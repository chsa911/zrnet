-- =====================================================================
-- Lonely Planet -> lp.
-- Belegt über Titel/Autoren und ISBN (Lonely Planet 978-1-74…/-78…, deutsch 978-3-8297)
-- Behalten wird der Kürzel-Eintrag lp. (31 Bücher) -> danach 51 Bücher.
-- NICHT enthalten: MairDumont (3 B.) – verlegt auch DuMont/Marco Polo.
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- Reihenfolge egal, auch vor oder nach verlage_anzeigename.sql.
--
-- Probelauf:
--   psql "$DB" -v ON_ERROR_STOP=1 -f verlage_merge_lonely_planet.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_merge_lonely_planet.sql | psql "$DB" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE keep_abbr (keep_id uuid PRIMARY KEY, abbr text NOT NULL, full_name text NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  -- lp. = Lonely Planet  (31 Bücher)  ->  danach 51
  ('10c1991e-a569-40d4-8bff-19361024c4cf', 'b6ae0350-d8ce-4bb7-985e-319fa6ddcbdd'),  -- Lonely Planet (18)
  ('c07f9905-86e8-4304-870d-de34192d20c6', 'b6ae0350-d8ce-4bb7-985e-319fa6ddcbdd')   -- Lonely Planet Publications (2)
;

INSERT INTO keep_abbr (keep_id, abbr, full_name) VALUES
  ('b6ae0350-d8ce-4bb7-985e-319fa6ddcbdd', 'lp.', 'Lonely Planet')
;

-- ---- Sicherheitsprüfung ----------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM merge_map m
   WHERE NOT EXISTS (SELECT 1 FROM publishers WHERE id = m.drop_id)
      OR NOT EXISTS (SELECT 1 FROM publishers WHERE id = m.keep_id);
  IF n > 0 THEN RAISE EXCEPTION '% IDs existieren nicht (mehr) – schon gelaufen oder Liste veraltet', n; END IF;
  SELECT count(*) INTO n FROM merge_map WHERE keep_id IN (SELECT drop_id FROM merge_map);
  IF n > 0 THEN RAISE EXCEPTION '% Einträge sind gleichzeitig behalten und zu löschen', n; END IF;
END $$;

-- ---- Sicherung -------------------------------------------------------
CREATE TABLE IF NOT EXISTS publishers_backup_merge_20261108 AS
  SELECT p.id, p.name, p.name_display, p.abbr, m.keep_id AS merged_into, now() AS merged_at
  FROM publishers p JOIN merge_map m ON m.drop_id = p.id WITH NO DATA;
INSERT INTO publishers_backup_merge_20261108 (id, name, name_display, abbr, merged_into, merged_at)
  SELECT p.id, p.name, p.name_display, p.abbr, m.keep_id, now() FROM publishers p JOIN merge_map m ON m.drop_id = p.id;

CREATE TABLE IF NOT EXISTS books_publisher_merge_20261108
  (book_id uuid, old_publisher_id uuid, new_publisher_id uuid, merged_at timestamptz DEFAULT now());
INSERT INTO books_publisher_merge_20261108 (book_id, old_publisher_id, new_publisher_id)
  SELECT b.id, m.drop_id, m.keep_id FROM books b JOIN merge_map m ON m.drop_id = b.publisher_id;

-- ---- Bücher umhängen, alte Einträge löschen, Kürzel setzen -----------
UPDATE books b SET publisher_id = m.keep_id
FROM merge_map m WHERE b.publisher_id = m.drop_id;

DELETE FROM publishers p USING merge_map m WHERE p.id = m.drop_id;

UPDATE publishers p SET abbr = k.abbr
FROM keep_abbr k WHERE p.id = k.keep_id AND p.abbr IS DISTINCT FROM k.abbr;

UPDATE publishers p SET name_display = k.full_name
FROM keep_abbr k WHERE p.id = k.keep_id;

-- ---- Ergebnis ----------------------------------------------------------
SELECT p.name AS kuerzel, p.name_display AS verlag, p.abbr, count(b.id) AS buecher_jetzt
FROM keep_abbr k JOIN publishers p ON p.id = k.keep_id
LEFT JOIN books b ON b.publisher_id = p.id
GROUP BY p.name, p.name_display, p.abbr ORDER BY 4 DESC;

SELECT 'übrige Verlage mit "lonely planet" im Namen' AS was, count(*) AS anzahl FROM publishers
 WHERE name ILIKE '%lonely planet%';

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
