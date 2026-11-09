// Auswahllisten für Landschaften und Epochen (Formular "Buch registrieren / bearbeiten").
//
//   GET /api/public/places/landscapes
//   GET /api/public/places/time-eras
//   GET /api/public/places/countries   (bereits verwendete Länderwerte)
//   GET /api/public/places/fictional   (bereits verwendete erfundene Orte)
//   GET /api/public/places/cities      (bereits verwendete Städte mit Region/Land/Bundesland)
//
// Jeder Eintrag: { id, slug, name, label, depth, parent_id, kind?, continent, country, ... }
//   label      Pfad für die Anzeige, z. B. "Karakorum › K2"
//   continent  Region-Code (books.action_continent), die beim Auswählen
//   country    Land (books.action_country, z. B. "D", "PK"), das beim Auswählen vorgeschlagen wird
//   state      Bundesland (books.action_state), nur zusammen mit diesem Land
//              (berechnet wie die DB-Trigger: landscape_place / time_era_place)
//
// Solange die Migrationen V20261109_01..03 noch nicht eingespielt sind, liefern
// beide Endpunkte eine leere Liste statt eines Fehlers.

const express = require("express");
const router = express.Router();

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

// undefined_table / undefined_function / undefined_column -> Migration fehlt noch
const NOT_MIGRATED = new Set(["42P01", "42883", "42703"]);

router.get("/landscapes", async (req, res) => {
  try {
    const { rows } = await getPool(req).query(`
      WITH RECURSIVE t AS (
        SELECT l.id, l.parent_id, l.name::text AS label, 1 AS depth,
               ARRAY[lpad(l.sort_order::text, 6, '0') || l.name] AS sortkey
        FROM public.landscapes l
        WHERE l.parent_id IS NULL AND l.is_active
        UNION ALL
        SELECT c.id, c.parent_id, t.label || ' › ' || c.name, t.depth + 1,
               t.sortkey || (lpad(c.sort_order::text, 6, '0') || c.name)
        FROM public.landscapes c
        JOIN t ON c.parent_id = t.id
        WHERE c.is_active AND t.depth < 10
      )
      SELECT t.id, l.slug, l.name, t.label, t.depth, t.parent_id, l.kind, l.height_m,
             p.continent, p.country, p.state
      FROM t
      JOIN public.landscapes l ON l.id = t.id
      CROSS JOIN LATERAL public.landscape_place(t.id) p
      ORDER BY t.sortkey
    `);
    res.json(rows);
  } catch (e) {
    if (NOT_MIGRATED.has(e?.code)) return res.json([]);
    console.error("GET /api/public/places/landscapes error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/time-eras", async (req, res) => {
  try {
    const { rows } = await getPool(req).query(`
      WITH RECURSIVE t AS (
        SELECT e.id, e.parent_id, e.name::text AS label, 1 AS depth,
               ARRAY[lpad(e.sort_order::text, 6, '0') || e.name] AS sortkey
        FROM public.time_eras e
        WHERE e.parent_id IS NULL AND e.is_active
        UNION ALL
        SELECT c.id, c.parent_id, t.label || ' › ' || c.name, t.depth + 1,
               t.sortkey || (lpad(c.sort_order::text, 6, '0') || c.name)
        FROM public.time_eras c
        JOIN t ON c.parent_id = t.id
        WHERE c.is_active AND t.depth < 10
      )
      SELECT t.id, e.slug, e.name, t.label, t.depth, t.parent_id,
             e.start_year, e.end_year, p.continent, p.country, p.state
      FROM t
      JOIN public.time_eras e ON e.id = t.id
      CROSS JOIN LATERAL public.time_era_place(t.id) p
      ORDER BY t.sortkey
    `);
    res.json(rows);
  } catch (e) {
    if (NOT_MIGRATED.has(e?.code)) return res.json([]);
    console.error("GET /api/public/places/time-eras error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// Alle schon verwendeten Länderwerte (Land des Buchs, Nationalität des Autors),
// damit eigene Kürzel als Vorschlag erscheinen.
//   GET /api/public/places/countries  ->  ["A", "C", "D", "PK", ...]
router.get("/countries", async (req, res) => {
  try {
    const { rows } = await getPool(req).query(`
      SELECT v FROM (
        SELECT btrim(action_country) AS v FROM public.books
        UNION ALL
        SELECT btrim(author_nationality) FROM public.authors
      ) x
      WHERE v IS NOT NULL AND v <> ''
      GROUP BY v
      ORDER BY count(*) DESC, v
      LIMIT 500
    `);
    res.json(rows.map((r) => r.v));
  } catch (e) {
    if (NOT_MIGRATED.has(e?.code)) return res.json([]);
    console.error("GET /api/public/places/countries error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// Schon verwendete Städte (books.action_city) als Vorschläge, jeweils mit der
// häufigsten Region/Land/Bundesland-Kombination der Bücher mit dieser Stadt.
// Das Formular füllt damit leere Region/Land/Bundesland aus.
//   GET /api/public/places/cities
//   -> [{ name: "Peking", continent: 0, country: "C", state: null }, ...]
router.get("/cities", async (req, res) => {
  try {
    const { rows } = await getPool(req).query(`
      WITH c AS (
        SELECT btrim(action_city) AS v,
               action_continent,
               nullif(btrim(action_country), '') AS country,
               nullif(btrim(action_state), '')   AS state
        FROM public.books
        WHERE nullif(btrim(action_city), '') IS NOT NULL
      ),
      names AS (
        SELECT DISTINCT ON (lower(v)) lower(v) AS k, v AS name,
               sum(count(*)) OVER (PARTITION BY lower(v)) AS n
        FROM c
        GROUP BY lower(v), v
        ORDER BY lower(v), count(*) DESC
      ),
      best AS (
        SELECT DISTINCT ON (lower(v)) lower(v) AS k, action_continent AS continent, country, state
        FROM c
        WHERE action_continent IS NOT NULL OR country IS NOT NULL
        GROUP BY lower(v), action_continent, country, state
        ORDER BY lower(v), count(*) DESC
      )
      SELECT n.name, b.continent, b.country, b.state
      FROM names n
      LEFT JOIN best b ON b.k = n.k
      ORDER BY n.n DESC, n.name
      LIMIT 1000
    `);
    res.json(rows);
  } catch (e) {
    if (NOT_MIGRATED.has(e?.code)) return res.json([]);
    console.error("GET /api/public/places/cities error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// Schon verwendete erfundene Orte (books.action_place_fictional) als Vorschläge.
//   GET /api/public/places/fictional  ->  ["Atlantis", "Mittelerde", ...]
router.get("/fictional", async (req, res) => {
  try {
    const { rows } = await getPool(req).query(`
      SELECT btrim(action_place_fictional) AS v
      FROM public.books
      WHERE nullif(btrim(action_place_fictional), '') IS NOT NULL
      GROUP BY 1
      ORDER BY count(*) DESC, 1
      LIMIT 500
    `);
    res.json(rows.map((r) => r.v));
  } catch (e) {
    if (NOT_MIGRATED.has(e?.code)) return res.json([]);
    console.error("GET /api/public/places/fictional error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
