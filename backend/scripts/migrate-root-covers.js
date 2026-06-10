#!/usr/bin/env node
/**
 * Normalizes existing root covers (covers/{id}.jpg) that are missing from
 * covers/normalized/{id}.jpg. Run once on the production server:
 *
 *   node backend/scripts/migrate-root-covers.js
 *   node backend/scripts/migrate-root-covers.js --execute   (actually write files)
 */

const fs   = require("fs");
const path = require("path");
const sharp = require("sharp");

const DRY_RUN = !process.argv.includes("--execute");

const UPLOAD_ROOT    = process.env.UPLOAD_ROOT || path.resolve(__dirname, "../../uploads");
const ROOT_DIR       = path.join(UPLOAD_ROOT, "covers");
const NORMALIZED_DIR = path.join(UPLOAD_ROOT, "covers", "normalized");

if (!fs.existsSync(ROOT_DIR)) {
  console.error("covers/ directory not found:", ROOT_DIR);
  process.exit(1);
}

fs.mkdirSync(NORMALIZED_DIR, { recursive: true });

// Root covers: covers/{uuid}.jpg  (exclude -raw and -home variants)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/i;

const rootFiles = fs.readdirSync(ROOT_DIR)
  .filter(f => UUID_RE.test(f));

console.log(`\n=== migrate-root-covers  [${DRY_RUN ? "DRY RUN" : "EXECUTE"}] ===`);
console.log(`Root covers found: ${rootFiles.length}`);

let created = 0, skipped = 0, errors = 0;

(async () => {
  for (const file of rootFiles) {
    const id     = path.basename(file, ".jpg");
    const src    = path.join(ROOT_DIR, file);
    const full   = path.join(NORMALIZED_DIR, `${id}.jpg`);
    const home   = path.join(NORMALIZED_DIR, `${id}-home.jpg`);

    if (fs.existsSync(full)) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] would normalize ${id}`);
      created++;
      continue;
    }

    try {
      const buf = fs.readFileSync(src);

      await sharp(buf)
        .rotate()
        .resize(800, 1200, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 90, progressive: true })
        .toFile(full);

      if (!fs.existsSync(home)) {
        await sharp(buf)
          .rotate()
          .resize(400, 600, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 80, progressive: true })
          .toFile(home);
      }

      console.log(`  ✓ ${id}`);
      created++;
    } catch (err) {
      console.error(`  ✗ ${id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n────────────────────────────────────`);
  console.log(`Skipped (already normalized): ${skipped}`);
  console.log(`${DRY_RUN ? "Would create" : "Created"}:  ${created}`);
  if (errors) console.log(`Errors: ${errors}`);
  if (DRY_RUN) console.log(`\nZum Ausführen: node scripts/migrate-root-covers.js --execute`);
})();
