#!/usr/bin/env node
// backend/scripts/cleanup-duplicates.js
//
// Für jedes Duplikat-Paar:
//   1. Benennt Cover-Dateien auf dem Produktionsserver um (SSH → Docker)
//      covers/normalized/{oldId}.jpg      → {newId}.jpg
//      covers/normalized/{oldId}-home.jpg → {newId}-home.jpg  (falls vorhanden)
//      covers/{oldId}.jpg                 → {newId}.jpg        (falls vorhanden)
//      covers/raw/ bleibt unberührt
//   2. Überträgt cover_ok-Eintrag in der DB
//   3. Löscht den alten in_stock-Eintrag aus der DB
//
// Dry-run (Standard – nichts wird verändert):
//   node scripts/cleanup-duplicates.js
//
// Tatsächlich ausführen:
//   node scripts/cleanup-duplicates.js --execute

/* eslint-disable no-console */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { Pool }      = require("pg");
const { execSync }  = require("child_process");

const DRY_RUN    = !process.argv.includes("--execute");
const PROD_HOST  = process.env.PROD_HOST  || "root@46.224.178.235";
const CONTAINER  = process.env.PROD_CONTAINER || "zrnet-api-1";
const COVERS     = "/uploads/covers";

// Duplikat-Paare: [ titel, in_progress_id (behalten, hat Barcode), in_stock_id (löschen, hat Cover) ]
const PAIRS = [
  ["Ach, wär ich nur zu Hause geblieben",        "be498ef3-3af8-4cee-b2fc-8ff0b6e40d2a", "de920e2d-e263-4154-9348-44f08f09a233"],
  ["Als die Götter zahlreich waren",              "5237ef84-764a-449e-92c1-713ab08a902a", "2c5af5ea-f439-4f15-a25d-aab462ea1fdf"],
  ["BEVERLY HILLS/FRUEHLINGSSTUERME",             "9283f679-4c7a-4611-bb4d-6397ed7d6ac6", "3357d3e8-ea1c-445d-a40f-24a45065ec83"],
  ["Bücher machen",                               "a1fdaecd-a530-4795-857b-10f277a95715", "9862c735-e0d0-4257-816c-0e070a8bf92e"],
  ["Costanza",                                    "8bcde6b2-7ccb-4ee8-8b53-3a3ca1f24c13", "66f0899a-ceb7-4085-b2bf-c09ef798db21"],
  ["Das Feuer von Assisi",                        "36cad318-f5cb-402d-826d-27224f70ad4f", "22f50b48-4646-4119-8b14-f4d6e5e932cb"],
  ["Das Geheimnis glücklicher Kinder.",           "37c64e68-fdb8-4e2b-a71f-db699a2361ef", "5273b19a-8f4b-4bdc-961a-130153e935af"],
  ["Der Greif",                                   "2bc7a6ea-15ce-496c-904e-cc92efbdd3f3", "27aa4064-1538-464b-aa40-8084954d40ce"],
  ["Der Puppenkönig",                             "d4f2e12d-305b-48ed-ba6d-eb4277740444", "8951881c-6eba-41e9-80de-b51cd5d4b07f"],
  ["Der Würfler",                                 "3b5bf104-7125-4b80-b0e1-867b3443dea9", "5b566eb6-ce3c-48bf-b4e2-f5572b81fb80"],
  ["Der betrogene Patient",                       "dc1f29ff-46af-49b7-8725-614f153f58b1", "a86b0a05-89b3-4af2-87a7-1bb57ba6b899"],
  ["Die Sonne brennt auf Curradarra",             "b8ccc1e9-ff9c-4c13-a6f2-30f9089d6ea3", "52f86731-8283-44f2-873e-cc6cbcb8d416"],
  ["Die Spur der Helden",                         "e55996f0-d7b5-48d4-a142-3bd7d74d0369", "367d8ff3-01ff-444c-8945-22058a3e2430"],
  ["Die Weisheit alter Hunde",                    "fad6b95e-7b83-4786-8c8a-4bc0c0f3030f", "e5779a9a-c1e1-4f98-9aec-23e34e5560fc"],
  ["Dschungel-Gold",                              "a87c2f63-086d-40e3-b1de-ee2777358f4e", "35e553b9-c2cb-4268-9910-51474224fa07"],
  ["Empörung reicht nicht!",                      "16281bea-a240-4c7f-8984-f7c6550e62a8", "2448d97b-33ba-44e0-8fff-aa55116b67ae"],
  ["Es zählt nur die Liebe",                      "8730ed68-a089-49f9-a809-bedf14ed2fac", "356bbf12-9de5-457c-b80d-3b485592166d"],
  ["Fremdflirten",                                "6942ffcf-8d25-426e-a3b5-d54f4be799f4", "ce80e213-4f28-4a6f-8e67-9173d87e7968"],
  ["Gefangen im Eis. Allein auf arktischem Kurs", "9821e927-a8c8-461c-99dc-f5b8946f17d5", "a737eff7-3bac-4ee0-9142-4b0a546b1928"],
  ["Gottes Erste Diener",                         "3bd17290-d4f2-4916-a0fb-7c59beab231c", "17504f3b-4225-4c58-b5f7-42a6f5284c5a"],
  ["Götter und Helden",                           "6dbf156e-f5c8-418c-939a-6645694bce0c", "87ca18c7-c35a-441a-9168-b82b04f302d4"],
  ["Ich bin's, von Sinnen!",                      "334c9283-f9e9-44e4-b200-408ec470131e", "cb69e30b-d8eb-4811-a7c8-c3ce34b76bfb"],
  ["Ich fand Tut-ench-Amun",                      "fc98d780-02f5-4fa9-87e3-19ea8777eead", "5318501c-400a-4c1e-ba50-74cab55754ed"],
  ["Im Namen der toten Prinzessin",               "8f7d0b1f-ef5f-4d7e-89a4-e98902e022d8", "a56079d4-7c91-44f1-9308-91927f611cb6"],
  ["Im Reich des Goldenen Drachen",               "4ece3697-a159-44b6-b5c9-0785b72a47d2", "b0f2f23a-3b88-4ca0-b07a-3f788e477fd5"],
  ["Insel der Seefahrer",                         "1c20a8f0-17f1-48ad-982c-82439320bb73", "ff3e1032-f68b-4d65-97a4-659b6f1e60a7"],
  ["Insomnia - Schlaflos.",                       "edf2e75a-a459-4544-9e59-e7675c9f2be0", "3512d7a3-b11b-428d-895d-942b20eade4b"],
  ["Lebe mit Herz und Seele",                     "3469c211-9e19-4113-9143-2cfff7884451", "ce650471-02cc-43ce-a684-0337abdb5a08"],
  ["Oya",                                         "f0c42c84-2eff-47b8-b334-be622074cdd0", "78e98536-548a-435b-90da-3b7b31b0660f"],
  ["Reparatur Basics",                            "5a391c24-7f33-4108-bac1-9a73677f5545", "34dca3f2-699c-4653-9e00-02a69f4d87b1"],
  ["Riskantes Spiel",                             "eb934b41-f102-4477-8fec-6cbb8c7850de", "265dcadb-20fa-4a74-80ca-a8b1e715ae1e"],
  ["Seelisch gesund werden mit Homöopathie.",     "3c765009-2c83-4b39-8428-2e9ba1a42dc7", "26897423-8ddf-452c-993d-b9c4dd2fd39a"],
  ["Taekwondo perfekt I.",                        "624070bc-c3f5-47a1-8683-ac1e8eade6e3", "ab3448ec-765c-4cb4-953d-8674fde9c843"],
  ["Tigris",                                      "df6e922a-e8ed-45ac-9386-ba05ee5352b1", "416e9aac-56ce-4d9f-959d-630381c6db0e"],
  ["Tochter der Täuschung.",                      "d79c75e9-7dd8-45d7-a116-0e4ed1776d11", "37e5f1f9-6587-4359-8327-68a1036ebaca"],
  ["Trimalchios Fest",                            "7923f58f-47db-40ed-b6df-43ee6dcef1a7", "7e7c0d57-d2be-4c0a-ad7a-2eb3e886485a"],
  ["Verbotene Fruchte",                           "77e229bd-3a9e-4941-86d6-00c2efb53f6e", "19ee3151-c534-4cc2-989c-a5bd5484b24e"],
  ["Vertauschtes Glück",                          "9aa5f070-e104-4632-9414-ea81e7f4172d", "523f5df7-1770-4f05-a0b2-f1be0fe312a2"],
  ["Woodys Welten",                               "dd629994-0ae0-4a81-8198-b323896e83e3", "1089b81d-0134-4dc2-bc54-49112c85b6b1"],
  ["Henry and June",                              "80818699-7d30-4c2a-9d39-d49fd1d1a477", "387324e7-f742-4860-8eb3-9b9bbfde3b71"],
  // Konfidenz "niedrig" — ISBN weicht ab; auskommentiert bis manuell bestätigt
  // ["Katzenwinter",                             "a2931293-5299-41ab-aa11-639e0de25f91", "56394564-3353-4c86-9662-4379437e02d1"],
];

