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

  const authorFirst = row.author_first_name ?? null;
  const authorLast = row.author_last_name ?? null;
  const authorNameDisplay =
    normalizeStr(row.author_name_display) || computeAuthorDisplay(authorFirst, authorLast);

  const publisherName = normalizeStr(row.publisher_name) || null;
  const publisherNameDisplay = normalizeStr(row.publisher_name_display) || publisherName || null;
  const publisherAbbr = normalizeStr(row.publisher_abbr) || null;

  return {
    id: row.id,
    _id: row.id,

    barcode: row.barcode ?? null,

    author_id: row.author_id ?? null,
    author_lastname: authorLast,
    author_firstname: authorFirst,
    name_display: authorNameDisplay || null,
    author_name_display: authorNameDisplay || null,
    author_abbreviation: row.author_abbreviation ?? null,
    author_nationality: row.author_nationality ?? null,
    place_of_birth: row.place_of_birth ?? null,
    male_female: row.male_female ?? null,
    published_titles: row.published_titles ?? null,
    number_of_millionsellers: row.number_of_millionsellers ?? null,

    publisher_id: row.publisher_id ?? null,
    publisher_name: publisherName,
    publisher_name_display: publisherNameDisplay,
    publisher_abbr: publisherAbbr,

    title_display: row.title_display ?? null,
    subtitle_display: row.subtitle_display ?? null,
    title_keyword: row.title_keyword ?? null,
    title_keyword_position: row.title_keyword_position ?? null,
    title_keyword2: row.title_keyword2 ?? null,
    title_keyword2_position: row.title_keyword2_position ?? null,
    title_keyword3: row.title_keyword3 ?? null,
    title_keyword3_position: row.title_keyword3_position ?? null,

    pages: row.pages ?? null,
    width_cm: widthCm,
    height_cm: heightCm,

    top_book: !!row.top_book,
    reading_status: row.reading_status ?? null,
    reading_status_updated_at: row.reading_status_updated_at ?? null,
    registered_at: row.registered_at ?? null,

    purchase_url: row.purchase_url ?? null,
    isbn13: row.isbn13 ?? null,
    isbn10: row.isbn10 ?? null,
    title_en: row.title_en ?? null,
    original_language: row.original_language ?? null,
    comment: row.comment ?? null,
  };
}

const AUTHOR_SORT_EXPR = `COALESCE(
  NULLIF(a.name_display, ''),
  NULLIF(concat_ws(' ', a.first_name, a.last_name), '')
)`;

const PUBLISHER_SORT_EXPR = `COALESCE(
  NULLIF(p.name_display, ''),
  NULLIF(p.name, '')
)`;

const AUTHOR_RESOLVE_JOIN_SQL = `
  LEFT JOIN public.authors a ON a.id = b.author_id
`;

const PUBLISHER_RESOLVE_JOIN_SQL = `
  LEFT JOIN public.publishers p ON p.id = b.publisher_id
`;

const AUTHOR_RESOLVE_SELECT_SQL = `
  a.id::text AS author_id,
  a.name_display AS author_name_display,
  a.first_name AS author_first_name,
  a.last_name AS author_last_name,
  a.abbreviation AS author_abbreviation,
  a.author_nationality AS author_nationality,
  a.place_of_birth AS place_of_birth,
  a.male_female AS male_female,
  a.published_titles AS published_titles,
  a.number_of_millionsellers AS number_of_millionsellers
`;

const PUBLISHER_RESOLVE_SELECT_SQL = `
  p.id::text AS publisher_id,
  p.name AS publisher_name,
  p.name_display AS publisher_name_display,
  p.abbr AS publisher_abbr
`;

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

function normalizeUuid(v) {
  const s = String(v || "").trim();
  return UUID_RE.test(s) ? s : null;
}


function parseExistingBookIdFromPgDetail(detail) {
  const m = /existing_id=([0-9a-f-]{36})/i.exec(String(detail || ""));
  return m?.[1] || null;
}

function sendKnownPgError(res, err) {
  const code = String(err?.code || "");
  const msg = String(err?.message || "");
  const detail = String(err?.detail || "");

  if (code === "23505" && /near_duplicate_book_blocked/i.test(msg)) {
    return res.status(409).json({
      error: "near_duplicate_book_blocked",
      message:
        "Ein sehr ähnlicher Bucheintrag wurde gerade eben bereits angelegt. Bitte den vorhandenen Eintrag weiterverwenden.",
      existing_book_id: parseExistingBookIdFromPgDetail(detail),
      detail: detail || null,
    });
  }

  return null;
}


