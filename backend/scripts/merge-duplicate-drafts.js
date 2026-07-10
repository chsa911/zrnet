#!/usr/bin/env node
// backend/scripts/merge-duplicate-drafts.js
//
// Automated version of cleanup-duplicates.js: instead of a hardcoded PAIRS
// list, it runs the same detection query as find-duplicate-drafts.js and
// acts on the results directly. For each stale in_stock draft row:
//   1. Renames its cover files on the production server to the keep id
//      (SSH -> Docker), same as cleanup-duplicates.js.
//   2. Transfers its cover_ok DB row to the keep id.
//   3. Deletes its book_barcodes + books row.
//
// Matching is restricted to what actually identifies "the same book": an
// identical ISBN, or (when ISBN isn't available/confirmed) an identical
// page count. Title text is never used to match -- too many false
// positives/negatives (typos, reprints, unrelated books sharing a title),
// and it's not what the app's own register-page matching uses either.
//
// Safety rules -- only ever acts automatically when:
//   - confidence 'high' (ISBN match), AND
//   - none of the candidate ISBN-matched keeps were added within a day of
//     each other (checked keep-vs-keep, not against the draft -- a draft
//     can legitimately predate its own eventual finalized registration by
//     any amount of time, so its own timestamp isn't informative here; two
//     already-barcoded, fully finished registrations landing on the same
//     day IS informative, since two physical copies are never bought and
//     registered on the same day -- that's a confirmed accidental
//     double-registration, not distinct copies, and needs a human to
//     decide which barcode survives).
// When a draft matches multiple keeps that ARE spread apart by more than a
// day (genuinely plausible separate copies), the earliest-registered keep
// is used as the merge target -- it doesn't matter which real copy the
// (identical) cover art ends up on.
//
// A draft with NO isbn match, only a single pages-only ('medium') match, is
// ALSO auto-eligible if the two cover photos are visually confirmed
// identical via pixel comparison (same technique as the app's own live
// duplicate-check in BookFormDesktop.jsx) -- page count alone can't
// distinguish two different books of the same length, but an identical
// cover photo can.
//
// Everything else is left alone and printed under "SKIPPED (needs manual
// review)":
//   - pages-only match where the cover comparison came back different, or
//     inconclusive (couldn't fetch one/both covers), or there's more than
//     one candidate keep.
//   - a same-day cluster (see above -- confirmed accidental duplicate
//     registration/wasted barcode, needs a manual barcode decision, never
//     auto-resolved).
//
// Dry-run (default -- nothing is changed):
//   node scripts/merge-duplicate-drafts.js
//
// Actually execute the safe cases:
//   node scripts/merge-duplicate-drafts.js --execute
//
// Skip the cover-photo verification step (treat all pages-only matches as
// needing manual review, same as before this was added):
//   node scripts/merge-duplicate-drafts.js --no-cover-check

/* eslint-disable no-console */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { Pool } = require("pg");
const { execSync } = require("child_process");
const sharp = require("sharp");

const DRY_RUN = !process.argv.includes("--execute");
const NO_COVER_CHECK = process.argv.includes("--no-cover-check");
const PROD_HOST = process.env.PROD_HOST || "root@46.224.178.235";
const CONTAINER = process.env.PROD_CONTAINER || "zrnet-api-1";
const COVERS = "/uploads/covers";
const COVER_SAME_THRESHOLD = 0.9;
const COVER_DIFFERENT_THRESHOLD = 0.6;