// ─────────────────────────────────────────────────────
// Cover-Umbenennung via SSH → Docker
// ─────────────────────────────────────────────────────

function dockerMv(src, dst) {
  // Gibt true zurück wenn Datei existierte und umbenannt wurde, false wenn nicht vorhanden
  const cmd = `ssh ${PROD_HOST} "docker exec ${CONTAINER} sh -c 'if [ -f ${src} ]; then mv ${src} ${dst} && echo moved; else echo missing; fi'"`;
  const out = execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
  return out === "moved";
}

function dockerExists(path_) {
  const cmd = `ssh ${PROD_HOST} "docker exec ${CONTAINER} sh -c 'if [ -f ${path_} ]; then echo yes; else echo no; fi'"`;
  return execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim() === "yes";
}

function renameCoversOnServer(oldId, newId, dryRun) {
  const files = [
    [`${COVERS}/normalized/${oldId}.jpg`,      `${COVERS}/normalized/${newId}.jpg`],
    [`${COVERS}/normalized/${oldId}-home.jpg`, `${COVERS}/normalized/${newId}-home.jpg`],
    [`${COVERS}/${oldId}.jpg`,                 `${COVERS}/${newId}.jpg`],
  ];

  const results = [];
  for (const [src, dst] of files) {
    const kind = src.includes("home") ? "home" : src.includes("normalized") ? "normalized" : "root";

    if (dryRun) {
      try {
        const exists = dockerExists(src);
        if (!exists) {
          results.push(`  [DRY] cover/${kind}: nicht vorhanden auf Server`);
          continue;
        }
        const dstExists = dockerExists(dst);
        if (dstExists) {
          results.push(`  [DRY] cover/${kind}: Ziel existiert bereits → würde überspringen`);
        } else {
          results.push(`  [DRY] cover/${kind}: würde umbenennen ${oldId.slice(0,8)}… → ${newId.slice(0,8)}…`);
        }
      } catch (e) {
        results.push(`  [DRY] cover/${kind}: SSH-Fehler – ${e.message}`);
      }
    } else {
      try {
        // Ziel darf noch nicht existieren
        if (dockerExists(dst)) {
          results.push(`  cover/${kind}: Ziel existiert bereits → übersprungen`);
          continue;
        }
        const moved = dockerMv(src, dst);
        results.push(moved
          ? `  cover/${kind}: umbenannt ✓`
          : `  cover/${kind}: nicht vorhanden auf Server`);
      } catch (e) {
        results.push(`  cover/${kind}: SSH-Fehler – ${e.message}`);
      }
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────
// Haupt-Logik
// ─────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== cleanup-duplicates.js  [${DRY_RUN ? "DRY RUN – keine Änderungen" : "⚠️  EXECUTE – Änderungen werden durchgeführt"}] ===`);
  console.log(`    Server: ${PROD_HOST}  Container: ${CONTAINER}\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let ok = 0, skipped = 0, failed = 0;

  for (const [titel, keepId, deleteId] of PAIRS) {
    console.log(`▶ "${titel}"`);
    console.log(`  behalten (in_progress/Barcode): ${keepId}`);
    console.log(`  löschen  (in_stock/alt):        ${deleteId}`);

    // ── 1. Beide Einträge aus DB prüfen ─────────────────
    let keepRow, deleteRow;
    try {
      const r = await pool.query(
        `SELECT id, reading_status FROM public.books WHERE id = ANY($1::uuid[])`,
        [[keepId, deleteId]]
      );
      keepRow   = r.rows.find(r => r.id === keepId);
      deleteRow = r.rows.find(r => r.id === deleteId);
    } catch (e) {
      console.error(`  ❌ DB-Lesefehler: ${e.message}`);
      failed++;
      console.log();
      continue;
    }

    if (!keepRow) {
      console.log(`  ⚠️  in_progress-Eintrag nicht gefunden → übersprungen`);
      skipped++;
      console.log();
      continue;
    }
    if (!deleteRow) {
      console.log(`  ⚠️  in_stock-Eintrag nicht gefunden (evtl. schon gelöscht) → übersprungen`);
      skipped++;
      console.log();
      continue;
    }
    if (deleteRow.reading_status !== "in_stock") {
      console.log(`  ⚠️  Alter Eintrag hat Status "${deleteRow.reading_status}" statt in_stock → übersprungen`);
      skipped++;
      console.log();
      continue;
    }

    // ── 2. Cover-Dateien auf Server umbenennen ───────────
    renameCoversOnServer(deleteId, keepId, DRY_RUN).forEach(l => console.log(l));

    // ── 3. cover_ok in DB übertragen ────────────────────
    if (DRY_RUN) {
      console.log(`  [DRY] cover_ok: würde prüfen und ggf. auf neuen Eintrag übertragen`);
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
          await pool.query(
            `INSERT INTO cover_ok (id) VALUES ($1::uuid) ON CONFLICT DO NOTHING`,
            [keepId]
          );
          console.log(`  cover_ok: übertragen ✓`);
        } else {
          console.log(`  cover_ok: ${old_ok ? "neuer hat bereits Eintrag" : "kein Eintrag beim alten"} → übersprungen`);
        }
      } catch (e) {
        console.error(`  cover_ok-Fehler: ${e.message}`);
      }
    }

    // ── 4. Alten in_stock-Eintrag aus DB löschen ────────
    if (DRY_RUN) {
      console.log(`  [DRY] DB-Delete: würde book_barcodes + books für alten Eintrag löschen`);
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
          console.log(`  ⚠️  Delete: Buch nicht gefunden oder Status nicht mehr in_stock → ROLLBACK`);
          skipped++;
        } else {
          await client.query("COMMIT");
          console.log(`  DB-Delete: ${bb.rowCount} barcode(s) + 1 book gelöscht ✓`);
          ok++;
        }
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(`  ❌ Delete-Fehler: ${e.message}`);
        failed++;
      } finally {
        client.release();
      }
    }

    console.log();
  }

  await pool.end();

  console.log("────────────────────────────────────────────────────────");
  if (DRY_RUN) {
    console.log(`Dry-run abgeschlossen. ${PAIRS.length} Paare geprüft.`);
    console.log(`Zum Ausführen: node scripts/cleanup-duplicates.js --execute`);
  } else {
    console.log(`Fertig: ${ok} gelöscht, ${skipped} übersprungen, ${failed} Fehler`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
