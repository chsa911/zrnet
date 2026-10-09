-- Store the FULL last word of the book (books.last_word), and derive the
-- 2-letter part of the book number into its own column (books.last_word_code).
--
-- Before (V20261009_01): last_word held only the 2 letters.
-- Now:
--   last_word       the whole last word as entered, e.g. "still"
--   last_word_code  first 2 letters, normalized, e.g. "st"  (set by trigger)
--                   lowercase, ä->a, é->e, ß->ss …; one letter -> "i0"; "00" = no text
--   phys_code       uses last_word_code, so the number is unchanged:
--                   1252100950or024st
--
-- last_word can not be cleared once set (like width/height). If last_word_code
-- is lost it is restored from phys_code.
--
-- Safe to run more than once. Run AFTER V20261009_01.

-- 1) last_word becomes free text
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_last_word_valid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_last_word_length') THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_last_word_length
      CHECK (last_word IS NULL OR length(last_word) BETWEEN 1 AND 100);
  END IF;
END $$;

-- 2) derived 2-letter code
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS last_word_code text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_last_word_code_valid') THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_last_word_code_valid
      CHECK (last_word_code IS NULL OR last_word_code ~ '^([a-z][a-z0]|00)$');
  END IF;
END $$;

-- word -> 2-letter code ("Ärger" -> "ar", "I" -> "i0", "00" -> "00", "" -> NULL)
CREATE OR REPLACE FUNCTION public.phys_code_word(p_word text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN btrim(coalesce(p_word, '')) = '00' THEN '00'
    WHEN letters = '' THEN NULL
    WHEN length(letters) = 1 THEN letters || '0'
    ELSE left(letters, 2)
  END
  FROM (
    SELECT regexp_replace(
             -- accents mapped explicitly in both cases, so the result does not
             -- depend on the database locale (lower() of 'Ä' under LC_CTYPE=C)
             lower(translate(
               replace(coalesce(p_word, ''), 'ß', 'ss'),
               'äàáâãåëéèêïíìîöóòôõøüúùûçñýÿÄÀÁÂÃÅËÉÈÊÏÍÌÎÖÓÒÔÕØÜÚÙÛÇÑÝ',
               'aaaaaaeeeeiiiioooooouuuucnyyaaaaaaeeeeiiiioooooouuuucny')),
             '[^a-z]', '', 'g') AS letters
  ) x
$$;

-- 3) trigger: same rules as before, now with last_word_code
CREATE OR REPLACE FUNCTION public.books_set_phys_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_src text;
BEGIN
  -- the full last word can not be cleared once set
  IF TG_OP = 'UPDATE' AND NEW.last_word IS NULL AND OLD.last_word IS NOT NULL THEN
    NEW.last_word := OLD.last_word;
  END IF;

  -- 2-letter code from the full word
  IF NEW.last_word IS NOT NULL THEN
    NEW.last_word_code := public.phys_code_word(NEW.last_word);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.last_word_code := OLD.last_word_code;
  END IF;

  -- restore lost values from the existing number
  v_src := CASE WHEN TG_OP = 'UPDATE' THEN OLD.phys_code ELSE NEW.phys_code END;
  IF v_src ~ '^[0-9]{10}(ol|om|or|ml|mr|ul|um|ur|00)[0-9]{3}([a-z][a-z0]|00)$' THEN
    IF NEW.width          IS NULL THEN NEW.width          := substr(v_src, 1, 3)::int;  END IF;
    IF NEW.height         IS NULL THEN NEW.height         := substr(v_src, 4, 3)::int;  END IF;
    IF NEW.pages          IS NULL THEN NEW.pages          := substr(v_src, 7, 4)::int;  END IF;
    IF NEW.page_num_pos   IS NULL THEN NEW.page_num_pos   := substr(v_src, 11, 2);      END IF;
    IF NEW.chapters       IS NULL THEN NEW.chapters       := substr(v_src, 13, 3)::int; END IF;
    IF NEW.last_word_code IS NULL THEN NEW.last_word_code := substr(v_src, 16, 2);      END IF;
  END IF;

  -- derive the number
  IF NEW.width IS NOT NULL AND NEW.height IS NOT NULL
     AND NEW.page_num_pos IS NOT NULL AND NEW.last_word_code IS NOT NULL THEN
    NEW.phys_code :=
      public.phys_code_pad(round(NEW.width)::int, 3)     ||
      public.phys_code_pad(round(NEW.height)::int, 3)    ||
      public.phys_code_pad(coalesce(NEW.pages, 0), 4)    ||
      NEW.page_num_pos                                   ||
      public.phys_code_pad(coalesce(NEW.chapters, 0), 3) ||
      NEW.last_word_code;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.phys_code := OLD.phys_code;   -- never cleared
  ELSE
    NEW.phys_code := NULL;            -- not complete yet
  END IF;

  RETURN NEW;
END;
$$;

-- 4) existing rows (if any were saved with the 2-letter value): fill last_word_code
UPDATE public.books SET last_word = last_word WHERE last_word IS NOT NULL AND last_word_code IS NULL;

GRANT UPDATE (last_word) ON public.books TO rxlog_app;
