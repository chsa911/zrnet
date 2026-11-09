-- =====================================================================
-- DBeaver-Fassung von landschaften_zuordnen.sql
--   * VORHER oben in der Leiste von "Auto" auf "Manual Commit" umstellen
--   * ganzes Skript ausführen: Alt+X ("SQL-Skript ausführen"), NICHT Strg+Enter
--   * die Liste erscheint als Ergebnis-Tabelle (Rechtsklick -> Daten exportieren -> CSV)
--   * Probelauf: so ausführen wie es ist (endet mit ROLLBACK, nichts wird gespeichert)
--   * echter Lauf: die letzte Zeile ROLLBACK; durch COMMIT; ersetzen und erneut ausführen
-- =====================================================================

-- =====================================================================
-- Bücher automatisch Landschaften zuordnen (Himalaya, Karakorum, Gipfel ...)
-- Voraussetzung: Migration V20261109_01__landscapes.sql ist eingespielt.
--
-- Gesucht wird mit landscapes.search_terms in Titel, Untertitel,
-- Originaltitel, englischem Titel, Zusatztiteln, Themen, Kommentar und den
-- Titel-Übersetzungen. Pro Buch wird nur die GENAUESTE Landschaft
-- eingetragen: "K2" statt zusätzlich "Karakorum".
-- Bestehende Zuordnungen bleiben unangetastet.
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

-- ---- Ausschlussliste: Fehltreffer (Buch + Landschaft) ---------------------
CREATE TEMP TABLE ausschluss (book_id uuid, slug text) ON COMMIT DROP;
-- INSERT INTO ausschluss VALUES
--   ('00000000-0000-0000-0000-000000000000', 'k2'),  -- Titel
-- ;

-- ---- Einschlussliste: Zuordnungen, die die Suche nicht findet ------------
CREATE TEMP TABLE einschluss (book_id uuid, slug text) ON COMMIT DROP;
-- INSERT INTO einschluss VALUES
--   ('00000000-0000-0000-0000-000000000000', 'nanga-parbat'),  -- Titel
-- ;

CREATE TEMP TABLE buchtext ON COMMIT DROP AS
SELECT b.id AS book_id,
       concat_ws(' ', b.title_display, b.main_title_display, b.subtitle_display, b.original_title,
                 b.title_en, array_to_string(b.extra_titles, ' '), b.themes, b.comment,
                 b.title_keyword, b.title_keyword2, b.title_keyword3,
                 (SELECT string_agg(t.title, ' ') FROM book_title_translations t WHERE t.book_id = b.id)) AS t
FROM books b;

-- alle Treffer, mit dem gefundenen Wort
CREATE TEMP TABLE treffer ON COMMIT DROP AS
SELECT bt.book_id, l.id AS landscape_id, l.slug,
       substring(bt.t from '(?i)(' || array_to_string(l.search_terms, '|') || ')') AS fundwort,
       'auto' AS quelle
FROM buchtext bt
JOIN landscapes l ON l.is_active AND cardinality(l.search_terms) > 0
WHERE bt.t ~* ('(' || array_to_string(l.search_terms, '|') || ')')
UNION ALL
SELECT e.book_id, l.id, l.slug, NULL, 'manual'
FROM einschluss e JOIN landscapes l ON l.slug = e.slug;

DELETE FROM treffer t USING ausschluss a
WHERE a.book_id = t.book_id AND a.slug = t.slug AND t.quelle = 'auto';

-- nur die genaueste Ebene: Oberbegriff weglassen, wenn ein Unterbegriff
-- (auch über mehrere Stufen) beim selben Buch gefunden wurde
WITH RECURSIVE vorfahren AS (
  SELECT t.book_id, l.parent_id AS ahn_id
  FROM treffer t JOIN landscapes l ON l.id = t.landscape_id
  WHERE l.parent_id IS NOT NULL
  UNION
  SELECT v.book_id, l.parent_id
  FROM vorfahren v JOIN landscapes l ON l.id = v.ahn_id
  WHERE l.parent_id IS NOT NULL
)
DELETE FROM treffer t USING vorfahren v
WHERE v.book_id = t.book_id AND v.ahn_id = t.landscape_id;

CREATE TEMP TABLE plan ON COMMIT DROP AS
SELECT DISTINCT ON (t.book_id, t.landscape_id)
  t.book_id, t.landscape_id, t.slug, t.fundwort, t.quelle,
  CASE WHEN bl.book_id IS NOT NULL THEN 'schon zugeordnet' ELSE 'zuordnen' END AS aktion
FROM treffer t
LEFT JOIN book_landscapes bl ON bl.book_id = t.book_id AND bl.landscape_id = t.landscape_id
ORDER BY t.book_id, t.landscape_id, t.quelle DESC;

-- ---- Liste zum Durchsehen -------------------------------------------------
SELECT p.aktion, l.name AS landschaft, p.fundwort, b.title_display AS titel, b.subtitle_display AS untertitel, coalesce(b.author_display, b.author) AS autor, b.action_country AS land, p.quelle, b.id FROM plan p JOIN books b ON b.id = p.book_id JOIN landscapes l ON l.id = p.landscape_id ORDER BY l.sort_order, b.title_display;
-- ---- Eintragen ------------------------------------------------------------
INSERT INTO book_landscapes (book_id, landscape_id, source)
SELECT book_id, landscape_id, quelle FROM plan WHERE aktion = 'zuordnen'
ON CONFLICT DO NOTHING;

-- ---- Ergebnis -------------------------------------------------------------
SELECT l.name AS landschaft, p.aktion, count(*) AS buecher
FROM plan p JOIN landscapes l ON l.id = p.landscape_id
GROUP BY l.name, l.sort_order, p.aktion
ORDER BY l.sort_order, p.aktion;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
