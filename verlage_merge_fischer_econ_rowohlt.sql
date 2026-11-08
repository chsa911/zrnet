-- =====================================================================
-- Fischer, Econ und Rowohlt jeweils zu EINEM Verlag zusammenführen
--   Fischer  -> "Fischer"  (Kürzel f.)   13 Varianten
--   Econ     -> "Econ"     (Kürzel e.)   3 Varianten
--   Rowohlt  -> "Rowohlt"  (Kürzel r.)   13 Varianten
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- NICHT enthalten (bitte selbst entscheiden):
--   "Econ Ullstein List" (e108b337…, 2 B.)  – Verlagsgruppe, passt zu Econ UND Ullstein
--   "Wunderlich im Rowohlt" (2056c44b…, 1 B.) – eigenes Imprint, es gibt auch "Wunderlich" separat
--   "ft." (b1c59fa5…, 2 B.)  – Kürzel ohne Zuordnung (evtl. Fischer Taschenbuch)
--   "r"   (71accd00…, 1 B.)  – Fachbuch "Software-Kopplung", passt nicht zu Rowohlt
--
-- ABLAUF:
--   1. Probelauf (endet mit ROLLBACK):
--      psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f verlage_merge_fischer_econ_rowohlt.sql
--   2. Echt:
--      sed 's/^ROLLBACK;$/COMMIT;/' verlage_merge_fischer_econ_rowohlt.sql | psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1
--
-- Sicherung: publishers_backup_merge_20261108 / books_publisher_merge_20261108
--            (dieselben Tabellen wie beim Ullstein-Merge, werden ergänzt)
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  -- Fischer  (behalten: Fischer, 359 Bücher)
  ('66c17879-0b09-452d-8ade-99c13663bece', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer (Tb.), Frankfurt (4)
  ('99765a92-e2f7-4344-ae2e-923b79094e43', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- FISCHER KJB (1)
  ('9df41cc4-7986-44d9-a3f7-963a976d42b3', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer S. Verlag GmbH (1)
  ('c26b06a9-015f-4151-a762-00602bb6c5ee', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- FISCHER Taschenbuch (7)
  ('c501e56e-c166-4037-affa-703a344d7699', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer Taschenbuch Verlag (7)
  ('55612a7e-3607-4326-b5d9-ca46a75bbf91', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer Taschenbuch Verlag GmbH (2)
  ('726b9780-3c60-4fa7-9495-5be1a7209b32', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer Taschenbuch Vlg. (2)
  ('a170087b-6fd9-4222-9802-615aa16e34b7', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- FISCHER TOR (1)
  ('3cb62a90-5aa4-4fd7-88cc-af3d70071a72', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- FISCHER, S. (2)
  ('25ba5da1-d402-41a5-8681-5a7e9f2b97e8', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer-Taschenbuch-Verl. (7)
  ('de7d99f5-7293-4450-9bca-71d594b01a1a', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer-Taschenbuch-Verlag (1)
  ('d14f607d-9f0e-49a0-bdaf-6211c6fd6ba3', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- Fischer-TB.-Vlg.,Ffm (1)
  ('509bff4d-6019-423f-aafd-d5ae96b3bc80', '30a9dd07-b238-4291-b985-0b0f8681a250'),  -- S. Fischer (4)
  -- Econ  (behalten: Econ, 85 Bücher)
  ('acfc94c2-4981-452f-a4cc-41bb375c31b4', '97f6227f-9e2b-400a-8726-656e4c7f7c55'),  -- e. (1)
  ('6451f948-6ac8-451f-a2b3-d2d44123e88b', '97f6227f-9e2b-400a-8726-656e4c7f7c55'),  -- Econ Tb. (4)
  ('3e698ef0-b443-4285-9619-2331fbdc39b9', '97f6227f-9e2b-400a-8726-656e4c7f7c55'),  -- ECON-Taschenbuchverlag (1)
  -- Rowohlt  (behalten: Rowohlt, 330 Bücher)
  ('7f78efe3-9f82-4ec4-9bd7-1fe36c55a00b', '72bf604b-d774-4d95-9e64-686187740805'),  -- r. (1)
  ('c4c3a539-fbaf-47fd-8fe3-9cdc2e9bcb44', '72bf604b-d774-4d95-9e64-686187740805'),  -- rw. (33)
  ('a23b43c9-9e6d-4e41-bea7-29c23a279cb1', '72bf604b-d774-4d95-9e64-686187740805'),  -- rororo (2)
  ('81566f27-43f6-4060-a8a0-aefa2f6606d4', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Berlin (2)
  ('ec919c0a-a68e-4aaa-b92d-13644cfc93fd', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Taschenbuch (7)
  ('db4f70ae-d2e7-4b4f-92f8-cc08991a3fd1', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Taschenbuch Verla (2)
  ('9228ea1e-2ac6-4a21-b2be-70252ea67642', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Taschenbuch Verlag (6)
  ('8d4871a4-0dc3-44aa-9cd5-dec8ce98c367', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Taschenbuch Verlag GmbH (2)
  ('1a7bd1d2-1c4b-4c60-9a97-71cdf247b109', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt TB-V., Rnb. (1)
  ('d559080c-8ec9-4f46-8a51-c2ef52d8fd44', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Tb. (3)
  ('94e7778f-5eef-4233-bfe6-97ed6a4ced46', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Verlag (2)
  ('2aca6f67-4723-4e88-a1fc-55436a279e6f', '72bf604b-d774-4d95-9e64-686187740805'),  -- Rowohlt Verlag GmbH (1)
  ('e5dc147f-e95a-4a50-8017-7a3db46a1c6f', '72bf604b-d774-4d95-9e64-686187740805')   -- Rowohlt-Taschenbuch-Verl. (11)
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
SELECT p.name_display AS verlag, count(b.id) AS buecher_jetzt
FROM publishers p LEFT JOIN books b ON b.publisher_id = p.id
WHERE p.id IN ('30a9dd07-b238-4291-b985-0b0f8681a250', '97f6227f-9e2b-400a-8726-656e4c7f7c55', '72bf604b-d774-4d95-9e64-686187740805')
GROUP BY p.name_display
UNION ALL
SELECT '(Verlage gelöscht)', count(*) FROM merge_map
UNION ALL
SELECT '(übrige Verlage mit fischer/econ/rowohlt im Namen)', count(*) FROM publishers
 WHERE (name ILIKE '%fischer%' OR name ILIKE '%econ%' OR name ILIKE '%rowohlt%' OR name ILIKE 'rororo')
   AND id NOT IN ('30a9dd07-b238-4291-b985-0b0f8681a250', '97f6227f-9e2b-400a-8726-656e4c7f7c55', '72bf604b-d774-4d95-9e64-686187740805');

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
