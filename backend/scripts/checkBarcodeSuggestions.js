// backend/scripts/checkBarcodeSuggestions.js
//
// Read-only. Tests exactly what the app SUGGESTS (same query as
// GET /api/barcodes/preview-barcode) for every prefix, and checks each
// suggestion against the business rule used by pickBestBarcode:
// a barcode is taken only if it is linked to a book with
// reading_status = 'in_progress' (via book_barcodes or an open
// barcode_assignments row), or has an unresolved conflict observation.
//
// Usage: npm run check:suggestions      Makes NO writes.

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { Pool } = require("pg");
const { pickFreeBarcode } = require("../utils/barcodeHolders");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const PREFIX = `lower(regexp_replace(bi.barcode, '[0-9]+$', ''))`;

async function main() {
  // A) Per prefix: the barcode preview-barcode would suggest right now,
  //    and whether it violates the rule.
  // Uses the exact function preview-barcode and save use.
  const prefixes = (await pool.query(`
    SELECT DISTINCT ${PREFIX} AS prefix FROM public.barcode_inventory bi ORDER BY 1
  `)).rows.map((r) => r.prefix);
  const a = { rows: [], rowCount: 0 };
  for (const prefix of prefixes) {
    const barcode = await pickFreeBarcode(pool, [prefix]);
    if (!barcode) continue;
    const r = await pool.query(`
      SELECT
        (SELECT string_agg(DISTINCT b.id::text || ' (' || b.reading_status || ')', ', ')
           FROM public.books b
          WHERE b.id IN (SELECT book_id FROM public.book_barcodes WHERE lower(barcode) = lower($1)
                         UNION SELECT book_id FROM public.barcode_assignments WHERE lower(barcode) = lower($1) AND freed_at IS NULL)
        ) AS linked_books,
        EXISTS (SELECT 1 FROM public.books b
                 WHERE b.reading_status = 'in_progress'
                   AND b.id IN (SELECT book_id FROM public.book_barcodes WHERE lower(barcode) = lower($1)
                                UNION SELECT book_id FROM public.barcode_assignments WHERE lower(barcode) = lower($1) AND freed_at IS NULL)
        ) AS held_in_progress,
        EXISTS (SELECT 1 FROM public.barcode_conflict_observations co
                 WHERE lower(co.barcode) = lower($1) AND co.resolved = false) AS open_conflict
    `, [barcode]);
    a.rows.push({ prefix, barcode, ...r.rows[0] });
  }
  a.rowCount = a.rows.length;
  const bad = a.rows.filter((r) => r.held_in_progress || r.open_conflict);
  console.log(`\n=== A) Current suggestion per prefix (${a.rowCount} prefixes) ===`);
  console.log("VIOLATIONS (suggested but taken by an in_progress book / open conflict):", bad.length);
  if (bad.length) console.table(bad);
  const stale = a.rows.filter((r) => r.linked_books && !r.held_in_progress && !r.open_conflict);
  console.log("Suggested, linked only to non-in_progress books (OK by rule, stale link):", stale.length);
  if (stale.length) console.table(stale);

  // B) Whole pool: AVAILABLE barcodes that preview could reach and that
  //    are held by an in_progress book -> future wrong suggestions.
  const b = await pool.query(`
    SELECT bi.barcode, b.id AS book_id, b.reading_status
    FROM public.barcode_inventory bi
    JOIN public.book_barcodes bb ON lower(bb.barcode) = lower(bi.barcode)
    JOIN public.books b ON b.id = bb.book_id
    LEFT JOIN public.barcode_assignments ba
      ON lower(ba.barcode) = lower(bi.barcode) AND ba.freed_at IS NULL
    WHERE bi.status = 'AVAILABLE'
      AND bi.rank_in_inventory IS NOT NULL
      AND ba.barcode IS NULL
      AND b.reading_status = 'in_progress'
    ORDER BY bi.barcode
  `);
  console.log("\n=== B) In pool, could be suggested later, but held by in_progress book (should be EMPTY) ===");
  console.log("Count:", b.rowCount);
  if (b.rowCount) console.table(b.rows);

  // C) Real double bookings: one barcode held by >1 in_progress book.
  const c = await pool.query(`
    WITH holders AS (
      SELECT lower(ba.barcode) AS barcode, ba.book_id FROM public.barcode_assignments ba
       WHERE ba.freed_at IS NULL
      UNION
      SELECT lower(bb.barcode), bb.book_id FROM public.book_barcodes bb
    )
    SELECT h.barcode, count(DISTINCT h.book_id) AS in_progress_books,
           string_agg(DISTINCT h.book_id::text, ', ') AS book_ids
    FROM holders h JOIN public.books b ON b.id = h.book_id
    WHERE b.reading_status = 'in_progress'
    GROUP BY h.barcode
    HAVING count(DISTINCT h.book_id) > 1
    ORDER BY in_progress_books DESC, h.barcode
  `);
  console.log("\n=== C) Barcode held by >1 in_progress book = real double booking (should be EMPTY) ===");
  console.log("Count:", c.rowCount);
  if (c.rowCount) console.table(c.rows);

  // D) Context for the 55/130 from check:barcodes: how many are just stale.
  const d = await pool.query(`
    SELECT b.reading_status, count(DISTINCT bi.barcode)::int AS barcodes
    FROM public.barcode_inventory bi
    JOIN public.book_barcodes bb ON lower(bb.barcode) = lower(bi.barcode)
    JOIN public.books b ON b.id = bb.book_id
    WHERE bi.status = 'AVAILABLE'
    GROUP BY b.reading_status ORDER BY 2 DESC
  `);
  console.log("\n=== D) AVAILABLE barcodes still linked in book_barcodes, by book status ===");
  console.table(d.rows);

  // E) Break down C: per barcode, how many in_progress holders come from
  //    book_barcodes (the real current link, unique per barcode) vs. only
  //    from an open barcode_assignments row (ledger never got freed_at).
  //    And: are the holders the same book (same ISBN or pages) = duplicate
  //    record, or different books = physically double-labelled?
  const e = await pool.query(`
    WITH holders AS (
      SELECT lower(ba.barcode) AS barcode, ba.book_id, false AS in_bb
        FROM public.barcode_assignments ba WHERE ba.freed_at IS NULL
      UNION ALL
      SELECT lower(bb.barcode), bb.book_id, true FROM public.book_barcodes bb
    ),
    h AS (
      SELECT h.barcode, h.book_id, bool_or(h.in_bb) AS in_bb
      FROM holders h JOIN public.books b ON b.id = h.book_id
      WHERE b.reading_status = 'in_progress'
      GROUP BY h.barcode, h.book_id
    ),
    multi AS (SELECT barcode FROM h GROUP BY barcode HAVING count(*) > 1)
    SELECT h.barcode,
           count(*)::int                                   AS holders,
           count(*) FILTER (WHERE h.in_bb)::int            AS in_book_barcodes,
           count(DISTINCT NULLIF(regexp_replace(upper(coalesce(b.isbn13,b.isbn10,'')),'[^0-9X]','','g'),''))::int AS distinct_isbn,
           count(DISTINCT b.pages)::int                    AS distinct_pages,
           min(b.registered_at)::date                      AS first_reg,
           max(b.registered_at)::date                      AS last_reg,
           string_agg(left(coalesce(b.title_display,'?'),30) || CASE WHEN h.in_bb THEN ' [bb]' ELSE '' END, ' | ') AS titles
    FROM h JOIN multi m USING (barcode) JOIN public.books b ON b.id = h.book_id
    GROUP BY h.barcode
    ORDER BY h.barcode
  `);
  const cls = (r) =>
    r.in_book_barcodes <= 1 && (r.distinct_isbn <= 1 && r.distinct_pages <= 1) ? "duplicate_record"
    : r.in_book_barcodes <= 1 ? "stale_ledger_other_book"
    : "two_live_links";
  const summary = {};
  for (const r of e.rows) { r.kind = cls(r); summary[r.kind] = (summary[r.kind] || 0) + 1; }
  console.log("\n=== E) What the C double bookings really are ===");
  console.log("duplicate_record        = same ISBN/pages -> same physical book registered twice");
  console.log("stale_ledger_other_book = different books, but only one has the live link [bb]; others are open ledger rows");
  console.log("two_live_links          = >1 live link (should be impossible, book_barcodes.barcode is unique)");
  console.table(summary);
  console.table(e.rows.map(({ barcode, kind, holders, in_book_barcodes, first_reg, last_reg, titles }) =>
    ({ barcode, kind, holders, in_bb: in_book_barcodes, first_reg, last_reg, titles })));

  await pool.end();
}

main().catch((e) => { console.error("ERROR", e); process.exit(1); });
