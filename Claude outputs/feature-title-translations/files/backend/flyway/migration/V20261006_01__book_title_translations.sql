-- Book titles per UI language (de, en, fr, es, pt-BR), one row per (book, locale).
--
--   title_kind  'original' = the book was originally written in this language (title = original title)
--               'official' = a published edition in this language exists (title = that edition's title)
--               'free'     = no known edition; title is a free (sinngemäße) translation
--   edition_available  true / false / NULL (unknown). 'original' and 'official' imply true.
--
-- Book-level language facts stay on public.books:
--   books.language           language of the physical copy Christopher owns (new books default 'de')
--   books.original_language  language the book was originally written in
--   books.original_title     title in the original language (new column)

CREATE TABLE IF NOT EXISTS public.book_title_translations (
  book_id            uuid        NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  locale             text        NOT NULL CHECK (locale IN ('de', 'en', 'fr', 'es', 'pt-BR')),
  title              text        NOT NULL CHECK (btrim(title) <> ''),
  title_kind         text        NOT NULL DEFAULT 'free'
                                 CHECK (title_kind IN ('original', 'official', 'free')),
  edition_available  boolean     NULL,
  note               text        NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, locale),
  CONSTRAINT book_title_translations_kind_vs_available CHECK (
    (title_kind IN ('original', 'official') AND edition_available IS TRUE)
    OR (title_kind = 'free' AND edition_available IS NOT TRUE)
  )
);

CREATE INDEX IF NOT EXISTS book_title_translations_locale_idx
  ON public.book_title_translations (locale);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_title_translations TO rxlog_app;

-- Title in the book's original language.
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_title text NULL;
GRANT UPDATE (original_title, language) ON public.books TO rxlog_app;

-- Language of the physical copy: new books default to German.
ALTER TABLE public.books ALTER COLUMN language SET DEFAULT 'de';
