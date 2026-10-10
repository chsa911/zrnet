// backend/tests/barcodeMultiCopy.test.js
//
// Rule under test: one barcode can be painted on several physical books.
// It may only be suggested / handed out again once ALL of them are gone
// (no longer reading_status = 'in_progress').
//
// Runs against a real Postgres INSIDE ONE TRANSACTION THAT IS ALWAYS
// ROLLED BACK - nothing is persisted. Still, point it at a copy of the
// data (e.g. a Neon branch), not production:
//
//   TEST_DATABASE_URL="postgres://..." npx jest tests/barcodeMultiCopy.test.js
//
// Without TEST_DATABASE_URL the test is skipped.

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { Client } = require("pg");
const {
  pickFreeBarcode,
  countFreeBarcodes,
  isBarcodeHeld,
  releaseBookBarcodes,
} = require("../utils/barcodeHolders");

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

d("barcode painted on several books", () => {
  let db;
  let prefix;
  let code;
  let books; // [bookA (has live link), bookB, bookC]

  const invStatus = async () =>
    (await db.query(`SELECT status FROM public.barcode_inventory WHERE lower(barcode) = lower($1)`, [code]))
      .rows[0]?.status;

  async function finish(bookId) {
    // what the app does: status change (DB trigger closes the ledger row),
    // then the explicit release
    await db.query(
      `UPDATE public.books SET reading_status = 'finished', reading_status_updated_at = clock_timestamp()
       WHERE id = $1::uuid`,
      [bookId]
    );
    await releaseBookBarcodes(db, bookId);
  }

  beforeAll(async () => {
    db = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
    await db.connect();
    await db.query("BEGIN");

    // a prefix that currently has a free code
    const p = await db.query(`
      SELECT DISTINCT lower(regexp_replace(barcode, '[0-9]+$', '')) AS prefix
      FROM public.barcode_inventory
      WHERE status = 'AVAILABLE' AND rank_in_inventory IS NOT NULL
    `);
    for (const r of p.rows) {
      const c = await pickFreeBarcode(db, [r.prefix]);
      if (c) { prefix = r.prefix; code = c; break; }
    }
    if (!code) throw new Error("no free barcode in test DB");

    // three existing books that hold nothing right now
    const b = await db.query(`
      SELECT b.id FROM public.books b
      WHERE b.reading_status = 'finished'
        AND NOT EXISTS (SELECT 1 FROM public.barcode_assignments ba WHERE ba.book_id = b.id AND ba.freed_at IS NULL)
      LIMIT 3
    `);
    if (b.rowCount < 3) throw new Error("need 3 finished books in test DB");
    books = b.rows.map((r) => r.id);

    // simulate: the code is painted on all three books, they are in hand
    await db.query(
      `UPDATE public.books SET reading_status = 'in_progress', reading_status_updated_at = clock_timestamp()
       WHERE id = ANY($1::uuid[])`,
      [books]
    );
    await db.query(`DELETE FROM public.book_barcodes WHERE book_id = ANY($1::uuid[]) OR lower(barcode) = lower($2)`, [books, code]);
    for (const id of books) {
      try {
        await db.query(
          `INSERT INTO public.barcode_assignments (barcode, book_id, assigned_at, freed_at) VALUES ($1, $2::uuid, now(), NULL)`,
          [code, id]
        );
      } catch (e) {
        throw new Error(
          `Could not give a second book the same code (${e.message}). ` +
          `If this is uq_barcode_assignments_open, the DB itself forbids multi-copy codes.`
        );
      }
    }
    // only one copy can appear in book_barcodes (UNIQUE barcode)
    await db.query(`INSERT INTO public.book_barcodes (book_id, barcode) VALUES ($1::uuid, $2)`, [books[0], code]);
    await db.query(`UPDATE public.barcode_inventory SET status = 'ASSIGNED' WHERE lower(barcode) = lower($1)`, [code]);
  });

  afterAll(async () => {
    if (db) {
      await db.query("ROLLBACK").catch(() => {});
      await db.end();
    }
  });

  test("while all 3 books are in hand, the code is not suggested", async () => {
    expect(await isBarcodeHeld(db, code)).toBe(true);
    expect(await pickFreeBarcode(db, [prefix])).not.toBe(code);
  });

  test("a 4th book cannot be given the code manually", async () => {
    // same check assignBarcodeTx uses (excluding the book being assigned)
    const fourth = "00000000-0000-4000-8000-000000000000";
    expect(await isBarcodeHeld(db, code, fourth)).toBe(true);
  });

  test("book with the live link finishes -> code still taken by the other 2", async () => {
    const before = await countFreeBarcodes(db, [prefix]);
    await finish(books[0]);
    expect(await invStatus()).toBe("ASSIGNED");
    expect(await isBarcodeHeld(db, code)).toBe(true);
    expect(await pickFreeBarcode(db, [prefix])).not.toBe(code);
    expect(await countFreeBarcodes(db, [prefix])).toBe(before);
  });

  test("second book finishes -> code still taken by the last one", async () => {
    await finish(books[1]);
    expect(await invStatus()).toBe("ASSIGNED");
    expect(await isBarcodeHeld(db, code)).toBe(true);
    expect(await pickFreeBarcode(db, [prefix])).not.toBe(code);
  });

  test("last book finishes -> code is free and suggested again", async () => {
    await finish(books[2]);
    expect(await invStatus()).toBe("AVAILABLE");
    expect(await isBarcodeHeld(db, code)).toBe(false);
    expect(await pickFreeBarcode(db, [prefix])).toBe(code);
  });
});
