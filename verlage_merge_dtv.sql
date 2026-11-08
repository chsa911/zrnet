-- =====================================================================
-- Alle dtv-Varianten in den Verlag "dt." zusammenführen (wie Heyne -> h.)
-- Behalten wird: dt. (39ff4f67…, 122 Bücher)  ->  danach 268 Bücher
-- Begründung: 43 von 55 dt.-Büchern mit ISBN haben die dtv-Verlagsnummer 3-423.
-- Das Kürzel-Feld von dt. wird auf "dt." gesetzt.
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- Reihenfolge egal (vor oder nach den anderen Verlags-Skripten).
--
-- Probelauf:
--   psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f verlage_merge_dtv.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_merge_dtv.sql | psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  ('9b0f99f3-e91a-403b-84c7-b90da07bae09', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- DTV (111, Kürzel-Feld "dtv")
  ('ad8588ac-988f-491d-96a0-9fc6436feab7', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- Deutscher Taschenbuch Verlag (11)
  ('cc085b92-dd2e-4235-92d5-2be7ae273077', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- Dtv Deutscher Taschenbuch (8)
  ('b427d9df-6d0b-4783-bea0-55304d22eb30', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- Dt. Taschenbuch-Verl. (6)
  ('7ab69d52-2f73-452d-a644-93e465aad32e', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- dtv. (4)
  ('99107d58-763f-42f3-9f51-c6ab795b09f5', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- dtv Verlagsgesellschaft (3)
  ('cf6b36d9-ba2a-4411-9009-cd58c3b733b0', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- Deutscher Taschenbuch Verlag (DTV) (1)
  ('02eb4c13-f037-4c8f-a809-568439dcce71', '39ff4f67-23a8-4028-a5b2-29021bb837bc'),  -- Deutscher Taschenbuch Verlag GmbH & Co. (1)
  ('ea9ef404-5fd2-4e0a-9e00-84a0dc8ee61f', '39ff4f67-23a8-4028-a5b2-29021bb837bc')   -- Deutscher Taschenbuch-Verlag (1)
;

-- ---- Sicherheitsprüfung ----------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM merge_map m
   WHERE NOT EXISTS (SELECT 1 FROM publishers WHERE id = m.drop_id)
      OR NOT EXISTS (SELECT 1 FROM publishers WHERE id = m.keep_id);
  IF n > 0 THEN RAISE EXCEPTION '% IDs existieren nicht (mehr) – schon gelaufen oder Liste veraltet', n; END IF;
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

-- ---- Bücher umhängen und alte Verlage löschen ------------------------
UPDATE books b SET publisher_id = m.keep_id
FROM merge_map m WHERE b.publisher_id = m.drop_id;

DELETE FROM publishers p USING merge_map m WHERE p.id = m.drop_id;

-- Kürzel dt. setzen
UPDATE publishers SET abbr = 'dt.' WHERE id = '39ff4f67-23a8-4028-a5b2-29021bb837bc' AND abbr IS NULL;

-- ---- Ergebnis ----------------------------------------------------------
SELECT 'Verlage gelöscht' AS was, count(*)::text AS wert FROM merge_map
UNION ALL
SELECT 'Bücher jetzt bei dt.', count(*)::text FROM books WHERE publisher_id = '39ff4f67-23a8-4028-a5b2-29021bb837bc'
UNION ALL
SELECT 'Kürzel von dt.', coalesce(abbr,'(leer)') FROM publishers WHERE id = '39ff4f67-23a8-4028-a5b2-29021bb837bc'
UNION ALL
SELECT 'übrige Verlage mit "dtv"/"taschenbuch verlag" im Namen', count(*)::text FROM publishers
 WHERE (name ILIKE 'dtv%' OR name ILIKE '%deutscher taschenbuch%' OR name ILIKE 'dt. taschenbuch%');

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
