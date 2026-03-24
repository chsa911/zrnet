BEGIN;

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS request_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_books_request_id
ON public.books (request_id)
WHERE request_id IS NOT NULL;

COMMIT;
