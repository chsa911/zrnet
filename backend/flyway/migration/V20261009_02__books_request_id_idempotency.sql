-- Idempotent book creation.
--
-- Every "Speichern" in the register forms sends a requestId that stays the
-- same for all retries of one entry. registerBook() (booksPgController.js)
-- stores it in books.request_id and, if a book with that id already exists,
-- returns it instead of inserting again. That way a retry after a lost
-- response (timeout, iPhone network drop) can never create a duplicate book
-- or burn a second barcode.
--
-- The controller only uses the column when it exists, so before this
-- migration the protection was silently off on databases without it.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS request_id text;

-- Enforce it in the DB too, so two concurrent retries cannot both insert.
CREATE UNIQUE INDEX IF NOT EXISTS books_request_id_unique
  ON public.books (request_id)
  WHERE request_id IS NOT NULL;
