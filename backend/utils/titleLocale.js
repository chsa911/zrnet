// backend/utils/titleLocale.js
// Locales for translated book titles (public.book_title_translations).
// Must match the UI languages in frontend/src/context/I18nContext.jsx.

const TITLE_LOCALES = ["de", "en", "fr", "es", "pt-BR"];

/**
 * Normalize a requested UI language to a supported title locale.
 * Accepts "de", "de-DE", "pt-BR", "pt_br", "pt" … Returns null if unsupported/missing.
 */
function normalizeTitleLocale(raw) {
  const s = String(raw ?? "").trim().replace("_", "-");
  if (!s) return null;
  const exact = TITLE_LOCALES.find((l) => l.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  const base = s.split("-")[0].toLowerCase();
  if (base === "pt") return "pt-BR";
  return TITLE_LOCALES.includes(base) ? base : null;
}

module.exports = { TITLE_LOCALES, normalizeTitleLocale };

/* ---------------------------------------------------------------------------
 * Feature check: are the title-translation migrations applied?
 * (V20261006_01__book_title_translations.sql creates the table and books.original_title)
 * Until they are, public pages keep working with original titles and the admin
 * page shows a "not active yet" message instead of failing.
 * ------------------------------------------------------------------------- */
let _ready = null;
let _checkedAt = 0;

async function titleTranslationsReady(pool) {
  if (_ready === true) return true; // once present, it stays present
  if (_ready === false && Date.now() - _checkedAt < 60_000) return false;
  try {
    const { rows } = await pool.query(`
      SELECT
        to_regclass('public.book_title_translations') IS NOT NULL AS has_table,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'original_title'
        ) AS has_col
    `);
    _ready = Boolean(rows[0]?.has_table && rows[0]?.has_col);
  } catch {
    _ready = false;
  }
  _checkedAt = Date.now();
  return _ready;
}

/**
 * SQL for the "tt" join. When the table is missing, joins an empty stand-in with the
 * same columns, still referencing the locale parameter so query parameters stay identical.
 */
function titleTranslationJoin(ready, localeParam) {
  return ready
    ? `LEFT JOIN public.book_title_translations tt ON tt.book_id = b.id AND tt.locale = ${localeParam}`
    : `LEFT JOIN (
         SELECT NULL::uuid AS book_id, NULL::text AS title, NULL::text AS title_kind,
                NULL::boolean AS edition_available
         WHERE ${localeParam}::text IS NULL AND false
       ) tt ON false`;
}

module.exports.titleTranslationsReady = titleTranslationsReady;
module.exports.titleTranslationJoin = titleTranslationJoin;
