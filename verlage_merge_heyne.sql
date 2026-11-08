-- =====================================================================
-- Alle Heyne-Varianten in den Verlag "h." zusammenführen
-- Behalten wird: h. (6ca0067c…, 604 Bücher)
-- Das Kürzel "h." vom bisherigen Eintrag "Heyne" wird auf "h." übertragen.
-- NICHT enthalten: "he." (= Herder laut publisher_aliases)
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- ABLAUF:
--   1. Probelauf (endet mit ROLLBACK):
--      psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f verlage_merge_heyne.sql
--   2. Echt:
--      sed 's/^ROLLBACK;$/COMMIT;/' verlage_merge_heyne.sql | psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  ('aef1df7d-270f-4512-9a2c-94683892bad8', '6ca0067c-4534-4701-94b5-43528a4ec6c7'),  -- Heyne (182, Kürzel h.)
  ('9a9c45c6-6258-44c2-8a39-24a3b39cae08', '6ca0067c-4534-4701-94b5-43528a4ec6c7'),  -- Heyne Verlag (9)
  ('9c985a64-7d1f-4dd4-b2c4-5d7acbff3b21', '6ca0067c-4534-4701-94b5-43528a4ec6c7'),  -- Wilhelm Heyne Verlag (6)
  ('5b58938f-4535-4975-a3a3-5fd576c11401', '6ca0067c-4534-4701-94b5-43528a4ec6c7'),  -- Wilhelm Heyne Verlag GmbH & Co KG (6)
  ('d4d1ba3a-2005-4eed-b327-d3ab811997fe', '6ca0067c-4534-4701-94b5-43528a4ec6c7'),  -- Heyne Wilhelm Verlag GmbH (1)
  ('b8919e39-ce97-4556-9b47-12cfced330fe', '6ca0067c-4534-4701-94b5-43528a4ec6c7'),  -- W. Heyne (1)
  ('1ee8cf35-7dd2-4e10-a9e2-449020780631', '6ca0067c-4534-4701-94b5-43528a4ec6c7')   -- Wilhelm Heyne (1)
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

-- Kürzel h. auf den behaltenen Eintrag übertragen (jetzt frei, da "Heyne" gelöscht)
UPDATE publishers SET abbr = 'h.' WHERE id = '6ca0067c-4534-4701-94b5-43528a4ec6c7' AND abbr IS NULL;

-- ---- Ergebnis ----------------------------------------------------------
SELECT 'Verlage gelöscht' AS was, count(*)::text AS wert FROM merge_map
UNION ALL
SELECT 'Bücher jetzt bei h.', count(*)::text FROM books WHERE publisher_id = '6ca0067c-4534-4701-94b5-43528a4ec6c7'
UNION ALL
SELECT 'Kürzel von h.', coalesce(abbr,'(leer)') FROM publishers WHERE id = '6ca0067c-4534-4701-94b5-43528a4ec6c7'
UNION ALL
SELECT 'übrige Verlage mit "heyne" im Namen', count(*)::text FROM publishers WHERE name ILIKE '%heyne%';

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
