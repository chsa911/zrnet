#!/usr/bin/env node
// backend/scripts/cleanup-duplicates.js
//
// Überträgt Cover-Bilder vom alten in_stock-Duplikat auf den in_progress-Eintrag
// und löscht danach den in_stock-Duplikat-Eintrag aus der Datenbank.
//
// Dry-run (Standard — nichts wird verändert):
//   node scripts/cleanup-duplicates.js
//
// Tatsächlich ausführen:
//   node scripts/cleanup-duplicates.js --execute

/* eslint-disable no-console */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { Pool } = require("pg");
const fs       = require("fs");
const path     = require("path");

const DRY_RUN    = !process.argv.includes("--execute");
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.resolve(__dirname, "../../uploads");
const COVERS_DIR  = path.join(UPLOAD_ROOT, "covers");
const NORM_DIR    = path.join(COVERS_DIR, "normalized");

// Duplikat-Paare: [ titel, in_progress_id (behalten), in_stock_id (löschen) ]
const PAIRS = [
  ["Ach, wär ich nur zu Hause geblieben",   "be498ef3-3af8-4cee-b2fc-8ff0b6e40d2a", "de920e2d-e263-4154-9348-44f08f09a233"],
  ["Als die Götter zahlreich waren",         "5237ef84-764a-449e-92c1-713ab08a902a", "2c5af5ea-f439-4f15-a25d-aab462ea1fdf"],
  ["BEVERLY HILLS/FRUEHLINGSSTUERME",        "9283f679-4c7a-4611-bb4d-6397ed7d6ac6", "3357d3e8-ea1c-445d-a40f-24a45065ec83"],
  ["Bücher machen",                          "a1fdaecd-a530-4795-857b-10f277a95715", "9862c735-e0d0-4257-816c-0e070a8bf92e"],
  ["Costanza",                               "8bcde6b2-7ccb-4ee8-8b53-3a3ca1f24c13", "66f0899a-ceb7-4085-b2bf-c09ef798db21"],
  ["Das Feuer von Assisi",                   "36cad318-f5cb-402d-826d-27224f70ad4f", "22f50b48-4646-4119-8b14-f4d6e5e932cb"],
  ["Das Geheimnis glücklicher Kinder.",      "37c64e68-fdb8-4e2b-a71f-db699a2361ef", "5273b19a-8f4b-4bdc-961a-130153e935af"],
  ["Der Greif",                              "2bc7a6ea-15ce-496c-904e-cc92efbdd3f3", "27aa4064-1538-464b-aa40-8084954d40ce"],
  ["Der Puppenkönig",                        "d4f2e12d-305b-48ed-ba6d-eb4277740444", "8951881c-6eba-41e9-80de-b51cd5d4b07f"],
  ["Der Würfler",                            "3b5bf104-7125-4b80-b0e1-867b3443dea9", "5b566eb6-ce3c-48bf-b4e2-f5572b81fb80"],
  ["Der betrogene Patient",                  "dc1f29ff-46af-49b7-8725-614f153f58b1", "a86b0a05-89b3-4af2-87a7-1bb57ba6b899"],
  ["Die Sonne brennt auf Curradarra",        "b8ccc1e9-ff9c-4c13-a6f2-30f9089d6ea3", "52f86731-8283-44f2-873e-cc6cbcb8d416"],
  ["Die Spur der Helden",                    "e55996f0-d7b5-48d4-a142-3bd7d74d0369", "367d8ff3-01ff-444c-8945-22058a3e2430"],
  ["Die Weisheit alter Hunde",               "fad6b95e-7b83-4786-8c8a-4bc0c0f3030f", "e5779a9a-c1e1-4f98-9aec-23e34e5560fc"],
  ["Dschungel-Gold",                         "a87c2f63-086d-40e3-b1de-ee2777358f4e", "35e553b9-c2cb-4268-9910-51474224fa07"],
  ["Empörung reicht nicht!",                 "16281bea-a240-4c7f-8984-f7c6550e62a8", "2448d97b-33ba-44e0-8fff-aa55116b67ae"],
  ["Es zählt nur die Liebe",                 "8730ed68-a089-49f9-a809-bedf14ed2fac", "356bbf12-9de5-457c-b80d-3b485592166d"],
  ["Fremdflirten",                           "6942ffcf-8d25-426e-a3b5-d54f4be799f4", "ce80e213-4f28-4a6f-8e67-9173d87e7968"],
  ["Gefangen im Eis. Allein auf arktischem Kurs", "9821e927-a8c8-461c-99dc-f5b8946f17d5", "a737eff7-3bac-4ee0-9142-4b0a546b1928"],
  ["Gottes Erste Diener",                    "3bd17290-d4f2-4916-a0fb-7c59beab231c", "17504f3b-4225-4c58-b5f7-42a6f5284c5a"],
  ["Götter und Helden",                      "6dbf156e-f5c8-418c-939a-6645694bce0c", "87ca18c7-c35a-441a-9168-b82b04f302d4"],
  ["Ich bin's, von Sinnen!",                 "334c9283-f9e9-44e4-b200-408ec470131e", "cb69e30b-d8eb-4811-a7c8-c3ce34b76bfb"],
  ["Ich fand Tut-ench-Amun",                 "fc98d780-02f5-4fa9-87e3-19ea8777eead", "5318501c-400a-4c1e-ba50-74cab55754ed"],
  ["Im Namen der toten Prinzessin",          "8f7d0b1f-ef5f-4d7e-89a4-e98902e022d8", "a56079d4-7c91-44f1-9308-91927f611cb6"],
  ["Im Reich des Goldenen Drachen",          "4ece3697-a159-44b6-b5c9-0785b72a47d2", "b0f2f23a-3b88-4ca0-b07a-3f788e477fd5"],
  ["Insel der Seefahrer",                    "1c20a8f0-17f1-48ad-982c-82439320bb73", "ff3e1032-f68b-4d65-97a4-659b6f1e60a7"],
  ["Insomnia - Schlaflos.",                  "edf2e75a-a459-4544-9e59-e7675c9f2be0", "3512d7a3-b11b-428d-895d-942b20eade4b"],
  ["Lebe mit Herz und Seele",                "3469c211-9e19-4113-9143-2cfff7884451", "ce650471-02cc-43ce-a684-0337abdb5a08"],
  ["Oya",                                    "f0c42c84-2eff-47b8-b334-be622074cdd0", "78e98536-548a-435b-90da-3b7b31b0660f"],
  ["Reparatur Basics",                       "5a391c24-7f33-4108-bac1-9a73677f5545", "34dca3f2-699c-4653-9e00-02a69f4d87b1"],
  ["Riskantes Spiel",                        "eb934b41-f102-4477-8fec-6cbb8c7850de", "265dcadb-20fa-4a74-80ca-a8b1e715ae1e"],
  ["Seelisch gesund werden mit Homöopathie.", "3c765009-2c83-4b39-8428-2e9ba1a42dc7", "26897423-8ddf-452c-993d-b9c4dd2fd39a"],
  ["Taekwondo perfekt I.",                   "624070bc-c3f5-47a1-8683-ac1e8eade6e3", "ab3448ec-765c-4cb4-953d-8674fde9c843"],
  ["Tigris",                                 "df6e922a-e8ed-45ac-9386-ba05ee5352b1", "416e9aac-56ce-4d9f-959d-630381c6db0e"],
  ["Tochter der Täuschung.",                 "d79c75e9-7dd8-45d7-a116-0e4ed1776d11", "37e5f1f9-6587-4359-8327-68a1036ebaca"],
  ["Trimalchios Fest",                       "7923f58f-47db-40ed-b6df-43ee6dcef1a7", "7e7c0d57-d2be-4c0a-ad7a-2eb3e886485a"],
  ["Verbotene Fruchte",                      "77e229bd-3a9e-4941-86d6-00c2efb53f6e", "19ee3151-c534-4cc2-989c-a5bd5484b24e"],
  ["Vertauschtes Glück",                     "9aa5f070-e104-4632-9414-ea81e7f4172d", "523f5df7-1770-4f05-a0b2-f1be0fe312a2"],
  ["Woodys Welten",                          "dd629994-0ae0-4a81-8198-b323896e83e3", "1089b81d-0134-4dc2-bc54-49112c85b6b1"],
  // Konfidenz "mittel" — kein ISBN-Match, nur Titel+Seiten
  ["Henry and June",                         "80818699-7d30-4c2a-9d39-d49fd1d1a477", "387324e7-f742-4860-8eb3-9b9bbfde3b71"],
  // Konfidenz "niedrig" — ISBN weicht ab, manuell prüfen; auskommentiert lassen bis bestätigt
  // ["Katzenwinter",                        "a2931293-5299-41ab-aa11-639e0de25f91", "56394564-3353-4c86-9662-4379437e02d1"],
];

