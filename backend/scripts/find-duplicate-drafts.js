#!/usr/bin/env node
// backend/scripts/find-duplicate-drafts.js
//
// Auto-detects the same duplicate pattern that backend/scripts/cleanup-duplicates.js
// fixes from a hardcoded list: a stale draft row (reading_status = 'in_stock', no
// barcode, usually holds the cover photo from the mobile scan) sitting alongside a
// separate, later book row for the SAME physical book that got fully registered
// (has a real barcode via book_barcodes) -- created because the "reuse this draft"
// step was skipped when the second one was registered at the desk.
//
// This script only DETECTS and REPORTS candidate pairs. It does not touch the
// database or any cover files -- review the report, then decide per pair whether
// to run the same cleanup steps cleanup-duplicates.js performs (cover rename,
// cover_ok transfer, delete the stale in_stock row).
//
// Matching is restricted to what actually identifies "the same book": an
// identical ISBN, or (when ISBN isn't available/confirmed) an identical
// page count. Title text is NOT used to match -- too unreliable (typos,
// reprints/translations with a different title_display, unrelated books
// sharing a title), and it's not what the app's own register-page matching
// (the "Treffer gefunden" panel, keyed on pages) uses either.
//   high   - normalized ISBN13 (or ISBN10) matches exactly
//   medium - identical page count, no ISBN confirmation on one/both sides
//            (page-count collisions between unrelated books do happen)
//
// Page count alone can't tell two different books with the same length
// apart -- there's no ISBN to fall back on for those. So every 'medium'
// (pages-only) match is additionally verified the same way the app's own
// live duplicate-check does it (see pixelSimilarity/getImageFingerprint in
// frontend/src/components/BookFormDesktop.jsx): both cover photos are
// pulled from the production server and compared pixel-by-pixel via sharp.
//   medium_confirmed - covers are visually near-identical -> actually the
//                       same physical book despite the missing ISBN
//   medium_rejected   - covers are clearly different -> coincidental page
//                       count, NOT a duplicate, no action needed
//   medium_unverified - couldn't fetch one/both covers, or similarity is in
//                       an ambiguous middle band -> can't tell, manual look
//
// A draft can match more than one already-barcoded book (same ISBN/pages).
// That alone doesn't mean anything is wrong -- you can genuinely own more
// than one physical copy of an edition. What you CAN'T have is two already-
// registered, already-barcoded copies added on the same day: two physical
// copies are never bought and registered on the same day, so that always
// means an accidental double-registration, not two distinct copies. So
// each multi-match group is timestamped by comparing the candidate KEEP
// rows against each other (not against the draft -- the draft can
// legitimately predate its own eventual finalized registration by any
// amount of time, so its own timestamp isn't informative here):
//   - keeps spread apart by more than a day -> probably real, separate copies
//   - two keeps within the same day/hour of each other -> same_day_cluster
//     (confirmed accidental double-registration -- a barcode was likely
//     wasted; flagged, not auto-fixed)
//
// Usage:
//   node scripts/find-duplicate-drafts.js
//   node scripts/find-duplicate-drafts.js --json      (machine-readable output)

/* eslint-disable no-console */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { Pool } = require("pg");
const { execSync } = require("child_process");
const sharp = require("sharp");

const AS_JSON = process.argv.includes("--json");
const NO_COVER_CHECK = process.argv.includes("--no-cover-check");
const PROD_HOST = process.env.PROD_HOST || "root@46.224.178.235";
const CONTAINER = process.env.PROD_CONTAINER || "zrnet-api-1";
const COVERS = "/uploads/covers";

// Same threshold family as the in-app check (BookFormDesktop.jsx uses 0.95
// for "identical"). A bit more headroom here since production JPEGs may
// have gone through slightly different resize/compress passes.
const COVER_SAME_THRESHOLD = 0.9;
const COVER_DIFFERENT_THRESHOLD = 0.6;

function dockerExists(path_) {
  const cmd = `ssh ${PROD_HOST} "docker exec ${CONTAINER} sh -c 'if [ -f ${path_} ]; then echo yes; else echo no; fi'"`;
  return execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim() === "yes";
}

function fetchCoverBuffer(id) {
  const candidates = [`${COVERS}/normalized/${id}.jpg`, `${COVERS}/${id}.jpg`];
  for (const remotePath of candidates) {
    try {
      if (!dockerExists(remotePath)) continue;
      const buf = execSync(`ssh ${PROD_HOST} "docker exec ${CONTAINER} cat ${remotePath}"`, {
        maxBuffer: 1024 * 1024 * 20,
      });
      if (buf && buf.length > 500) return buf;
    } catch {
      // try next candidate / give up
    }
  }
  return null;
}

