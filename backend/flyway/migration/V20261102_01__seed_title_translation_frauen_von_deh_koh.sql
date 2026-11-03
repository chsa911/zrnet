-- New highlight (Top Received, Nov 2026): Erika Friedl, "Die Frauen von Deh Koh"
-- (Knesebeck & Schuler; subtitle "Geschichten aus einem iranischen Dorf").
-- Original English: "Women of Deh Koh: Lives in an Iranian Village"
-- (Smithsonian Institution Press, Washington, 1989; Penguin paperback 1991 as
-- "The Women of Deh Koh", ISBN 978-0-14-014993-7).
-- No French, Spanish or Portuguese edition found (Nov 2026) -> 'free'.
-- The book is matched by its German title + author, since its id is not known here.
-- Existing translation rows are never overwritten.

WITH bk AS (
  SELECT b.id
  FROM public.books b
  LEFT JOIN public.authors a ON a.id = b.author_id
  WHERE COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Die Frauen von Deh Koh%'
    AND COALESCE(NULLIF(a.name_display, ''), concat_ws(' ', a.first_name, a.last_name)) ILIKE '%Friedl%'
)
INSERT INTO public.book_title_translations
  (book_id, locale, title, title_kind, edition_available, note)
SELECT bk.id, v.locale, v.title, v.title_kind, v.edition_available::boolean, NULL
FROM bk
CROSS JOIN (VALUES
  ('de',    'Die Frauen von Deh Koh',    'official', true),
  ('en',    'The Women of Deh Koh',      'original', true),
  ('fr',    'Les femmes de Deh Koh',     'free', NULL),
  ('es',    'Las mujeres de Deh Koh',    'free', NULL),
  ('pt-BR', 'As mulheres de Deh Koh',    'free', NULL)
) AS v(locale, title, title_kind, edition_available)
ON CONFLICT (book_id, locale) DO NOTHING;

UPDATE public.books b
SET original_language = COALESCE(b.original_language, 'en'),
    original_title    = COALESCE(b.original_title, 'Women of Deh Koh: Lives in an Iranian Village')
FROM public.authors a
WHERE a.id = b.author_id
  AND COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Die Frauen von Deh Koh%'
  AND COALESCE(NULLIF(a.name_display, ''), concat_ws(' ', a.first_name, a.last_name)) ILIKE '%Friedl%';
