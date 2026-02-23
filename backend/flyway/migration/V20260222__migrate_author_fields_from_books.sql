-- V20260222__migrate_author_fields_from_books.sql
-- Migrate author-related attributes from public.books -> public.authors
-- Backwards compatible: keeps legacy columns in books and keeps them in sync.

-- 1) Add columns to authors (idempotent)
ALTER TABLE public.authors
  ADD COLUMN IF NOT EXISTS published_titles int4 NULL,
  ADD COLUMN IF NOT EXISTS number_of_millionsellers int4 NULL,
  ADD COLUMN IF NOT EXISTS male_female text NULL,
  ADD COLUMN IF NOT EXISTS author_nationality text NULL,
  ADD COLUMN IF NOT EXISTS place_of_birth text NULL;

-- Optional non-negative checks for numeric fields (only create if not existing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'authors_published_titles_nonneg'
  ) THEN
    ALTER TABLE public.authors
      ADD CONSTRAINT authors_published_titles_nonneg
      CHECK (published_titles IS NULL OR published_titles >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'authors_number_of_millionsellers_nonneg'
  ) THEN
    ALTER TABLE public.authors
      ADD CONSTRAINT authors_number_of_millionsellers_nonneg
      CHECK (number_of_millionsellers IS NULL OR number_of_millionsellers >= 0);
  END IF;
END $$;

-- 2) Backfill authors from books
-- Numeric fields: MAX() is safest if values differ across books.
-- Text fields: use MAX() as a pragmatic pick (you said they're mostly empty).
WITH agg AS (
  SELECT
    b.author_id,
    MAX(b.published_titles)          AS published_titles,
    MAX(b.number_of_millionsellers)  AS number_of_millionsellers,
    MAX(b.male_female)               AS male_female,
    MAX(b.author_nationality)        AS author_nationality,
    MAX(b.place_of_birth)            AS place_of_birth
  FROM public.books b
  WHERE b.author_id IS NOT NULL
  GROUP BY b.author_id
)
UPDATE public.authors a
SET
  published_titles = COALESCE(a.published_titles, agg.published_titles),
  number_of_millionsellers = COALESCE(a.number_of_millionsellers, agg.number_of_millionsellers),
  male_female = COALESCE(a.male_female, agg.male_female),
  author_nationality = COALESCE(a.author_nationality, agg.author_nationality),
  place_of_birth = COALESCE(a.place_of_birth, agg.place_of_birth)
FROM agg
WHERE a.id = agg.author_id;

-- 3) Trigger: when author fields change, sync to ALL books of that author
CREATE OR REPLACE FUNCTION public.sync_author_fields_to_books()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.books b
  SET
    published_titles = NEW.published_titles,
    number_of_millionsellers = NEW.number_of_millionsellers,
    male_female = NEW.male_female,
    author_nationality = NEW.author_nationality,
    place_of_birth = NEW.place_of_birth
  WHERE b.author_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_author_fields_to_books ON public.authors;

CREATE TRIGGER trg_sync_author_fields_to_books
AFTER UPDATE OF
  published_titles,
  number_of_millionsellers,
  male_female,
  author_nationality,
  place_of_birth
ON public.authors
FOR EACH ROW
WHEN (
  OLD.published_titles IS DISTINCT FROM NEW.published_titles OR
  OLD.number_of_millionsellers IS DISTINCT FROM NEW.number_of_millionsellers OR
  OLD.male_female IS DISTINCT FROM NEW.male_female OR
  OLD.author_nationality IS DISTINCT FROM NEW.author_nationality OR
  OLD.place_of_birth IS DISTINCT FROM NEW.place_of_birth
)
EXECUTE FUNCTION public.sync_author_fields_to_books();

-- 4) Trigger: when inserting a book or changing author_id, copy author fields into books if NULL
-- This keeps legacy reads working even if some endpoints still read from books.*
CREATE OR REPLACE FUNCTION public.set_book_author_fields_from_author()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  a_rec record;
BEGIN
  IF NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    published_titles,
    number_of_millionsellers,
    male_female,
    author_nationality,
    place_of_birth
  INTO a_rec
  FROM public.authors
  WHERE id = NEW.author_id;

  -- Only fill if NULL on the book row (do not overwrite explicit book values)
  IF NEW.published_titles IS NULL THEN
    NEW.published_titles := a_rec.published_titles;
  END IF;

  IF NEW.number_of_millionsellers IS NULL THEN
    NEW.number_of_millionsellers := a_rec.number_of_millionsellers;
  END IF;

  IF NEW.male_female IS NULL THEN
    NEW.male_female := a_rec.male_female;
  END IF;

  IF NEW.author_nationality IS NULL THEN
    NEW.author_nationality := a_rec.author_nationality;
  END IF;

  IF NEW.place_of_birth IS NULL THEN
    NEW.place_of_birth := a_rec.place_of_birth;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_book_author_fields_from_author ON public.books;

CREATE TRIGGER trg_set_book_author_fields_from_author
BEFORE INSERT OR UPDATE OF author_id
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.set_book_author_fields_from_author();