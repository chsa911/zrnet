ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_books_updated_at
  ON public.books (updated_at DESC NULLS LAST);
