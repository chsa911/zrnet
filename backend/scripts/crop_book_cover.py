import cv2
import numpy as np
import sys
from pathlib import Path

EXPAND_SCALE = 0.985


def order_points(pts):
    pts = np.array(pts, dtype="float32")
    rect = np.zeros((4, 2), dtype="float32")

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def clip_points(pts, img_w, img_h):
    pts = np.array(pts, dtype="float32")
    pts[:, 0] = np.clip(pts[:, 0], 0, img_w - 1)
    pts[:, 1] = np.clip(pts[:, 1], 0, img_h - 1)
    return pts


def expand_quad(pts, scale=EXPAND_SCALE):
    pts = np.array(pts, dtype="float32")
    center = np.mean(pts, axis=0)
    return (pts - center) * scale + center


def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = max(1, int(round(max(widthA, widthB))))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = max(1, int(round(max(heightA, heightB))))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped


def border_strip_size(h, w, ratio):
    return max(10, int(min(h, w) * ratio))


def postprocess_mask(mask, erode_iters=0):
    kernel7 = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    kernel5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    kernel3 = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))

    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel5, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel7, iterations=2)

    if erode_iters > 0:
        mask = cv2.erode(mask, kernel3, iterations=erode_iters)

    return mask


def build_background_diff(image, border_strip_ratio=0.06):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    h, w = image.shape[:2]
    strip = border_strip_size(h, w, border_strip_ratio)

    border_pixels = np.concatenate([
        lab[:strip, :, :].reshape(-1, 3),
        lab[-strip:, :, :].reshape(-1, 3),
        lab[:, :strip, :].reshape(-1, 3),
        lab[:, -strip:, :].reshape(-1, 3),
    ], axis=0)

    bg_color = np.median(border_pixels, axis=0).astype(np.float32)
    diff = np.linalg.norm(lab.astype(np.float32) - bg_color, axis=2)
    diff_u8 = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    return diff_u8


def build_distance_mask(image, border_strip_ratio=0.06, erode_iters=2):
    diff_u8 = build_background_diff(image, border_strip_ratio=border_strip_ratio)
    _, mask = cv2.threshold(diff_u8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = postprocess_mask(mask, erode_iters=erode_iters)
    return diff_u8, mask


def build_percentile_mask(image, border_strip_ratio=0.06, percentile=80, erode_iters=1):
    diff_u8 = build_background_diff(image, border_strip_ratio=border_strip_ratio)
    thr = float(np.percentile(diff_u8, percentile))
    mask = np.where(diff_u8 >= thr, 255, 0).astype(np.uint8)
    mask = postprocess_mask(mask, erode_iters=erode_iters)
    return diff_u8, mask


def build_kmeans_mask(image, k=3, border_strip_ratio=0.06, erode_iters=1):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    h, w = image.shape[:2]

    data = lab.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 25, 1.0)
    flags = cv2.KMEANS_PP_CENTERS

    _compactness, labels, _centers = cv2.kmeans(
        data, k, None, criteria, 3, flags
    )

    labels2 = labels.reshape((h, w))
    strip = border_strip_size(h, w, border_strip_ratio)

    border_labels = np.concatenate([
        labels2[:strip, :].ravel(),
        labels2[-strip:, :].ravel(),
        labels2[:, :strip].ravel(),
        labels2[:, -strip:].ravel(),
    ]).astype(np.int32)

    bg_label = np.bincount(border_labels, minlength=k).argmax()
    mask = np.where(labels2 != bg_label, 255, 0).astype(np.uint8)
    mask = postprocess_mask(mask, erode_iters=erode_iters)

    if k > 1:
        preview = (labels2 * (255 // (k - 1))).astype(np.uint8)
    else:
        preview = np.zeros((h, w), dtype=np.uint8)

    return preview, mask


def component_touches_border(stats_row, img_w, img_h, margin=4):
    x, y, w, h, _ = stats_row
    return (
        x <= margin or
        y <= margin or
        (x + w) >= (img_w - margin) or
        (y + h) >= (img_h - margin)
    )


def largest_valid_component(
    mask,
    min_component_area=0.03,
    max_component_area=0.97,
    min_aspect=0.90,
    max_aspect=2.80,
    allow_border_touch=True,
):
    h, w = mask.shape[:2]
    img_area = h * w

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)

    candidates = []
    for i in range(1, num_labels):
        x, y, cw, ch, area = stats[i]

        if area < img_area * min_component_area:
            continue
        if area > img_area * max_component_area:
            continue
        if (not allow_border_touch) and component_touches_border(stats[i], w, h):
            continue

        aspect = max(cw, ch) / max(1.0, min(cw, ch))
        if aspect < min_aspect or aspect > max_aspect:
            continue

        cx = x + cw / 2.0
        cy = y + ch / 2.0
        center_dx = abs(cx - w / 2) / (w / 2)
        center_dy = abs(cy - h / 2) / (h / 2)
        center_score = 1.0 - min(1.0, (center_dx + center_dy) / 2.0)

        fill_ratio = area / max(1.0, cw * ch)
        score = area * (0.8 + 0.1 * center_score + 0.1 * fill_ratio)
        candidates.append((score, i))

    if not candidates:
        return None

    candidates.sort(reverse=True)
    best_label = candidates[0][1]

    comp = np.zeros_like(mask)
    comp[labels == best_label] = 255
    return comp


def largest_component_any(mask, min_pixels=300):
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)

    best_label = None
    best_area = 0
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area > best_area and area >= min_pixels:
            best_area = area
            best_label = i

    if best_label is None:
        return None

    comp = np.zeros_like(mask)
    comp[labels == best_label] = 255
    return comp


