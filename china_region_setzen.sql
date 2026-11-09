-- =====================================================================
-- China-Bücher: Region = Asien (action_continent = 0), Land = 'C' (China)
--
-- Erkennung wie in china_buecher_finden.sql (Handlungsort, Dynastie, Figur,
-- Titel/Untertitel/Originaltitel/Themen/Kommentar).
-- NICHT geändert werden:
--   - Bücher, die nur wegen chinesischer Autor-Nationalität gefunden wurden
--   - reine Taiwan-Treffer (Taiwan wird nicht als China eingetragen)
--   - Bücher, bei denen schon ein ANDERES Land (z. B. Japan, USA) oder eine
--     andere Region als Asien eingetragen ist  -> stehen als "konflikt" in der CSV
--   - IDs in der Ausschlussliste unten (Fehltreffer nach Durchsicht eintragen)
-- Zusätzlich gesetzt werden IDs aus der Einschlussliste (z. B. aus
-- china_autoren_pruefen.csv), auch wenn die Suche sie nicht findet.
-- Ein Land wie 'China', 'Tibet', 'Hongkong', 'Peking', 'VR China', 'CN' wird zu 'C'.
--
-- Probelauf (ändert nichts, schreibt china_region_aenderungen.csv):
--   psql "$DB" -v ON_ERROR_STOP=1 -f china_region_setzen.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' china_region_setzen.sql | psql "$DB" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

