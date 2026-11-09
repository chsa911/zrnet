-- =====================================================================
-- China-Autoren: weitere Bücher zum Prüfen  (nur lesend, ändert nichts)
--
-- Findet Autoren, die
--   a) mindestens 2 Bücher haben, die schon als China-Bücher erkannt werden
--      (gleiche Erkennung wie china_region_setzen.sql), oder
--   b) chinesische Nationalität haben,
-- und listet deren ÜBRIGE Bücher auf, die die Suche nicht erkennt.
-- Echte China-Bücher daraus: id in die Einschlussliste von
-- china_region_setzen.sql eintragen.
--
-- Ausführen:
--   psql "$DB" -v ON_ERROR_STOP=1 -f china_autoren_pruefen.sql
-- Ergebnis: china_autoren_pruefen.csv
-- =====================================================================

BEGIN;

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

-- bekannte Fehltreffer nicht als China-Buch zählen
DELETE FROM kandidaten WHERE nur_taiwan
   OR id IN ('3a1ac44f-72dd-4c79-96ff-e0b5ba28063b');  -- Mao II (DeLillo)

CREATE TEMP TABLE buch_autor ON COMMIT DROP AS
SELECT book_id, author_id FROM book_authors
UNION
SELECT id, author_id FROM books WHERE author_id IS NOT NULL;

CREATE TEMP TABLE china_autor ON COMMIT DROP AS
SELECT a.id AS author_id,
       coalesce(a.name_display, a.full_name, a.name) AS autor,
       a.author_nationality AS nationalitaet,
       count(DISTINCT k.id) AS china_buecher,
       (SELECT count(DISTINCT x.book_id) FROM buch_autor x WHERE x.author_id = a.id) AS buecher_gesamt,
       string_agg(DISTINCT b.title_display, ' | ') AS china_titel
FROM authors a
JOIN buch_autor ba ON ba.author_id = a.id
LEFT JOIN kandidaten k ON k.id = ba.book_id
LEFT JOIN books b ON b.id = k.id
GROUP BY a.id, a.name_display, a.full_name, a.name, a.author_nationality
HAVING count(DISTINCT k.id) >= 2
    OR a.author_nationality ~* '(china|chines|\mcn\M|\mchn\M|volksrepublik)';

-- Überblick: Autoren
SELECT autor, nationalitaet, china_buecher, buecher_gesamt
FROM china_autor ORDER BY china_buecher DESC, autor;

\copy (SELECT ca.autor, ca.nationalitaet, ca.china_buecher AS china_buecher_erkannt, ca.buecher_gesamt, b.title_display AS titel, b.subtitle_display AS untertitel, CASE WHEN b.is_fiction THEN 'Roman/Fiktion' WHEN b.is_fiction = false THEN 'Sachbuch' END AS art, b.action_continent AS region, b.action_country AS land, b.reading_status AS status, ca.china_titel AS erkannte_china_titel, b.id FROM china_autor ca JOIN buch_autor ba ON ba.author_id = ca.author_id JOIN books b ON b.id = ba.book_id WHERE NOT EXISTS (SELECT 1 FROM kandidaten k WHERE k.id = b.id) ORDER BY ca.china_buecher DESC, ca.autor, b.title_display) TO 'china_autoren_pruefen.csv' WITH (FORMAT csv, HEADER, DELIMITER ';', ENCODING 'UTF8')

ROLLBACK;
