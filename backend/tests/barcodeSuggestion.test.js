// backend/tests/barcodeSuggestion.test.js
//
// PROOF: a barcode that (from legacy data) is painted on SEVERAL books that
// are still in hand (reading_status = 'in_progress') can no longer be
// suggested or handed out:
//
//   1. the suggestion the form shows   (GET /api/barcodes/preview-barcode)
//   2. the auto-pick on registration   (POST /api/books without a barcode)
//   3. typing it in by hand            (POST /api/books with that barcode) -> 409
//   4. it only comes back once ALL copies are gone (counter-check, so the
//      test cannot pass by accident)
//
// Runs the REAL handlers against Postgres inside ONE transaction that is
// always rolled back. Point it at a copy of the data (Neon branch):
//
//   TEST_DATABASE_URL="postgres://..." npx jest tests/barcodeSuggestion.test.js

const { txPool, call, routeHandler, openTx, closeTx } = require("./helpers/txHarness");
const { registerBook } = require("../controllers/booksPgController");
const { releaseBookBarcodes } = require("../utils/barcodeHolders");
const previewRouter = require("../routes/api/barcodes/previewBarcode");

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

jest.setTimeout(60_000);

d("legacy multi-copy barcode is never suggested again", () => {
  let db;
  let pool;
  let preview;
  let size; // { width, height } in cm that maps to the series of `code`
  let code; // the multi-copy barcode
  let copies; // ids of the two books that carry `code`
  let base; // valid registration payload (without size/title)
  let freeBefore; // availableCount before the legacy situation was built

  const suggest = async () => {
    const r = await call(preview, pool, { query: { width: size.width, height: size.height } });
    expect(r.status).toBe(200);
    return r.body; // { candidate, availableCount, ... }
  };

  async function finish(bookId) {
    // what the app does when a book is finished: status change + release
    await db.query(
      `UPDATE public.books
          SET reading_status = 'finished', reading_status_updated_at = clock_timestamp()
        WHERE id = $1::uuid`,
      [bookId]
    );
    await releaseBookBarcodes(db, bookId);
  }

  beforeAll(async () => {
    db = await openTx(URL);
    pool = txPool(db);
    preview = routeHandler(previewRouter, "get", "/preview-barcode");

    // a size whose series has at least 2 free codes (one we "paint twice",
    // one that may be suggested instead)
    const rules = await db.query(
      `SELECT id, name, min_width, min_height, eq_heights FROM public.size_rules ORDER BY id`
    );
    for (const r of rules.rows) {
      const eq = (r.eq_heights && r.eq_heights.length ? r.eq_heights : [205, 210, 215]).map(Number);
      let hMm = Number(r.min_height) + 20; // -> position "o"
      while (eq.includes(hMm)) hMm += 1;
      const candidateSize = { width: Number(r.min_width) / 10, height: hMm / 10 };
      size = candidateSize;
      const s = await suggest();
      if (s.candidate && s.availableCount >= 2) {
        code = s.candidate;
        freeBefore = s.availableCount;
        break;
      }
    }
    if (!code) throw new Error("test DB needs a series with >= 2 free barcodes");

    // two existing books that currently hold nothing
    const b = await db.query(`
      SELECT b.id FROM public.books b
      WHERE b.reading_status = 'finished'
        AND NOT EXISTS (SELECT 1 FROM public.barcode_assignments ba
                        WHERE ba.book_id = b.id AND ba.freed_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM public.book_barcodes bb WHERE bb.book_id = b.id)
      LIMIT 2
    `);
    if (b.rowCount < 2) throw new Error("test DB needs 2 finished books without barcode");
    copies = b.rows.map((r) => r.id);

    // Build the LEGACY situation: the same code painted on both books, both
    // in hand. Since V20261018_01 the DB forbids this for new data, so the
    // fixture opts out for this rolled-back transaction only.
    await db.query(`SET LOCAL zrnet.allow_legacy_multicopy = 'on'`);
    await db.query(
      `UPDATE public.books SET reading_status = 'in_progress', reading_status_updated_at = clock_timestamp()
       WHERE id = ANY($1::uuid[])`,
      [copies]
    );
    for (const id of copies) {
      await db.query(
        `INSERT INTO public.barcode_assignments (barcode, book_id, assigned_at, freed_at)
         VALUES ($1, $2::uuid, now(), NULL)`,
        [code, id]
      );
    }
    await db.query(`INSERT INTO public.book_barcodes (book_id, barcode) VALUES ($1::uuid, $2)`, [copies[0], code]);
    // legacy data is often inconsistent: inventory even says AVAILABLE
    await db.query(`UPDATE public.barcode_inventory SET status = 'AVAILABLE' WHERE lower(barcode) = lower($1)`, [code]);
    await db.query(`SET LOCAL zrnet.allow_legacy_multicopy = 'off'`);

    const a = await db.query(`SELECT id FROM public.authors LIMIT 1`);
    const p = await db.query(`SELECT id FROM public.publishers LIMIT 1`);
    base = {
      author_id: a.rows[0].id,
      publisher_id: p.rows[0].id,
      page_num_pos: "ul",
      chapters: 9,
      last_word: "Schluss",
      width_cm: size.width,
      height_cm: size.height,
    };
  });

  afterAll(() => closeTx(db));

  test("1. the form's suggestion skips the multi-copy code", async () => {
    const s = await suggest();
    expect(s.candidate).not.toBe(code);
    expect(s.availableCount).toBe(freeBefore - 1); // not counted as free either
  });

  test("2. registering without a barcode never auto-assigns it", async () => {
    const r = await call(registerBook, pool, {
      body: { ...base, title_display: "ZRTEST auto-pick", pages: 4321 },
    });
    expect(r.status).toBe(201);
    expect(r.body.barcode).toBeTruthy();
    expect(String(r.body.barcode).toLowerCase()).not.toBe(String(code).toLowerCase());
  });

  test("3. typing the multi-copy code in by hand is rejected with an error", async () => {
    const title = "ZRTEST typed multi-copy";
    const r = await call(registerBook, pool, {
      body: { ...base, title_display: title, pages: 4322, barcode: code },
    });
    expect(r.status).toBe(409);
    expect(r.body.error).toBe("barcode_already_assigned_to_other_book");
    const n = await db.query(`SELECT count(*)::int AS n FROM public.books WHERE title_display = $1`, [title]);
    expect(n.rows[0].n).toBe(0);
  });

  test("4a. one copy finished, the other still in hand: still NOT suggested", async () => {
    await finish(copies[0]);
    const s = await suggest();
    expect(s.candidate).not.toBe(code);
  });

  test("4b. counter-check: once ALL copies are finished it is free again", async () => {
    await finish(copies[1]);
    const s = await suggest();
    expect(s.candidate).toBe(code);
  });
});
