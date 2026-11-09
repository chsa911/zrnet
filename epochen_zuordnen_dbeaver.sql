-- =====================================================================
-- DBeaver-Fassung von epochen_zuordnen.sql
--   * VORHER oben in der Leiste von "Auto" auf "Manual Commit" umstellen
--   * ganzes Skript ausführen: Alt+X ("SQL-Skript ausführen"), NICHT Strg+Enter
--   * die Liste erscheint als Ergebnis-Tabelle (Rechtsklick -> Daten exportieren -> CSV)
--   * Probelauf: so ausführen wie es ist (endet mit ROLLBACK, nichts wird gespeichert)
--   * echter Lauf: die letzte Zeile ROLLBACK; durch COMMIT; ersetzen und erneut ausführen
-- =====================================================================

-- =====================================================================
-- Bücher automatisch Epochen zuordnen (Mittelalter, Kulturrevolution ...)
-- Voraussetzung: Migration V20261109_02__time_eras_scope_and_books.sql.
--
-- Ein Buch bekommt eine Epoche, wenn
--   a) ein Suchbegriff der Epoche in Titel, Untertitel, Originaltitel,
--      Themen, Kommentar, Handlungszeit (action_time_period[_display])
--      oder einer Titel-Übersetzung vorkommt                 -> grund "wort"
--   b) oder das Handlungsjahr (action_time_year) in die Epoche fällt
--      UND der Handlungsort passt (Land, sonst Region)       -> grund "jahr+ort"
-- Bei a) muss der Ort nicht eingetragen sein; ist er eingetragen und passt
-- NICHT (z. B. "Mittelalter" bei einem Buch, das in Japan spielt), wird das
-- Buch nur als "prüfen: anderer Ort" gelistet und nicht zugeordnet.
-- Pro Buch nur die GENAUESTE Epoche: "Kulturrevolution" statt zusätzlich
-- "China unter Mao". Bestehende Zuordnungen bleiben unangetastet.
--
-- Probelauf (ändert nichts):
-- =====================================================================

BEGIN;

-- Sperre: in DBeaver muss oben "Manual Commit" eingestellt sein (nicht "Auto"),
-- sonst würde schon der Probelauf jede Änderung sofort speichern.
DO $$
BEGIN
  IF now() = statement_timestamp() THEN
    RAISE EXCEPTION 'Abbruch: DBeaver steht auf Auto-Commit. Bitte oben in der Leiste von "Auto" auf "Manual Commit" umstellen und das Skript erneut ausführen.';
  END IF;
END $$;

-- ---- Ausschlussliste: Fehltreffer (Buch + Epoche) -------------------------
CREATE TEMP TABLE ausschluss (book_id uuid, slug text) ON COMMIT DROP;
-- INSERT INTO ausschluss VALUES
--   ('00000000-0000-0000-0000-000000000000', 'mittelalter'),  -- Titel
-- ;

-- ---- Einschlussliste: Zuordnungen, die die Suche nicht findet ------------
CREATE TEMP TABLE einschluss (book_id uuid, slug text) ON COMMIT DROP;
-- INSERT INTO einschluss VALUES
--   ('00000000-0000-0000-0000-000000000000', 'kulturrevolution'),  -- Titel
-- ;

CREATE TEMP TABLE buch ON COMMIT DROP AS
SELECT b.id AS book_id,
       b.action_continent,
       nullif(btrim(b.action_country), '') AS land,
       b.action_time_year,
       concat_ws(' ', b.title_display, b.main_title_display, b.subtitle_display, b.original_title,
                 b.title_en, array_to_string(b.extra_titles, ' '), b.themes, b.comment,
                 b.title_keyword, b.title_keyword2, b.title_keyword3,
                 b.action_time_period, b.action_time_period_display,
                 (SELECT string_agg(t.title, ' ') FROM book_title_translations t WHERE t.book_id = b.id)) AS t
FROM books b;

