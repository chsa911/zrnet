// backend/controllers/booksPgController.js
// Postgres implementation for /api/books endpoints.

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clampInt = (x, def, min, max) => {
  const n = Number.parseInt(x, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
};

const toNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const cmToMm = (cm) => Math.round(Number(cm) * 10);

function normalizeStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function normalizeInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}
function normalizeBool(v) {
  if (v === true || v === false) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function computeAuthorDisplay(first, last) {
  const f = normalizeStr(first);
  const l = normalizeStr(last);
  if (f && l) return `${f} ${l}`;
  return l || f || null;
}

// Build a human-ish title string from up to 3 keyword+position pairs.
function computeFullTitle({ kw, pos, kw1, pos1, kw2, pos2 }) {
  const parts = [];
  const push = (word, p, fallbackP) => {
    const w = normalizeStr(word);
    if (!w) return;
    const n = normalizeInt(p);
    parts.push({ p: Number.isFinite(n) ? n : fallbackP, w });
  };
  push(kw, pos, 1);
  push(kw1, pos1, 2);
  push(kw2, pos2, 3);
  parts.sort((a, b) => a.p - b.p);
  const title = parts.map((x) => x.w).join(" ").trim();
  return title || null;
}

function mapReadingStatus(v) {
  const s = normalizeStr(v);
  if (!s) return null;
  const x = s.toLowerCase();
  if (x === "open" || x === "inprogress" || x === "in-progress") return "in_progress";
  if (x === "in_progress" || x === "finished" || x === "abandoned") return x;
  return s;
}

function rowToApi(row) {
  if (!row) return null;

  const widthCm = row.width != null ? row.width / 10 : null;
  const heightCm = row.height != null ? row.height / 10 : null;

  // Author names must come from public.authors (not from legacy books.author/author_display).
  // listBooks joins authors and aliases these fields.
  const authorFirst = row.author_first_name ?? null;
  const authorLast = row.author_last_name ?? null;
  const authorNameDisplay = normalizeStr(row.author_name_display);
  const authorDisplay = authorNameDisplay || computeAuthorDisplay(authorFirst, authorLast);

  return {
    id: row.id,
    _id: row.id,

    barcode: row.barcode ?? null,
    BMarkb: row.barcode ?? null,
    BMark: row.barcode ?? null,

    author_lastname: authorLast,
    author_firstname: authorFirst,
    male_female: row.male_female ?? null,
    author_nationality: row.author_nationality ?? null,
    place_of_birth: row.place_of_birth ?? null,
    published_titles: row.published_titles ?? null,
    number_of_millionsellers: row.number_of_millionsellers ?? null,

    // legacy aliases used in UI
    // (UI labels are German, but key names are legacy)
    BAutor: authorDisplay,
    Autor: authorDisplay,

    BVerlag: row.publisher ?? null,
    publisher: row.publisher ?? null,

    // Display title (for admin list columns / future UI)
    title_display: row.title_display ?? null,
    titleDisplay: row.title_display ?? null,
    BTitel: row.title_display ?? null,
    title: row.title_display ?? null,

    BKw: row.title_keyword ?? null,
    BKP: row.title_keyword_position ?? null,
    BKw1: row.title_keyword2 ?? null,
    BK1P: row.title_keyword2_position ?? null,
    BKw2: row.title_keyword3 ?? null,
    BK2P: row.title_keyword3_position ?? null,

    BSeiten: row.pages ?? null,
    BBreite: widthCm,
    BHoehe: heightCm,
    BTop: !!row.top_book,

    status: row.reading_status ?? null,
    reading_status: row.reading_status ?? null,

    // Status change timestamp (finished/abandoned). Fallback to created/registered.
    reading_status_updated_at: row.reading_status_updated_at ?? null,
    status_changed_at:
      row.reading_status_updated_at ?? row.registered_at ?? row.added_at ?? row.created_at ?? null,
    statusChangedAt:
      row.reading_status_updated_at ?? row.registered_at ?? row.added_at ?? row.created_at ?? null,

    BEind: row.registered_at ?? row.created_at ?? null,
    createdAt: row.registered_at ?? row.created_at ?? null,
    registered_at: row.registered_at ?? null,

    // Keep for compatibility, but prefer authorDisplay above.
    author_display: authorDisplay ?? row.author_display ?? null,

    // ✅ add these for BookThemesPage / candidate dropdown
    full_title: row.full_title ?? null,
    themes: row.themes ?? null,
    purchase_url: row.purchase_url ?? null,
  };
}

/* ------------------------- schema introspection cache ---------------------- */

const _columnsCache = new Map(); // key: tableName => { ts, cols:Set<string> }

async function getColumns(pool, tableName) {
  const key = String(tableName);
  const now = Date.now();
  const cached = _columnsCache.get(key);
  if (cached && now - cached.ts < 5 * 60 * 1000) return cached.cols;

  const { rows } = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    `,
    [key]
  );

  const cols = new Set(rows.map((r) => r.column_name));
  _columnsCache.set(key, { ts: now, cols });
  return cols;
}

function pickKnownColumns(colsSet, obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (colsSet.has(k)) out[k] = v;
  }
  return out;
}

/* ------------------------- barcode / size helpers -------------------------- */

/**
 * Resolve size_rule + position (d/l/o) from width/height.
 * Mirrors backend/routes/api/barcodes/previewBarcode.js.
 */
async function resolveRuleAndPos(pool, widthCm, heightCm) {
  const wMm = cmToMm(widthCm);
  const hMm = cmToMm(heightCm);
  if (!Number.isFinite(wMm) || !Number.isFinite(hMm) || wMm <= 0 || hMm <= 0) return null;

  // schema has only min_width/min_height -> pick the best matching band by min_width
  const { rows } = await pool.query(
    `
    SELECT id, name, min_height
    FROM public.size_rules
    WHERE $1 >= min_width
    ORDER BY min_width DESC
    LIMIT 1
    `,
    [wMm]
  );

  const r = rows[0];
  if (!r) return null;

  // your DB doesn't store eq_heights -> keep a small fixed rule
  const eqHeights = [205, 210, 215]; // mm
  let pos = "o";
  if (eqHeights.includes(hMm)) pos = "l";
  else if (hMm <= Number(r.min_height)) pos = "d";

  return { sizeRuleId: r.id, color: r.name, pos };
}

/**
 * Pick best AVAILABLE barcode for given size_rule_id and pos.
 * Uses barcode_numbers.rank_in_series if present; falls back to lexical code order.
 */
async function pickBestBarcode(pool, sizeRuleId, pos) {
  const p = normalizeStr(pos) ? String(pos).toLowerCase() : null;

  // Prefer rank_in_series via barcode_numbers if available
  try {
    const r = await pool.query(
      `
      SELECT b.code
      FROM public.barcodes b
      JOIN public.barcode_numbers n
        ON right(b.code, 3) = n.num
      WHERE b.status = 'AVAILABLE'
        AND b.size_rule_id = $1
        AND ($2::text IS NULL OR left(lower(b.code), 1) = $2)
      ORDER BY n.rank_in_series ASC
      LIMIT 1
      `,
      [sizeRuleId, p]
    );
    return r.rows[0]?.code ?? null;
  } catch {
    // If barcode_numbers doesn't exist in some env, fallback below
  }

  const r2 = await pool.query(
    `
    SELECT b.code
    FROM public.barcodes b
    WHERE b.status = 'AVAILABLE'
      AND b.size_rule_id = $1
      AND ($2::text IS NULL OR left(lower(b.code), 1) = $2)
    ORDER BY b.code ASC
    LIMIT 1
    `,
    [sizeRuleId, p]
  );
  return r2.rows[0]?.code ?? null;
}

async function assignBarcodeTx(pool, { bookId, barcode, expectedSizeRuleId, expectedPos }) {
  const chk = await pool.query(
    `SELECT code, status, size_rule_id FROM public.barcodes WHERE lower(code) = lower($1) FOR UPDATE`,
    [barcode]
  );
  const row = chk.rows[0];
  if (!row) throw new Error("barcode_not_found");
  if (String(row.status).toUpperCase() !== "AVAILABLE") throw new Error("barcode_not_available");
  if (expectedSizeRuleId && String(row.size_rule_id) !== String(expectedSizeRuleId)) {
    throw new Error("barcode_wrong_series");
  }
  if (expectedPos && String(row.code).slice(0, 1).toLowerCase() !== String(expectedPos).toLowerCase()) {
    throw new Error("barcode_wrong_position");
  }

  const already = await pool.query(
    `SELECT 1 FROM public.book_barcodes WHERE lower(barcode) = lower($1) LIMIT 1`,
    [barcode]
  );
  if (already.rowCount) throw new Error("barcode_already_assigned");

  await pool.query(
    `UPDATE public.barcodes SET status='ASSIGNED', updated_at=now() WHERE lower(code)=lower($1)`,
    [barcode]
  );
  await pool.query(`DELETE FROM public.book_barcodes WHERE book_id=$1`, [bookId]);
  await pool.query(`INSERT INTO public.book_barcodes (book_id, barcode) VALUES ($1,$2)`, [bookId, barcode]);
}

async function fetchBookWithBarcode(pool, bookId) {
  const { rows } = await pool.query(
    `
    SELECT b.*, bb.barcode
    FROM public.books b
    LEFT JOIN LATERAL (
      SELECT barcode FROM public.book_barcodes bb WHERE bb.book_id = b.id LIMIT 1
    ) bb ON true
    WHERE b.id = $1
    `,
    [bookId]
  );
  return rows[0] || null;
}

/* --------------------------------- list ----------------------------------- */

function mapSort(sortByRaw) {
  const sortBy = String(sortByRaw || "").trim();
  const map = {
    BEind: "b.registered_at",
    createdAt: "b.registered_at",
    BAutor: "a.name_display",
    BVerlag: "b.publisher",
    BKw: "b.title_keyword",
  };
  return map[sortBy] || "b.registered_at";
}

async function listBooks(req, res) {
  try {
    const pool = getPool(req);

    const page = clampInt(req.query.page, 1, 1, 500000);
    const limit = clampInt(req.query.limit, 20, 1, 500); // ✅ allow bigger result set for dropdown
    const offset = (page - 1) * limit;

    const order =
      String(req.query.order || req.query.sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
    const sortCol = mapSort(req.query.sortBy || req.query.sort);

    const where = [];
    const params = [];

    // q (freitext)
    const q = normalizeStr(req.query.q);
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(
        `(
          b.title_display ILIKE ${p} OR
          a.name_display ILIKE ${p} OR
          b.publisher ILIKE ${p} OR
          b.title_keyword ILIKE ${p} OR
          b.title_keyword2 ILIKE ${p} OR
          b.title_keyword3 ILIKE ${p} OR
          b.isbn10 ILIKE ${p} OR
          b.isbn13 ILIKE ${p} OR
          bb.barcode ILIKE ${p}
        )`
      );
    }

    // ✅ pages exakt (unabhängig von q)
    const pagesEq = normalizeInt(req.query.pages ?? req.query.BSeiten);
    if (pagesEq !== null) {
      params.push(pagesEq);
      where.push(`b.pages = $${params.length}`);
    }

    // status filter
    const status = mapReadingStatus(req.query.status || req.query.reading_status);
    if (status) {
      params.push(status);
      where.push(`b.reading_status = $${params.length}`);
    }

    const topOnly = normalizeBool(req.query.topOnly ?? req.query.top);
    if (topOnly === true) {
      where.push(`b.top_book = true`);
    }

    const since = normalizeStr(req.query.since);
    if (since) {
      // Accept YYYY-MM-DD; let PG cast
      params.push(since);
      where.push(`b.registered_at >= $${params.length}::date`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await pool.query(
      `
      SELECT count(*)::int AS total
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN LATERAL (
        SELECT barcode FROM public.book_barcodes bb WHERE bb.book_id = b.id LIMIT 1
      ) bb ON true
      ${whereSql}
      `,
      params
    );
    const total = countRes.rows[0]?.total ?? 0;

    const listRes = await pool.query(
      `
      SELECT
        b.*, 
        bb.barcode,
        a.name_display AS author_name_display,
        a.first_name   AS author_first_name,
        a.last_name    AS author_last_name
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN LATERAL (
        SELECT barcode FROM public.book_barcodes bb WHERE bb.book_id = b.id LIMIT 1
      ) bb ON true
      ${whereSql}
      ORDER BY ${sortCol} ${order} NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    );

    const items = listRes.rows.map(rowToApi);
    const pages = Math.max(1, Math.ceil(total / limit) || 1);

    return res.json({ items, data: items, total, page, limit, pages });
  } catch (err) {
    console.error("listBooks error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/* ------------------------------ autocomplete -------------------------------- */

async function autocomplete(req, res) {
  try {
    const pool = getPool(req);

    const field = String(req.query.field || "").trim();
    const q = String(req.query.q || "").trim();
    if (!field || q.length < 1) return res.json([]);

    const max = clampInt(req.query.limit, 10, 1, 50);
    const like = `${q}%`;

    // Whitelist -> SQL fragment.
    // For BKw we search across all 3 keyword columns.
    const columns = await getColumns(pool, "books");

    const runSimple = async (col) => {
      if (!columns.has(col)) return [];
      const { rows } = await pool.query(
        `
        SELECT DISTINCT ${col} AS v
        FROM public.books
        WHERE ${col} ILIKE $1
          AND ${col} IS NOT NULL
        ORDER BY ${col}
        LIMIT $2
        `,
        [like, max]
      );
      return rows.map((r) => r.v).filter(Boolean);
    };

    if (field === "BAutor") {
      // Author suggestions must come from public.authors (not from legacy books.author)
      const { rows } = await pool.query(
        `
        SELECT DISTINCT
          COALESCE(NULLIF(name_display,''), NULLIF(concat_ws(' ', first_name, last_name), '')) AS v
        FROM public.authors
        WHERE (
          name_display ILIKE $1
          OR concat_ws(' ', first_name, last_name) ILIKE $1
          OR last_name ILIKE $1
        )
        ORDER BY v
        LIMIT $2
        `,
        [like, max]
      );
      return res.json(rows.map((r) => r.v).filter(Boolean));
    }
    if (field === "BVerlag") {
      return res.json(await runSimple("publisher"));
    }
    if (field === "BKw") {
      // union over title_keyword/2/3 if present
      const selects = [];
      if (columns.has("title_keyword")) selects.push("SELECT title_keyword AS v FROM public.books");
      if (columns.has("title_keyword2")) selects.push("SELECT title_keyword2 AS v FROM public.books");
      if (columns.has("title_keyword3")) selects.push("SELECT title_keyword3 AS v FROM public.books");
      if (!selects.length) return res.json([]);

      const { rows } = await pool.query(
        `
        WITH vals AS (
          ${selects.join(" UNION ALL ")}
        )
        SELECT DISTINCT v
        FROM vals
        WHERE v ILIKE $1 AND v IS NOT NULL
        ORDER BY v
        LIMIT $2
        `,
        [like, max]
      );

      return res.json(rows.map((r) => r.v).filter(Boolean));
    }

    // Unknown field => empty list (safe)
    return res.json([]);
  } catch (err) {
    console.error("autocomplete error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/* --------------------------------- create --------------------------------- */

async function registerBook(req, res) {
  const body = req.body || {};

  const widthCm = toNum(body.BBreite ?? body.width);
  const heightCm = toNum(body.BHoehe ?? body.height);
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    return res.status(400).json({ error: "width_and_height_required" });
  }

  const authorLast = normalizeStr(body.BAutor ?? body.author_lastname ?? body.author);
  const authorFirst = normalizeStr(body.author_firstname ?? body.authorFirstname ?? body.author_firstname);
  const publisher = normalizeStr(body.BVerlag ?? body.publisher);
  const kw = normalizeStr(body.BKw ?? body.title_keyword);

  // Keep some basic validations matching the UI.
  if (!authorLast) return res.status(400).json({ error: "author_required" });
  if (!kw) return res.status(400).json({ error: "keyword_required" });

  const pool = getPool(req);
  const rule = await resolveRuleAndPos(pool, widthCm, heightCm);
  if (!rule) return res.status(422).json({ error: "no_series_for_size" });

  const requestedBarcode = normalizeStr(body.barcode ?? body.BMarkb ?? body.BMark ?? body.code);
  const requestId = normalizeStr(body.requestId ?? body.request_id);

  const wMm = cmToMm(widthCm);
  const hMm = cmToMm(heightCm);

  // Candidate record to insert
  const bookInsert = {
    author: authorLast,
    author_firstname: authorFirst,
    male_female: normalizeStr(body.male_female),
    author_nationality: normalizeStr(body.author_nationality),
    place_of_birth: normalizeStr(body.place_of_birth),
    published_titles: normalizeInt(body.published_titles),
    number_of_millionsellers: normalizeInt(body.number_of_millionsellers),

    publisher,

    title_keyword: kw,
    title_keyword_position: normalizeInt(body.BKP ?? body.title_keyword_position),
    title_keyword2: normalizeStr(body.BKw1 ?? body.title_keyword2),
    title_keyword2_position: normalizeInt(body.BK1P ?? body.title_keyword2_position),
    title_keyword3: normalizeStr(body.BKw2 ?? body.title_keyword3),
    title_keyword3_position: normalizeInt(body.BK2P ?? body.title_keyword3_position),

    pages: normalizeInt(body.BSeiten ?? body.pages),
    width: Number.isFinite(wMm) ? wMm : null,
    height: Number.isFinite(hMm) ? hMm : null,
    top_book: normalizeBool(body.BTop ?? body.top_book) ?? false,

    reading_status: normalizeStr(body.status ?? body.reading_status) ?? "in_progress",
    registered_at: new Date().toISOString(),

    // helpful denormalizations if your schema includes them
    author_display: computeAuthorDisplay(authorFirst, authorLast),
    full_title: computeFullTitle({
      kw,
      pos: body.BKP ?? body.title_keyword_position,
      kw1: body.BKw1 ?? body.title_keyword2,
      pos1: body.BK1P ?? body.title_keyword2_position,
      kw2: body.BKw2 ?? body.title_keyword3,
      pos2: body.BK2P ?? body.title_keyword3_position,
    }),

    request_id: requestId,
  };

  try {
    const cols = await getColumns(pool, "books");

    // Idempotency (optional): if request_id exists, return the existing book.
    if (requestId && cols.has("request_id")) {
      const exists = await pool.query(`SELECT id FROM public.books WHERE request_id = $1 LIMIT 1`, [requestId]);
      const id = exists.rows[0]?.id;
      if (id) {
        const existing = await fetchBookWithBarcode(pool, id);
        return res.status(200).json(rowToApi(existing));
      }
    }

    await pool.query("BEGIN");

    const insertObj = pickKnownColumns(cols, bookInsert);
    const insertKeys = Object.keys(insertObj);

    let insertedRow;
    if (!insertKeys.length) {
      const r = await pool.query(`INSERT INTO public.books DEFAULT VALUES RETURNING *`);
      insertedRow = r.rows[0];
    } else {
      const vals = insertKeys.map((k) => insertObj[k]);
      const placeholders = insertKeys.map((_, i) => `$${i + 1}`);
      const r = await pool.query(
        `INSERT INTO public.books (${insertKeys.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
        vals
      );
      insertedRow = r.rows[0];
    }

    const bookId = insertedRow?.id;
    if (!bookId) throw new Error("book_insert_failed");

    let barcode = requestedBarcode;
    if (!barcode) {
      barcode = await pickBestBarcode(pool, rule.sizeRuleId, rule.pos);
    }
    if (!barcode) {
      await pool.query("ROLLBACK");
      return res.status(409).json({ error: "no_barcodes_available" });
    }

    await assignBarcodeTx(pool, {
      bookId,
      barcode,
      expectedSizeRuleId: rule.sizeRuleId,
      expectedPos: rule.pos,
    });

    await pool.query("COMMIT");

    const full = await fetchBookWithBarcode(pool, bookId);
    return res.status(201).json(rowToApi(full));
  } catch (err) {
    try {
      await pool.query("ROLLBACK");
    } catch {}

    const msg = String(err?.message || err);
    const map = {
      barcode_not_found: [404, "barcode_not_found"],
      barcode_not_available: [409, "barcode_not_available"],
      barcode_already_assigned: [409, "barcode_already_assigned"],
      barcode_wrong_series: [400, "barcode_wrong_series"],
      barcode_wrong_position: [400, "barcode_wrong_position"],
    };
    if (map[msg]) {
      const [status, code] = map[msg];
      return res.status(status).json({ error: code });
    }

    console.error("registerBook error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/* --------------------------------- update --------------------------------- */

async function updateBook(req, res) {
  try {
    const pool = getPool(req);
    const id = String(req.params.id || "").trim();
    if (!UUID_RE.test(id)) return res.status(400).json({ error: "invalid_id" });

    const patch = req.body || {};
    const cols = await getColumns(pool, "books");

    const updates = {
      author: normalizeStr(patch.BAutor ?? patch.author_lastname ?? patch.author),
      author_firstname: normalizeStr(patch.author_firstname),
      male_female: normalizeStr(patch.male_female),
      author_nationality: normalizeStr(patch.author_nationality),
      place_of_birth: normalizeStr(patch.place_of_birth),
      published_titles: patch.published_titles !== undefined ? normalizeInt(patch.published_titles) : undefined,
      number_of_millionsellers:
        patch.number_of_millionsellers !== undefined ? normalizeInt(patch.number_of_millionsellers) : undefined,

      publisher: normalizeStr(patch.BVerlag ?? patch.publisher),

      title_keyword: normalizeStr(patch.BKw ?? patch.title_keyword),
      title_keyword_position:
        patch.BKP !== undefined || patch.title_keyword_position !== undefined
          ? normalizeInt(patch.BKP ?? patch.title_keyword_position)
          : undefined,
      title_keyword2: normalizeStr(patch.BKw1 ?? patch.title_keyword2),
      title_keyword2_position:
        patch.BK1P !== undefined || patch.title_keyword2_position !== undefined
          ? normalizeInt(patch.BK1P ?? patch.title_keyword2_position)
          : undefined,
      title_keyword3: normalizeStr(patch.BKw2 ?? patch.title_keyword3),
      title_keyword3_position:
        patch.BK2P !== undefined || patch.title_keyword3_position !== undefined
          ? normalizeInt(patch.BK2P ?? patch.title_keyword3_position)
          : undefined,

      pages: patch.BSeiten !== undefined || patch.pages !== undefined ? normalizeInt(patch.BSeiten ?? patch.pages) : undefined,

      top_book: patch.BTop !== undefined || patch.top_book !== undefined ? normalizeBool(patch.BTop ?? patch.top_book) : undefined,
      reading_status: normalizeStr(patch.status ?? patch.reading_status) ?? undefined,
    };

    // width/height updates
    if (patch.BBreite !== undefined || patch.width !== undefined) {
      const w = toNum(patch.BBreite ?? patch.width);
      updates.width = Number.isFinite(w) ? cmToMm(w) : null;
    }
    if (patch.BHoehe !== undefined || patch.height !== undefined) {
      const h = toNum(patch.BHoehe ?? patch.height);
      updates.height = Number.isFinite(h) ? cmToMm(h) : null;
    }

    // Recompute author_display/full_title if schema supports it.
    const authorChanged = updates.author !== undefined || updates.author_firstname !== undefined;
    if (authorChanged && cols.has("author_display")) {
      const current = await pool.query(`SELECT author, author_firstname FROM public.books WHERE id=$1`, [id]);
      const cur = current.rows[0] || {};
      const nextFirst = updates.author_firstname !== undefined ? updates.author_firstname : cur.author_firstname;
      const nextLast = updates.author !== undefined ? updates.author : cur.author;
      updates.author_display = computeAuthorDisplay(nextFirst, nextLast);
    }

    const titleChanged =
      updates.title_keyword !== undefined ||
      updates.title_keyword_position !== undefined ||
      updates.title_keyword2 !== undefined ||
      updates.title_keyword2_position !== undefined ||
      updates.title_keyword3 !== undefined ||
      updates.title_keyword3_position !== undefined;

    if (titleChanged && cols.has("full_title")) {
      const current = await pool.query(
        `
        SELECT title_keyword, title_keyword_position,
               title_keyword2, title_keyword2_position,
               title_keyword3, title_keyword3_position
        FROM public.books WHERE id=$1
        `,
        [id]
      );
      const cur = current.rows[0] || {};
      const next = {
        kw: updates.title_keyword !== undefined ? updates.title_keyword : cur.title_keyword,
        pos: updates.title_keyword_position !== undefined ? updates.title_keyword_position : cur.title_keyword_position,
        kw1: updates.title_keyword2 !== undefined ? updates.title_keyword2 : cur.title_keyword2,
        pos1:
          updates.title_keyword2_position !== undefined ? updates.title_keyword2_position : cur.title_keyword2_position,
        kw2: updates.title_keyword3 !== undefined ? updates.title_keyword3 : cur.title_keyword3,
        pos2:
          updates.title_keyword3_position !== undefined ? updates.title_keyword3_position : cur.title_keyword3_position,
      };
      updates.full_title = computeFullTitle(next);
    }

    const setObj = pickKnownColumns(cols, updates);
    const keys = Object.keys(setObj).filter((k) => setObj[k] !== undefined);
    if (!keys.length) return res.status(400).json({ error: "no_fields" });

    const values = keys.map((k) => setObj[k]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);

    const upd = await pool.query(
      `UPDATE public.books SET ${sets.join(", ")} WHERE id = $${keys.length + 1} RETURNING id`,
      [...values, id]
    );
    if (!upd.rowCount) return res.status(404).json({ error: "not_found" });

    const full = await fetchBookWithBarcode(pool, id);
    return res.json(rowToApi(full));
  } catch (err) {
    console.error("updateBook error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/* --------------------------------- drop --------------------------------- */

async function dropBook(req, res) {
  try {
    const pool = getPool(req);
    const id = String(req.params.id || "").trim();
    if (!UUID_RE.test(id)) return res.status(400).json({ error: "invalid_id" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Free active barcode assignments (your schema uses barcode_assignments)
      await client.query(
        `
        UPDATE public.barcode_assignments
        SET freed_at = now()
        WHERE book_id = $1::uuid
          AND freed_at IS NULL
        `,
        [id]
      );

      // 2) Remove legacy mapping (your codebase also uses book_barcodes)
      await client.query(`DELETE FROM public.book_barcodes WHERE book_id = $1::uuid`, [id]);

      // 3) Delete the book itself
      const del = await client.query(`DELETE FROM public.books WHERE id = $1::uuid RETURNING id`, [id]);

      await client.query("COMMIT");

      if (!del.rowCount) return res.status(404).json({ error: "not_found" });
      return res.status(204).send();
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      // FK conflict (book referenced by other tables)
      if (String(e?.code) === "23503") {
        return res.status(409).json({
          error: "conflict_foreign_key",
          detail: "Book is referenced by other records; cannot delete.",
        });
      }

      console.error("dropBook error", e);
      return res.status(500).json({ error: "delete_failed", detail: String(e?.message || e) });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("dropBook error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = {
  listBooks,
  autocomplete,
  registerBook,
  updateBook,
  dropBook, // ✅ wichtig
};