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

// ISBN: allow user input like "978-3-..." but store canonical digits/X only.
// This prevents DB constraint failures (e.g. CHECK isbn13 ~ '^[0-9]{13}$').
function stripIsbnLike(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
}

function normalizeIsbnForDb(isbn13In, isbn10In, rawIn) {
  const a = stripIsbnLike(isbn13In);
  const b = stripIsbnLike(isbn10In);
  const raw = stripIsbnLike(rawIn) || a || b || null;

  let isbn13 = null;
  let isbn10 = null;

  if (a.length === 13 && /^[0-9]{13}$/.test(a)) isbn13 = a;
  if (b.length === 10 && /^[0-9]{9}[0-9X]$/.test(b)) isbn10 = b;

  // User may paste ISBN-10 into the ISBN-13 field (or vice versa).
  if (!isbn10 && a.length === 10 && /^[0-9]{9}[0-9X]$/.test(a)) isbn10 = a;
  if (!isbn13 && b.length === 13 && /^[0-9]{13}$/.test(b)) isbn13 = b;

  const isbn13_raw = raw && !isbn13 && !isbn10 ? raw : null;
  return { isbn13, isbn10, isbn13_raw };
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

  const publisherName = normalizeStr(row.publisher_name) || null;
  const publisherNameDisplay = normalizeStr(row.publisher_name_display) || normalizeStr(row.publisher) || null;

  return {
    id: row.id,
    _id: row.id,

    barcode: row.barcode ?? null,
    BMarkb: row.barcode ?? null,
    BMark: row.barcode ?? null,    author_lastname: authorLast,
    author_firstname: authorFirst,
    name_display: authorNameDisplay || null,
    male_female: row.male_female ?? null,
    author_nationality: row.author_nationality ?? null,
    place_of_birth: row.place_of_birth ?? null,
    published_titles: row.published_titles ?? null,
    number_of_millionsellers: row.number_of_millionsellers ?? null,

    // legacy aliases used in UI
    // (UI labels are German, but key names are legacy)
    BAutor: authorDisplay,
    Autor: authorDisplay,
    publisher_name: publisherName,
    publisher_name_display: publisherNameDisplay,

    BVerlag: publisherNameDisplay,
    publisher: publisherNameDisplay,

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
    isbn13: row.isbn13 ?? null,
    isbn10: row.isbn10 ?? null,
    title_en: row.title_en ?? null,
    comment: row.comment ?? null,
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



/* ------------------------- author / publisher helpers ---------------------- */

function normalizeKey(v) {
  const s = normalizeStr(v);
  if (!s) return null;
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function splitNameDisplay(display) {
  const d = normalizeStr(display);
  if (!d) return { first: null, last: null };
  const parts = d.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: null, last: parts[0] || null };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

async function upsertAuthor(db, { key, firstName, lastName, nameDisplay }) {
  const k = normalizeKey(key || lastName || nameDisplay);
  if (!k) return null;

  const disp = normalizeStr(nameDisplay);
  const first = normalizeStr(firstName);
  const last = normalizeStr(lastName);
  const guessed = splitNameDisplay(disp);

  // If last/first missing, fall back to parsing name_display.
  const effFirst = first ?? guessed.first;
  const effLast = last ?? guessed.last;

  const full = disp || computeAuthorDisplay(effFirst, effLast);

  const { rows } = await db.query(
    `
    INSERT INTO public.authors (name, name_display, first_name, last_name, full_name)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (name) DO UPDATE SET
      name_display = COALESCE(EXCLUDED.name_display, public.authors.name_display),
      first_name   = COALESCE(EXCLUDED.first_name,   public.authors.first_name),
      last_name    = COALESCE(EXCLUDED.last_name,    public.authors.last_name),
      full_name    = COALESCE(EXCLUDED.full_name,    public.authors.full_name)
    RETURNING id, name, name_display, first_name, last_name
    `,
    [k, disp, effFirst, effLast, full]
  );

  return rows[0] || null;
}

async function upsertPublisher(db, { key, nameDisplay }) {
  const k = normalizeKey(key || nameDisplay);
  if (!k) return null;

  const disp = normalizeStr(nameDisplay);

  const { rows } = await db.query(
    `
    INSERT INTO public.publishers (name, name_display)
    VALUES ($1, $2)
    ON CONFLICT (name) DO UPDATE SET
      name_display = COALESCE(EXCLUDED.name_display, public.publishers.name_display)
    RETURNING id, name, name_display
    `,
    [k, disp]
  );

  return rows[0] || null;
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

  // Mirror /api/barcodes/preview-barcode behavior (uses max_width + eq_heights)
  const { rows } = await pool.query(
    `
    SELECT id, name, min_height, eq_heights
    FROM public.size_rules
    WHERE $1 >= min_width
      AND ($1 <= max_width OR max_width IS NULL)
    ORDER BY min_width DESC
    LIMIT 1
    `,
    [wMm]
  );

  const r = rows[0];
  if (!r) return null;

  const eq = Array.isArray(r.eq_heights) && r.eq_heights.length ? r.eq_heights : [205, 210, 215];

  let pos = "o";
  if (eq.includes(hMm)) pos = "l";
  else if (hMm <= Number(r.min_height)) pos = "d";
  else pos = "o";

  return { sizeRuleId: r.id, color: r.name, pos };
}

function posToBand(pos) {
  if (pos === "l") return "special";
  if (pos === "d") return "low";
  return "high"; // pos === "o"
}

/**
 * Pick best AVAILABLE barcode for given size_rule_id and pos.
 * Uses barcode_numbers.rank_in_series if present; falls back to lexical code order.
 */
async function pickBestBarcode(pool, sizeRuleId, pos) {
  const band = posToBand(String(pos || "").toLowerCase());
  const r = await pool.query(
    `
    SELECT bi.barcode
    FROM public.barcode_inventory bi
    LEFT JOIN public.barcode_assignments ba
      ON lower(ba.barcode) = lower(bi.barcode)
     AND ba.freed_at IS NULL
    WHERE bi.status = 'AVAILABLE'
      AND bi.rank_in_inventory IS NOT NULL
      AND (bi.size_rule_id = $1 OR bi.sizegroup = $1)
      AND bi.band = $2
      AND ba.barcode IS NULL
    ORDER BY bi.rank_in_inventory
    LIMIT 1
    `,
    [sizeRuleId, band]
  );
  return r.rows[0]?.barcode ?? null;
}

async function assignBarcodeTx(pool, { bookId, barcode, expectedSizeRuleId, expectedPos, assignedAt }) {
  // lock inventory row
  const inv = await pool.query(
    `
    SELECT barcode, status, size_rule_id, sizegroup, band
    FROM public.barcode_inventory
    WHERE lower(barcode) = lower($1)
    FOR UPDATE
    `,
    [barcode]
  );
  const row = inv.rows[0];
  if (!row) throw new Error("barcode_not_found");
  if (String(row.status).toUpperCase() !== "AVAILABLE") throw new Error("barcode_not_available");

  if (expectedSizeRuleId) {
    const ok = String(row.size_rule_id || "") === String(expectedSizeRuleId) || String(row.sizegroup || "") === String(expectedSizeRuleId);
    if (!ok) throw new Error("barcode_wrong_series");
  }
  if (expectedPos) {
    const expectedBand = posToBand(String(expectedPos).toLowerCase());
    if (String(row.band || "").toLowerCase() !== expectedBand) throw new Error("barcode_wrong_position");
  }

  // guard: barcode must not have an open assignment
  const open = await pool.query(
    `SELECT 1 FROM public.barcode_assignments WHERE lower(barcode)=lower($1) AND freed_at IS NULL LIMIT 1`,
    [barcode]
  );
  if (open.rowCount) throw new Error("barcode_already_assigned");

  // mark inventory (safe even if trigger also updates)
  await pool.query(
    `UPDATE public.barcode_inventory SET status='ASSIGNED', updated_at=now(), size_rule_id=COALESCE(size_rule_id,$2) WHERE lower(barcode)=lower($1)`,
    [barcode, expectedSizeRuleId || null]
  );

  // store current barcode on book
  await pool.query(`DELETE FROM public.book_barcodes WHERE book_id=$1`, [bookId]);
  await pool.query(`INSERT INTO public.book_barcodes (book_id, barcode) VALUES ($1,$2)`, [bookId, barcode]);

  // create open assignment (freed_at NULL)
  await pool.query(
    `INSERT INTO public.barcode_assignments (barcode, book_id, assigned_at, freed_at) VALUES ($1,$2,$3,NULL)`,
    [barcode, bookId, assignedAt || new Date().toISOString()]
  );
}

async function fetchBookWithBarcode(pool, bookId) {
  const { rows } = await pool.query(
    `
    SELECT
      b.*, 
      bb.barcode,
      a.name_display AS author_name_display,
      a.first_name   AS author_first_name,
      a.last_name    AS author_last_name,
      p.name         AS publisher_name,
      p.name_display AS publisher_name_display
    FROM public.books b
    LEFT JOIN public.authors a   ON a.id = b.author_id
    LEFT JOIN public.publishers p ON p.id = b.publisher_id
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
    BVerlag: "COALESCE(p.name_display, b.publisher)",
    BKw: "b.title_keyword",
    statusChangedAt: "COALESCE(b.reading_status_updated_at, b.registered_at)",
    status_changed_at: "COALESCE(b.reading_status_updated_at, b.registered_at)",
    reading_status_updated_at: "COALESCE(b.reading_status_updated_at, b.registered_at)",
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
          p.name_display ILIKE ${p} OR
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
// status filter (supports single value or CSV like "finished,abandoned")
const statusRaw = normalizeStr(req.query.status || req.query.reading_status);
if (statusRaw) {
  const parts = String(statusRaw)
    .split(",")
    .map((s) => mapReadingStatus(String(s || "").trim()))
    .filter(Boolean);

  const uniq = Array.from(new Set(parts));

  if (uniq.length === 1) {
    params.push(uniq[0]);
    where.push(`b.reading_status = $${params.length}`);
  } else if (uniq.length > 1) {
    params.push(uniq);
    where.push(`b.reading_status = ANY($${params.length}::text[])`);
  }
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



// ✅ theme filter (CSV field b.themes, exact token match like "mt.")
const theme = normalizeStr(req.query.theme);
if (theme) {
  params.push(String(theme).toLowerCase().trim());
  const p = `$${params.length}`;
  where.push(
    `regexp_split_to_array(lower(coalesce(b.themes,'')), '\\s*,\\s*') @> ARRAY[${p}]`
  );
}

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await pool.query(
      `
      SELECT count(*)::int AS total
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN public.publishers p ON p.id = b.publisher_id
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
        a.last_name    AS author_last_name,
        p.name         AS publisher_name,
        p.name_display AS publisher_name_display
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN public.publishers p ON p.id = b.publisher_id
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

/* ------------------------------ read one ---------------------------------- */

// Return a full book record (all columns) plus UI-friendly alias fields.
// Used by the edit form to prefill every field.
async function getBook(req, res) {
  try {
    const pool = getPool(req);
    const id = String(req.params.id || "").trim();
    if (!UUID_RE.test(id)) return res.status(400).json({ error: "bad_id" });

    const { rows } = await pool.query(
      `
      SELECT
        b.*,
        bb.barcode,
        a.name_display AS author_name_display,
        a.first_name   AS author_first_name,
        a.last_name    AS author_last_name,
        p.name         AS publisher_name,
        p.name_display AS publisher_name_display
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN public.publishers p ON p.id = b.publisher_id
      LEFT JOIN LATERAL (
        SELECT barcode FROM public.book_barcodes bb WHERE bb.book_id = b.id LIMIT 1
      ) bb ON true
      WHERE b.id = $1::uuid
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "not_found" });

    const row = rows[0];
    // Merge the raw DB row with the legacy/UI alias keys.
    // This way the edit form can show *all* fields and still reuse existing pick() logic.
    return res.json({ ...row, ...rowToApi(row) });
  } catch (err) {
    console.error("getBook error", err);
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
      const { rows } = await pool.query(
        `
        SELECT DISTINCT COALESCE(NULLIF(name_display,''), NULLIF(name,'')) AS v
        FROM public.publishers
        WHERE name_display ILIKE $1 OR name ILIKE $1
        ORDER BY v
        LIMIT $2
        `,
        [like, max]
      );
      return res.json(rows.map((r) => r.v).filter(Boolean));
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

  // Whether to assign/pick a barcode immediately.
  // Default is true (existing behavior). RegistrationForm can set assign_barcode=false.
  const assignBarcodeFlag = body.assign_barcode ?? body.assignBarcode;
  const assignBarcodeNow = assignBarcodeFlag === false ? false : true;

  const requestedBarcode = normalizeStr(body.barcode ?? body.BMarkb ?? body.BMark ?? body.code);

  const widthCm = toNum(body.BBreite ?? body.width);
  const heightCm = toNum(body.BHoehe ?? body.height);

  // Only require width/height when we want to auto-pick a barcode (assign now AND no barcode provided).
  if (assignBarcodeNow && !requestedBarcode) {
    if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
      return res.status(400).json({ error: "width_and_height_required" });
    }
  }

  // All metadata fields are optional; ISBN lookup can fill them later.
  const kw = normalizeStr(body.BKw ?? body.title_keyword);

  // Author (canonical) – optional
  const authorLastRaw = normalizeStr(body.author_lastname ?? body.BAutor ?? body.author_lastname ?? body.author);
  const authorFirstRaw = normalizeStr(body.author_firstname ?? body.authorFirstname ?? body.author_firstname);
  const authorDispRaw = normalizeStr(body.name_display ?? body.author_name_display ?? body.author_display);

  // Publisher (canonical)
  const publisherKeyRaw = normalizeStr(body.publisher_name);
  const publisherDispRaw = normalizeStr(body.publisher_name_display ?? body.BVerlag ?? body.publisher);

  const pool = getPool(req);
  // Only resolve size rule when we need to pick a barcode from dimensions.
  const rule = assignBarcodeNow && !requestedBarcode ? await resolveRuleAndPos(pool, widthCm, heightCm) : null;
  if (assignBarcodeNow && !requestedBarcode && !rule) return res.status(422).json({ error: "no_series_for_size" });
  const requestId = normalizeStr(body.requestId ?? body.request_id);

  const wMm = cmToMm(widthCm);
  const hMm = cmToMm(heightCm);

  // If we assign a barcode now, the book must be in_progress (DB invariant for open assignments).
  // Drafts (assign_barcode=false) are always created as in_stock so we can later find them reliably
  // via (pages/code) and/or ISBN during registration.
  const status = assignBarcodeNow ? "in_progress" : "in_stock";
  const nowIso = new Date().toISOString();
  const statusTs = status === "finished" || status === "abandoned" ? nowIso : null;

  try {
    const cols = await getColumns(pool, "books");

    const isbnInfo = normalizeIsbnForDb(
      body.isbn13,
      body.isbn10,
      body.isbn13_raw ?? body.isbn13Raw ?? body.isbn_raw ?? body.isbn
    );

    // Idempotency (optional): if request_id exists, return the existing book.
    if (requestId && cols.has("request_id")) {
      const exists = await pool.query(`SELECT id FROM public.books WHERE request_id = $1 LIMIT 1`, [requestId]);
      const existingId = exists.rows[0]?.id;
      if (existingId) {
        const existing = await fetchBookWithBarcode(pool, existingId);
        return res.status(200).json(rowToApi(existing));
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Upsert author + publisher and link via *_id columns
      const authorRow = await upsertAuthor(client, {
        key: authorLastRaw || authorDispRaw,
        firstName: authorFirstRaw,
        lastName: authorLastRaw,
        nameDisplay: authorDispRaw,
      });

      const publisherRow = await upsertPublisher(client, {
        key: publisherKeyRaw || publisherDispRaw,
        nameDisplay: publisherDispRaw,
      });

      const bookInsert = {
        author_id: authorRow?.id ?? null,
        publisher_id: publisherRow?.id ?? null,

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
        top_book_set_at: (normalizeBool(body.BTop ?? body.top_book) ?? false) ? nowIso : null,

        reading_status: status,
        reading_status_updated_at: statusTs,
        // Drafts (assign_barcode=false) should NOT set registered_at.
        registered_at: assignBarcodeNow ? nowIso : null,

        title_display: normalizeStr(body.title_display),
        title_en: normalizeStr(body.title_en),
        isbn13: isbnInfo.isbn13,
        isbn10: isbnInfo.isbn10,
        isbn13_raw: isbnInfo.isbn13_raw,
        purchase_url: normalizeStr(body.purchase_url),
        comment: normalizeStr(body.comment),

        full_title: computeFullTitle({
          kw,
          pos: body.BKP ?? body.title_keyword_position,
          kw1: body.BKw1 ?? body.title_keyword2,
          pos1: body.BK1P ?? body.title_keyword2_position,
          kw2: body.BKw2 ?? body.title_keyword3,
          pos2: body.BK2P ?? body.title_keyword3_position,
        }),

        request_id: requestId,

        // legacy denorm for compatibility (search/sort) if column exists
        publisher: publisherRow?.name_display ?? publisherDispRaw ?? null,
      };

      const insertObj = pickKnownColumns(cols, bookInsert);
      const insertKeys = Object.keys(insertObj);

      let insertedRow;
      if (!insertKeys.length) {
        const r = await client.query(`INSERT INTO public.books DEFAULT VALUES RETURNING *`);
        insertedRow = r.rows[0];
      } else {
        const vals = insertKeys.map((k) => insertObj[k]);
        const placeholders = insertKeys.map((_, i) => `$${i + 1}`);
        const r = await client.query(
          `INSERT INTO public.books (${insertKeys.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
          vals
        );
        insertedRow = r.rows[0];
      }

      const bookId = insertedRow?.id;
      if (!bookId) throw new Error("book_insert_failed");

      // If we explicitly do NOT want a barcode right now (e.g. "Neu im Bestand"),
      // finish here and allow barcode assignment later.
      if (!assignBarcodeNow) {
        await client.query("COMMIT");
        const full = await fetchBookWithBarcode(pool, bookId);
        return res.status(201).json(rowToApi(full));
      }

      let barcode = requestedBarcode;
      if (!barcode) {
        barcode = await pickBestBarcode(client, rule.sizeRuleId, rule.pos);
      }
      if (!barcode) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "no_barcodes_available" });
      }

      await assignBarcodeTx(client, {
        bookId,
        barcode,
        expectedSizeRuleId: rule ? rule.sizeRuleId : null,
        expectedPos: rule ? rule.pos : null,
        assignedAt: nowIso,
      });

      await client.query("COMMIT");

      const full = await fetchBookWithBarcode(pool, bookId);
      return res.status(201).json(rowToApi(full));
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    const msg = String(err?.message || err);
    const map = {
      barcode_not_found: [404, "barcode_not_found"],
      barcode_not_available: [409, "barcode_not_available"],
      barcode_already_assigned: [409, "barcode_already_assigned"],
      barcode_wrong_series: [400, "barcode_wrong_series"],
      barcode_wrong_position: [400, "barcode_wrong_position"],
    };
    if (map[msg]) {
      const [statusCode, code] = map[msg];
      return res.status(statusCode).json({ error: code });
    }

    console.error("registerBook error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/* ---------------------------- register existing ---------------------------- */

// Finalize an existing draft: assign/pick a barcode and persist metadata.
// Admin route: POST /api/admin/books/:id/register
async function registerExistingBook(req, res) {
  const pool = getPool(req);
  const id = String(req.params.id || "").trim();
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "invalid_id" });

  const body = req.body || {};

  const requestedBarcode = normalizeStr(body.barcode ?? body.BMarkb ?? body.BMark ?? body.code);
  const widthCm = toNum(body.BBreite ?? body.width);
  const heightCm = toNum(body.BHoehe ?? body.height);

  // Need either an explicit barcode OR size for auto-pick.
  if (!requestedBarcode) {
    if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
      return res.status(400).json({ error: "width_and_height_required" });
    }
  }

  const rule = !requestedBarcode ? await resolveRuleAndPos(pool, widthCm, heightCm) : null;
  if (!requestedBarcode && !rule) return res.status(422).json({ error: "no_series_for_size" });

  const nowIso = new Date().toISOString();
  const cols = await getColumns(pool, "books");

  const isbnProvided =
    body.isbn13 !== undefined ||
    body.isbn10 !== undefined ||
    body.isbn13_raw !== undefined ||
    body.isbn13Raw !== undefined ||
    body.isbn_raw !== undefined ||
    body.isbn !== undefined;

  const isbnInfo = isbnProvided
    ? normalizeIsbnForDb(
        body.isbn13,
        body.isbn10,
        body.isbn13_raw ?? body.isbn13Raw ?? body.isbn_raw ?? body.isbn
      )
    : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock book row
    const curRes = await client.query(
      `SELECT id, registered_at, reading_status FROM public.books WHERE id=$1::uuid FOR UPDATE`,
      [id]
    );
    if (!curRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "not_found" });
    }

    // Prevent double-registration if barcode already open
    const open = await client.query(
      `SELECT 1 FROM public.barcode_assignments WHERE book_id=$1::uuid AND freed_at IS NULL LIMIT 1`,
      [id]
    );
    if (open.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "already_registered" });
    }

    // Upsert author/publisher if provided
    const authorLastRaw = normalizeStr(body.author_lastname ?? body.BAutor ?? body.author_lastname ?? body.author);
    const authorFirstRaw = normalizeStr(body.author_firstname ?? body.authorFirstname ?? body.author_firstname);
    const authorDispRaw = normalizeStr(body.name_display ?? body.author_name_display ?? body.author_display);

    const publisherKeyRaw = normalizeStr(body.publisher_name);
    const publisherDispRaw = normalizeStr(body.publisher_name_display ?? body.BVerlag ?? body.publisher);

    const updates = {
      // must be in_progress to allow an open barcode assignment
      reading_status: "in_progress",
      registered_at: nowIso,
      reading_status_updated_at: null,
    };

    if ((authorLastRaw || authorFirstRaw || authorDispRaw) && cols.has("author_id")) {
      const authorRow = await upsertAuthor(client, {
        key: authorLastRaw || authorDispRaw,
        firstName: authorFirstRaw,
        lastName: authorLastRaw,
        nameDisplay: authorDispRaw,
      });
      if (authorRow?.id) updates.author_id = authorRow.id;
    }

    if ((publisherKeyRaw || publisherDispRaw) && cols.has("publisher_id")) {
      const publisherRow = await upsertPublisher(client, {
        key: publisherKeyRaw || publisherDispRaw,
        nameDisplay: publisherDispRaw,
      });
      if (publisherRow?.id) updates.publisher_id = publisherRow.id;
      if (cols.has("publisher")) updates.publisher = publisherRow?.name_display ?? publisherDispRaw ?? null;
    }

    // Apply basic metadata updates (all optional)
    if (body.title_display !== undefined && cols.has("title_display")) updates.title_display = normalizeStr(body.title_display);
    if (body.title_en !== undefined && cols.has("title_en")) updates.title_en = normalizeStr(body.title_en);
    if (body.purchase_url !== undefined && cols.has("purchase_url")) updates.purchase_url = normalizeStr(body.purchase_url);
    if (isbnInfo && cols.has("isbn13")) updates.isbn13 = isbnInfo.isbn13;
    if (isbnInfo && cols.has("isbn10")) updates.isbn10 = isbnInfo.isbn10;
    if (isbnInfo && cols.has("isbn13_raw")) updates.isbn13_raw = isbnInfo.isbn13_raw;
    if (body.comment !== undefined && cols.has("comment")) updates.comment = normalizeStr(body.comment);

    // keywords
    if (body.BKw !== undefined || body.title_keyword !== undefined) updates.title_keyword = normalizeStr(body.BKw ?? body.title_keyword);
    if (body.BKP !== undefined || body.title_keyword_position !== undefined) updates.title_keyword_position = normalizeInt(body.BKP ?? body.title_keyword_position);
    if (body.BKw1 !== undefined || body.title_keyword2 !== undefined) updates.title_keyword2 = normalizeStr(body.BKw1 ?? body.title_keyword2);
    if (body.BK1P !== undefined || body.title_keyword2_position !== undefined) updates.title_keyword2_position = normalizeInt(body.BK1P ?? body.title_keyword2_position);
    if (body.BKw2 !== undefined || body.title_keyword3 !== undefined) updates.title_keyword3 = normalizeStr(body.BKw2 ?? body.title_keyword3);
    if (body.BK2P !== undefined || body.title_keyword3_position !== undefined) updates.title_keyword3_position = normalizeInt(body.BK2P ?? body.title_keyword3_position);

    // pages
    if (body.BSeiten !== undefined || body.pages !== undefined) updates.pages = normalizeInt(body.BSeiten ?? body.pages);

    // width/height (cm)
    if (body.BBreite !== undefined || body.width !== undefined) {
      const w = toNum(body.BBreite ?? body.width);
      updates.width = Number.isFinite(w) ? cmToMm(w) : null;
    }
    if (body.BHoehe !== undefined || body.height !== undefined) {
      const h = toNum(body.BHoehe ?? body.height);
      updates.height = Number.isFinite(h) ? cmToMm(h) : null;
    }

    // recompute full_title if possible
    if (cols.has("full_title")) {
      const kw = normalizeStr(updates.title_keyword ?? body.BKw ?? body.title_keyword);
      updates.full_title = computeFullTitle({
        kw,
        pos: updates.title_keyword_position ?? body.BKP ?? body.title_keyword_position,
        kw1: updates.title_keyword2 ?? body.BKw1 ?? body.title_keyword2,
        pos1: updates.title_keyword2_position ?? body.BK1P ?? body.title_keyword2_position,
        kw2: updates.title_keyword3 ?? body.BKw2 ?? body.title_keyword3,
        pos2: updates.title_keyword3_position ?? body.BK2P ?? body.title_keyword3_position,
      });
    }

    const setObj = pickKnownColumns(cols, updates);
    const keys = Object.keys(setObj).filter((k) => setObj[k] !== undefined);
    if (keys.length) {
      const values = keys.map((k) => setObj[k]);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      await client.query(
        `UPDATE public.books SET ${sets.join(", ")} WHERE id = $${keys.length + 1}::uuid`,
        [...values, id]
      );
    }

    // Pick or use barcode
    let barcode = requestedBarcode;
    if (!barcode) barcode = await pickBestBarcode(client, rule.sizeRuleId, rule.pos);
    if (!barcode) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "no_barcodes_available" });
    }

    await assignBarcodeTx(client, {
      bookId: id,
      barcode,
      expectedSizeRuleId: rule ? rule.sizeRuleId : null,
      expectedPos: rule ? rule.pos : null,
      assignedAt: nowIso,
    });

    await client.query("COMMIT");
    const full = await fetchBookWithBarcode(pool, id);
    return res.json(rowToApi(full));
  } catch (err) {
    try {
      await client.query("ROLLBACK");
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
      const [statusCode, code] = map[msg];
      return res.status(statusCode).json({ error: code });
    }

    console.error("registerExistingBook error", err);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
}

