// backend/scripts/fixBarcodeInventoryStatus.js
//
// Brings barcode_inventory.status in line with reality, using the same rule
// as the app (utils/barcodeHolders.js): a code is taken while at least one
// in_progress book carries it.
//
//   npm run fix:barcode-status                -> DRY RUN, shows both lists, changes nothing
//   npm run fix:barcode-status -- --apply     -> AVAILABLE but taken  => ASSIGNED   (safe direction)
//   npm run fix:barcode-status -- --apply --free
//                                             -> additionally ASSIGNED but nobody holds it => AVAILABLE
//
// Everything runs in one transaction.

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { Pool } = require("pg");
const { heldByActiveBookSql } = require("../utils/barcodeHolders");

const APPLY = process.argv.includes("--apply");
const FREE = process.argv.includes("--free");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const HOLDERS = `(
  SELECT string_agg(DISTINCT left(coalesce(b.title_display,'?'),35) || ' (' || b.id::text || ')', ' | ')
  FROM public.books b
  WHERE b.reading_status = 'in_progress'
    AND b.id IN (
      SELECT book_id FROM public.book_barcodes WHERE lower(barcode) = lower(bi.barcode)
      UNION
      SELECT book_id FROM public.barcode_assignments WHERE lower(barcode) = lower(bi.barcode) AND freed_at IS NULL)
)`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const wrongFree = await client.query(`
      SELECT bi.barcode, bi.status, ${HOLDERS} AS held_by
      FROM public.barcode_inventory bi
      WHERE bi.status = 'AVAILABLE' AND ${heldByActiveBookSql("bi.barcode")}
      ORDER BY bi.barcode
    `);
    console.log(`\n=== AVAILABLE, but still on an in_progress book -> should be ASSIGNED: ${wrongFree.rowCount} ===`);
    if (wrongFree.rowCount) console.table(wrongFree.rows);

    const wrongTaken = await client.query(`
      SELECT bi.barcode, bi.status
      FROM public.barcode_inventory bi
      WHERE bi.status = 'ASSIGNED' AND NOT ${heldByActiveBookSql("bi.barcode")}
      ORDER BY bi.barcode
    `);
    console.log(`\n=== ASSIGNED, but no in_progress book carries it -> could be AVAILABLE: ${wrongTaken.rowCount} ===`);
    if (wrongTaken.rowCount) console.table(wrongTaken.rows);

    if (!APPLY) {
      console.log("\nDRY RUN - nothing changed. Use --apply (and optionally --free).");
      await client.query("ROLLBACK");
      return;
    }

    const u1 = await client.query(`
      UPDATE public.barcode_inventory bi
      SET status = 'ASSIGNED', updated_at = now()
      WHERE bi.status = 'AVAILABLE' AND ${heldByActiveBookSql("bi.barcode")}
    `);
    console.log(`\nSet to ASSIGNED: ${u1.rowCount}`);

    if (FREE) {
      const u2 = await client.query(`
        UPDATE public.barcode_inventory bi
        SET status = 'AVAILABLE', updated_at = now()
        WHERE bi.status = 'ASSIGNED' AND NOT ${heldByActiveBookSql("bi.barcode")}
      `);
      console.log(`Set to AVAILABLE: ${u2.rowCount}`);
    }

    await client.query("COMMIT");
    console.log("Committed.");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error("ERROR", e); process.exit(1); });
