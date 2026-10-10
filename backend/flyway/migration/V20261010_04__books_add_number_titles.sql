BEGIN;

-- Number of titles (works) contained in one book, e.g. an omnibus edition
-- with three novels -> 3. Default 1 for every normal book.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS number_titles integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'books_number_titles_positive'
  ) THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_number_titles_positive CHECK (number_titles >= 1);
  END IF;
END $$;

COMMIT;
