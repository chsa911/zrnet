ALTER TABLE public.books
  ADD COLUMN original_language text NULL;

ALTER TABLE public.books
  ADD CONSTRAINT books_original_language_chk
  CHECK (original_language IS NULL OR original_language ~ '^[a-z]{2}$');