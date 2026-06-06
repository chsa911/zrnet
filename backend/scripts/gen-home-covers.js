#!/usr/bin/env node
/**
 * Generates missing -home.jpg thumbnails (400x600) from existing normalized covers.
 * Run once on the server:  node backend/scripts/gen-home-covers.js
 */

const fs   = require("fs");
const path = require("path");
const sharp = require("sharp");

const DIR = path.join(__dirname, "../../uploads/covers/normalized");

if (!fs.existsSync(DIR)) {
  console.error("Directory not found:", DIR);
  process.exit(1);
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith(".jpg") && !f.endsWith("-home.jpg"));
console.log(`Found ${files.length} full-size covers to process`);

let created = 0, skipped = 0, errors = 0;

(async () => {
  for (const file of files) {
    const id      = path.basename(file, ".jpg");
    const src     = path.join(DIR, file);
    const dest    = path.join(DIR, `${id}-home.jpg`);

    if (fs.existsSync(dest)) { skipped++; continue; }

    try {
      await sharp(src)
        .resize(400, 600, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 80, progressive: true })
        .toFile(dest);
      created++;
      console.log(`  ✓ ${id}-home.jpg`);
    } catch (err) {
      errors++;
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  console.log(`\nDone — created: ${created}, skipped: ${skipped}, errors: ${errors}`);
})();
