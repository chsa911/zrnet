-- Add 'wishlist' to books.reading_status and set default

BEGIN;

-- 1) Allow 'wishlist' in books.reading_status check constraint
ALTER TABLE public.books
  DROP CONSTRAINT IF EXISTS books_reading_status_check;

ALTER TABLE public.books
  ADD CONSTRAINT books_reading_status_check
  CHECK (reading_status = ANY (ARRAY[
    'wishlist',
    'in_progress',
    'finished',
    'abandoned',
    'in_stock'
  ]));

-- 2) Set default to wishlist for new rows
ALTER TABLE public.books
  ALTER COLUMN reading_status SET DEFAULT 'wishlist';

COMMIT; 