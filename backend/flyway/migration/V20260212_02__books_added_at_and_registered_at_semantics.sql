BEGIN;

-- 1) added_at: one timestamp for ALL books (wishlist / in_stock / normal)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='books' AND column_name='added_at'
  ) THEN
    ALTER TABLE public.books ADD COLUMN added_at timestamptz;
  END IF;
END $$;

-- Backfill added_at from old registered_at (historically "created time")
UPDATE public.books
SET added_at = registered_at
WHERE added_at IS NULL;

ALTER TABLE public.books
ALTER COLUMN added_at SET DEFAULT now();

ALTER TABLE public.books
ALTER COLUMN added_at SET NOT NULL;

-- 2) registered_at becomes the REAL registration moment:
--    nullable + no default
ALTER TABLE public.books
ALTER COLUMN registered_at DROP NOT NULL;

ALTER TABLE public.books
ALTER COLUMN registered_at DROP DEFAULT;

-- 3) Fix existing imported placeholders: in_stock imported => NOT registered
UPDATE public.books
SET registered_at = NULL
WHERE reading_status = 'in_stock'
  AND imported_at IS NOT NULL;

-- 4) Ensure registered statuses have a registered_at (so future constraints won't fail)
UPDATE public.books
SET registered_at = COALESCE(registered_at, added_at)
WHERE reading_status IN ('in_progress','finished','abandoned')
  AND registered_at IS NULL;

COMMIT;