async function upsertAuthor(
  db,
  {
    authorId,
    key,
    firstName,
    lastName,
    nameDisplay,
    abbreviation,
    publishedTitles,
    numberOfMillionSellers,
    maleFemale,
    authorNationality,
    placeOfBirth,
  }
) {
  const authorUuid = normalizeUuid(authorId);
  const disp = normalizeStr(nameDisplay);
  const first = normalizeStr(firstName);
  const last = normalizeStr(lastName);
  const guessed = splitNameDisplay(disp);

  const effFirst = first ?? guessed.first;
  const effLast = last ?? guessed.last;
  const effDisplay = disp || computeAuthorDisplay(effFirst, effLast);
  const effAbbr = normalizeStr(abbreviation);
  const effPublished = normalizeInt(publishedTitles);
  const effMillions = normalizeInt(numberOfMillionSellers);
  const effMaleFemale = normalizeStr(maleFemale);
  const effNationality = normalizeStr(authorNationality);
  const effPlaceOfBirth = normalizeStr(placeOfBirth);
  const k = normalizeKey(key || effDisplay || effLast || effAbbr);

  if (!authorUuid && !k) return null;

  const baseCols = `id, name, name_display, first_name, last_name, abbreviation,
                    published_titles, number_of_millionsellers, male_female, author_nationality, place_of_birth`;

  const mergeAuthor = async (row) => {
    if (!row?.id) return null;
    const { rows } = await db.query(
      `
      UPDATE public.authors
      SET
        name_display = COALESCE($2, name_display),
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        abbreviation = COALESCE(abbreviation, $5),
        published_titles = COALESCE($6, published_titles),
        number_of_millionsellers = COALESCE($7, number_of_millionsellers),
        male_female = COALESCE($8, male_female),
        author_nationality = COALESCE($9, author_nationality),
        place_of_birth = COALESCE($10, place_of_birth)
      WHERE id = $1::uuid
      RETURNING ${baseCols}
      `,
      [
        row.id,
        effDisplay,
        effFirst,
        effLast,
        effAbbr,
        effPublished,
        effMillions,
        effMaleFemale,
        effNationality,
        effPlaceOfBirth,
      ]
    );
    return rows[0] || null;
  };

  const fetchById = async (id) => {
    const { rows } = await db.query(
      `SELECT ${baseCols} FROM public.authors WHERE id = $1::uuid LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  };

  if (authorUuid) {
    const row = await fetchById(authorUuid);
    if (row) return mergeAuthor(row);
  }

  if (effAbbr) {
    const byAbbr = await db.query(
      `SELECT ${baseCols} FROM public.authors WHERE lower(abbreviation) = lower($1) LIMIT 1`,
      [effAbbr]
    );
    if (byAbbr.rows[0]) return mergeAuthor(byAbbr.rows[0]);

    const byAlias = await db.query(
      `
      SELECT a.${baseCols}
      FROM public.author_aliases aa
      JOIN public.authors a ON lower(a.name) = lower(aa.full_name)
      WHERE aa.abbr_norm = regexp_replace(lower($1), '[^a-z0-9]+', '', 'g')
      LIMIT 1
      `,
      [effAbbr]
    );
    if (byAlias.rows[0]) return mergeAuthor(byAlias.rows[0]);
  }

  if (effDisplay || (effFirst && effLast) || k) {
    const byName = await db.query(
      `
      SELECT ${baseCols}
      FROM public.authors
      WHERE ($1::text IS NOT NULL AND lower(name_display) = lower($1))
         OR ($2::text IS NOT NULL AND $3::text IS NOT NULL AND lower(first_name) = lower($2) AND lower(last_name) = lower($3))
         OR ($4::text IS NOT NULL AND lower(name) = lower($4))
      ORDER BY
        CASE
          WHEN $1::text IS NOT NULL AND lower(name_display) = lower($1) THEN 1
          WHEN $2::text IS NOT NULL AND $3::text IS NOT NULL AND lower(first_name) = lower($2) AND lower(last_name) = lower($3) THEN 2
          WHEN $4::text IS NOT NULL AND lower(name) = lower($4) THEN 3
          ELSE 99
        END,
        name_display NULLS LAST,
        id
      LIMIT 1
      `,
      [effDisplay, effFirst, effLast, k]
    );
    if (byName.rows[0]) return mergeAuthor(byName.rows[0]);
  }

  if (effLast) {
    const uniqueLast = await db.query(
      `
      SELECT ${baseCols}
      FROM public.authors
      WHERE lower(last_name) = lower($1)
      ORDER BY name_display NULLS LAST, id
      LIMIT 2
      `,
      [effLast]
    );
    if (uniqueLast.rows.length === 1) return mergeAuthor(uniqueLast.rows[0]);
  }

  if (!k) return null;

  try {
    const { rows } = await db.query(
      `
      INSERT INTO public.authors (
        name, name_display, first_name, last_name,
        abbreviation, published_titles, number_of_millionsellers,
        male_female, author_nationality, place_of_birth
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (name) DO UPDATE SET
        name_display = COALESCE(EXCLUDED.name_display, public.authors.name_display),
        first_name   = COALESCE(EXCLUDED.first_name, public.authors.first_name),
        last_name    = COALESCE(EXCLUDED.last_name, public.authors.last_name),
        abbreviation = COALESCE(public.authors.abbreviation, EXCLUDED.abbreviation),
        published_titles = COALESCE(EXCLUDED.published_titles, public.authors.published_titles),
        number_of_millionsellers = COALESCE(EXCLUDED.number_of_millionsellers, public.authors.number_of_millionsellers),
        male_female = COALESCE(EXCLUDED.male_female, public.authors.male_female),
        author_nationality = COALESCE(EXCLUDED.author_nationality, public.authors.author_nationality),
        place_of_birth = COALESCE(EXCLUDED.place_of_birth, public.authors.place_of_birth)
      RETURNING ${baseCols}
      `,
      [
        k,
        effDisplay,
        effFirst,
        effLast,
        effAbbr,
        effPublished,
        effMillions,
        effMaleFemale,
        effNationality,
        effPlaceOfBirth,
      ]
    );
    return rows[0] || null;
  } catch (err) {
    if (String(err?.code) !== "23505") throw err;

    if (effAbbr) {
      const byAbbr = await db.query(
        `SELECT ${baseCols} FROM public.authors WHERE lower(abbreviation) = lower($1) LIMIT 1`,
        [effAbbr]
      );
      if (byAbbr.rows[0]) return mergeAuthor(byAbbr.rows[0]);
    }

    const byName = await db.query(
      `SELECT ${baseCols} FROM public.authors WHERE lower(name) = lower($1) LIMIT 1`,
      [k]
    );
    if (byName.rows[0]) return mergeAuthor(byName.rows[0]);

    throw err;
  }
}

function normalizePublisherAbbr(v) {
  const s = normalizeStr(v);
  return s ? s.replace(/\s+/g, " ").trim() : null;
}

async function upsertPublisher(db, { publisherId, key, nameDisplay, abbr }) {
  const publisherUuid = normalizeUuid(publisherId);
  const disp = normalizeStr(nameDisplay);
  const ab = normalizePublisherAbbr(abbr);
  const k = normalizeKey(key || disp || ab);
  if (!publisherUuid && !k) return null;

  const baseCols = `id, name, name_display, abbr`;

  const mergePublisher = async (row) => {
    if (!row?.id) return null;
    const { rows } = await db.query(
      `
      UPDATE public.publishers
      SET
        name_display = COALESCE($2, name_display),
        abbr = COALESCE(abbr, $3)
      WHERE id = $1::uuid
      RETURNING ${baseCols}
      `,
      [row.id, disp, ab]
    );
    return rows[0] || null;
  };

  if (publisherUuid) {
    const byId = await db.query(`SELECT ${baseCols} FROM public.publishers WHERE id = $1::uuid LIMIT 1`, [publisherUuid]);
    if (byId.rows[0]) return mergePublisher(byId.rows[0]);
  }

  if (ab) {
    const byAbbr = await db.query(
      `
      SELECT ${baseCols}
      FROM public.publishers
      WHERE lower(abbr) = lower($1)
         OR regexp_replace(lower(abbr), '[^a-z0-9]+', '', 'g') = regexp_replace(lower($1), '[^a-z0-9]+', '', 'g')
      LIMIT 1
      `,
      [ab]
    );
    if (byAbbr.rows[0]) return mergePublisher(byAbbr.rows[0]);

    const byAlias = await db.query(
      `
      SELECT p.${baseCols}
      FROM public.publisher_aliases pa
      JOIN public.publishers p ON lower(p.name) = lower(pa.full_name)
      WHERE pa.abbr_norm = regexp_replace(lower($1), '[^a-z0-9]+', '', 'g')
      LIMIT 1
      `,
      [ab]
    );
    if (byAlias.rows[0]) return mergePublisher(byAlias.rows[0]);
  }

  if (disp || k) {
    const byName = await db.query(
      `
      SELECT ${baseCols}
      FROM public.publishers
      WHERE ($1::text IS NOT NULL AND lower(name_display) = lower($1))
         OR ($2::text IS NOT NULL AND lower(name) = lower($2))
      ORDER BY
        CASE
          WHEN $1::text IS NOT NULL AND lower(name_display) = lower($1) THEN 1
          WHEN $2::text IS NOT NULL AND lower(name) = lower($2) THEN 2
          ELSE 99
        END,
        name_display NULLS LAST,
        name
      LIMIT 1
      `,
      [disp, k]
    );
    if (byName.rows[0]) return mergePublisher(byName.rows[0]);
  }

  if (!k) return null;

  const { rows } = await db.query(
    `
    INSERT INTO public.publishers (name, name_display, abbr)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET
      name_display = COALESCE(EXCLUDED.name_display, public.publishers.name_display),
      abbr = COALESCE(public.publishers.abbr, EXCLUDED.abbr)
    RETURNING ${baseCols}
    `,
    [k, disp, ab]
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
      ${AUTHOR_RESOLVE_SELECT_SQL},
      ${PUBLISHER_RESOLVE_SELECT_SQL}
    FROM public.books b
    ${AUTHOR_RESOLVE_JOIN_SQL}
    ${PUBLISHER_RESOLVE_JOIN_SQL}
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
    registered_at: "b.registered_at",
    author_name_display: AUTHOR_SORT_EXPR,
    publisher_name_display: PUBLISHER_SORT_EXPR,
    title_keyword: "b.title_keyword",
    reading_status_updated_at: "COALESCE(b.reading_status_updated_at, b.registered_at)",
    pages: "b.pages",
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
          ${AUTHOR_SORT_EXPR} ILIKE ${p} OR
          ${PUBLISHER_SORT_EXPR} ILIKE ${p} OR
          p.abbr ILIKE ${p} OR
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
      ${AUTHOR_RESOLVE_JOIN_SQL}
      ${PUBLISHER_RESOLVE_JOIN_SQL}
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
        ${AUTHOR_RESOLVE_SELECT_SQL},
        ${PUBLISHER_RESOLVE_SELECT_SQL}
      FROM public.books b
      ${AUTHOR_RESOLVE_JOIN_SQL}
      ${PUBLISHER_RESOLVE_JOIN_SQL}
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
        ${AUTHOR_RESOLVE_SELECT_SQL},
        ${PUBLISHER_RESOLVE_SELECT_SQL}
      FROM public.books b
      ${AUTHOR_RESOLVE_JOIN_SQL}
      ${PUBLISHER_RESOLVE_JOIN_SQL}
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
    const contains = `%${q}%`;

    const columns = await getColumns(pool, "books");

    if (field === "author_lastname" || field === "name_display") {
      const { rows } = await pool.query(
        `
        SELECT
          a.id::text AS id,
          a.first_name,
          a.last_name,
          a.name_display,
          a.abbreviation,
          a.author_nationality,
          a.place_of_birth,
          a.male_female,
          a.published_titles,
          a.number_of_millionsellers
        FROM public.authors a
        WHERE a.last_name ILIKE $1
           OR a.name_display ILIKE $1
           OR concat_ws(' ', a.first_name, a.last_name) ILIKE $1
           OR a.abbreviation ILIKE $1
        ORDER BY
          CASE
            WHEN lower(a.last_name) = lower($2) THEN 1
            WHEN lower(a.name_display) = lower($2) THEN 2
            WHEN lower(a.abbreviation) = lower($2) THEN 3
            ELSE 99
          END,
          a.name_display NULLS LAST,
          a.last_name NULLS LAST,
          a.first_name NULLS LAST,
          a.id
        LIMIT $3
        `,
        [contains, q, max]
      );
      return res.json(rows);
    }

    if (field === "publisher_name_display") {
      const { rows } = await pool.query(
        `
        SELECT
          p.id::text AS id,
          p.name,
          p.name_display,
          p.abbr
        FROM public.publishers p
        WHERE p.name_display ILIKE $1
           OR p.name ILIKE $1
           OR p.abbr ILIKE $1
        ORDER BY
          CASE
            WHEN lower(p.name_display) = lower($2) THEN 1
            WHEN lower(p.name) = lower($2) THEN 2
            WHEN lower(p.abbr) = lower($2) THEN 3
            ELSE 99
          END,
          p.name_display NULLS LAST,
          p.name,
          p.id
        LIMIT $3
        `,
        [contains, q, max]
      );
      return res.json(rows);
    }

    if (field === "title_keyword") {
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

    return res.json([]);
  } catch (err) {
    console.error("autocomplete error", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/* --------------------------------- create --------------------------------- */


async function registerBook(req, res) {
  const body = req.body || {};

  // Hard safety: if the client explicitly tells us which existing row to use,
  // never create a new book row.
  const explicitExistingId = normalizeUuid(
    body.existing_book_id ??
      body.existingBookId ??
      body.draft_id ??
      body.draftId
  );
  if (explicitExistingId) {
    req.params = { ...(req.params || {}), id: explicitExistingId };
    return registerExistingBook(req, res);
  }

  const assignBarcodeFlag = body.assign_barcode ?? body.assignBarcode;
  const assignBarcodeNow = !(
    assignBarcodeFlag === false ||
    assignBarcodeFlag === "false" ||
    assignBarcodeFlag === 0 ||
    assignBarcodeFlag === "0"
  );

  const requestedBarcode = normalizeStr(body.barcode);
  const widthCm = toNum(body.width_cm);
  const heightCm = toNum(body.height_cm);

  const pool = getPool(req);

  const isbnInfo = normalizeIsbnForDb(
    body.isbn13,
    body.isbn10,
    body.isbn13_raw ?? body.isbn13Raw ?? body.isbn_raw ?? body.isbn
  );

  // Second safety: if this ISBN already exists exactly once, finalize that row
  // instead of creating a new duplicate. If it exists multiple times, fail loudly.
  const exactIsbn = isbnInfo.isbn13 || isbnInfo.isbn10 || null;
  if (exactIsbn) {
    const dup = await pool.query(
      `
      SELECT id
      FROM public.books
      WHERE ($1::text IS NOT NULL AND isbn13 = $1)
         OR ($2::text IS NOT NULL AND isbn10 = $2)
      ORDER BY registered_at DESC NULLS LAST, added_at DESC NULLS LAST, id
      LIMIT 3
      `,
      [isbnInfo.isbn13 || null, isbnInfo.isbn10 || null]
    );

    if (dup.rows.length === 1) {
      if (assignBarcodeNow) {
        req.params = { ...(req.params || {}), id: dup.rows[0].id };
        return registerExistingBook(req, res);
      }

      return saveExistingBookWithoutBarcode(req, res, dup.rows[0].id);
    }
    if (dup.rows.length > 1) {
      return res.status(409).json({
        error: "duplicate_isbn_ambiguous",
        isbn13: isbnInfo.isbn13 || null,
        isbn10: isbnInfo.isbn10 || null,
        book_ids: dup.rows.map((r) => r.id),
      });
    }
  }

  if (assignBarcodeNow && !requestedBarcode) {
    if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
      return res.status(400).json({ error: "width_and_height_required" });
    }
  }

  const rule =
    assignBarcodeNow && !requestedBarcode
      ? await resolveRuleAndPos(pool, widthCm, heightCm)
      : null;
  if (assignBarcodeNow && !requestedBarcode && !rule) {
    return res.status(422).json({ error: "no_series_for_size" });
  }

  const requestId = normalizeStr(body.requestId ?? body.request_id);

  const wMm = cmToMm(widthCm);
  const hMm = cmToMm(heightCm);

  const status = assignBarcodeNow ? "in_progress" : "in_stock";
  const nowIso = new Date().toISOString();
  const statusTs = status === "finished" || status === "abandoned" ? nowIso : null;

  try {
    const cols = await getColumns(pool, "books");

    if (requestId && cols.has("request_id")) {
      const exists = await pool.query(
        `SELECT id FROM public.books WHERE request_id = $1 LIMIT 1`,
        [requestId]
      );
      const existingId = exists.rows[0]?.id;
      if (existingId) {
        const existing = await fetchBookWithBarcode(pool, existingId);
        return res.status(200).json(rowToApi(existing));
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const authorIdRaw = normalizeUuid(body.author_id);
      const authorLastRaw = normalizeStr(body.author_lastname);
      const authorFirstRaw = normalizeStr(body.author_firstname);
      const authorDispRaw = normalizeStr(body.name_display ?? body.author_name_display);
      const authorAbbrRaw = normalizeStr(body.author_abbreviation);
      const authorPublishedTitlesRaw = normalizeInt(body.published_titles);
      const authorMillionsRaw = normalizeInt(body.number_of_millionsellers);
      const authorNationalityRaw = normalizeStr(body.author_nationality);
      const authorPlaceOfBirthRaw = normalizeStr(body.place_of_birth);
      const authorMaleFemaleRaw = normalizeStr(body.male_female);

      const publisherIdRaw = normalizeUuid(body.publisher_id);
      const publisherDispRaw = normalizeStr(body.publisher_name_display);
      const publisherAbbrRaw = normalizePublisherAbbr(body.publisher_abbr);
      const publisherKeyRaw = normalizeKey(publisherDispRaw || publisherAbbrRaw);

      const authorRow = await upsertAuthor(client, {
        authorId: authorIdRaw,
        key: authorDispRaw || authorLastRaw,
        firstName: authorFirstRaw,
        lastName: authorLastRaw,
        nameDisplay: authorDispRaw,
        abbreviation: authorAbbrRaw,
        publishedTitles: authorPublishedTitlesRaw,
        numberOfMillionSellers: authorMillionsRaw,
        maleFemale: authorMaleFemaleRaw,
        authorNationality: authorNationalityRaw,
        placeOfBirth: authorPlaceOfBirthRaw,
      });

      const publisherRow = await upsertPublisher(client, {
        publisherId: publisherIdRaw,
        key: publisherKeyRaw,
        nameDisplay: publisherDispRaw,
        abbr: publisherAbbrRaw,
      });

      const topBook = normalizeBool(body.top_book) ?? false;

      const bookInsert = {
        author_id: authorRow?.id ?? null,
        publisher_id: publisherRow?.id ?? null,

        title_keyword: normalizeStr(body.title_keyword),
        title_keyword_position: normalizeInt(body.title_keyword_position),
        title_keyword2: normalizeStr(body.title_keyword2),
        title_keyword2_position: normalizeInt(body.title_keyword2_position),
        title_keyword3: normalizeStr(body.title_keyword3),
        title_keyword3_position: normalizeInt(body.title_keyword3_position),

        pages: normalizeInt(body.pages),
        width: Number.isFinite(wMm) ? wMm : null,
        height: Number.isFinite(hMm) ? hMm : null,

        top_book: topBook,
        top_book_set_at: topBook ? nowIso : null,

        reading_status: status,
        reading_status_updated_at: statusTs,
        registered_at: assignBarcodeNow ? nowIso : null,

        title_display: normalizeStr(body.title_display),
        subtitle_display: normalizeStr(body.subtitle_display),
        title_en: normalizeStr(body.title_en),
        isbn13: isbnInfo.isbn13,
        isbn10: isbnInfo.isbn10,
        isbn13_raw: isbnInfo.isbn13_raw,
        purchase_url: normalizeStr(body.purchase_url),
        comment: normalizeStr(body.comment),
        original_language: normalizeStr(body.original_language),
        request_id: requestId,
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

      if (!assignBarcodeNow) {
        await client.query("COMMIT");
        const full = await fetchBookWithBarcode(pool, bookId);
        return res.status(201).json(rowToApi(full));
      }

      let barcode = requestedBarcode;
      if (!barcode) barcode = await pickBestBarcode(client, rule.sizeRuleId, rule.pos);
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
    const knownPg = sendKnownPgError(res, err);
    if (knownPg) return knownPg;

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



async function saveExistingBookWithoutBarcode(req, res, idOverride) {
  const pool = getPool(req);
  const id = String(idOverride || req.params?.id || "").trim();
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "invalid_id" });

  const body = req.body || {};
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

    const curRes = await client.query(
      `
      SELECT reading_status, reading_status_updated_at, top_book, author_id, publisher_id, registered_at
      FROM public.books
      WHERE id=$1::uuid
      FOR UPDATE
      `,
      [id]
    );
    if (!curRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "not_found" });
    }
    const cur = curRes.rows[0];

    const updates = {
      reading_status: "in_stock",
      reading_status_updated_at: null,
      registered_at: null,
    };

    const authorIdRaw = normalizeUuid(body.author_id);
    const effectiveAuthorId = authorIdRaw || cur.author_id || null;
    const authorLastRaw = normalizeStr(body.author_lastname);
    const authorFirstRaw = normalizeStr(body.author_firstname);
    const authorDispRaw = normalizeStr(body.name_display ?? body.author_name_display);
    const authorAbbrRaw = normalizeStr(body.author_abbreviation);
    const authorPublishedTitlesRaw = normalizeInt(body.published_titles);
    const authorMillionsRaw = normalizeInt(body.number_of_millionsellers);
    const authorNationalityRaw = normalizeStr(body.author_nationality);
    const authorPlaceOfBirthRaw = normalizeStr(body.place_of_birth);
    const authorMaleFemaleRaw = normalizeStr(body.male_female);

    if (
      body.author_id !== undefined ||
      body.author_lastname !== undefined ||
      body.author_firstname !== undefined ||
      body.name_display !== undefined ||
      body.author_name_display !== undefined ||
      body.author_abbreviation !== undefined ||
      body.published_titles !== undefined ||
      body.number_of_millionsellers !== undefined ||
      body.author_nationality !== undefined ||
      body.place_of_birth !== undefined ||
      body.male_female !== undefined
    ) {
      const authorRow = await upsertAuthor(client, {
        authorId: effectiveAuthorId,
        key: authorDispRaw || authorLastRaw,
        firstName: authorFirstRaw,
        lastName: authorLastRaw,
        nameDisplay: authorDispRaw,
        abbreviation: authorAbbrRaw,
        publishedTitles: authorPublishedTitlesRaw,
        numberOfMillionSellers: authorMillionsRaw,
        maleFemale: authorMaleFemaleRaw,
        authorNationality: authorNationalityRaw,
        placeOfBirth: authorPlaceOfBirthRaw,
      });
      if (cols.has("author_id")) updates.author_id = authorRow?.id ?? effectiveAuthorId ?? null;
    }

    const publisherIdRaw = normalizeUuid(body.publisher_id);
    const effectivePublisherId = publisherIdRaw || cur.publisher_id || null;
    const publisherDispRaw = normalizeStr(body.publisher_name_display);
    const publisherAbbrRaw = normalizePublisherAbbr(body.publisher_abbr);
    const publisherKeyRaw = normalizeKey(publisherDispRaw || publisherAbbrRaw);

    if (
      body.publisher_id !== undefined ||
      body.publisher_name_display !== undefined ||
      body.publisher_abbr !== undefined
    ) {
      const publisherRow = await upsertPublisher(client, {
        publisherId: effectivePublisherId,
        key: publisherKeyRaw,
        nameDisplay: publisherDispRaw,
        abbr: publisherAbbrRaw,
      });
      if (cols.has("publisher_id")) updates.publisher_id = publisherRow?.id ?? effectivePublisherId ?? null;
    }

    if (body.title_display !== undefined && cols.has("title_display")) {
      updates.title_display = normalizeStr(body.title_display);
    }
    if (body.subtitle_display !== undefined && cols.has("subtitle_display")) {
      updates.subtitle_display = normalizeStr(body.subtitle_display);
    }
    if (body.title_en !== undefined && cols.has("title_en")) {
      updates.title_en = normalizeStr(body.title_en);
    }
    if (body.purchase_url !== undefined && cols.has("purchase_url")) {
      updates.purchase_url = normalizeStr(body.purchase_url);
    }
    if (body.original_language !== undefined && cols.has("original_language")) {
      updates.original_language = normalizeStr(body.original_language);
    }
    if (isbnInfo && cols.has("isbn13")) updates.isbn13 = isbnInfo.isbn13;
    if (isbnInfo && cols.has("isbn10")) updates.isbn10 = isbnInfo.isbn10;
    if (isbnInfo && cols.has("isbn13_raw")) updates.isbn13_raw = isbnInfo.isbn13_raw;
    if (body.comment !== undefined && cols.has("comment")) {
      updates.comment = normalizeStr(body.comment);
    }

    if (body.title_keyword !== undefined) updates.title_keyword = normalizeStr(body.title_keyword);
    if (body.title_keyword_position !== undefined) {
      updates.title_keyword_position = normalizeInt(body.title_keyword_position);
    }
    if (body.title_keyword2 !== undefined) updates.title_keyword2 = normalizeStr(body.title_keyword2);
    if (body.title_keyword2_position !== undefined) {
      updates.title_keyword2_position = normalizeInt(body.title_keyword2_position);
    }
    if (body.title_keyword3 !== undefined) updates.title_keyword3 = normalizeStr(body.title_keyword3);
    if (body.title_keyword3_position !== undefined) {
      updates.title_keyword3_position = normalizeInt(body.title_keyword3_position);
    }

    if (body.pages !== undefined) updates.pages = normalizeInt(body.pages);

    if (body.width_cm !== undefined) {
      const w = toNum(body.width_cm);
      updates.width = Number.isFinite(w) ? cmToMm(w) : null;
    }
    if (body.height_cm !== undefined) {
      const h = toNum(body.height_cm);
      updates.height = Number.isFinite(h) ? cmToMm(h) : null;
    }

    if (body.top_book !== undefined) {
      const nextTop = normalizeBool(body.top_book);
      if (nextTop !== null && nextTop !== undefined) {
        updates.top_book = nextTop;
        if (cols.has("top_book_set_at")) {
          updates.top_book_set_at = nextTop ? new Date().toISOString() : null;
        }
      }
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

    await client.query("COMMIT");
    const full = await fetchBookWithBarcode(pool, id);
    return res.status(200).json(rowToApi(full));
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    const knownPg = sendKnownPgError(res, err);
    if (knownPg) return knownPg;

    console.error("saveExistingBookWithoutBarcode error", err);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
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

  const requestedBarcode = normalizeStr(body.barcode);
  const widthCm = toNum(body.width_cm);
  const heightCm = toNum(body.height_cm);

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

    const curRes = await client.query(
      `
      SELECT id, registered_at, reading_status, author_id, publisher_id
      FROM public.books
      WHERE id = $1::uuid
      FOR UPDATE
      `,
      [id]
    );
    if (!curRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "not_found" });
    }

    const open = await client.query(
      `SELECT 1 FROM public.barcode_assignments WHERE book_id=$1::uuid AND freed_at IS NULL LIMIT 1`,
      [id]
    );
    if (open.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "already_registered" });
    }

    const authorIdRaw = normalizeUuid(body.author_id);
    const effectiveAuthorId = authorIdRaw || curRes.rows[0]?.author_id || null;
    const authorLastRaw = normalizeStr(body.author_lastname);
    const authorFirstRaw = normalizeStr(body.author_firstname);
    const authorDispRaw = normalizeStr(body.name_display ?? body.author_name_display);
    const authorAbbrRaw = normalizeStr(body.author_abbreviation);
    const authorPublishedTitlesRaw = normalizeInt(body.published_titles);
    const authorMillionsRaw = normalizeInt(body.number_of_millionsellers);
    const authorNationalityRaw = normalizeStr(body.author_nationality);
    const authorPlaceOfBirthRaw = normalizeStr(body.place_of_birth);
    const authorMaleFemaleRaw = normalizeStr(body.male_female);

    const publisherIdRaw = normalizeUuid(body.publisher_id);
    const effectivePublisherId = publisherIdRaw || curRes.rows[0]?.publisher_id || null;
    const publisherDispRaw = normalizeStr(body.publisher_name_display);
    const publisherAbbrRaw = normalizePublisherAbbr(body.publisher_abbr);
    const publisherKeyRaw = normalizeKey(publisherDispRaw || publisherAbbrRaw);

    const updates = {
      reading_status: "in_progress",
      registered_at: nowIso,
      reading_status_updated_at: null,
    };

    if (
      authorIdRaw ||
      authorLastRaw ||
      authorFirstRaw ||
      authorDispRaw ||
      authorAbbrRaw ||
      authorPublishedTitlesRaw !== null ||
      authorMillionsRaw !== null ||
      authorNationalityRaw ||
      authorPlaceOfBirthRaw ||
      authorMaleFemaleRaw
    ) {
      const authorRow = await upsertAuthor(client, {
        authorId: effectiveAuthorId,
        key: authorDispRaw || authorLastRaw,
        firstName: authorFirstRaw,
        lastName: authorLastRaw,
        nameDisplay: authorDispRaw,
        abbreviation: authorAbbrRaw,
        publishedTitles: authorPublishedTitlesRaw,
        numberOfMillionSellers: authorMillionsRaw,
        maleFemale: authorMaleFemaleRaw,
        authorNationality: authorNationalityRaw,
        placeOfBirth: authorPlaceOfBirthRaw,
      });
      if (cols.has("author_id")) updates.author_id = authorRow?.id ?? effectiveAuthorId ?? null;
    }

    if (publisherIdRaw || publisherDispRaw || publisherAbbrRaw) {
      const publisherRow = await upsertPublisher(client, {
        publisherId: effectivePublisherId,
        key: publisherKeyRaw,
        nameDisplay: publisherDispRaw,
        abbr: publisherAbbrRaw,
      });
      if (cols.has("publisher_id")) updates.publisher_id = publisherRow?.id ?? effectivePublisherId ?? null;
    }

    if (body.title_display !== undefined && cols.has("title_display")) {
      updates.title_display = normalizeStr(body.title_display);
    }
    if (body.subtitle_display !== undefined && cols.has("subtitle_display")) {
      updates.subtitle_display = normalizeStr(body.subtitle_display);
    }
    if (body.title_en !== undefined && cols.has("title_en")) {
      updates.title_en = normalizeStr(body.title_en);
    }
    if (body.purchase_url !== undefined && cols.has("purchase_url")) {
      updates.purchase_url = normalizeStr(body.purchase_url);
    }
    if (body.original_language !== undefined && cols.has("original_language")) {
      updates.original_language = normalizeStr(body.original_language);
    }
    if (isbnInfo && cols.has("isbn13")) updates.isbn13 = isbnInfo.isbn13;
    if (isbnInfo && cols.has("isbn10")) updates.isbn10 = isbnInfo.isbn10;
    if (isbnInfo && cols.has("isbn13_raw")) updates.isbn13_raw = isbnInfo.isbn13_raw;
    if (body.comment !== undefined && cols.has("comment")) {
      updates.comment = normalizeStr(body.comment);
    }

    if (body.title_keyword !== undefined) updates.title_keyword = normalizeStr(body.title_keyword);
    if (body.title_keyword_position !== undefined) {
      updates.title_keyword_position = normalizeInt(body.title_keyword_position);
    }
    if (body.title_keyword2 !== undefined) updates.title_keyword2 = normalizeStr(body.title_keyword2);
    if (body.title_keyword2_position !== undefined) {
      updates.title_keyword2_position = normalizeInt(body.title_keyword2_position);
    }
    if (body.title_keyword3 !== undefined) updates.title_keyword3 = normalizeStr(body.title_keyword3);
    if (body.title_keyword3_position !== undefined) {
      updates.title_keyword3_position = normalizeInt(body.title_keyword3_position);
    }

    if (body.pages !== undefined) updates.pages = normalizeInt(body.pages);

    if (body.width_cm !== undefined) {
      const w = toNum(body.width_cm);
      updates.width = Number.isFinite(w) ? cmToMm(w) : null;
    }
    if (body.height_cm !== undefined) {
      const h = toNum(body.height_cm);
      updates.height = Number.isFinite(h) ? cmToMm(h) : null;
    }

    if (body.top_book !== undefined) {
      const nextTop = normalizeBool(body.top_book);
      if (nextTop !== null && nextTop !== undefined) {
        updates.top_book = nextTop;
        if (cols.has("top_book_set_at")) {
          updates.top_book_set_at = nextTop ? nowIso : null;
        }
      }
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

    const knownPg = sendKnownPgError(res, err);
    if (knownPg) return knownPg;

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

    const curRes = await client.query(
      `
      SELECT reading_status, reading_status_updated_at, top_book, author_id, publisher_id
      FROM public.books
      WHERE id=$1::uuid
      FOR UPDATE
      `,
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

    const authorIdRaw = normalizeUuid(patch.author_id);
    const effectiveAuthorId = authorIdRaw || cur.author_id || null;
    const authorLastRaw = normalizeStr(patch.author_lastname);
    const authorFirstRaw = normalizeStr(patch.author_firstname);
    const authorDispRaw = normalizeStr(patch.name_display ?? patch.author_name_display);
    const authorAbbrRaw = normalizeStr(patch.author_abbreviation);
    const authorPublishedTitlesRaw = normalizeInt(patch.published_titles);
    const authorMillionsRaw = normalizeInt(patch.number_of_millionsellers);
    const authorNationalityRaw = normalizeStr(patch.author_nationality);
    const authorPlaceOfBirthRaw = normalizeStr(patch.place_of_birth);
    const authorMaleFemaleRaw = normalizeStr(patch.male_female);

    if (
      patch.author_id !== undefined ||
      patch.author_lastname !== undefined ||
      patch.author_firstname !== undefined ||
      patch.name_display !== undefined ||
      patch.author_name_display !== undefined ||
      patch.author_abbreviation !== undefined ||
      patch.published_titles !== undefined ||
      patch.number_of_millionsellers !== undefined ||
      patch.author_nationality !== undefined ||
      patch.place_of_birth !== undefined ||
      patch.male_female !== undefined
    ) {
      const authorRow = await upsertAuthor(client, {
        authorId: effectiveAuthorId,
        key: authorDispRaw || authorLastRaw,
        firstName: authorFirstRaw,
        lastName: authorLastRaw,
        nameDisplay: authorDispRaw,
        abbreviation: authorAbbrRaw,
        publishedTitles: authorPublishedTitlesRaw,
        numberOfMillionSellers: authorMillionsRaw,
        maleFemale: authorMaleFemaleRaw,
        authorNationality: authorNationalityRaw,
        placeOfBirth: authorPlaceOfBirthRaw,
      });
      if (cols.has("author_id")) updates.author_id = authorRow?.id ?? effectiveAuthorId ?? null;
    }

    const publisherIdRaw = normalizeUuid(patch.publisher_id);
    const effectivePublisherId = publisherIdRaw || cur.publisher_id || null;
    const publisherDispRaw = normalizeStr(patch.publisher_name_display);
    const publisherAbbrRaw = normalizePublisherAbbr(patch.publisher_abbr);
    const publisherKeyRaw = normalizeKey(publisherDispRaw || publisherAbbrRaw);

    if (
      patch.publisher_id !== undefined ||
      patch.publisher_name_display !== undefined ||
      patch.publisher_abbr !== undefined
    ) {
      const publisherRow = await upsertPublisher(client, {
        publisherId: effectivePublisherId,
        key: publisherKeyRaw,
        nameDisplay: publisherDispRaw,
        abbr: publisherAbbrRaw,
      });
      if (cols.has("publisher_id")) updates.publisher_id = publisherRow?.id ?? effectivePublisherId ?? null;
    }

    if (patch.title_display !== undefined && cols.has("title_display")) {
      updates.title_display = normalizeStr(patch.title_display);
    }
    if (patch.subtitle_display !== undefined && cols.has("subtitle_display")) {
      updates.subtitle_display = normalizeStr(patch.subtitle_display);
    }
    if (patch.title_en !== undefined && cols.has("title_en")) {
      updates.title_en = normalizeStr(patch.title_en);
    }
    if (patch.purchase_url !== undefined && cols.has("purchase_url")) {
      updates.purchase_url = normalizeStr(patch.purchase_url);
    }
    if (patch.original_language !== undefined && cols.has("original_language")) {
      updates.original_language = normalizeStr(patch.original_language);
    }
    if (isbnInfo && cols.has("isbn13")) updates.isbn13 = isbnInfo.isbn13;
    if (isbnInfo && cols.has("isbn10")) updates.isbn10 = isbnInfo.isbn10;
    if (isbnInfo && cols.has("isbn13_raw")) updates.isbn13_raw = isbnInfo.isbn13_raw;
    if (patch.comment !== undefined && cols.has("comment")) {
      updates.comment = normalizeStr(patch.comment);
    }

    if (patch.title_keyword !== undefined) updates.title_keyword = normalizeStr(patch.title_keyword);
    if (patch.title_keyword_position !== undefined) {
      updates.title_keyword_position = normalizeInt(patch.title_keyword_position);
    }

    if (patch.title_keyword2 !== undefined) updates.title_keyword2 = normalizeStr(patch.title_keyword2);
    if (patch.title_keyword2_position !== undefined) {
      updates.title_keyword2_position = normalizeInt(patch.title_keyword2_position);
    }

    if (patch.title_keyword3 !== undefined) updates.title_keyword3 = normalizeStr(patch.title_keyword3);
    if (patch.title_keyword3_position !== undefined) {
      updates.title_keyword3_position = normalizeInt(patch.title_keyword3_position);
    }

    if (patch.pages !== undefined) updates.pages = normalizeInt(patch.pages);

    if (patch.width_cm !== undefined) {
      const w = toNum(patch.width_cm);
      updates.width = Number.isFinite(w) ? cmToMm(w) : null;
    }
    if (patch.height_cm !== undefined) {
      const h = toNum(patch.height_cm);
      updates.height = Number.isFinite(h) ? cmToMm(h) : null;
    }

    if (patch.top_book !== undefined) {
      const nextTop = normalizeBool(patch.top_book);
      if (nextTop !== null && nextTop !== undefined) {
        updates.top_book = nextTop;
        if (cols.has("top_book_set_at")) {
          if (nextTop && !cur.top_book) updates.top_book_set_at = new Date().toISOString();
          if (!nextTop) updates.top_book_set_at = null;
        }
      }
    }

    if (patch.reading_status !== undefined) {
      const nextStatus = mapReadingStatus(patch.reading_status);
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

    const knownPg = sendKnownPgError(res, err);
    if (knownPg) return knownPg;

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