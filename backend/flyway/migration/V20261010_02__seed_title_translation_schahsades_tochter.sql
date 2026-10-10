-- New highlight (Top Finished, Oct 2026): Sattareh Farman Farmaian, "Schahsades Tochter".
-- The German Heyne edition is a translation; the original is English:
-- "Daughter of Persia: A Woman's Journey from Her Father's Harem Through the Islamic Revolution"
-- (Crown, 1992, with Dona Munker).
-- Known translations (Goodreads edition list, Oct 2026): German (Heyne / Bertelsmann Club),
-- Dutch ("Dochter van Perzie", 1993), Persian ("Dokhtari az Iran", 1998). No French, Spanish or
-- Portuguese edition found -> 'free' translations for fr / es / pt-BR.
-- The book is matched by its German title, since its id is not known here.
-- Existing translation rows are never overwritten.

WITH bk AS (
  SELECT b.id
  FROM public.books b
  WHERE COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Schahsade%Tochter%'
)
INSERT INTO public.book_title_translations
  (book_id, locale, title, title_kind, edition_available, note)
SELECT bk.id, v.locale, v.title, v.title_kind, v.edition_available::boolean, NULL
FROM bk
CROSS JOIN (VALUES
  ('de', 'Schahsades Tochter: Die faszinierende Lebensgeschichte einer Frau im Iran', 'official', true),
  ('en', 'Daughter of Persia: A Woman''s Journey from Her Father''s Harem Through the Islamic Revolution', 'original', true),
  ('fr', 'Fille de Perse : le voyage d''une femme, du harem de son père à la révolution islamique', 'free', NULL),
  ('es', 'Hija de Persia: el viaje de una mujer desde el harén de su padre hasta la revolución islámica', 'free', NULL),
  ('pt-BR', 'Filha da Pérsia: a jornada de uma mulher do harém de seu pai até a revolução islâmica', 'free', NULL)
) AS v(locale, title, title_kind, edition_available)
ON CONFLICT (book_id, locale) DO NOTHING;

UPDATE public.books b
SET original_language = COALESCE(b.original_language, 'en'),
    original_title    = COALESCE(b.original_title,
      'Daughter of Persia: A Woman''s Journey from Her Father''s Harem Through the Islamic Revolution')
WHERE COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Schahsade%Tochter%';
