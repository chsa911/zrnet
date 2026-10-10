// backend/utils/barcodeHolders.js
//
// SINGLE SOURCE OF TRUTH for "is this barcode still taken?".
//
// Physical reality: a barcode is painted onto a book. In the past the same
// code was sometimes painted onto several books at once. A code may only be
// handed out again once EVERY book carrying it is gone.
//
// "Book is still around" = reading_status = 'in_progress' (the only status
// that may hold a barcode; finishing/abandoning a book is the only way to
// let go of it, enforced by DB triggers).
//
// Where a holder can be recorded:
//   - barcode_assignments with freed_at IS NULL: one row per physical book,
//     several rows per code are possible (multi-copy case).
//   - book_barcodes: the "live" link shown in the UI. barcode is UNIQUE
//     there, so at most ONE of several copies appears in it.
// Therefore BOTH are checked. Checking only book_barcodes would free a code
// as soon as the one linked copy is finished, while other copies still
// carry it.

/**
 * SQL boolean expression: true while at least one in_progress book holds
 * the barcode given by `barcodeExpr` (an SQL expression, e.g. "bi.barcode"
 * or "$1"). `excludeBookExpr` optionally ignores one book (e.g. the book
 * that is currently being assigned that code).
 */
function heldByActiveBookSql(barcodeExpr, { excludeBookExpr } = {}) {
  const ex = excludeBookExpr ? `AND b.id <> ${excludeBookExpr}` : "";
  return `(
    EXISTS (
      SELECT 1
      FROM public.barcode_assignments ba
      JOIN public.books b ON b.id = ba.book_id
      WHERE lower(ba.barcode) = lower(${barcodeExpr})
        AND ba.freed_at IS NULL
        AND b.reading_status = 'in_progress'
        ${ex}
    )
    OR EXISTS (
      SELECT 1
      FROM public.book_barcodes bb
      JOIN public.books b ON b.id = bb.book_id
      WHERE lower(bb.barcode) = lower(${barcodeExpr})
        AND b.reading_status = 'in_progress'
        ${ex}
    )
  )`;
}

/** SQL boolean: an admin flagged this code as "seen on another book, unresolved". */
function unresolvedConflictSql(barcodeExpr) {
  return `EXISTS (
    SELECT 1
    FROM public.barcode_conflict_observations co
    WHERE lower(co.barcode) = lower(${barcodeExpr})
      AND co.resolved = false
  )`;
}

const PREFIX_SQL = `lower(regexp_replace(bi.barcode, '[0-9]+$', ''))`;

// WHERE clause shared by suggestion (preview), auto-pick on save and count.
const FREE_POOL_WHERE = `
  bi.status = 'AVAILABLE'
  AND bi.rank_in_inventory IS NOT NULL
  AND ${PREFIX_SQL} = ANY($1::text[])
  AND NOT ${heldByActiveBookSql("bi.barcode")}
  AND NOT ${unresolvedConflictSql("bi.barcode")}
`;

/** Best free barcode for the given prefixes (in priority order), or null. */
async function pickFreeBarcode(db, prefixes) {
  const clean = (prefixes || []).filter(Boolean).map((p) => String(p).toLowerCase());
  if (!clean.length) return null;
  const { rows } = await db.query(
    `
    SELECT bi.barcode
    FROM public.barcode_inventory bi
    WHERE ${FREE_POOL_WHERE}
    ORDER BY
      array_position($1::text[], ${PREFIX_SQL}),
      bi.rank_in_inventory ASC,
      lower(bi.barcode) ASC
    LIMIT 1
    `,
    [clean]
  );
  return rows[0]?.barcode ?? null;
}

/** Number of free barcodes for the given prefixes. */
async function countFreeBarcodes(db, prefixes) {
  const clean = (prefixes || []).filter(Boolean).map((p) => String(p).toLowerCase());
  if (!clean.length) return 0;
  const { rows } = await db.query(
    `SELECT count(*)::int AS n FROM public.barcode_inventory bi WHERE ${FREE_POOL_WHERE}`,
    [clean]
  );
  return rows[0]?.n ?? 0;
}

/** True while at least one in_progress book (other than excludeBookId) holds the code. */
async function isBarcodeHeld(db, barcode, excludeBookId = null) {
  const { rows } = await db.query(
    `SELECT ${heldByActiveBookSql("$1", excludeBookId ? { excludeBookExpr: "$2::uuid" } : {})} AS held`,
    excludeBookId ? [barcode, excludeBookId] : [barcode]
  );
  return rows[0]?.held === true;
}

/**
 * Release the barcode(s) of ONE book that has left (finished/abandoned):
 * close that book's open ledger rows, drop its live link, and mark the code
 * AVAILABLE in the inventory only if no other in_progress book still
 * carries it. Other copies' rows are never touched.
 * Returns the list of barcodes this book held.
 */
async function releaseBookBarcodes(db, bookId) {
  const { rows } = await db.query(
    `
    WITH freed AS (
      UPDATE public.barcode_assignments
      SET freed_at = COALESCE(freed_at, now())
      WHERE book_id = $1::uuid
        AND freed_at IS NULL
      RETURNING barcode
    ),
    unlinked AS (
      DELETE FROM public.book_barcodes
      WHERE book_id = $1::uuid
      RETURNING barcode
    ),
    history AS (
      -- the DB trigger usually already closed the row (with the mobile
      -- timestamp) when the status changed, so take every code this book
      -- ever had. Flipping a code to AVAILABLE is only done below when
      -- nobody holds it, which is always correct.
      SELECT barcode FROM public.barcode_assignments
      WHERE book_id = $1::uuid
    )
    SELECT DISTINCT lower(barcode) AS barcode
    FROM (SELECT barcode FROM freed UNION ALL SELECT barcode FROM unlinked
          UNION ALL SELECT barcode FROM history) x
    `,
    [bookId]
  );
  const codes = rows.map((r) => r.barcode);
  if (codes.length) {
    await db.query(
      `
      UPDATE public.barcode_inventory bi
      SET status = 'AVAILABLE', updated_at = now()
      WHERE lower(bi.barcode) = ANY($1::text[])
        AND NOT ${heldByActiveBookSql("bi.barcode")}
      `,
      [codes]
    );
  }
  return codes;
}

module.exports = {
  heldByActiveBookSql,
  unresolvedConflictSql,
  pickFreeBarcode,
  countFreeBarcodes,
  isBarcodeHeld,
  releaseBookBarcodes,
};