function dockerMv(src, dst) {
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
    [`${COVERS}/normalized/${oldId}.jpg`, `${COVERS}/normalized/${newId}.jpg`],
    [`${COVERS}/normalized/${oldId}-home.jpg`, `${COVERS}/normalized/${newId}-home.jpg`],
    [`${COVERS}/${oldId}.jpg`, `${COVERS}/${newId}.jpg`],
  ];

  const results = [];
  for (const [src, dst] of files) {
    const kind = src.includes("home") ? "home" : src.includes("normalized") ? "normalized" : "root";
    if (dryRun) {
      try {
        if (!dockerExists(src)) {
          results.push(`  [DRY] cover/${kind}: nicht vorhanden auf Server`);
          continue;
        }
        results.push(
          dockerExists(dst)
            ? `  [DRY] cover/${kind}: Ziel existiert bereits -> würde überspringen`
            : `  [DRY] cover/${kind}: würde umbenennen ${oldId.slice(0, 8)}… -> ${newId.slice(0, 8)}…`
        );
      } catch (e) {
        results.push(`  [DRY] cover/${kind}: SSH-Fehler - ${e.message}`);
      }
    } else {
      try {
        if (dockerExists(dst)) {
          results.push(`  cover/${kind}: Ziel existiert bereits -> übersprungen`);
          continue;
        }
        const moved = dockerMv(src, dst);
        results.push(moved ? `  cover/${kind}: umbenannt ✓` : `  cover/${kind}: nicht vorhanden auf Server`);
      } catch (e) {
        results.push(`  cover/${kind}: SSH-Fehler - ${e.message}`);
      }
    }
  }
  return results;
}

function fetchCoverBuffer(id) {
  const candidates = [`${COVERS}/normalized/${id}.jpg`, `${COVERS}/${id}.jpg`];
  for (const remotePath of candidates) {
    try {
      if (!dockerExists(remotePath)) continue;
      const buf = execSync(`ssh ${PROD_HOST} "docker exec ${CONTAINER} cat ${remotePath}"`, {
        maxBuffer: 1024 * 1024 * 20,
      });
      if (buf && buf.length > 500) return buf;
    } catch {
      // try next candidate / give up
    }
  }
  return null;
}

