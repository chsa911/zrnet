-- =====================================================================
-- Alle Bücher, die sich um China drehen  (nur lesend, ändert nichts)
--
-- Ausführen:
--   psql "$DB" -v ON_ERROR_STOP=1 -f china_buecher_finden.sql
-- Ergebnis: china_buecher.csv im aktuellen Ordner
--
-- Spalte "grund" zeigt, warum ein Buch gefunden wurde:
--   ort        Handlungsland/-stadt ist China (inkl. Tibet, Hongkong, Taiwan, Macau)
--   dynastie   verknüpfte Dynastie mit Herkunftsland China (Ming, Qing ...)
--   figur      Hauptfigur in China geboren/gestorben
--   titel      Titel/Untertitel/Originaltitel/Themen/Kommentar enthält China-Begriff
--   autor_cn   nur: Autor hat chinesische Nationalität (schwächstes Signal)
-- =====================================================================

CREATE TEMP VIEW china_treffer AS
WITH muster AS (
  SELECT '(china|chines|peking|beijing|shanghai|hongkong|hong kong|guangzhou|nanking|nanjing|'
      || 'taiwan|formosa|macau|macao|tibet|lhasa|xinjiang|uigur|mandschu|mongolei|'
      || 'jangtse|yangtse|yangtze|gelber fluss|große mauer|grosse mauer|great wall|verbotene stadt|forbidden city|'
      || 'reich der mitte|middle kingdom|\mmaos?\M|maoismus|maoist|mao tse|mao zedong|mao-tse|tse-tung|kultur-?revolution|cultural revolution|'
      || 'tiananmen|tian''anmen|konfuz|confuci|laotse|lao-tse|laozi|tao te|daodejing|\mcixi\M|tz''u-hsi|'
      || 'opiumkrieg|opium war|boxeraufstand|boxer rebellion|deng xiaoping|xi jinping|chiang kai|tschiang|'
      || '\mming\M|\mqing\M|\mhan-dynastie|\mtang-dynastie|seidenstraße|seidenstrasse|silk road|shaolin)' AS re
),
ort AS (
  SELECT b.id FROM books b, muster m
  WHERE concat_ws(' ', b.action_country, b.action_state, b.action_city) ~* m.re
     OR upper(btrim(b.action_country)) IN ('CN','CHN','TW','TWN','RC','HK','HKG','MO','MAC','VR CHINA','PRC')
     OR (upper(btrim(b.action_country)) = 'C' AND b.action_continent = 0)
),
dyn AS (
  SELECT bd.book_id AS id FROM book_dynasties bd
  JOIN dynasties d ON d.id = bd.dynasty_id, muster m
  WHERE concat_ws(' ', d.origin_country, d.name, d.name_display) ~* m.re
     OR upper(btrim(d.origin_country)) IN ('CN','CHN')
),
fig AS (
  SELECT bc.book_id AS id FROM book_characters bc
  JOIN characters c ON c.id = bc.character_id, muster m
  WHERE concat_ws(' ', c.birth_country, c.death_country, c.birth_city, c.death_city) ~* m.re
     OR upper(btrim(c.birth_country)) IN ('CN','CHN') OR upper(btrim(c.death_country)) IN ('CN','CHN')
  UNION
  SELECT bm.book_id FROM book_main_characters bm
  JOIN main_characters c ON c.id = bm.character_id, muster m
  WHERE concat_ws(' ', c.birth_country, c.birth_city) ~* m.re
     OR upper(btrim(c.birth_country)) IN ('CN','CHN')
),
tit AS (
  SELECT b.id FROM books b, muster m
  WHERE concat_ws(' ', b.title_display, b.main_title_display, b.subtitle_display, b.original_title,
                  b.title_en, array_to_string(b.extra_titles, ' '), b.themes, b.comment,
                  b.title_keyword, b.title_keyword2, b.title_keyword3)
        ~* m.re
  UNION
  SELECT t.book_id FROM book_title_translations t, muster m WHERE t.title ~* m.re
),
aut AS (
  SELECT b.id FROM books b
  LEFT JOIN authors a ON a.id = b.author_id
  WHERE concat_ws(' ', b.author_nationality, a.author_nationality) ~* '(china|chines|\mcn\M|taiwan|hongkong)'
),
alle AS (
  SELECT id, 'ort' AS g, 1 AS p FROM ort
  UNION ALL SELECT id, 'dynastie', 2 FROM dyn
  UNION ALL SELECT id, 'figur', 3 FROM fig
  UNION ALL SELECT id, 'titel', 4 FROM tit
  UNION ALL SELECT id, 'autor_cn', 5 FROM aut
),
grund AS (
  SELECT id, string_agg(DISTINCT g, ', ') AS grund,
         bool_and(g = 'autor_cn') AS nur_autor
  FROM alle GROUP BY id
)
SELECT
  b.title_display                                  AS titel,
  b.subtitle_display                               AS untertitel,
  coalesce(b.author_display, b.author)             AS autor,
  b.year_first_published                           AS erstveroeffentlicht,
  CASE WHEN b.is_fiction THEN 'Roman/Fiktion'
       WHEN b.is_fiction = false THEN 'Sachbuch' END AS art,
  coalesce(sg.name, b.sub_genre)                   AS subgenre,
  b.themes                                         AS themen,
  concat_ws(' / ', b.action_country, b.action_city) AS handlungsort,
  b.action_time_period_display                     AS handlungszeit,
  b.reading_status                                 AS status,
  b.pages                                          AS seiten,
  b.isbn13,
  g.grund,
  CASE WHEN g.nur_autor THEN 'prüfen' ELSE 'ja' END AS china_bezug,
  b.id
FROM grund g
JOIN books b ON b.id = g.id
LEFT JOIN sub_genres sg ON sg.id = b.sub_genre_id
ORDER BY g.nur_autor, b.title_display;

-- Überblick in der Konsole
SELECT grund, count(*) AS anzahl FROM china_treffer GROUP BY grund ORDER BY anzahl DESC;

\copy (SELECT * FROM china_treffer) TO 'china_buecher.csv' WITH (FORMAT csv, HEADER, DELIMITER ';', ENCODING 'UTF8')
