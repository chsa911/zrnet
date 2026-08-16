#!/usr/bin/env node
// backend/scripts/merge-andalusien-328.js
//
// One-off targeted merge for the "Andalusien." (328 pages, ISBN
// 9783791317649) triple-match found via find-pages-328.js:
//
//   keep   3a040773-41d1-4730-8586-296dcfab2d92  barcode oak404, registered
//          today 17:46 -- ~2h after the draft below, same session
//   delete 3530f7c8-4c14-40ce-ba04-6ffa16ec9e5f  in_stock draft, no barcode,
//          no title, holds today's scanned cover -- this is the id that's
//          404ing at /uploads/covers/normalized/...jpg
//
// NOT touching 55c8ea40-3109-4351-a592-01bc31112791 (barcode oak022,
// registered back in May) -- that's a separate, genuinely earlier copy.
// merge-duplicate-drafts.js would have picked oak022 as the merge target
// (earliest-registered among the >1-day-apart keeps), which is wrong here;
// this script targets oak404 instead, since it's the same-day registration.
//
// Same steps as cleanup-duplicates.js:
//   1. Rename cover files on prod (SSH -> Docker): draft id -> keep id
//   2. Transfer cover_ok row
//   3. Delete draft's book_barcodes + books row
//
// Dry-run (default -- nothing changed):
//   node scripts/merge-andalusien-328.js
// Execute:
//   node scripts/merge-andalusien-328.js --execute

/* eslint-disable no-console */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { Pool } = require("pg");
const { execSync } = require("child_process");

const DRY_RUN = !process.argv.includes("--execute");
const PROD_HOST = process.env.PROD_HOST || "root@46.224.178.235";
const CONTAINER = process.env.PROD_CONTAINER || "zrnet-api-1";
const COVERS = "/uploads/covers";

const KEEP_ID = "3a040773-41d1-4730-8586-296dcfab2d92"; // oak404, today
const DELETE_ID = "3530f7c8-4c14-40ce-ba04-6ffa16ec9e5f"; // draft, no barcode

function dockerMv(src, dst) {
  const cmd = `ssh ${PROD_HOST} "docker exec ${CONTAINER} sh -c 'if [ -f ${src} ]; then mv ${src} ${dst} && echo moved; else echo missing; fi'"`;
  return execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim() === "moved";
}

function dockerExists(path_) {
  const cmd = `ssh ${PROD_HOST} "docker exec ${CONTAINER} sh -c 'if [ -f ${path_} ]; then echo yes; else echo no; fi'"`;
  return execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim() === "yes";
}

function renameCoversOnServer(oldId, newId, dryRun) {
  const files = [
    [`${COVERS}/normalized/${oldId}.jpg`, `${COVERS}/normalized/${newId}.jpg`],
    [`${COVERS}/normalized/${oldId}-home.jpg`, `${COVERS}/normalized/${newId}-home.jpg`],
    [`${COVERS}/${oldId}.jpg`, `${COVERS}/${newId}.jpg`],
  ];
  const results = [];
  for (const [src, dst] of files) {
    const kind = src.includes("home") ? "home" : src.includes("normalized") ? "normalized" : "root";
    try {
      const exists = dockerExists(src);
      if (!exists) {
        results.push(`  ${dryRun ? "[DRY] " : ""}cover/${kind}: not found on server (source ${oldId.slice(0, 8)}… missing here -- check the other candidate path/local upload)`);
        continue;
      }
      if (dockerExists(dst)) {
        results.push(`  ${dryRun ? "[DRY] " : ""}cover/${kind}: target already exists -> skipped`);
        continue;
      }
      if (dryRun) {
        results.push(`  [DRY] cover/${kind}: would rename ${oldId.slice(0, 8)}… -> ${newId.slice(0, 8)}…`);
      } else {
        const moved = dockerMv(src, dst);
        results.push(moved ? `  cover/${kind}: renamed ✓` : `  cover/${kind}: mv failed`);
      }
    } catch (e) {
      results.push(`  cover/${kind}: SSH error - ${e.message}`);
    }
  }
  return results;
}

async function main() {
  console.log(`\n=== merge-andalusien-328.js  [${DRY_RUN ? "DRY RUN - no changes" : "EXECUTE - changes will be made"}] ===\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query(
    `SELECT id::text, reading_status FROM public.books WHERE id = ANY($1::uuid[])`,
    [[KEEP_ID, DELETE_ID]]
  );
  const keepRow = rows.find((r) => r.id === KEEP_ID);
  const deleteRow = rows.find((r) => r.id === DELETE_ID);

  if (!keepRow) {
    console.log(`Keep row ${KEEP_ID} not found -- aborting.`);
    await pool.end();
    return;
  }
  if (!deleteRow) {
    console.log(`Draft row ${DELETE_ID} not found (already deleted?) -- aborting.`);
    await pool.end();
    return;
  }
  if (deleteRow.reading_status !== "in_stock") {
    console.log(`Draft row status is "${deleteRow.reading_status}", not in_stock -- aborting (safety check).`);
    await pool.end();
    return;
  }

  console.log(`keep:   ${KEEP_ID}  (${keepRow.reading_status})`);
  console.log(`delete: ${DELETE_ID}  (${deleteRow.reading_status})\n`);

  renameCoversOnServer(DELETE_ID, KEEP_ID, DRY_RUN).forEach((l) => console.log(l));

  if (DRY_RUN) {
    console.log(`\n[DRY] cover_ok: would check and transfer if present`);
    console.log(`[DRY] DB-delete: would delete book_barcodes + books for ${DELETE_ID}`);
    await pool.end();
    console.log(`\nDry-run done. Run with --execute to apply.`);
    return;
  }

  try {
    const { rows: okRows } = await pool.query(
      `SELECT
         EXISTS(SELECT 1 FROM cover_ok WHERE id = $1::uuid) AS old_ok,
         EXISTS(SELECT 1 FROM cover_ok WHERE id = $2::uuid) AS new_ok`,
      [DELETE_ID, KEEP_ID]
    );
    const { old_ok, new_ok } = okRows[0];
    if (old_ok && !new_ok) {
      await pool.query(`INSERT INTO cover_ok (id) VALUES ($1::uuid) ON CONFLICT DO NOTHING`, [KEEP_ID]);
      console.log(`cover_ok: transferred ✓`);
    } else {
      console.log(`cover_ok: ${old_ok ? "keep already has an entry" : "no entry on draft"} -> skipped`);
    }
  } catch (e) {
    console.error(`cover_ok error: ${e.message}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bb = await client.query(`DELETE FROM public.book_barcodes WHERE book_id = $1::uuid`, [DELETE_ID]);
    const bk = await client.query(
      `DELETE FROM public.books WHERE id = $1::uuid AND reading_status = 'in_stock'`,
      [DELETE_ID]
    );
    if (bk.rowCount === 0) {
      await client.query("ROLLBACK");
      console.log(`Delete: row not found or status changed -> ROLLBACK`);
    } else {
      await client.query("COMMIT");
      console.log(`DB-delete: ${bb.rowCount} barcode row(s) + 1 book deleted ✓`);
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(`Delete error: ${e.message}`);
  } finally {
    client.release();
  }

  await pool.end();
  console.log(`\nDone.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
