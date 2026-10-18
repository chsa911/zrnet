// backend/tests/openIssues.test.js
//
// "Offene Vorgänge": a rejected registration must stay visible until it is
// dealt with – it may not vanish just because the form message was closed.
//
//   1. rejected registration -> appears as open Vorgang (with reason + form data)
//   2. retry fails again     -> still ONE Vorgang (attempts counted)
//   3. pure input error      -> no Vorgang (nothing was lost)
//   4. re-registered from the list (followup_attempt_ids) -> Vorgang closed
//   5. dismissed with a note -> Vorgang closed; dismissing without note -> 400
//
// Real handlers + real DB in ONE rolled-back transaction:
//   TEST_DATABASE_URL="postgres://..." npx jest tests/openIssues.test.js

const crypto = require("crypto");
const { txPool, call, routeHandler, openTx, closeTx } = require("./helpers/txHarness");
const { registerBook, registerExistingBook } = require("../controllers/booksPgController");
const { listOpenFailures } = require("../utils/saveFailures");
const adminRouter = require("../routes/admin");

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

jest.setTimeout(60_000);

d("offene Vorgänge", () => {
  let db;
  let pool;
  let base;
  let held; // { barcode, size } of a barcode that is in use
  const listRoute = () => routeHandler(adminRouter, "get", "/save-failures");
  const dismissRoute = () => routeHandler(adminRouter, "post", "/save-failures/dismiss");

  const open = async () => (await call(listRoute(), pool)).body;
  const findOpen = async (title) => (await open()).items.find((x) => x.title === title);

  beforeAll(async () => {
    db = await openTx(URL);
    pool = txPool(db);
    const a = await db.query(`SELECT id FROM public.authors LIMIT 1`);
    const p = await db.query(`SELECT id FROM public.publishers LIMIT 1`);
    base = {
      author_id: a.rows[0].id,
      publisher_id: p.rows[0].id,
      page_num_pos: "ul",
      chapters: 7,
      last_word: "Ende",
    };
    // a barcode that is currently held by an in_progress book + its size
    const h = await db.query(`
      SELECT bb.barcode, b.width, b.height
      FROM public.book_barcodes bb JOIN public.books b ON b.id = bb.book_id
      WHERE b.reading_status = 'in_progress' AND b.width IS NOT NULL AND b.height IS NOT NULL
      LIMIT 1`);
    if (!h.rowCount) throw new Error("test DB needs an in_progress book with barcode and size");
    held = { barcode: h.rows[0].barcode, size: { width_cm: h.rows[0].width / 10, height_cm: h.rows[0].height / 10 } };
  });

  afterAll(() => closeTx(db));

  const title = `ZRTEST Vorgang ${crypto.randomBytes(3).toString("hex")}`;

  test("1. rejected registration becomes an open Vorgang with reason and form data", async () => {
    const r = await call(registerBook, pool, {
      body: { ...base, ...held.size, title_display: title, pages: 333, barcode: held.barcode, comment: "Testnotiz" },
    });
    expect(r.status).toBe(409);

    const v = await findOpen(title);
    expect(v).toBeTruthy();
    expect(v.attempts).toBe(1);
    expect(v.reason).toMatch(/Barcode war bereits einem anderen Buch zugewiesen/);
    expect(v.payload?.comment).toBe("Testnotiz"); // full form data kept for pre-filling
    expect(v.payload?.last_word).toBe("Ende");
  });

  test("2. retry that fails again -> still ONE Vorgang, attempts counted", async () => {
    await call(registerBook, pool, {
      body: { ...base, ...held.size, title_display: title, pages: 333, barcode: held.barcode },
    });
    const all = (await open()).items.filter((x) => x.title === title);
    expect(all).toHaveLength(1);
    expect(all[0].attempts).toBe(2);
    expect(all[0].ids).toHaveLength(2);
  });

  test("3. a pure input error is not a Vorgang", async () => {
    const draftTitle = `ZRTEST Eingabefehler ${crypto.randomBytes(3).toString("hex")}`;
    const draft = await call(registerBook, pool, {
      body: { ...base, title_display: draftTitle, pages: 10, assign_barcode: false },
    });
    expect(draft.status).toBe(201);
    // register the draft without width/height -> 400 width_and_height_required
    const r = await call(registerExistingBook, pool, { params: { id: draft.body.id }, body: { title_display: draftTitle } });
    expect(r.status).toBe(400);
    expect(await findOpen(draftTitle)).toBeUndefined();
  });

  test("4. re-registered from the list -> Vorgang closed as 'done'", async () => {
    const v = await findOpen(title);
    const r = await call(registerBook, pool, {
      body: { ...v.payload, barcode: undefined, title_display: title, followup_attempt_ids: v.ids },
    });
    expect(r.status).toBe(201);
    expect(await findOpen(title)).toBeUndefined();

    const rows = await db.query(
      `SELECT followup_status, book_id FROM public.book_save_attempts WHERE id = ANY($1::uuid[])`,
      [v.ids]
    );
    expect(rows.rows.every((x) => x.followup_status === "done" && x.book_id === r.body.id)).toBe(true);
  });

  test("5. dismissing needs a note, then the Vorgang is gone", async () => {
    const t2 = `ZRTEST verwerfen ${crypto.randomBytes(3).toString("hex")}`;
    await call(registerBook, pool, {
      body: { ...base, ...held.size, title_display: t2, pages: 444, barcode: held.barcode },
    });
    const v = await findOpen(t2);
    expect(v).toBeTruthy();

    const noNote = await call(dismissRoute(), pool, { body: { ids: v.ids, note: "  " } });
    expect(noNote.status).toBe(400);
    expect(await findOpen(t2)).toBeTruthy();

    const ok = await call(dismissRoute(), pool, { body: { ids: v.ids, note: "Duplikat, war schon da" } });
    expect(ok.status).toBe(200);
    expect(ok.body.closed).toBe(1);
    expect(await findOpen(t2)).toBeUndefined();

    // the shared module (used by the watcher) agrees
    expect((await listOpenFailures(pool)).find((x) => x.title === t2)).toBeUndefined();
  });
});
