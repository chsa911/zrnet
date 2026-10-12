-- New highlights (Oct 2026):
--
-- 1) Nedjma, "Die Mandel" (Knaur). Original French: "L'Amande" (Plon, 2004).
--    Official editions: English "The Almond" (Grove Press, 2005),
--    Spanish "La almendra" (Maeva, 2005), Portuguese "A amêndoa" (Círculo de Leitores, 2005, Portugal).
--
-- 2) John Stafford Gowland, "Allein im kanadischen Urwald" (Orell Füssli, Zürich).
--    Original English: "Smoke Over Sikanaska" (Ives Washburn / Werner Laurie, 1955).
--    No French, Spanish or Portuguese edition found -> 'free'.
--
-- Books are matched by title + author (ids unknown here). All copies (reading attempts) match.
-- Existing translation rows are never overwritten.

WITH bk AS (
  SELECT b.id,
         CASE WHEN COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Die Mandel%'
              THEN 'mandel' ELSE 'gowland' END AS which
  FROM public.books b
  LEFT JOIN public.authors a ON a.id = b.author_id
  WHERE (COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Die Mandel%'
         AND COALESCE(NULLIF(a.name_display, ''), concat_ws(' ', a.first_name, a.last_name)) ILIKE '%Nedj%')
     OR (COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Allein im kanadischen Urwald%'
         AND COALESCE(NULLIF(a.name_display, ''), concat_ws(' ', a.first_name, a.last_name)) ILIKE '%Gowland%')
)
INSERT INTO public.book_title_translations
  (book_id, locale, title, title_kind, edition_available, note)
SELECT bk.id, v.locale, v.title, v.title_kind, v.edition_available::boolean, v.note
FROM bk
JOIN (VALUES
  ('mandel', 'de',    'Die Mandel',  'official', true, NULL),
  ('mandel', 'en',    'The Almond',  'official', true, NULL),
  ('mandel', 'fr',    'L''Amande',   'original', true, NULL),
  ('mandel', 'es',    'La almendra', 'official', true, NULL),
  ('mandel', 'pt-BR', 'A amêndoa',   'official', true, 'Ausgabe aus Portugal'),

  ('gowland', 'de',    'Allein im kanadischen Urwald', 'official', true, NULL),
  ('gowland', 'en',    'Smoke Over Sikanaska',         'original', true, NULL),
  ('gowland', 'fr',    'Fumée sur Sikanaska',          'free', NULL, NULL),
  ('gowland', 'es',    'Humo sobre Sikanaska',         'free', NULL, NULL),
  ('gowland', 'pt-BR', 'Fumaça sobre Sikanaska',       'free', NULL, NULL)
) AS v(which, locale, title, title_kind, edition_available, note) ON v.which = bk.which
ON CONFLICT (book_id, locale) DO NOTHING;

UPDATE public.books b
SET original_language = COALESCE(b.original_language, v.lang),
    original_title    = COALESCE(b.original_title, v.otitle)
FROM public.authors a,
     (VALUES ('Die Mandel%', '%Nedj%', 'fr', 'L''Amande'),
             ('Allein im kanadischen Urwald%', '%Gowland%', 'en', 'Smoke Over Sikanaska')
     ) AS v(title_pat, author_pat, lang, otitle)
WHERE a.id = b.author_id
  AND COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE v.title_pat
  AND COALESCE(NULLIF(a.name_display, ''), concat_ws(' ', a.first_name, a.last_name)) ILIKE v.author_pat;
