-- Per-language purchase link: a link for the edition in that language.
-- Shown on the home highlights and the book page for that UI language; when empty,
-- books.purchase_url (the general link) is used as before.

ALTER TABLE public.book_title_translations
  ADD COLUMN IF NOT EXISTS purchase_url text NULL;

ALTER TABLE public.book_title_translations
  DROP CONSTRAINT IF EXISTS book_title_translations_purchase_url_http;
ALTER TABLE public.book_title_translations
  ADD CONSTRAINT book_title_translations_purchase_url_http
  CHECK (purchase_url IS NULL OR purchase_url ~* '^https?://');

-- Links for Nedjma, "Die Mandel" (highlight Oct 2026), checked 2026-10-11.
--   de     -> no own link: the general books.purchase_url (medimops, Knaur TB) applies
--   en     -> Grove Press paperback, ISBN 978-0-8021-4261-0 (Bookshop.org)
--   fr     -> Pocket, EAN 978-2-266-14849-8 (Fnac, used copies)
--   es     -> "La almendra: memorias eróticas de una mujer árabe" (IberLibro, used copies)
--   pt-BR  -> only an edition from Portugal (Círculo de Leitores, 2005); no shop link verified
-- Existing links are never overwritten.
UPDATE public.book_title_translations tt
SET purchase_url = v.url,
    updated_at   = now()
FROM (VALUES
  ('en', 'https://bookshop.org/book/9780802142610'),
  ('fr', 'https://www.fnac.com/a1650559/Nedjma-L-amande'),
  ('es', 'https://www.iberlibro.com/buscar-libro/titulo/la-almendra-memorias-er%F3ticas-de-una-mujer-%E1rabe/autor/nedjma/')
) AS v(locale, url),
public.books b
LEFT JOIN public.authors a ON a.id = b.author_id
WHERE tt.book_id = b.id
  AND tt.locale = v.locale
  AND tt.purchase_url IS NULL
  AND COALESCE(NULLIF(b.title_display, ''), b.title_keyword) ILIKE 'Die Mandel%'
  AND COALESCE(a.name_display, '') ILIKE '%Nedj%';
