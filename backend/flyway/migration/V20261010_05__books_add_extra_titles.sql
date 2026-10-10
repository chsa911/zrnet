BEGIN;

-- Further titles of a book that contains several works (number_titles > 1).
-- title_display holds title 1; extra_titles[1] is title 2, extra_titles[2] title 3, ...

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS extra_titles text[] NOT NULL DEFAULT '{}';

COMMIT;