def build_cover_shape(component_mask):
    contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None, None

    contour = max(contours, key=cv2.contourArea)
    hull = cv2.convexHull(contour)

    filled = np.zeros_like(component_mask)
    cv2.drawContours(filled, [hull], -1, 255, thickness=cv2.FILLED)
    return filled, hull


def border_hits_from_box(box, img_w, img_h, margin=20):
    box = np.array(box, dtype=np.float32)
    xs = box[:, 0]
    ys = box[:, 1]

    hits = 0
    if xs.min() <= margin:
        hits += 1
    if ys.min() <= margin:
        hits += 1
    if xs.max() >= (img_w - 1 - margin):
        hits += 1
    if ys.max() >= (img_h - 1 - margin):
        hits += 1
    return hits


def candidate_score(contour, img_w, img_h):
    rect = cv2.minAreaRect(contour)
    rw, rh = rect[1]

    if rw < 20 or rh < 20:
        return None

    rect_area = rw * rh
    img_area = float(img_w * img_h)
    area_ratio = rect_area / img_area
    aspect = max(rw, rh) / max(1.0, min(rw, rh))

    box = cv2.boxPoints(rect)
    border_margin = max(12, int(min(img_w, img_h) * 0.02))
    border_hits = border_hits_from_box(box, img_w, img_h, margin=border_margin)

    if area_ratio > 0.82:
        return None
    if border_hits >= 2 and area_ratio > 0.60:
        return None
    if aspect < 0.95 or aspect > 2.8:
        return None

    M = cv2.moments(contour)
    if M["m00"] != 0:
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]
    else:
        cx, cy = img_w / 2, img_h / 2

    center_dx = abs(cx - img_w / 2) / (img_w / 2)
    center_dy = abs(cy - img_h / 2) / (img_h / 2)
    center_pref = 1.0 - min(1.0, (center_dx + center_dy) / 2.0)

    area_pref = 1.0 - min(1.0, abs(area_ratio - 0.38) / 0.38)
    aspect_pref = 1.0 - min(1.0, abs(aspect - 1.55) / 1.55)

    score = (
        area_pref * 0.45 +
        aspect_pref * 0.30 +
        center_pref * 0.25
    ) - (0.25 * border_hits)

    return score