/* --------------------------------- update --------------------------------- */

async function updateBook(req, res) {
  const pool = getPool(req);
  const id = String(req.params.id || "").trim();
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "invalid_id" });

  const patch = req.body || {};

  const cols = await getColumns(pool, "books");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock current row for timestamp logic
    const curRes = await client.query(
      `SELECT reading_status, reading_status_updated_at, top_book FROM public.books WHERE id=$1::uuid FOR UPDATE`,
      [id]
    );
    if (!curRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "not_found" });
    }
    const cur = curRes.rows[0];

    const updates = {};

    const isbnProvided =
      patch.isbn13 !== undefined ||
      patch.isbn10 !== undefined ||
      patch.isbn13_raw !== undefined ||
      patch.isbn13Raw !== undefined ||
      patch.isbn_raw !== undefined ||
      patch.isbn !== undefined;

    const isbnInfo = isbnProvided
      ? normalizeIsbnForDb(
          patch.isbn13,
          patch.isbn10,
          patch.isbn13_raw ?? patch.isbn13Raw ?? patch.isbn_raw ?? patch.isbn
        )
      : null;

    // ---------------- Author / Publisher ----------------
    const authorLastRaw = normalizeStr(patch.author_lastname ?? patch.BAutor ?? patch.author_lastname ?? patch.author);
    const authorFirstRaw = normalizeStr(patch.author_firstname);
    const authorDispRaw = normalizeStr(patch.name_display ?? patch.author_name_display ?? patch.author_display);

    if (patch.author_lastname !== undefined || patch.author_firstname !== undefined || patch.name_display !== undefined || patch.BAutor !== undefined || patch.author !== undefined) {
      const authorRow = await upsertAuthor(client, {
        key: authorLastRaw || authorDispRaw,
        firstName: authorFirstRaw,
        lastName: authorLastRaw,
        nameDisplay: authorDispRaw,
      });
      if (authorRow?.id && cols.has("author_id")) updates.author_id = authorRow.id;
    }

    const publisherKeyRaw = normalizeStr(patch.publisher_name);
    const publisherDispRaw = normalizeStr(patch.publisher_name_display ?? patch.BVerlag ?? patch.publisher);

    if (patch.publisher_name !== undefined || patch.publisher_name_display !== undefined || patch.BVerlag !== undefined || patch.publisher !== undefined) {
      const publisherRow = await upsertPublisher(client, {
        key: publisherKeyRaw || publisherDispRaw,
        nameDisplay: publisherDispRaw,
      });
      if (publisherRow?.id && cols.has("publisher_id")) updates.publisher_id = publisherRow.id;
      if (cols.has("publisher")) updates.publisher = publisherRow?.name_display ?? publisherDispRaw ?? null;
    }

    // ---------------- Simple scalar updates ----------------

    // title / links
    if (patch.title_display !== undefined && cols.has("title_display")) updates.title_display = normalizeStr(patch.title_display);
    if (patch.title_en !== undefined && cols.has("title_en")) updates.title_en = normalizeStr(patch.title_en);
    if (patch.purchase_url !== undefined && cols.has("purchase_url")) updates.purchase_url = normalizeStr(patch.purchase_url);
    if (isbnInfo && cols.has("isbn13")) updates.isbn13 = isbnInfo.isbn13;
    if (isbnInfo && cols.has("isbn10")) updates.isbn10 = isbnInfo.isbn10;
    if (isbnInfo && cols.has("isbn13_raw")) updates.isbn13_raw = isbnInfo.isbn13_raw;
    if (patch.comment !== undefined && cols.has("comment")) updates.comment = normalizeStr(patch.comment);

    // keywords
    if (patch.BKw !== undefined || patch.title_keyword !== undefined) updates.title_keyword = normalizeStr(patch.BKw ?? patch.title_keyword);
    if (patch.BKP !== undefined || patch.title_keyword_position !== undefined) updates.title_keyword_position = normalizeInt(patch.BKP ?? patch.title_keyword_position);

    if (patch.BKw1 !== undefined || patch.title_keyword2 !== undefined) updates.title_keyword2 = normalizeStr(patch.BKw1 ?? patch.title_keyword2);
    if (patch.BK1P !== undefined || patch.title_keyword2_position !== undefined) updates.title_keyword2_position = normalizeInt(patch.BK1P ?? patch.title_keyword2_position);

    if (patch.BKw2 !== undefined || patch.title_keyword3 !== undefined) updates.title_keyword3 = normalizeStr(patch.BKw2 ?? patch.title_keyword3);
    if (patch.BK2P !== undefined || patch.title_keyword3_position !== undefined) updates.title_keyword3_position = normalizeInt(patch.BK2P ?? patch.title_keyword3_position);

    // pages
    if (patch.BSeiten !== undefined || patch.pages !== undefined) updates.pages = normalizeInt(patch.BSeiten ?? patch.pages);

    // width/height
    if (patch.BBreite !== undefined || patch.width !== undefined) {
      const w = toNum(patch.BBreite ?? patch.width);
      updates.width = Number.isFinite(w) ? cmToMm(w) : null;
    }
    if (patch.BHoehe !== undefined || patch.height !== undefined) {
      const h = toNum(patch.BHoehe ?? patch.height);
      updates.height = Number.isFinite(h) ? cmToMm(h) : null;
    }

    // top_book + timestamp
    if (patch.BTop !== undefined || patch.top_book !== undefined) {
      const nextTop = normalizeBool(patch.BTop ?? patch.top_book);
      if (nextTop !== null && nextTop !== undefined) {
        updates.top_book = nextTop;
        if (cols.has("top_book_set_at")) {
          if (nextTop && !cur.top_book) updates.top_book_set_at = new Date().toISOString();
          if (!nextTop) updates.top_book_set_at = null;
        }
      }
    }

    // reading_status + timestamp
    if (patch.status !== undefined || patch.reading_status !== undefined) {
      const nextStatus = mapReadingStatus(patch.status ?? patch.reading_status);
      if (nextStatus) {
        updates.reading_status = nextStatus;
        if (cols.has("reading_status_updated_at")) {
          const changed = String(cur.reading_status || "") !== String(nextStatus || "");
          if (changed && (nextStatus === "finished" || nextStatus === "abandoned")) {
            updates.reading_status_updated_at = new Date().toISOString();
          } else if (changed && nextStatus !== "finished" && nextStatus !== "abandoned") {
            updates.reading_status_updated_at = null;
          }
        }
      }
    }

    // Recompute full_title if keywords changed and column exists
    const titleChanged =
      updates.title_keyword !== undefined ||
      updates.title_keyword_position !== undefined ||
      updates.title_keyword2 !== undefined ||
      updates.title_keyword2_position !== undefined ||
      updates.title_keyword3 !== undefined ||
      updates.title_keyword3_position !== undefined;

    if (titleChanged && cols.has("full_title")) {
      const current = await client.query(
        `
        SELECT title_keyword, title_keyword_position,
               title_keyword2, title_keyword2_position,
               title_keyword3, title_keyword3_position
        FROM public.books WHERE id=$1::uuid
        `,
        [id]
      );
      const curT = current.rows[0] || {};
      const next = {
        kw: updates.title_keyword !== undefined ? updates.title_keyword : curT.title_keyword,
        pos: updates.title_keyword_position !== undefined ? updates.title_keyword_position : curT.title_keyword_position,
        kw1: updates.title_keyword2 !== undefined ? updates.title_keyword2 : curT.title_keyword2,
        pos1: updates.title_keyword2_position !== undefined ? updates.title_keyword2_position : curT.title_keyword2_position,
        kw2: updates.title_keyword3 !== undefined ? updates.title_keyword3 : curT.title_keyword3,
        pos2: updates.title_keyword3_position !== undefined ? updates.title_keyword3_position : curT.title_keyword3_position,
      };
      updates.full_title = computeFullTitle(next);
    }

    const setObj = pickKnownColumns(cols, updates);
    const keys = Object.keys(setObj).filter((k) => setObj[k] !== undefined);
    if (!keys.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "no_fields" });
    }

    const values = keys.map((k) => setObj[k]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);

    await client.query(
      `UPDATE public.books SET ${sets.join(", ")} WHERE id = $${keys.length + 1}::uuid`,
      [...values, id]
    );

    await client.query("COMMIT");

    const full = await fetchBookWithBarcode(pool, id);
    return res.json(rowToApi(full));
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("updateBook error", err);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
}

