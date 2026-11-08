-- =====================================================================
-- Alle Ullstein-Varianten zu EINEM Verlag "Ullstein" zusammenführen
-- Behalten wird: Ullstein (11b23975…, Kürzel u.)
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- ABLAUF wie beim Autoren-Merge:
--   1. Probelauf (endet mit ROLLBACK, nichts wird gespeichert):
--      psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f verlage_merge_ullstein.sql
--   2. Echt:
--      sed 's/^ROLLBACK;$/COMMIT;/' verlage_merge_ullstein.sql | psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1
--
-- Sicherung: publishers_backup_merge_20261108 (gelöschte Verlage)
--            books_publisher_merge_20261108   (alte Zuordnung Buch -> Verlag)
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  ('8fdf7685-9eed-4581-9181-cf69f463756f', '11b23975-e915-4aef-899a-5642dea427e1'),  -- u.                         (223 Bücher)
  ('693ff189-26ce-46f5-94b4-40e0b1ab281d', '11b23975-e915-4aef-899a-5642dea427e1'),  -- Verlag Ullstein            (16)
  ('ab7d7f4f-2887-4255-b6ac-cb1b7db3c5f9', '11b23975-e915-4aef-899a-5642dea427e1'),  -- Ullstein Buchverlage GmbH & Co. KG / Ullstein Tas (2)
  ('11163f32-44e2-43dd-8090-fa1d94bdfea6', '11b23975-e915-4aef-899a-5642dea427e1'),  -- Ullstein Verlag GmbH       (1)
  ('09edaf7a-35cb-4d50-8953-755f4c1e6e4b', '11b23975-e915-4aef-899a-5642dea427e1'),  -- Ullstein Verlag            (1)
  ('d3afd0bc-10a4-4661-8797-f67e6fa1d7b4', '11b23975-e915-4aef-899a-5642dea427e1'),  -- Ullstein Tb                (1)
  ('131bab9e-6d21-4460-98b4-3fa28d9591a0', '11b23975-e915-4aef-899a-5642dea427e1'),  -- Ullstein-Taschenbuch-Verl. (1)
  ('3fdf3dfc-2d8d-4160-b9e8-b7a6e453f045', '11b23975-e915-4aef-899a-5642dea427e1'),  -- Ullstein Taschenbuchvlg.   (2)
  ('3b72e4bc-6544-4e7e-a516-eadd2b4f0e88', '11b23975-e915-4aef-899a-5642dea427e1')   -- u                          (0)
  -- NICHT enthalten: "Econ Ullstein List" (e108b337…, 2 Bücher) – Verlagsgruppe aus drei Verlagen.
  -- Soll der auch zu Ullstein, diese Zeile oben (mit Komma davor) einfügen:
  -- ,('e108b337-e783-46b3-bf50-e4c51e2b0263', '11b23975-e915-4aef-899a-5642dea427e1')
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

-- ---- Ergebnis ----------------------------------------------------------
SELECT 'Verlage gelöscht'          AS was, count(*) AS anzahl FROM merge_map
UNION ALL
SELECT 'Bücher umgehängt',          count(*) FROM books_publisher_merge_20261108 WHERE merged_at >= now() - interval '1 minute'
UNION ALL
SELECT 'Bücher jetzt bei Ullstein', count(*) FROM books WHERE publisher_id = '11b23975-e915-4aef-899a-5642dea427e1'
UNION ALL
SELECT 'übrige Verlage mit "ullstein" im Namen', count(*) FROM publishers
 WHERE name ILIKE '%ullstein%' AND id <> '11b23975-e915-4aef-899a-5642dea427e1';

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
