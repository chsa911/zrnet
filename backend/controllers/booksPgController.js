// Replace the top of registerBook(...) with this version.
// The rest of the function stays unchanged.

async function registerBook(req, res) {
  const body = req.body || {};

  const explicitExistingId = normalizeUuid(
    body.existing_book_id ??
      body.existingBookId ??
      body.draft_id ??
      body.draftId
  );
  if (explicitExistingId) {
    req.params = { ...(req.params || {}), id: explicitExistingId };
    return registerExistingBook(req, res);
  }

  const assignBarcodeFlag = body.assign_barcode ?? body.assignBarcode;
  let assignBarcodeNow = !(
    assignBarcodeFlag === false ||
    assignBarcodeFlag === "false" ||
    assignBarcodeFlag === 0 ||
    assignBarcodeFlag === "0"
  );

  const requestedBarcode = normalizeStr(body.barcode);
  const widthCm = toNum(body.width_cm);
  const heightCm = toNum(body.height_cm);

  const pool = getPool(req);

  // Safari/mobile fallback:
  // if no barcode was explicitly chosen and dimensions are missing,
  // save the new scan without barcode instead of rejecting it.
  if (
    assignBarcodeNow &&
    !requestedBarcode &&
    (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0)
  ) {
    assignBarcodeNow = false;
  }

  const isbnInfo = normalizeIsbnForDb(
    body.isbn13,
    body.isbn10,
    body.isbn13_raw ?? body.isbn13Raw ?? body.isbn_raw ?? body.isbn
  );

  const exactIsbn = isbnInfo.isbn13 || isbnInfo.isbn10 || null;
  if (assignBarcodeNow && exactIsbn) {
    const dup = await pool.query(
      `
      SELECT id
      FROM public.books
      WHERE ($1::text IS NOT NULL AND isbn13 = $1)
         OR ($2::text IS NOT NULL AND isbn10 = $2)
      ORDER BY registered_at DESC NULLS LAST, added_at DESC NULLS LAST, id
      LIMIT 3
      `,
      [isbnInfo.isbn13 || null, isbnInfo.isbn10 || null]
    );

    if (dup.rows.length === 1) {
      req.params = { ...(req.params || {}), id: dup.rows[0].id };
      return registerExistingBook(req, res);
    }
    if (dup.rows.length > 1) {
      return res.status(409).json({
        error: "duplicate_isbn_ambiguous",
        isbn13: isbnInfo.isbn13 || null,
        isbn10: isbnInfo.isbn10 || null,
        book_ids: dup.rows.map((r) => r.id),
      });
    }
  }

  const rule =
    assignBarcodeNow && !requestedBarcode
      ? await resolveRuleAndPos(pool, widthCm, heightCm)
      : null;
  if (assignBarcodeNow && !requestedBarcode && !rule) {
    return res.status(422).json({ error: "no_series_for_size" });
  }

  // ... keep the rest of your current registerBook implementation unchanged
}
