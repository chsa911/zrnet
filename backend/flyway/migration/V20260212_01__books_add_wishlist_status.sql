BEGIN;

-- Extend allowed reading_status values with 'wishlist'
ALTER TABLE public.books
DROP CONSTRAINT IF EXISTS books_reading_status_check;

ALTER TABLE public.books
ADD CONSTRAINT books_reading_status_check
CHECK (
  reading_status = ANY (ARRAY[
    'in_progress'::text,
    'finished'::text,
    'abandoned'::text,
    'in_stock'::text,
    'wishlist'::text
  ])
);

COMMIT;