/* --------------------------------- drop --------------------------------- */

async function dropBook(req, res) {
  const pool = getPool(req);
  const id = String(req.params.id || "").trim();
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "invalid_id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure the book exists and lock it so concurrent drops/updates don't race.
    const exists = await client.query(
      `SELECT id FROM public.books WHERE id = $1::uuid FOR UPDATE`,
      [id]
    );
    if (!exists.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "not_found" });
    }

    // 1) Free active barcode assignment(s)
    await client.query(
      `
      UPDATE public.barcode_assignments
      SET freed_at = now()
      WHERE book_id = $1::uuid
        AND freed_at IS NULL
      `,
      [id]
    );

    // 2) Remove current barcode mapping (book_barcodes is the canonical mapping table)
    await client.query(`DELETE FROM public.book_barcodes WHERE book_id = $1::uuid`, [id]);

    // 3) Delete the book itself
    await client.query(`DELETE FROM public.books WHERE id = $1::uuid`, [id]);

    await client.query("COMMIT");
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

    // Permissions
    if (String(e?.code) === "42501") {
      return res.status(403).json({
        error: "permission_denied",
        detail: "Missing DB privileges (need DELETE on public.books).",
      });
    }

    console.error("dropBook error", e);
    return res.status(500).json({ error: "delete_failed", detail: String(e?.message || e) });
  } finally {
    client.release();
  }
}


module.exports = {
  listBooks,
  getBook,
  autocomplete,
  registerBook,
  registerExistingBook,
  updateBook,
  dropBook, // ✅ wichtig
};