async function coverSimilarity(bufA, bufB) {
  const SIZE = 16;
  const [a, b] = await Promise.all([
    sharp(bufA).resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer(),
    sharp(bufB).resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer(),
  ]);
  if (!a.length || a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
  return 1 - diff / (a.length * 255);
}

// Returns 'confirmed' | 'rejected' | 'unverified'
async function classifyPagesOnlyMatch(draftId, keepId) {
  if (NO_COVER_CHECK) return "unverified";
  try {
    const [bufA, bufB] = await Promise.all([fetchCoverBuffer(draftId), fetchCoverBuffer(keepId)]);
    if (!bufA || !bufB) return "unverified";
    const sim = await coverSimilarity(bufA, bufB);
    if (sim == null) return "unverified";
    if (sim >= COVER_SAME_THRESHOLD) return "confirmed";
    if (sim <= COVER_DIFFERENT_THRESHOLD) return "rejected";
    return "unverified";
  } catch {
    return "unverified";
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query(`
    SELECT
      draft.id::text            AS draft_id,
      draft.title_display       AS draft_title,
      draft.isbn13               AS draft_isbn13,
      draft.isbn10               AS draft_isbn10,
      draft.pages                 AS draft_pages,
      draft.added_at               AS draft_added_at,
      keep.id::text                AS keep_id,
      keep.title_display           AS keep_title,
      keep.isbn13                   AS keep_isbn13,
      keep.isbn10                   AS keep_isbn10,
      keep.pages                     AS keep_pages,
      keep.reading_status             AS keep_reading_status,
      keep.registered_at              AS keep_registered_at,
      keep.added_at                     AS keep_added_at,
      CASE
        WHEN NULLIF(regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g'), '') IS NOT NULL
         AND regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g')
           = regexp_replace(upper(coalesce(keep.isbn13, keep.isbn10, '')), '[^0-9X]', '', 'g')
        THEN 'high'
        ELSE 'medium'
      END AS confidence
    FROM public.books draft
    JOIN public.books keep
      ON keep.id <> draft.id
     AND (
           (
             NULLIF(regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g'), '') IS NOT NULL
             AND regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g')
               = regexp_replace(upper(coalesce(keep.isbn13, keep.isbn10, '')), '[^0-9X]', '', 'g')
           )
           OR (
             draft.pages IS NOT NULL
             AND keep.pages IS NOT NULL
             AND draft.pages = keep.pages
           )
         )
    JOIN public.book_barcodes bc ON bc.book_id = keep.id
    WHERE draft.reading_status = 'in_stock'
      AND NOT EXISTS (
        SELECT 1 FROM public.book_barcodes bb0 WHERE bb0.book_id = draft.id
      )
    ORDER BY confidence, draft.added_at DESC NULLS LAST
  `);

  await pool.end();

  if (AS_JSON) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (!rows.length) {
    console.log("No candidate duplicate drafts found.");
    return;
  }

  const SAME_DAY_MS = 24 * 60 * 60 * 1000;

  // Group by draft so we can tell single-keep from multi-keep, and check
  // timestamp clustering across a whole multi-keep group.
  const byDraft = new Map();
  for (const r of rows) {
    if (!byDraft.has(r.draft_id)) byDraft.set(r.draft_id, []);
    byDraft.get(r.draft_id).push(r);
  }

  const groups = { high: [], medium: [], same_day_cluster: [] };

  for (const [draftId, matches] of byDraft) {
    const highMatches = matches.filter((m) => m.confidence === "high");
    const distinctHighKeepIds = new Set(highMatches.map((m) => m.keep_id));

    if (distinctHighKeepIds.size > 1) {
      // Compare the ISBN-matched KEEP rows against each other only -- the
      // draft's own added_at isn't informative (it can predate its eventual
      // finalized registration by any amount of time).
      let minGapMs = Infinity;
      for (let i = 0; i < highMatches.length; i++) {
        for (let j = i + 1; j < highMatches.length; j++) {
          const a = new Date(highMatches[i].keep_added_at).getTime();
          const b = new Date(highMatches[j].keep_added_at).getTime();
          if (Number.isFinite(a) && Number.isFinite(b)) {
            minGapMs = Math.min(minGapMs, Math.abs(a - b));
          }
        }
      }

      if (minGapMs <= SAME_DAY_MS) {
        groups.same_day_cluster.push({ draftId, matches: highMatches, minGapMs });
        continue;
      }
      // Spread apart by more than a day -> probably genuinely separate
      // copies. Falls through to normal confidence bucketing below (still
      // reported, just not flagged as an urgent same-day cluster).
    }

    for (const m of matches) groups[m.confidence].push({ draftId, matches: [m] });
  }

  // Pages-only matches can't be trusted on page count alone (two unrelated
  // books can share a length). Verify each against the actual cover photos,
  // the same way the app's live duplicate-check does.
  console.log(
    NO_COVER_CHECK
      ? "Skipping cover comparison (--no-cover-check).\n"
      : `Verifying ${groups.medium.length} pages-only match(es) against cover photos (SSH to ${PROD_HOST})…\n`
  );

  const mediumConfirmed = [];
  const mediumRejected = [];
  const mediumUnverified = [];
  for (const entry of groups.medium) {
    const r = entry.matches[0];
    const verdict = await classifyPagesOnlyMatch(r.draft_id, r.keep_id);
    if (verdict === "confirmed") mediumConfirmed.push(entry);
    else if (verdict === "rejected") mediumRejected.push(entry);
    else mediumUnverified.push(entry);
  }

  const totalPairs = rows.length;
  console.log(`Found ${totalPairs} candidate duplicate pair(s) across ${byDraft.size} draft row(s):\n`);

  if (groups.same_day_cluster.length) {
    console.log(
      `── SAME-DAY CLUSTER (${groups.same_day_cluster.length}) -- confirmed accidental double-registration ${"─".repeat(10)}`
    );
    for (const { matches, minGapMs } of groups.same_day_cluster) {
      const hours = (minGapMs / 3600000).toFixed(1);
      console.log(`"${matches[0].draft_title || "(kein Titel)"}"`);
      console.log(`  draft (in_stock, kein Barcode): ${matches[0].draft_id}`);
      for (const m of matches) {
        console.log(`  candidate keep (${m.keep_reading_status}, hat Barcode): ${m.keep_id}`);
      }
      console.log(`  ⚠ ISBN-Treffer nur ~${hours}h auseinander registriert -- zwei Exemplare werden nie am selben Tag gekauft+registriert, also ist eines davon eine Fehlregistrierung (Barcode evtl. verschwendet). Manuell klären, welcher Barcode bleibt.`);
      console.log();
    }
  }

  if (groups.high.length) {
    console.log(`── HIGH confidence (${groups.high.length}) -- ISBN-Treffer ${"─".repeat(30)}`);
    for (const { matches } of groups.high) {
      const r = matches[0];
      console.log(`"${r.draft_title || r.keep_title || "(kein Titel)"}"`);
      console.log(`  keep   (${r.keep_reading_status}, hat Barcode): ${r.keep_id}`);
      console.log(`  delete (in_stock, alt/Draft):        ${r.draft_id}`);
      console.log();
    }
  }

  if (mediumConfirmed.length) {
    console.log(`── MEDIUM confidence, COVER-CONFIRMED (${mediumConfirmed.length}) -- gleiche Seitenzahl + Cover visuell identisch ${"─".repeat(10)}`);
    for (const { matches } of mediumConfirmed) {
      const r = matches[0];
      console.log(`"${r.draft_title || r.keep_title || "(kein Titel)"}" (${r.draft_pages} S.)`);
      console.log(`  keep   (${r.keep_reading_status}, hat Barcode): ${r.keep_id}`);
      console.log(`  delete (in_stock, alt/Draft):        ${r.draft_id}`);
      console.log(`  ✓ Cover-Foto stimmt überein -- trotz fehlender ISBN dasselbe Buch`);
      console.log();
    }
  }

  if (mediumRejected.length) {
    console.log(`── MEDIUM confidence, COVER-REJECTED (${mediumRejected.length}) -- vermutlich KEIN Duplikat, nur zufällig gleiche Seitenzahl ${"─".repeat(10)}`);
    for (const { matches } of mediumRejected) {
      const r = matches[0];
      console.log(`"${r.draft_title || "(kein Titel)"}" (${r.draft_pages} S.) vs. keep ${r.keep_id} -- Cover sieht anders aus, keine Aktion nötig`);
    }
    console.log();
  }

  if (mediumUnverified.length) {
    console.log(`── MEDIUM confidence, UNVERIFIED (${mediumUnverified.length}) -- Cover konnte nicht verglichen werden ${"─".repeat(10)}`);
    for (const { matches } of mediumUnverified) {
      const r = matches[0];
      console.log(`"${r.draft_title || r.keep_title || "(kein Titel)"}" (${r.draft_pages} S.)`);
      console.log(`  keep   (${r.keep_reading_status}, hat Barcode): ${r.keep_id}`);
      console.log(`  delete (in_stock, alt/Draft):        ${r.draft_id}`);
      console.log(`  ⚠ nur Seitenzahl übereinstimmend, kein ISBN- und kein Cover-Vergleich möglich -- manuell prüfen`);
      console.log();
    }
  }

  console.log("─".repeat(60));
  console.log(
    "Dies ist nur ein Report -- nichts wurde verändert.\n" +
      "Für die automatisch sicheren Fälle (ISBN-bestätigt oder Cover-bestätigt,\n" +
      "kein Same-Day-Cluster): node scripts/merge-duplicate-drafts.js\n" +
      "Same-day cluster, unverified und mehrere weit auseinander liegende\n" +
      "ISBN-Treffer brauchen eine manuelle Entscheidung. Cover-rejected braucht\n" +
      "keine Aktion (kein echtes Duplikat)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
