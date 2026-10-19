// backend/tests/registration.test.js
//
// Guards the rule "a registered book is ALWAYS persisted – or the user gets
// an error". Covers the bug where a book got a barcode painted on, the save
// was rejected because the barcode was already taken, and nobody noticed.
//
// Runs the REAL controller (registerBook / registerExistingBook) and the REAL
// database triggers against Postgres, inside ONE transaction that is always
// rolled back – nothing is persisted. The controller's own BEGIN/COMMIT/
// ROLLBACK are mapped onto a SAVEPOINT inside that transaction.
// Still: point it at a copy of the data (a Neon branch), never production.
//
//   TEST_DATABASE_URL="postgres://..." npx jest tests/registration.test.js
//
// Without TEST_DATABASE_URL the tests are skipped.

const crypto = require("crypto");
const { txPool, call, openTx, closeTx } = require("./helpers/txHarness");
const {
  registerBook,
  registerExistingBook,
  verifyRegistrationPersisted,
} = require("../controllers/booksPgController");
const { isBarcodeHeld } = require("../utils/barcodeHolders");

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

jest.setTimeout(60_000);

const tag = () => crypto.randomBytes(4).toString("hex");

d("registration is persisted or reported as error", () => {
  let db;
  let pool;
  let base; // payload fields that make a valid registration
  let first; // { id, barcode } of a book registered in the first test

  async function bookCountByTitle(title) {
    const r = await db.query(`SELECT count(*)::int AS n FROM public.books WHERE title_display = $1`, [title]);
    return r.rows[0].n;
  }

  async function lastAttempt(title) {
    const r = await db.query(
      `SELECT * FROM public.book_save_attempts WHERE title_display = $1 ORDER BY created_at DESC LIMIT 1`,
      [title]
    );
    return r.rows[0] || null;
  }

  beforeAll(async () => {
    db = await openTx(URL);
    pool = txPool(db);

    // an existing author + publisher, so the test does not depend on upserts
    const a = await db.query(`SELECT id FROM public.authors ORDER BY created_at LIMIT 1`);
    const p = await db.query(`SELECT id FROM public.publishers LIMIT 1`);
    if (!a.rowCount || !p.rowCount) throw new Error("test DB needs at least one author and one publisher");

    base = {
      author_id: a.rows[0].id,
      publisher_id: p.rows[0].id,
      pages: 0, // overridden per test
      page_num_pos: "ul",
      chapters: 12,
      last_word: "Ende",
    };
  });

  afterAll(() => closeTx(db));

  test("successful registration: 201 + book, barcode link and ledger row really exist", async () => {
    // try sizes of books that are in use, until one series still has a free code
    const sizes = await db.query(`
      SELECT DISTINCT width, height FROM public.books
      WHERE reading_status = 'in_progress' AND width IS NOT NULL AND height IS NOT NULL
      LIMIT 25
    `);

    let r;
    let title;
    let size;
    for (const s of sizes.rows) {
      title = `ZRTEST register ${tag()}`;
      size = { width_cm: s.width / 10, height_cm: s.height / 10 };
      r = await call(registerBook, pool, {
        body: { ...base, ...size, title_display: title, pages: 7000 + Math.floor(Math.random() * 999) },
      });
      if (r.status === 201) break;
      if (r.body?.error !== "no_barcodes_available") break; // a real error -> fail below
    }

    expect(r.status).toBe(201);
    expect(r.body?.id).toBeTruthy();
    expect(r.body?.barcode).toBeTruthy();

    const { id, barcode } = r.body;
    first = { id, barcode, size };

    const check = await verifyRegistrationPersisted(pool, id, barcode);
    expect(check).toEqual({ ok: true, problems: [] });

    const book = (await db.query(`SELECT * FROM public.books WHERE id = $1`, [id])).rows[0];
    expect(book.title_display).toBe(title);
    expect(book.registered_at).not.toBeNull();
    expect(book.reading_status).toBe("in_progress");
    expect(book.last_word).toBe("Ende");

    const attempt = await lastAttempt(title);
    expect(attempt?.status).toBe("success");
    expect(attempt?.book_id).toBe(id);
  });

  test("the auto-picked barcode is held by exactly ONE in_progress book", async () => {
    expect(first).toBeTruthy();
    expect(await isBarcodeHeld(db, first.barcode, first.id)).toBe(false); // nobody else
    expect(await isBarcodeHeld(db, first.barcode)).toBe(true); // our book
  });

  test("barcode already taken: 409 with error, NO book row, attempt logged as failed", async () => {
    expect(first).toBeTruthy();
    const title = `ZRTEST duplicate ${tag()}`;

    const r = await call(registerBook, pool, {
      body: {
        ...base,
        ...first.size,
        title_display: title,
        pages: 6000 + Math.floor(Math.random() * 999),
        barcode: first.barcode, // the code of the first book
      },
    });

    expect(r.status).toBe(409);
    expect(r.body?.error).toBe("barcode_already_assigned_to_other_book");
    expect(await bookCountByTitle(title)).toBe(0); // nothing half-saved

    const attempt = await lastAttempt(title);
    expect(attempt?.status).toBe("failed");
    expect(attempt?.error_message).toMatch(/barcode_already_assigned/);

    // the first book still owns its code
    expect((await verifyRegistrationPersisted(pool, first.id, first.barcode)).ok).toBe(true);
  });

  test("registering an existing draft with a taken barcode: 409, draft stays unregistered", async () => {
    expect(first).toBeTruthy();
    const title = `ZRTEST draft ${tag()}`;

    // create a draft (no barcode)
    const draft = await call(registerBook, pool, {
      body: { ...base, title_display: title, pages: 5000, assign_barcode: false },
    });
    expect(draft.status).toBe(201);
    const draftId = draft.body.id;

    const r = await call(registerExistingBook, pool, {
      params: { id: draftId },
      body: { ...base, ...first.size, title_display: title, pages: 5000, barcode: first.barcode },
    });

    expect(r.status).toBe(409);
    expect(r.body?.error).toBe("barcode_already_assigned_to_other_book");

    const row = (await db.query(`SELECT registered_at FROM public.books WHERE id = $1`, [draftId])).rows[0];
    expect(row.registered_at).toBeNull();
    const links = await db.query(`SELECT 1 FROM public.book_barcodes WHERE book_id = $1`, [draftId]);
    expect(links.rowCount).toBe(0);
  });

  test("DB itself blocks a NEW duplicate, even when the app is bypassed", async () => {
    expect(first).toBeTruthy();
    const other = await db.query(
      `SELECT id FROM public.books WHERE reading_status = 'in_progress' AND id <> $1 LIMIT 1`,
      [first.id]
    );
    expect(other.rowCount).toBe(1);

    await db.query("SAVEPOINT direct_insert");
    await expect(
      db.query(
        `INSERT INTO public.barcode_assignments (barcode, book_id, assigned_at, freed_at)
         VALUES ($1, $2::uuid, now(), NULL)`,
        [first.barcode, other.rows[0].id]
      )
    ).rejects.toThrow(/barcode_already_assigned_to_other_book/);
    await db.query("ROLLBACK TO SAVEPOINT direct_insert");
  });

  test("verifyRegistrationPersisted notices a missing barcode link", async () => {
    expect(first).toBeTruthy();
    await db.query("SAVEPOINT break_link");
    await db.query(`DELETE FROM public.book_barcodes WHERE book_id = $1`, [first.id]);

    const check = await verifyRegistrationPersisted(pool, first.id, first.barcode);
    expect(check.ok).toBe(false);
    expect(check.problems).toContain("barcode_not_linked");

    await db.query("ROLLBACK TO SAVEPOINT break_link");
  });

  test("publisher abbreviation owned by another publisher never blocks the registration", async () => {
    // two entries for the same publisher: one has the abbreviation, the other not
    const owner = await db.query(
      `INSERT INTO public.publishers (name, name_display, abbr) VALUES ($1, $2, 'ZQX.') RETURNING id`,
      [`zrtest verlag a ${tag()}`, "ZRTEST Verlag"]
    );
    const dup = await db.query(
      `INSERT INTO public.publishers (name, name_display, abbr) VALUES ($1, $2, NULL) RETURNING id`,
      [`zrtest verlag b ${tag()}`, "ZRTEST Verlag (Duplikat)"]
    );
    const title = `ZRTEST Verlagskuerzel ${tag()}`;

    // picked the duplicate in the form, abbreviation typed as display
    const r = await call(registerBook, pool, {
      body: {
        ...base,
        publisher_id: dup.rows[0].id,
        publisher_name_display: "zqx.",
        title_display: title,
        pages: 0,
        assign_barcode: false,
      },
    });
    expect(r.status).toBe(201);

    // brand-new publisher name with an abbreviation that already exists
    const r2 = await call(registerBook, pool, {
      body: {
        ...base,
        publisher_id: undefined,
        publisher_name_display: `ZRTEST Neuer Verlag ${tag()}`,
        publisher_abbr: "ZQX",
        title_display: `${title} 2`,
        pages: 0,
        assign_barcode: false,
      },
    });
    expect(r2.status).toBe(201);

    const abbrs = await db.query(
      `SELECT id, abbr FROM public.publishers WHERE id = ANY($1::uuid[])`,
      [[owner.rows[0].id, dup.rows[0].id]]
    );
    const byId = Object.fromEntries(abbrs.rows.map((x) => [x.id, x.abbr]));
    expect(byId[owner.rows[0].id]).toBe("ZQX."); // owner keeps it
    expect(byId[dup.rows[0].id]).toBeNull(); // duplicate is not given a clashing one
  });

  test("required fields missing: 400, nothing saved", async () => {
    const title = `ZRTEST missing ${tag()}`;
    const r = await call(registerBook, pool, {
      body: { ...base, width_cm: 12, height_cm: 19, title_display: title, last_word: "" },
    });
    expect(r.status).toBe(400);
    expect(r.body?.fields).toContain("last_word");
    expect(await bookCountByTitle(title)).toBe(0);
  });
});
