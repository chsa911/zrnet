-- Subgenres werden zu Schlagworten.
--
-- Künftig wird beim Buch nur noch Fiction / Non-Fiction (books.genre_id)
-- gewählt, alles Weitere über Schlagworte (V20261111_01). Damit der Bestand
-- nicht verloren geht, bekommt jedes Buch mit Subgenre das gleichnamige
-- Schlagwort (z. B. Subgenre "Frauenschicksale" -> Schlagwort "Frauenschicksale").
--
-- books.sub_genre_id bleibt unverändert stehen (u. a. für "Ähnliche Bücher").
-- Mehrfach ausführbar; vorhandene Schlagworte/Zuordnungen bleiben erhalten.

BEGIN;

-- 1) ein Schlagwort je verwendetem Subgenre-Namen
WITH names AS (
  SELECT DISTINCT ON (lower(n)) n AS name
  FROM (
    SELECT btrim(coalesce(nullif(btrim(sg.name), ''), sg.abbr)) AS n
    FROM public.sub_genres sg
    WHERE EXISTS (SELECT 1 FROM public.books b WHERE b.sub_genre_id = sg.id)
  ) x
  WHERE n IS NOT NULL AND n <> ''
  ORDER BY lower(n), n
),
slugged AS (
  SELECT name,
         coalesce(nullif(btrim(regexp_replace(
           translate(replace(replace(replace(replace(lower(name), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
                     'áàâãåéèêëíìîïóòôõúùûçñ', 'aaaaaeeeeiiiiooooouuucn'),
           '[^a-z0-9]+', '-', 'g'), '-'), ''), 'schlagwort') AS base
  FROM names
  WHERE NOT EXISTS (SELECT 1 FROM public.keywords k WHERE lower(k.name) = lower(names.name))
),
numbered AS (
  SELECT name, base, row_number() OVER (PARTITION BY base ORDER BY name) AS nr
  FROM slugged
)
INSERT INTO public.keywords (slug, name)
SELECT CASE
         WHEN nr = 1 AND NOT EXISTS (SELECT 1 FROM public.keywords k WHERE k.slug = base) THEN base
         ELSE base || '-' || left(md5(name), 6)
       END,
       left(name, 80)
FROM numbered
ON CONFLICT DO NOTHING;

-- 2) Bücher mit Subgenre bekommen das Schlagwort
INSERT INTO public.book_keywords (book_id, keyword_id, sort_order)
SELECT b.id, k.id, 0
FROM public.books b
JOIN public.sub_genres sg ON sg.id = b.sub_genre_id
JOIN public.keywords k
  ON lower(k.name) = lower(left(btrim(coalesce(nullif(btrim(sg.name), ''), sg.abbr)), 80))
ON CONFLICT (book_id, keyword_id) DO NOTHING;

COMMIT;
