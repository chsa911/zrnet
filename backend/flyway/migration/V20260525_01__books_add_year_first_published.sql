ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS year_first_published integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'books_year_first_published_reasonable'
  ) THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_year_first_published_reasonable
      CHECK (
        year_first_published IS NULL
        OR (year_first_published >= 0 AND year_first_published <= 3000)
      );
  END IF;
END $$;

GRANT UPDATE (year_first_published) ON public.books TO rxlog_app;
