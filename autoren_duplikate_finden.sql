-- Doppelte Autoren finden (nur lesend, ändert nichts)
-- Ausführen z.B. in DBeaver/psql gegen die Produktiv-DB.
-- Teil A braucht keine Extensions. Teil B (Tippfehler) braucht fuzzystrmatch:
--   CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ---------------------------------------------------------------
-- Hilfsfunktion: Name normalisieren
-- (klein, Umlaute -> ae/oe/ue, ß -> ss, Akzente weg, nur a-z)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.norm_name(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           translate(
             replace(replace(replace(replace(lower(coalesce(t,'')),
               'ä','ae'),'ö','oe'),'ü','ue'),'ß','ss'),
             'áàâãåéèêëíìîïóòôõøúùûýÿçñčšžćłńśźżőű',
             'aaaaaeeeeiiiiooooouuuyycncszclnszzou'),
           '[^a-z]', '', 'g')
$$;

-- Buchanzahl je Autor (books.author_id + book_authors)
CREATE TEMP TABLE a_norm AS
SELECT a.id,
       a.first_name, a.last_name, a.name_display, a.name,
       pg_temp.norm_name(a.first_name)                         AS fn,
       pg_temp.norm_name(a.last_name)                          AS ln,
       pg_temp.norm_name(regexp_replace(a.last_name,
         '^(von|van|de|der|den|du|la|le|di|da|zu|vom|v\.)\s+', '', 'i')) AS ln_core,
       (SELECT count(*) FROM books b WHERE b.author_id = a.id)
     + (SELECT count(*) FROM book_authors ba WHERE ba.author_id = a.id
          AND NOT EXISTS (SELECT 1 FROM books b2 WHERE b2.id = ba.book_id AND b2.author_id = a.id)) AS buecher
FROM authors a;

-- ---------------------------------------------------------------
-- Teil A: sichere Treffer
-- ---------------------------------------------------------------
WITH paare AS (
  -- 1) gleicher Vor- und Nachname nach Normalisierung (inkl. ohne "von")
  SELECT x.id id1, y.id id2, 'identisch' kategorie, 'hoch' sicherheit
  FROM a_norm x JOIN a_norm y ON x.id < y.id
   AND x.fn <> '' AND x.fn = y.fn AND x.ln_core = y.ln_core
  UNION ALL
  -- 2) Vor-/Nachname vertauscht
  SELECT x.id, y.id, 'vertauscht', 'hoch'
  FROM a_norm x JOIN a_norm y ON x.id < y.id
   AND x.fn <> '' AND x.fn = y.ln AND x.ln = y.fn
  UNION ALL
  -- 3) ganzer Name im Nachnamenfeld ("Reich Ranicki" vs "Reich-Ranicki")
  SELECT x.id, y.id, 'ganzer Name im Nachnamenfeld', 'hoch'
  FROM a_norm x JOIN a_norm y ON x.id <> y.id
   AND x.fn = '' AND x.last_name ~ '\s' AND x.ln = y.fn || y.ln
  UNION ALL
  -- 4) beide ohne Vorname, gleicher Nachname
  SELECT x.id, y.id, 'gleicher Nachname, ohne Vorname', 'mittel'
  FROM a_norm x JOIN a_norm y ON x.id < y.id
   AND x.fn = '' AND y.fn = '' AND x.ln_core = y.ln_core AND x.ln_core <> ''
  UNION ALL
  -- 5) einer ohne Vorname, genau EIN Autor mit Vorname hat diesen Nachnamen
  SELECT x.id, y.id, 'ohne Vorname vs. einziger mit Vorname', 'mittel'
  FROM a_norm x JOIN a_norm y ON x.fn = '' AND y.fn <> '' AND x.ln_core = y.ln_core AND x.ln_core <> ''
  WHERE (SELECT count(DISTINCT z.fn) FROM a_norm z WHERE z.ln_core = x.ln_core AND z.fn <> '') = 1
  UNION ALL
  -- 6) Initiale vs. voller Vorname ("J.M.G. Le Clezio" vs "Jean-Marie Gustave Le Clézio")
  SELECT x.id, y.id, 'Initiale vs. Vorname', 'mittel'
  FROM a_norm x JOIN a_norm y ON x.id <> y.id AND x.ln_core = y.ln_core
   AND x.first_name ~ '^([A-ZÄÖÜ]\.?[\s-]*)+$'
   AND y.first_name !~ '^([A-ZÄÖÜ]\.?[\s-]*)+$' AND y.fn <> ''
   AND left(y.fn,1) = left(x.fn,1)
)
SELECT p.sicherheit, p.kategorie,
       coalesce(nullif(trim(concat_ws(' ', x.first_name, x.last_name)),''), x.name_display) autor_1, x.buecher buecher_1,
       coalesce(nullif(trim(concat_ws(' ', y.first_name, y.last_name)),''), y.name_display) autor_2, y.buecher buecher_2,
       x.id id_1, y.id id_2
FROM (SELECT DISTINCT ON (least(id1,id2), greatest(id1,id2)) * FROM paare
      ORDER BY least(id1,id2), greatest(id1,id2), sicherheit) p
JOIN a_norm x ON x.id = p.id1
JOIN a_norm y ON y.id = p.id2
ORDER BY CASE p.sicherheit WHEN 'hoch' THEN 0 ELSE 1 END, p.kategorie, x.ln, x.fn;

-- ---------------------------------------------------------------
-- Teil B: mögliche Tippfehler (braucht fuzzystrmatch) – manuell prüfen!
-- ---------------------------------------------------------------
SELECT 'Nachname ähnlich, gleicher Vorname' kategorie,
       concat_ws(' ', x.first_name, x.last_name) autor_1, x.buecher buecher_1,
       concat_ws(' ', y.first_name, y.last_name) autor_2, y.buecher buecher_2,
       levenshtein(x.ln_core, y.ln_core) abstand, x.id id_1, y.id id_2
FROM a_norm x JOIN a_norm y ON x.id < y.id
 AND x.fn <> '' AND x.fn = y.fn AND x.ln_core <> y.ln_core
 AND least(length(x.ln_core), length(y.ln_core)) >= 5
 AND levenshtein(x.ln_core, y.ln_core) = 1
UNION ALL
SELECT 'Vorname ähnlich, gleicher Nachname',
       concat_ws(' ', x.first_name, x.last_name), x.buecher,
       concat_ws(' ', y.first_name, y.last_name), y.buecher,
       levenshtein(x.fn, y.fn), x.id, y.id
FROM a_norm x JOIN a_norm y ON x.id < y.id
 AND x.ln_core = y.ln_core AND x.fn <> '' AND y.fn <> '' AND x.fn <> y.fn
 AND least(length(x.fn), length(y.fn)) >= 4
 AND levenshtein(x.fn, y.fn) = 1
ORDER BY 1, 2;