def try_profiles(orig):
    h, w = orig.shape[:2]

    profiles = [
        dict(
            mode="distance", name="strict",
            border_strip_ratio=0.06, erode_iters=3,
            min_component_area=0.05, max_component_area=0.85,
            min_aspect=1.15, max_aspect=2.0,
            allow_border_touch=False, allow_any_component=False
        ),
        dict(
            mode="distance", name="normal",
            border_strip_ratio=0.06, erode_iters=2,
            min_component_area=0.04, max_component_area=0.90,
            min_aspect=1.05, max_aspect=2.2,
            allow_border_touch=False, allow_any_component=False
        ),
        dict(
            mode="kmeans", name="k3",
            k=3, border_strip_ratio=0.06, erode_iters=1,
            min_component_area=0.02, max_component_area=0.95,
            min_aspect=0.90, max_aspect=2.6,
            allow_border_touch=True, allow_any_component=True
        ),
        dict(
            mode="percentile", name="p82",
            border_strip_ratio=0.06, percentile=82, erode_iters=1,
            min_component_area=0.02, max_component_area=0.95,
            min_aspect=0.90, max_aspect=2.8,
            allow_border_touch=True, allow_any_component=True
        ),
        dict(
            mode="kmeans", name="k4",
            k=4, border_strip_ratio=0.08, erode_iters=1,
            min_component_area=0.015, max_component_area=0.97,
            min_aspect=0.80, max_aspect=3.0,
            allow_border_touch=True, allow_any_component=True
        ),
        dict(
            mode="distance", name="soft",
            border_strip_ratio=0.10, erode_iters=0,
            min_component_area=0.01, max_component_area=0.98,
            min_aspect=0.70, max_aspect=3.2,
            allow_border_touch=True, allow_any_component=True
        ),
        dict(
            mode="percentile", name="p70",
            border_strip_ratio=0.10, percentile=70, erode_iters=0,
            min_component_area=0.01, max_component_area=0.98,
            min_aspect=0.70, max_aspect=3.5,
            allow_border_touch=True, allow_any_component=True
        ),
    ]

    candidates = []

    for p in profiles:
        if p["mode"] == "distance":
            source_preview, raw_mask = build_distance_mask(
                orig,
                border_strip_ratio=p["border_strip_ratio"],
                erode_iters=p["erode_iters"],
            )
        elif p["mode"] == "percentile":
            source_preview, raw_mask = build_percentile_mask(
                orig,
                border_strip_ratio=p["border_strip_ratio"],
                percentile=p["percentile"],
                erode_iters=p["erode_iters"],
            )
        elif p["mode"] == "kmeans":
            source_preview, raw_mask = build_kmeans_mask(
                orig,
                k=p["k"],
                border_strip_ratio=p["border_strip_ratio"],
                erode_iters=p["erode_iters"],
            )
        else:
            continue

        component = largest_valid_component(
            raw_mask,
            min_component_area=p["min_component_area"],
            max_component_area=p["max_component_area"],
            min_aspect=p["min_aspect"],
            max_aspect=p["max_aspect"],
            allow_border_touch=p["allow_border_touch"],
        )

        if component is None and p["allow_any_component"]:
            component = largest_component_any(raw_mask)

        if component is None:
            continue

        filled_mask, hull = build_cover_shape(component)
        if filled_mask is None or hull is None:
            continue

        contours, _ = cv2.findContours(filled_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        best_contour = max(contours, key=cv2.contourArea)

        score = candidate_score(best_contour, w, h)
        if score is None:
            continue

        candidates.append({
            "score": score,
            "profile": p["name"],
            "mode": p["mode"],
            "source_preview": source_preview,
            "raw_mask": raw_mask,
            "component": component,
            "filled_mask": filled_mask,
            "hull": hull,
            "best_contour": best_contour,
        })

    if not candidates:
        return None

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[0]


def crop_book_cover(image_path, output_path, debug=False):
    image = cv2.imread(image_path)
    if image is None:
        print(f"Could not read image: {image_path}")
        return False

    orig = image.copy()
    h, w = orig.shape[:2]

    result = try_profiles(orig)
    if result is None:
        print("No suitable foreground component found.")
        return False

    rect = cv2.minAreaRect(result["best_contour"])
    box = cv2.boxPoints(rect)
    box = expand_quad(box, scale=EXPAND_SCALE)
    box = clip_points(box, w, h)

    cropped = four_point_transform(orig, box)
    used_pts = order_points(box)
    method = f"minAreaRect cover | mode={result['mode']} | profile={result['profile']}"

    cv2.imwrite(output_path, cropped)
    print(f"Saved cropped cover to: {output_path}")
    print(f"Detection method: {method}")

    if debug:
        out_path = Path(output_path)
        stem = str(out_path.with_suffix(""))

        cv2.imwrite(f"{stem}_debug_source.jpg", result["source_preview"])
        cv2.imwrite(f"{stem}_debug_raw_mask.jpg", result["raw_mask"])
        cv2.imwrite(f"{stem}_debug_component.jpg", result["component"])
        cv2.imwrite(f"{stem}_debug_filled.jpg", result["filled_mask"])

        overlay = orig.copy()
        cv2.drawContours(overlay, [result["hull"]], -1, (0, 255, 0), 3)

        pts_int = used_pts.astype(int)
        for i in range(4):
            p1 = tuple(pts_int[i])
            p2 = tuple(pts_int[(i + 1) % 4])
            cv2.line(overlay, p1, p2, (255, 0, 0), 3)

        cv2.putText(
            overlay,
            method,
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 0, 255),
            2,
            cv2.LINE_AA
        )

        cv2.imwrite(f"{stem}_debug_overlay.jpg", overlay)
        print(f"Saved debug files next to: {output_path}")

    return True


if __name__ == "__main__":
    args = sys.argv[1:]

    debug = False
    if "--debug" in args:
        debug = True
        args.remove("--debug")

    if len(args) != 2:
        print("Usage: python crop_book_cover.py input.jpg output.jpg [--debug]")
        sys.exit(1)

    input_path = args[0]
    output_path = args[1]
    success = crop_book_cover(input_path, output_path, debug=debug)
    sys.exit(0 if success else 1)
 