-- ---- Ausschlussliste: Fehltreffer hier eintragen -------------------------
CREATE TEMP TABLE ausschluss (id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO ausschluss VALUES
  ('3a1ac44f-72dd-4c79-96ff-e0b5ba28063b')   -- Mao II (DeLillo): spielt in New York/Beirut, nicht China
;

-- ---- Einschlussliste: China-Bücher, die die Suche nicht findet -----------
-- (z. B. aus china_autoren_pruefen.csv, Spalte id)
CREATE TEMP TABLE einschluss (id uuid PRIMARY KEY) ON COMMIT DROP;
-- INSERT INTO einschluss VALUES
--   ('00000000-0000-0000-0000-000000000000'),  -- Titel
-- ;

CREATE TEMP TABLE muster ON COMMIT DROP AS
SELECT
  '(china|chines|peking|beijing|shanghai|hongkong|hong kong|guangzhou|nanking|nanjing|'
  || 'macau|macao|tibet|lhasa|xinjiang|uigur|mandschu|'
  || 'jangtse|yangtse|yangtze|gelber fluss|große mauer|grosse mauer|great wall|verbotene stadt|forbidden city|'
  || 'reich der mitte|middle kingdom|\mmaos?\M|maoismus|maoist|mao tse|mao zedong|mao-tse|tse-tung|kultur-?revolution|cultural revolution|'
  || 'tiananmen|tian''anmen|konfuz|confuci|laotse|lao-tse|laozi|tao te|daodejing|\mcixi\M|tz''u-hsi|'
  || 'opiumkrieg|opium war|boxeraufstand|boxer rebellion|deng xiaoping|xi jinping|chiang kai|tschiang|'
  || '\mming\M|\mqing\M|\mhan-dynastie|\mtang-dynastie|shaolin)' AS re,
  '(taiwan|formosa)' AS re_tw;

CREATE TEMP TABLE kandidaten ON COMMIT DROP AS
WITH ort AS (
  SELECT b.id, false AS tw FROM books b, muster m
  WHERE concat_ws(' ', b.action_country, b.action_state, b.action_city) ~* m.re
     OR upper(btrim(b.action_country)) IN ('CN','CHN','HK','HKG','MO','MAC','VR CHINA','PRC')
     OR (upper(btrim(b.action_country)) = 'C' AND b.action_continent = 0)
  UNION ALL
  SELECT b.id, true FROM books b, muster m
  WHERE concat_ws(' ', b.action_country, b.action_state, b.action_city) ~* m.re_tw
     OR upper(btrim(b.action_country)) IN ('TW','TWN','RC')
),
dyn AS (
  SELECT bd.book_id AS id, false AS tw FROM book_dynasties bd
  JOIN dynasties d ON d.id = bd.dynasty_id, muster m
  WHERE concat_ws(' ', d.origin_country, d.name, d.name_display) ~* m.re
     OR upper(btrim(d.origin_country)) IN ('CN','CHN')
),
fig AS (
  SELECT bc.book_id AS id, false AS tw FROM book_characters bc
  JOIN characters c ON c.id = bc.character_id, muster m
  WHERE concat_ws(' ', c.birth_country, c.death_country, c.birth_city, c.death_city) ~* m.re
     OR upper(btrim(c.birth_country)) IN ('CN','CHN') OR upper(btrim(c.death_country)) IN ('CN','CHN')
  UNION
  SELECT bm.book_id, false FROM book_main_characters bm
  JOIN main_characters c ON c.id = bm.character_id, muster m
  WHERE concat_ws(' ', c.birth_country, c.birth_city) ~* m.re
     OR upper(btrim(c.birth_country)) IN ('CN','CHN')
),
txt AS (
  SELECT b.id,
         concat_ws(' ', b.title_display, b.main_title_display, b.subtitle_display, b.original_title,
                   b.title_en, array_to_string(b.extra_titles, ' '), b.themes, b.comment,
                   b.title_keyword, b.title_keyword2, b.title_keyword3) AS t
  FROM books b
  UNION ALL
  SELECT book_id, title FROM book_title_translations
),
tit AS (
  SELECT DISTINCT x.id, false AS tw FROM txt x, muster m WHERE x.t ~* m.re
  UNION
  SELECT DISTINCT x.id, true FROM txt x, muster m WHERE x.t ~* m.re_tw
),
alle AS (
  SELECT id, 'ort' AS g, tw FROM ort
  UNION ALL SELECT id, 'dynastie', tw FROM dyn
  UNION ALL SELECT id, 'figur', tw FROM fig
  UNION ALL SELECT id, 'titel', tw FROM tit
)
SELECT id,
       string_agg(DISTINCT g, ', ') AS grund,
       bool_and(tw)                 AS nur_taiwan
FROM alle
GROUP BY id;

-- manuell ergänzte Bücher (aus china_autoren_pruefen.csv) dazunehmen
INSERT INTO kandidaten (id, grund, nur_taiwan)
SELECT e.id, 'manuell', false FROM einschluss e
WHERE NOT EXISTS (SELECT 1 FROM kandidaten k WHERE k.id = e.id);

CREATE TEMP TABLE plan ON COMMIT DROP AS
SELECT
  b.id,
  b.title_display,
  coalesce(b.author_display, b.author) AS autor,
  k.grund,
  b.action_continent AS region_alt,
  b.action_country   AS land_alt,
  CASE
    WHEN k.nur_taiwan                                   THEN 'übersprungen: nur Taiwan'
    WHEN a.id IS NOT NULL                               THEN 'übersprungen: Ausschlussliste'
    WHEN b.action_continent IS NOT NULL AND b.action_continent <> 0
                                                        THEN 'konflikt: andere Region'
    WHEN nullif(btrim(b.action_country), '') IS NULL    THEN 'setzen'
    WHEN b.action_country ~* m.re
      OR upper(btrim(b.action_country)) IN ('C','CN','CHN','HK','HKG','MO','MAC','VR CHINA','PRC')
                                                        THEN 'setzen'
    ELSE 'konflikt: anderes Land'
  END AS aktion
FROM kandidaten k
JOIN books b ON b.id = k.id
CROSS JOIN muster m
LEFT JOIN ausschluss a ON a.id = b.id;

-- nichts ändern, was schon stimmt
UPDATE plan SET aktion = 'unverändert (stimmt schon)'
WHERE aktion = 'setzen' AND region_alt = 0 AND land_alt = 'C';

-- ---- Liste zum Durchsehen -------------------------------------------------
\copy (SELECT aktion, title_display AS titel, autor, grund, region_alt, land_alt, CASE WHEN aktion = 'setzen' THEN 'Asien / C' END AS neu, id FROM plan ORDER BY aktion DESC, title_display) TO 'china_region_aenderungen.csv' WITH (FORMAT csv, HEADER, DELIMITER ';', ENCODING 'UTF8')

-- ---- Sicherung ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books_china_region_backup_20261108 (
  id uuid, action_continent int2, action_country text, gesichert_am timestamptz DEFAULT now()
);
INSERT INTO books_china_region_backup_20261108 (id, action_continent, action_country)
SELECT b.id, b.action_continent, b.action_country
FROM books b JOIN plan p ON p.id = b.id
WHERE p.aktion = 'setzen';

-- ---- Ändern ---------------------------------------------------------------
UPDATE books b SET
  action_continent = 0,
  action_country   = 'C',
  updated_at       = now()
FROM plan p
WHERE p.id = b.id AND p.aktion = 'setzen';

-- ---- Ergebnis -------------------------------------------------------------
SELECT aktion, count(*) AS anzahl FROM plan GROUP BY aktion ORDER BY anzahl DESC;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
