#!/usr/bin/env node
// backend/scripts/check-covers.js
//
// Local check:       node scripts/check-covers.js
// Production check:  node scripts/check-covers.js --production
// Compare local vs production (find what's missing on server):
//                    node scripts/check-covers.js --compare

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const isProd = process.argv.includes("--production");
const isCompare = process.argv.includes("--compare");
const PROD_HOST = process.env.PROD_HOST || "root@46.224.178.235";
const PROD_COVERS_ROOT = "/srv/zrnet/uploads/covers";

const UPLOAD_ROOT   = process.env.UPLOAD_ROOT   || path.resolve(__dirname, "../../uploads");
const BACKUP_ROOT   = process.env.BACKUP_ROOT   || path.join(process.env.HOME || "", "p_backup");
const LOCAL_ROOT    = isCompare ? BACKUP_ROOT : UPLOAD_ROOT;
const COVERS_DIR      = path.join(LOCAL_ROOT, "covers");
const COVERS_NORM_DIR = path.join(LOCAL_ROOT, "covers", "normalized");

function fetchRemoteFileSet() {
  // Returns { normalized: Set<id>, root: Set<id> }
  try {
    const out = execSync(
      `ssh ${PROD_HOST} "ls ${PROD_COVERS_ROOT}/normalized/*.jpg 2>/dev/null; ls ${PROD_COVERS_ROOT}/*.jpg 2>/dev/null" `,
      { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }
    ).toString();

    const normalized = new Set();
    const root = new Set();

    for (const line of out.split("\n")) {
      const l = line.trim();
      if (!l) continue;
      const base = path.basename(l, ".jpg");
      if (l.includes("/normalized/")) normalized.add(base);
      else root.add(base);
    }
    return { normalized, root };
  } catch (e) {
    console.error("SSH failed:", e.message);
    process.exit(1);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractUuid(filename) {
  // Handles: uuid.jpg, uuid-2026-03-26T08-33Z.jpg, uuid-home.jpg, uuid_cropped.jpg
  const base = path.basename(filename, ".jpg");
  const match = base.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : null;
}

async function compareLocalVsProduction() {
  // Get local IDs (deduplicated UUIDs)
  const localRoot = new Set(
    fs.existsSync(COVERS_DIR)
      ? fs.readdirSync(COVERS_DIR)
          .map(f => extractUuid(f))
          .filter(Boolean)
      : []
  );
  const localNorm = new Set(
    fs.existsSync(COVERS_NORM_DIR)
      ? fs.readdirSync(COVERS_NORM_DIR)
          .map(f => extractUuid(f))
          .filter(Boolean)
      : []
  );
  const localAll = new Set([...localRoot, ...localNorm]);

  // Get production IDs
  console.log(`Fetching production file list via SSH…`);
  const remote = fetchRemoteFileSet();
  const remoteAll = new Set([...remote.normalized, ...remote.root]);

  // Compare
  const localOnly = [...localAll].filter(id => !remoteAll.has(id));
  const remoteOnly = [...remoteAll].filter(id => !localAll.has(id));
  const both = [...localAll].filter(id => remoteAll.has(id));

  console.log(`\nLocal covers:      ${localAll.size}  (${localRoot.size} root/, ${localNorm.size} normalized/)`);
  console.log(`Production covers: ${remoteAll.size}  (${remote.root.size} root/, ${remote.normalized.size} normalized/)`);
  console.log(`\n✅  On both:        ${both.length}`);
  console.log(`⬆️   Local only:     ${localOnly.length}  ← these are NOT on the server`);
  console.log(`⬇️   Production only: ${remoteOnly.length}  ← server has these, you don't locally`);

  if (localOnly.length > 0) {
    console.log(`\n── Local-only covers (need syncing to server) ──`);
    for (const id of localOnly) console.log(`  ${id}`);

    console.log(`\nTo sync these to production, run:`);
    console.log(`  rsync -av ${COVERS_DIR}/ root@46.224.178.235:${PROD_COVERS_ROOT}/`);
  } else {
    console.log(`\n✅  All local covers are already on the server.`);
  }
  console.log();
}

async function main() {
  if (isCompare) {
    await compareLocalVsProduction();
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query(`
    SELECT id::text, title_display, added_at
    FROM public.books
    WHERE reading_status = 'in_stock'
    ORDER BY added_at DESC NULLS LAST
  `);

  await pool.end();

  if (isProd) {
    console.log(`\nChecking ${rows.length} in_stock books on PRODUCTION server (${PROD_HOST}):`);
    console.log(`  ${PROD_COVERS_ROOT}/normalized/  (staging PWA)`);
    console.log(`  ${PROD_COVERS_ROOT}/  (manually synced)`);
    console.log(`  (checking one by one via SSH — may take a while)\n`);
  } else {
    console.log(`\nChecking ${rows.length} in_stock books for covers in:`);
    console.log(`  ${COVERS_NORM_DIR}  (staging PWA)`);
    console.log(`  ${COVERS_DIR}  (manually synced)\n`);
    console.log(`  Tip: use --production to check the live server instead.\n`);
  }

  const missing = [];
  const found = [];

  let remoteFiles = null;
  if (isProd) remoteFiles = fetchRemoteFileSet();

  for (const row of rows) {
    let location;
    if (isProd) {
      location = remoteFiles.normalized.has(row.id) ? "normalized/"
               : remoteFiles.root.has(row.id)       ? "root/"
               : null;
    } else {
      const inNormalized = fs.existsSync(path.join(COVERS_NORM_DIR, `${row.id}.jpg`));
      const inNormHome   = fs.existsSync(path.join(COVERS_NORM_DIR, `${row.id}-home.jpg`));
      const inRoot = fs.existsSync(path.join(COVERS_DIR, `${row.id}.jpg`)) ||
        (fs.existsSync(COVERS_DIR) && fs.readdirSync(COVERS_DIR).some(f => f.startsWith(row.id) && f.endsWith(".jpg")));
      location = inNormalized ? (inNormHome ? "normalized/+home" : "normalized/") : inRoot ? "root/" : null;
    }

    if (location) {
      found.push({ ...row, location });
    } else {
      missing.push(row);
    }
  }

  const normCount = found.filter((r) => r.location === "normalized/").length;
  const rootCount = found.filter((r) => r.location === "root/").length;

  if (missing.length === 0) {
    console.log(`✅  All ${found.length} in_stock books have a cover.`);
    console.log(`   ${normCount} in normalized/,  ${rootCount} in root/\n`);
  } else {
    console.log(`✅  ${found.length} books have a cover  (${normCount} normalized/, ${rootCount} root/)`);
    console.log(`❌  ${missing.length} books are MISSING a cover:\n`);
    for (const row of missing) {
      const date = row.added_at ? new Date(row.added_at).toLocaleDateString("de-DE") : "—";
      console.log(`  ${row.id}  ${date}  ${row.title_display || "(kein Titel)"}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
