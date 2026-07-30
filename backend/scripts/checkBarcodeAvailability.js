// backend/scripts/checkBarcodeAvailability.js
//
// Read-only diagnostic: checks that the barcode-suggestion pool
// (barcode_inventory.status = 'AVAILABLE') never contains a barcode that is
// actually still in use, and surfaces barcodes with a long reuse history so
// you can pick one and manually retest the "already assigned multiple times"
// scenario end-to-end.
//
// Usage: node scripts/checkBarcodeAvailability.js
// Makes NO writes to the database.

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // 1. Barcodes marked AVAILABLE but still actually linked to a book, or
  //    with an open (freed_at IS NULL) assignment. If this ever returns
  //    rows, the preview endpoint could suggest an already-taken barcode.
  const wronglyAvailable = await pool.query(`
    SELECT bi.barcode, bi.status,
           bb.book_id AS linked_book_id,
           ba.book_id AS open_assignment_book_id, ba.assigned_at
    FROM public.barcode_inventory bi
    LEFT JOIN public.book_barcodes bb ON lower(bb.barcode) = lower(bi.barcode)
    LEFT JOIN public.barcode_assignments ba
      ON lower(ba.barcode) = lower(bi.barcode) AND ba.freed_at IS NULL
    WHERE bi.status = 'AVAILABLE'
      AND (bb.book_id IS NOT NULL OR ba.book_id IS NOT NULL)
  `);
  console.log("\n=== 1) AVAILABLE but actually still taken (should be EMPTY) ===");
  console.log("Count:", wronglyAvailable.rowCount);
  if (wronglyAvailable.rowCount) console.table(wronglyAvailable.rows);

  // 2. Barcodes with more than one currently-open assignment row (should be
  //    impossible, but checks the ledger directly rather than trusting the
  //    app logic).
  const doubleOpen = await pool.query(`
    SELECT barcode, count(*) AS open_rows
    FROM public.barcode_assignments
    WHERE freed_at IS NULL
    GROUP BY barcode
    HAVING count(*) > 1
  `);
  console.log("\n=== 2) Barcodes with >1 currently-open assignment (should be EMPTY) ===");
  console.log("Count:", doubleOpen.rowCount);
  if (doubleOpen.rowCount) console.table(doubleOpen.rows);

  // 3. Barcodes that have been assigned/freed the most times historically -
  //    good candidates to manually retest the "schon mehrmals vergeben" case.
  const mostReused = await pool.query(`
    SELECT ba.barcode,
           count(*) AS times_assigned,
           bool_or(ba.freed_at IS NULL) AS currently_assigned,
           bi.status AS inventory_status,
           bb.book_id AS current_book_id
    FROM public.barcode_assignments ba
    LEFT JOIN public.barcode_inventory bi ON lower(bi.barcode) = lower(ba.barcode)
    LEFT JOIN public.book_barcodes bb ON lower(bb.barcode) = lower(ba.barcode)
    GROUP BY ba.barcode, bi.status, bb.book_id
    ORDER BY times_assigned DESC
    LIMIT 15
  `);
  console.log("\n=== 3) Most-reused barcodes (pick one to manually retest) ===");
  console.table(mostReused.rows);

  // 4. Barcodes stuck as ASSIGNED with no current link and no open
  //    assignment (not a correctness bug for suggestions, but shrinks the
  //    available pool for no reason - worth knowing about).
  const stuckAssigned = await pool.query(`
    SELECT bi.barcode
    FROM public.barcode_inventory bi
    LEFT JOIN public.book_barcodes bb ON lower(bb.barcode) = lower(bi.barcode)
    LEFT JOIN public.barcode_assignments ba
      ON lower(ba.barcode) = lower(bi.barcode) AND ba.freed_at IS NULL
    WHERE bi.status = 'ASSIGNED'
      AND bb.book_id IS NULL
      AND ba.barcode IS NULL
    LIMIT 20
  `);
  console.log("\n=== 4) Stuck ASSIGNED with no link/open assignment (informational) ===");
  console.log("Count:", stuckAssigned.rowCount);
  if (stuckAssigned.rowCount) console.table(stuckAssigned.rows);

  await pool.end();
}

main().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
