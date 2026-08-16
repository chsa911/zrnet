#!/usr/bin/env node
// backend/scripts/find-pages-328.js
//
// All rows with pages = 328, plus whether each currently has a barcode
// (no barcode -> likely the stale in_stock draft) and whether its id
// (= cover filename) matches the 404-ing cover.
//
// Usage: node scripts/find-pages-328.js

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { Pool } = require("pg");

const COVER_404_ID = "3530f7c8-4c14-40ce-ba04-6ffa16ec9e5f";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query(
    `SELECT
       b.id,
       b.title_display,
       b.author_display,
       b.isbn13,
       b.isbn10,
       b.pages,
       b.reading_status,
       b.added_at,
       b.registered_at,
       bb.barcode AS current_barcode
     FROM public.books b
     LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
     WHERE b.pages = 328
     ORDER BY b.added_at DESC NULLS LAST`
  );

  await pool.end();

  if (!rows.length) {
    console.log("No rows with pages = 328 found.");
    return;
  }

  console.log(`${rows.length} row(s) with pages = 328:\n`);
  for (const r of rows) {
    console.log(`"${r.title_display || "(kein Titel)"}" -- ${r.author_display || "?"}`);
    console.log(`  id:              ${r.id}${r.id === COVER_404_ID ? "   <-- this is the 404'ing cover id" : ""}`);
    console.log(`  reading_status:  ${r.reading_status}`);
    console.log(`  barcode:         ${r.current_barcode || "(none)"}`);
    console.log(`  isbn13/isbn10:   ${r.isbn13 || "-"} / ${r.isbn10 || "-"}`);
    console.log(`  added_at:        ${r.added_at || "-"}`);
    console.log(`  registered_at:   ${r.registered_at || "-"}`);
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
