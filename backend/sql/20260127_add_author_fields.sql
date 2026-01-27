-- Add new author-related columns to public.books
-- Safe to run multiple times.
BEGIN;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS author_firstname text,
  ADD COLUMN IF NOT EXISTS male_female text,
  ADD COLUMN IF NOT EXISTS author_nationality text,
  ADD COLUMN IF NOT EXISTS place_of_birth text,
  ADD COLUMN IF NOT EXISTS published_titles integer,
  ADD COLUMN IF NOT EXISTS number_of_millionsellers integer;

-- Optional: keep author_display consistent for existing rows
UPDATE public.books
SET author_display =
  CASE
    WHEN author_firstname IS NOT NULL AND author_firstname <> '' THEN concat_ws(' ', author_firstname, author)
    ELSE author
  END
WHERE author_display IS NULL;

COMMIT;