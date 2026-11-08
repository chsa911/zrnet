-- =====================================================================
-- Kürzel tauschen:
--   dtv                   dt. -> d.
--   Deutscher Bücherbund  d.  -> db.
--   Das Beste / Reader's Digest: bisheriges db. + "Das Beste" + "Verl. Das Beste" -> rd.
--
-- Die Bücher bleiben bei ihrem Verlag; nur die Kürzel wandern.
-- Für Das Beste werden 3 Einträge in rd. zusammengeführt.
-- Abkürzungstabelle publisher_aliases wird angepasst (d, db, rd).
-- Erzeugt am 08.11.2026.
--
-- Reihenfolge egal (vor oder nach verlage_anzeigename.sql).
--
-- Probelauf:
--   psql "$DB" -v ON_ERROR_STOP=1 -f verlage_kuerzel_tausch_d_db_rd.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_kuerzel_tausch_d_db_rd.sql | psql "$DB" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

-- ---- Sicherheitsprüfung ----------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM publishers WHERE id = '39ff4f67-23a8-4028-a5b2-29021bb837bc' AND name = 'dt.') THEN
    RAISE EXCEPTION 'dtv ist nicht (mehr) unter dt. – Skript schon gelaufen?';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM publishers WHERE id = '8738de12-43eb-4aba-b4d7-58b5f9b56ab8' AND name = 'd.') THEN
    RAISE EXCEPTION 'Deutscher Bücherbund ist nicht (mehr) unter d. – Skript schon gelaufen?';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM publishers WHERE id = '5885561a-137a-4c44-b9e4-38bf798da3a6' AND name = 'rd.') THEN
    RAISE EXCEPTION 'Eintrag rd. nicht gefunden';
  END IF;
END $$;

-- ---- Sicherung -------------------------------------------------------
CREATE TABLE IF NOT EXISTS publishers_rename_20261108 AS
  SELECT id, name, name_display, abbr, now() AS renamed_at FROM publishers WITH NO DATA;
INSERT INTO publishers_rename_20261108 (id, name, name_display, abbr, renamed_at)
  SELECT id, name, name_display, abbr, now() FROM publishers
  WHERE id IN ('39ff4f67-23a8-4028-a5b2-29021bb837bc', '8738de12-43eb-4aba-b4d7-58b5f9b56ab8', '5885561a-137a-4c44-b9e4-38bf798da3a6');

-- ---- 1. Das Beste nach rd. zusammenführen -----------------------------
CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;
INSERT INTO merge_map (drop_id, keep_id) VALUES
  ('2330b2cd-b2ab-4ab0-ab11-89cfbbe8a864', '5885561a-137a-4c44-b9e4-38bf798da3a6'),  -- db. (12)
  ('39b6ddc6-86a9-4cb4-8f58-2a90a513cf6d', '5885561a-137a-4c44-b9e4-38bf798da3a6'),  -- das beste (4)
  ('cf5a5b08-26eb-4239-96bc-b0597aac4f30', '5885561a-137a-4c44-b9e4-38bf798da3a6')   -- Verl. Das Beste (1)
;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM merge_map m WHERE NOT EXISTS (SELECT 1 FROM publishers WHERE id = m.drop_id);
  IF n > 0 THEN RAISE EXCEPTION '% Das-Beste-Einträge existieren nicht (mehr) – Skript schon gelaufen?', n; END IF;
END $$;

CREATE TABLE IF NOT EXISTS publishers_backup_merge_20261108 AS
  SELECT p.id, p.name, p.name_display, p.abbr, m.keep_id AS merged_into, now() AS merged_at
  FROM publishers p JOIN merge_map m ON m.drop_id = p.id WITH NO DATA;
INSERT INTO publishers_backup_merge_20261108 (id, name, name_display, abbr, merged_into, merged_at)
  SELECT p.id, p.name, p.name_display, p.abbr, m.keep_id, now() FROM publishers p JOIN merge_map m ON m.drop_id = p.id;

CREATE TABLE IF NOT EXISTS books_publisher_merge_20261108
  (book_id uuid, old_publisher_id uuid, new_publisher_id uuid, merged_at timestamptz DEFAULT now());
INSERT INTO books_publisher_merge_20261108 (book_id, old_publisher_id, new_publisher_id)
  SELECT b.id, m.drop_id, m.keep_id FROM books b JOIN merge_map m ON m.drop_id = b.publisher_id;

UPDATE books b SET publisher_id = m.keep_id FROM merge_map m WHERE b.publisher_id = m.drop_id;
DELETE FROM publishers p USING merge_map m WHERE p.id = m.drop_id;

UPDATE publishers SET abbr = 'rd.', name_display = 'Reader''s Digest / Das Beste'
WHERE id = '5885561a-137a-4c44-b9e4-38bf798da3a6';

-- ---- 2. Deutscher Bücherbund: d. -> db. --------------------------------
UPDATE publishers SET name = 'db.', abbr = 'db.', name_display = 'Deutscher Bücherbund'
WHERE id = '8738de12-43eb-4aba-b4d7-58b5f9b56ab8';

-- ---- 3. dtv: dt. -> d. ------------------------------------------------
UPDATE publishers SET name = 'd.', abbr = 'd.', name_display = 'dtv'
WHERE id = '39ff4f67-23a8-4028-a5b2-29021bb837bc';

-- ---- 4. Abkürzungstabelle anpassen ------------------------------------
INSERT INTO publisher_aliases (abbr_norm, full_name, "type", abbr_raw, "full") VALUES
  ('d',  'dtv',                          'publisher', 'd.',  'dtv'),
  ('db', 'Deutscher Bücherbund',         'publisher', 'db.', 'deutscher buecherbund'),
  ('rd', 'Reader''s Digest / Das Beste', 'publisher', 'rd.', 'readers digest')
ON CONFLICT (abbr_norm) DO UPDATE
  SET full_name = EXCLUDED.full_name, "type" = EXCLUDED."type", abbr_raw = EXCLUDED.abbr_raw, "full" = EXCLUDED."full";

-- ---- Ergebnis ----------------------------------------------------------
SELECT p.name AS kuerzel, p.name_display AS verlag, p.abbr, count(b.id) AS buecher
FROM publishers p LEFT JOIN books b ON b.publisher_id = p.id
WHERE p.name IN ('d.', 'db.', 'rd.', 'dt.')
GROUP BY p.name, p.name_display, p.abbr ORDER BY p.name;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