// ────────────────────────────────────────────
// Cover-Hilfsfunktionen
// ────────────────────────────────────────────

function coverPaths(id) {
  return {
    norm: path.join(NORM_DIR, `${id}.jpg`),
    root: path.join(COVERS_DIR, `${id}.jpg`),
  };
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

/**
 * Überträgt Cover-Dateien von oldId → newId, falls:
 *   - oldId hat eine Cover-Datei
 *   - newId hat noch KEINE Cover-Datei derselben Art
 * Gibt Aktionsbeschreibung zurück.
 */
function transferCovers(oldId, newId, dryRun) {
  const old_ = coverPaths(oldId);
  const new_ = coverPaths(newId);
  const actions = [];

  for (const [kind, oldPath, newPath] of [
    ["normalized", old_.norm, new_.norm],
    ["root",       old_.root, new_.root],
  ]) {
    if (!fileExists(oldPath)) continue;

    if (fileExists(newPath)) {
      actions.push(`  cover/${kind}: in_progress hat bereits ein Cover → übersprungen`);
      continue;
    }

    if (dryRun) {
      actions.push(`  [DRY] cover/${kind}: würde kopieren ${path.basename(oldPath)} → ${path.basename(newPath)}`);
    } else {
      fs.mkdirSync(path.dirname(newPath), { recursive: true });
      fs.copyFileSync(oldPath, newPath);
      actions.push(`  cover/${kind}: kopiert ✓`);
    }
  }

  return actions;
}

// ────────────────────────────────────────────
// Haupt-Logik
// ────────────────────────────────────────────

async function main() {
  console.log(`\n=== cleanup-duplicates.js  [${DRY_RUN ? "DRY RUN – keine Änderungen" : "⚠️  EXECUTE – Datenbank wird verändert"}] ===\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  let ok = 0, skipped = 0, failed = 0;

  for (const [titel, keepId, deleteId] of PAIRS) {
    console.log(`▶ "${titel}"`);
    console.log(`  behalten:  ${keepId}`);
    console.log(`  löschen:   ${deleteId}`);

    // 1. Cover-Dateien übertragen
    const coverActions = transferCovers(deleteId, keepId, DRY_RUN);
    if (coverActions.length) {
      coverActions.forEach(a => console.log(a));
    } else {
      console.log("  cover: keine Cover-Datei für alten Eintrag vorhanden");
    }

    // 2. cover_ok übertragen (falls alter Eintrag drin ist und neuer noch nicht)
    if (DRY_RUN) {
      console.log("  [DRY] cover_ok: würde prüfen und ggf. übertragen");
    } else {
      try {
        const { rows } = await pool.query(
          `SELECT
             EXISTS(SELECT 1 FROM cover_ok WHERE id = $1::uuid) AS old_ok,
             EXISTS(SELECT 1 FROM cover_ok WHERE id = $2::uuid) AS new_ok`,
          [deleteId, keepId]
        );
        const { old_ok, new_ok } = rows[0];
        if (old_ok && !new_ok) {
          await pool.query(`INSERT INTO cover_ok (id) VALUES ($1::uuid) ON CONFLICT DO NOTHING`, [keepId]);
          console.log("  cover_ok: übertragen ✓");
        } else if (old_ok && new_ok) {
          console.log("  cover_ok: neuer Eintrag bereits vorhanden → übersprungen");
        } else {
          console.log("  cover_ok: alter Eintrag nicht vorhanden → nichts zu übertragen");
        }
      } catch (e) {
        console.error("  cover_ok-Fehler:", e.message);
      }
    }

    // 3. DB-Eintrag löschen (in Transaktion)
    if (DRY_RUN) {
      console.log("  [DRY] DB: würde book_barcodes + books löschen");
      ok++;
    } else {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const bb = await client.query(
          `DELETE FROM public.book_barcodes WHERE book_id = $1::uuid`,
          [deleteId]
        );
        const bk = await client.query(
          `DELETE FROM public.books WHERE id = $1::uuid AND reading_status = 'in_stock'`,
          [deleteId]
        );
        if (bk.rowCount === 0) {
          await client.query("ROLLBACK");
          console.log("  ⚠️  Buch nicht gefunden oder kein in_stock-Status mehr → übersprungen");
          skipped++;
        } else {
          await client.query("COMMIT");
          console.log(`  DB: ${bb.rowCount} barcode(s) + 1 book gelöscht ✓`);
          ok++;
        }
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(`  ❌ DB-Fehler: ${e.message}`);
        failed++;
      } finally {
        client.release();
      }
    }

    console.log();
  }

  await pool.end();

  console.log("────────────────────────────────────────");
  if (DRY_RUN) {
    console.log(`Dry-run abgeschlossen. ${PAIRS.length} Einträge geprüft.`);
    console.log("Zum tatsächlichen Ausführen: node scripts/cleanup-duplicates.js --execute");
  } else {
    console.log(`Fertig: ${ok} gelöscht, ${skipped} übersprungen, ${failed} Fehler`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
