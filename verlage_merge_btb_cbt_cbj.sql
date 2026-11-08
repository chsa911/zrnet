-- =====================================================================
-- btb -> bb.   cbt -> ct.   cbj -> cj.
-- Belegt über die ISBN: bb. 3-442-7… (wie btb), ct. 3-570-3… (cbt), cj. 3-570-1…/-4… (cbj)
-- Behalten wird jeweils der Kürzel-Eintrag; Kürzel (abbr) und Anzeigename (name_display) werden gesetzt.
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- Reihenfolge egal, auch vor oder nach verlage_anzeigename.sql.
--
-- Probelauf:
--   psql "$DB" -v ON_ERROR_STOP=1 -f verlage_merge_btb_cbt_cbj.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_merge_btb_cbt_cbj.sql | psql "$DB" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE keep_abbr (keep_id uuid PRIMARY KEY, abbr text NOT NULL, full_name text NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  -- bb. = btb  (60 Bücher)  ->  danach 103
  ('b6b26dfb-74f2-4e1c-907c-a6381d4085dc', '70883008-29d7-4101-b150-8e360a8792ad'),  -- btb (41)
  ('7df13c83-b137-4254-8ee7-e2bb701b5f0a', '70883008-29d7-4101-b150-8e360a8792ad'),  -- btb Verlag (1)
  ('16c24afb-daf7-428a-8103-581cafa64204', '70883008-29d7-4101-b150-8e360a8792ad'),  -- btb Taschenbuch (1)
  -- ct. = cbt  (41 Bücher)  ->  danach 55
  ('be563148-370e-48b4-9032-f09de259e20e', '9506f13a-846b-4b02-803a-2cb52935e5cd'),  -- cbt (14)
  -- cj. = cbj  (8 Bücher)  ->  danach 16
  ('6242ad41-3562-43fb-b05b-ac9b7a616602', '74c7d0ba-a6ad-41eb-98a4-5faf4361456e'),  -- cbj (7)
  ('2cba9fc7-5609-4e18-bdd4-4079cf3bf408', '74c7d0ba-a6ad-41eb-98a4-5faf4361456e')   -- cbj [München] (1)
;

INSERT INTO keep_abbr (keep_id, abbr, full_name) VALUES
  ('70883008-29d7-4101-b150-8e360a8792ad', 'bb.', 'btb'),
  ('9506f13a-846b-4b02-803a-2cb52935e5cd', 'ct.', 'cbt'),
  ('74c7d0ba-a6ad-41eb-98a4-5faf4361456e', 'cj.', 'cbj')
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

SELECT 'übrige Verlage mit btb/cbt/cbj im Namen' AS was, count(*) AS anzahl FROM publishers
 WHERE name ~* '(^|[^a-z])(btb|cbt|cbj)([^a-z]|$)';

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