async function coverSimilarity(bufA, bufB) {
  const SIZE = 16;
  const [a, b] = await Promise.all([
    sharp(bufA).resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer(),
    sharp(bufB).resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer(),
  ]);
  if (!a.length || a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
  return 1 - diff / (a.length * 255);
}

// Returns 'confirmed' | 'rejected' | 'unverified'
async function classifyPagesOnlyMatch(draftId, keepId) {
  if (NO_COVER_CHECK) return "unverified";
  try {
    const [bufA, bufB] = await Promise.all([fetchCoverBuffer(draftId), fetchCoverBuffer(keepId)]);
    if (!bufA || !bufB) return "unverified";
    const sim = await coverSimilarity(bufA, bufB);
    if (sim == null) return "unverified";
    if (sim >= COVER_SAME_THRESHOLD) return "confirmed";
    if (sim <= COVER_DIFFERENT_THRESHOLD) return "rejected";
    return "unverified";
  } catch {
    return "unverified";
  }
}

async function fetchCandidates(pool) {
  // Matching is restricted to the two identifiers that actually mean "this
  // is the same book": an identical ISBN, or an identical page count.
  // Title text is NOT used to match anymore -- it's just too unreliable
  // (typos, reprints/translations with a different title_display, or two
  // unrelated books that happen to share a title) and isn't something the
  // app itself treats as an identity signal either (the register page's own
  // "Treffer gefunden" panel matches on pages, not title).
  const { rows } = await pool.query(`
    SELECT
      draft.id::text        AS draft_id,
      draft.title_display   AS draft_title,
      draft.isbn13           AS draft_isbn13,
      draft.isbn10           AS draft_isbn10,
      draft.pages             AS draft_pages,
      draft.added_at           AS draft_added_at,
      keep.id::text            AS keep_id,
      keep.reading_status       AS keep_reading_status,
      keep.pages                 AS keep_pages,
      keep.added_at                AS keep_added_at,
      CASE
        WHEN NULLIF(regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g'), '') IS NOT NULL
         AND regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g')
           = regexp_replace(upper(coalesce(keep.isbn13, keep.isbn10, '')), '[^0-9X]', '', 'g')
        THEN 'high'
        ELSE 'medium'
      END AS confidence
    FROM public.books draft
    JOIN public.books keep
      ON keep.id <> draft.id
     AND (
           (
             NULLIF(regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g'), '') IS NOT NULL
             AND regexp_replace(upper(coalesce(draft.isbn13, draft.isbn10, '')), '[^0-9X]', '', 'g')
               = regexp_replace(upper(coalesce(keep.isbn13, keep.isbn10, '')), '[^0-9X]', '', 'g')
           )
           OR (
             draft.pages IS NOT NULL
             AND keep.pages IS NOT NULL
             AND draft.pages = keep.pages
           )
         )
    JOIN public.book_barcodes bc ON bc.book_id = keep.id
    WHERE draft.reading_status = 'in_stock'
      AND NOT EXISTS (
        SELECT 1 FROM public.book_barcodes bb0 WHERE bb0.book_id = draft.id
      )
  `);
  return rows;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const rows = await fetchCandidates(pool);

  console.log(`\n=== merge-duplicate-drafts.js  [${DRY_RUN ? "DRY RUN - keine Änderungen" : "⚠️  EXECUTE - Änderungen werden durchgeführt"}] ===\n`);

  // Group by draft_id so we can tell single-keep from multi-keep drafts.
  const byDraft = new Map();
  for (const r of rows) {
    if (!byDraft.has(r.draft_id)) byDraft.set(r.draft_id, []);
    byDraft.get(r.draft_id).push(r);
  }

  const SAME_DAY_MS = 24 * 60 * 60 * 1000;

  const eligible = []; // { draftId, keepId, title }
  const skipped = []; // { draftId, reason, matches }

  for (const [draftId, matches] of byDraft) {
    const highMatches = matches.filter((m) => m.confidence === "high");

    // Pages-only matches (no ISBN on one/both sides): page count alone
    // can't tell two different books of the same length apart. Only
    // auto-resolve when there's exactly one candidate AND its cover photo
    // is visually confirmed identical to the draft's.
    if (!highMatches.length) {
      const distinctMediumKeepIds = [...new Set(matches.map((m) => m.keep_id))];

      if (distinctMediumKeepIds.length === 1) {
        const verdict = await classifyPagesOnlyMatch(draftId, matches[0].keep_id);
        if (verdict === "confirmed") {
          eligible.push({ draftId, keepId: matches[0].keep_id, title: matches[0].draft_title, viaCover: true });
          continue;
        }
        skipped.push({
          draftId,
          title: matches[0].draft_title,
          reason:
            verdict === "rejected"
              ? "matched by pages only, but cover photos look different -- likely NOT a duplicate, no action needed"
              : "matched by pages only, cover photos could not be compared -- review manually",
          matches,
        });
        continue;
      }

      skipped.push({
        draftId,
        title: matches[0].draft_title,
        reason: `matched by pages only across ${distinctMediumKeepIds.length} candidates, no ISBN confirmation -- review manually`,
        matches,
      });
      continue;
    }

    const distinctKeepIds = [...new Set(highMatches.map((m) => m.keep_id))];

    // Same-day clustering is checked ONLY across the ISBN-matched keep rows
    // themselves, not against the draft's own added_at. The draft can
    // legitimately predate its own eventual finalized registration by any
    // amount of time (scanned at home, barcoded at the desk weeks later) --
    // that gap says nothing. What's diagnostic is two ALREADY-BARCODED,
    // fully finished registrations for the same ISBN landing on the same
    // day: two physical copies are never bought and registered on the same
    // day, so that's a confirmed accidental double-registration (a barcode
    // was likely wasted), not two distinct copies.
    let minGapMs = Infinity;
    for (let i = 0; i < highMatches.length; i++) {
      for (let j = i + 1; j < highMatches.length; j++) {
        const a = new Date(highMatches[i].keep_added_at).getTime();
        const b = new Date(highMatches[j].keep_added_at).getTime();
        if (Number.isFinite(a) && Number.isFinite(b)) {
          minGapMs = Math.min(minGapMs, Math.abs(a - b));
        }
      }
    }

    if (distinctKeepIds.length > 1 && minGapMs <= SAME_DAY_MS) {
      skipped.push({
        draftId,
        title: matches[0].draft_title,
        reason: `same-day cluster (~${(minGapMs / 3600000).toFixed(1)}h apart) across ${distinctKeepIds.length} barcoded matches -- confirmed accidental double-registration of one book, not separate copies; decide manually which barcode survives`,
        matches: highMatches,
      });
      continue;
    }

    if (distinctKeepIds.length > 1) {
      // Spread apart by more than a day -> genuinely separate owned copies
      // (that IS possible for the same ISBN). Safe to still merge the
      // draft's cover into the earliest-registered copy (identical cover
      // art either way).
      const earliest = [...highMatches].sort(
        (a, b) => new Date(a.keep_added_at).getTime() - new Date(b.keep_added_at).getTime()
      )[0];
      eligible.push({ draftId, keepId: earliest.keep_id, title: matches[0].draft_title });
      continue;
    }

    eligible.push({ draftId, keepId: highMatches[0].keep_id, title: matches[0].draft_title });
  }

  const coverConfirmedCount = eligible.filter((e) => e.viaCover).length;
  console.log(
    `${eligible.length} safe pair(s) (${eligible.length - coverConfirmedCount} ISBN-confirmed, ${coverConfirmedCount} cover-confirmed) -- ${DRY_RUN ? "would process" : "processing"}:\n`
  );

  let ok = 0, dbSkipped = 0, failed = 0;

  for (const { draftId, keepId, title, viaCover } of eligible) {
    console.log(`▶ "${title || "(kein Titel)"}"${viaCover ? " [cover-confirmed, no ISBN]" : ""}`);
    console.log(`  keep:   ${keepId}`);
    console.log(`  delete: ${draftId}`);

    renameCoversOnServer(draftId, keepId, DRY_RUN).forEach((l) => console.log(l));

    if (DRY_RUN) {
      console.log(`  [DRY] cover_ok: würde prüfen und ggf. übertragen`);
      console.log(`  [DRY] DB-Delete: würde book_barcodes + books für ${draftId} löschen`);
      ok++;
      console.log();
      continue;
    }

    try {
      const { rows: okRows } = await pool.query(
        `SELECT
           EXISTS(SELECT 1 FROM cover_ok WHERE id = $1::uuid) AS old_ok,
           EXISTS(SELECT 1 FROM cover_ok WHERE id = $2::uuid) AS new_ok`,
        [draftId, keepId]
      );
      const { old_ok, new_ok } = okRows[0];
      if (old_ok && !new_ok) {
        await pool.query(`INSERT INTO cover_ok (id) VALUES ($1::uuid) ON CONFLICT DO NOTHING`, [keepId]);
        console.log(`  cover_ok: übertragen ✓`);
      } else {
        console.log(`  cover_ok: ${old_ok ? "neuer hat bereits Eintrag" : "kein Eintrag beim alten"} -> übersprungen`);
      }
    } catch (e) {
      console.error(`  cover_ok-Fehler: ${e.message}`);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const bb = await client.query(`DELETE FROM public.book_barcodes WHERE book_id = $1::uuid`, [draftId]);
      const bk = await client.query(
        `DELETE FROM public.books WHERE id = $1::uuid AND reading_status = 'in_stock'`,
        [draftId]
      );
      if (bk.rowCount === 0) {
        await client.query("ROLLBACK");
        console.log(`  ⚠️  Delete: Buch nicht gefunden oder Status nicht mehr in_stock -> ROLLBACK`);
        dbSkipped++;
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

    console.log();
  }

  if (skipped.length) {
    console.log(`─`.repeat(60));
    console.log(`${skipped.length} draft(s) SKIPPED (needs manual review):\n`);
    for (const s of skipped) {
      console.log(`"${s.title || "(kein Titel)"}" -- draft ${s.draftId}`);
      console.log(`  reason: ${s.reason}`);
      for (const m of s.matches) {
        console.log(`  candidate keep: ${m.keep_id} (${m.keep_reading_status}, confidence: ${m.confidence})`);
      }
      console.log();
    }
  }

  await pool.end();

  console.log("─".repeat(60));
  if (DRY_RUN) {
    console.log(`Dry-run abgeschlossen. ${eligible.length} sicher(e) Paar(e) geprüft, ${skipped.length} zur manuellen Prüfung.`);
    console.log(`Zum Ausführen: node scripts/merge-duplicate-drafts.js --execute`);
  } else {
    console.log(`Fertig: ${ok} gelöscht, ${dbSkipped} übersprungen, ${failed} Fehler. ${skipped.length} weiterhin zur manuellen Prüfung.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
