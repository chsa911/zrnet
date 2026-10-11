-- New highlight (Top Finished, Oct 2026): Nedjma, "Die Mandel" (Knaur).
-- The German edition is a translation; the original is French: "L'Amande" (Plon, 2004).
-- Known editions (checked Oct 2026):
--   en  "The Almond" (Grove Press, 2005; subtitle "The Sexual Awakening of a Muslim Woman")
--   es  "La almendra"
--   pt  "A amêndoa" (Círculo de Leitores, 2005) – edition from Portugal, no Brazilian edition found
-- The book is matched by its German title + author, since its id is not known here.
-- Existing translation rows are never overwritten.

WITH bk AS (
  SELECT b.id
  FROM public.books b
  LEFT JOIN public.authors a ON a.id = b.author_id
  WHERE COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Die Mandel%'
    AND COALESCE(a.name_display, '') ILIKE '%Nedj%'
)
INSERT INTO public.book_title_translations
  (book_id, locale, title, title_kind, edition_available, note)
SELECT bk.id, v.locale, v.title, v.title_kind, v.edition_available::boolean, v.note
FROM bk
CROSS JOIN (VALUES
  ('de',    'Die Mandel',  'official', true, NULL),
  ('en',    'The Almond: The Sexual Awakening of a Muslim Woman', 'official', true, NULL),
  ('fr',    'L''Amande',   'original', true, NULL),
  ('es',    'La almendra', 'official', true, NULL),
  ('pt-BR', 'A amêndoa',   'official', true, 'Ausgabe aus Portugal')
) AS v(locale, title, title_kind, edition_available, note)
ON CONFLICT (book_id, locale) DO NOTHING;

UPDATE public.books b
SET original_language = COALESCE(b.original_language, 'fr'),
    original_title    = COALESCE(b.original_title, 'L''Amande')
FROM public.authors a
WHERE a.id = b.author_id
  AND COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Die Mandel%'
  AND a.name_display ILIKE '%Nedj%';
