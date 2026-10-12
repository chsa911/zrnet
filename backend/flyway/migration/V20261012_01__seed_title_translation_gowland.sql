-- New highlight (Top Received, Oct 2026): John Stafford Gowland, "Allein im kanadischen Urwald"
-- (Orell Füssli, Zürich, 1950s; translated by Paul Lang).
-- Original English: "Smoke Over Sikanaska" (Ives Washburn, New York / Werner Laurie, London, 1955;
-- subtitle varies: "The Story of a Forest Ranger" / "My Life as a Forest Ranger").
-- No French, Spanish or Portuguese edition found (Oct 2026) -> 'free'.
-- The book is matched by its German title + author, since its id is not known here.
-- Existing translation rows are never overwritten.

WITH bk AS (
  SELECT b.id
  FROM public.books b
  LEFT JOIN public.authors a ON a.id = b.author_id
  WHERE COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Allein%kanadischen Urwald%'
    AND COALESCE(NULLIF(a.name_display, ''), concat_ws(' ', a.first_name, a.last_name)) ILIKE '%Gowland%'
)
INSERT INTO public.book_title_translations
  (book_id, locale, title, title_kind, edition_available, note)
SELECT bk.id, v.locale, v.title, v.title_kind, v.edition_available::boolean, NULL
FROM bk
CROSS JOIN (VALUES
  ('de',    'Allein im kanadischen Urwald', 'official', true),
  ('en',    'Smoke Over Sikanaska',         'original', true),
  ('fr',    'Fumée sur Sikanaska',          'free', NULL),
  ('es',    'Humo sobre Sikanaska',         'free', NULL),
  ('pt-BR', 'Fumaça sobre Sikanaska',       'free', NULL)
) AS v(locale, title, title_kind, edition_available)
ON CONFLICT (book_id, locale) DO NOTHING;

UPDATE public.books b
SET original_language = COALESCE(b.original_language, 'en'),
    original_title    = COALESCE(b.original_title, 'Smoke Over Sikanaska')
FROM public.authors a
WHERE a.id = b.author_id
  AND COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Allein%kanadischen Urwald%'
  AND COALESCE(NULLIF(a.name_display, ''), concat_ws(' ', a.first_name, a.last_name)) ILIKE '%Gowland%';