-- passt der eingetragene Ort zur Epoche? (NULL = kein Ort eingetragen)
CREATE TEMP TABLE treffer ON COMMIT DROP AS
WITH kombi AS (
  SELECT bu.*, e.id AS era_id, e.slug, e.start_year, e.end_year, e.continents, e.countries, e.search_terms,
         CASE
           WHEN bu.land IS NULL AND bu.action_continent IS NULL THEN NULL
           WHEN cardinality(e.countries) > 0 AND bu.land IS NOT NULL
                THEN EXISTS (SELECT 1 FROM unnest(e.countries) c WHERE lower(c) = lower(bu.land))
           WHEN cardinality(e.continents) > 0 AND bu.action_continent IS NOT NULL
                THEN bu.action_continent = ANY (e.continents)
           WHEN cardinality(e.countries) = 0 AND cardinality(e.continents) = 0 THEN true
           ELSE NULL
         END AS ort_passt
  FROM buch bu
  CROSS JOIN time_eras e
  WHERE e.is_active
)
SELECT book_id, era_id, slug, 'wort' AS grund,
       substring(t from '(?i)(' || array_to_string(search_terms, '|') || ')') AS fundwort,
       ort_passt, 'auto' AS quelle
FROM kombi
WHERE cardinality(search_terms) > 0
  AND t ~* ('(' || array_to_string(search_terms, '|') || ')')
UNION ALL
SELECT book_id, era_id, slug, 'jahr+ort', action_time_year::text, ort_passt, 'auto'
FROM kombi
WHERE action_time_year IS NOT NULL AND ort_passt
  -- nur Epochen mit festen Jahren UND festgelegtem Raum
  AND start_year IS NOT NULL AND end_year IS NOT NULL
  AND (cardinality(countries) > 0 OR cardinality(continents) > 0)
  AND action_time_year BETWEEN start_year AND end_year
UNION ALL
SELECT e.book_id, te.id, te.slug, 'manuell', NULL, true, 'manual'
FROM einschluss e JOIN time_eras te ON te.slug = e.slug;

DELETE FROM treffer t USING ausschluss a
WHERE a.book_id = t.book_id AND a.slug = t.slug AND t.quelle = 'auto';

-- nur die genaueste Ebene behalten
WITH RECURSIVE vorfahren AS (
  SELECT t.book_id, e.parent_id AS ahn_id
  FROM treffer t JOIN time_eras e ON e.id = t.era_id
  WHERE e.parent_id IS NOT NULL AND t.ort_passt IS NOT FALSE
  UNION
  SELECT v.book_id, e.parent_id
  FROM vorfahren v JOIN time_eras e ON e.id = v.ahn_id
  WHERE e.parent_id IS NOT NULL
)
DELETE FROM treffer t USING vorfahren v
WHERE v.book_id = t.book_id AND v.ahn_id = t.era_id;

CREATE TEMP TABLE plan ON COMMIT DROP AS
SELECT t.book_id, t.era_id, t.slug,
       string_agg(DISTINCT t.grund, ', ')     AS grund,
       string_agg(DISTINCT t.fundwort, ', ')  AS fundwort,
       bool_or(t.ort_passt IS NOT FALSE)      AS ok,
       max(t.quelle)                          AS quelle,     -- 'manual' > 'auto'
       CASE
         WHEN bool_or(bte.book_id IS NOT NULL)   THEN 'schon zugeordnet'
         WHEN NOT bool_or(t.ort_passt IS NOT FALSE) THEN 'prüfen: anderer Ort'
         ELSE 'zuordnen'
       END AS aktion
FROM treffer t
LEFT JOIN book_time_eras bte ON bte.book_id = t.book_id AND bte.time_era_id = t.era_id
GROUP BY t.book_id, t.era_id, t.slug;

-- ---- Liste zum Durchsehen -------------------------------------------------
SELECT p.aktion, e.name AS epoche, p.grund, p.fundwort, b.title_display AS titel, b.subtitle_display AS untertitel, coalesce(b.author_display, b.author) AS autor, b.action_continent AS region, b.action_country AS land, b.action_time_year AS jahr, b.action_time_period_display AS handlungszeit, b.id FROM plan p JOIN books b ON b.id = p.book_id JOIN time_eras e ON e.id = p.era_id ORDER BY e.sort_order, p.aktion DESC, b.title_display;
-- ---- Eintragen ------------------------------------------------------------
INSERT INTO book_time_eras (book_id, time_era_id, source)
SELECT book_id, era_id, quelle FROM plan WHERE aktion = 'zuordnen'
ON CONFLICT DO NOTHING;

-- ---- Ergebnis -------------------------------------------------------------
SELECT e.name AS epoche, p.aktion, count(*) AS buecher
FROM plan p JOIN time_eras e ON e.id = p.era_id
GROUP BY e.name, e.sort_order, p.aktion
ORDER BY e.sort_order, p.aktion;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
