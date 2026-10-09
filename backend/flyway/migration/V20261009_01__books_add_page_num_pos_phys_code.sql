-- Physical book number ("phys_code"): 17 characters, fixed blocks, always complete
--
--   BBB HHH SSSS PP KKK WW  e.g.  125 210 0950 or 024 st  ->  stored as 1252100950or024st
--
--   BBB   Breite in mm (12,5 cm -> 125)
--   HHH   Höhe   in mm (21,0 cm -> 210)
--   SSSS  Seiten = number of the LAST page that has a printed page number, 0000 = none
--   PP    Position of the page number on that last numbered page:
--           ol oben links   om oben mitte   or oben rechts
--           ml mitte links                  mr mitte rechts
--           ul unten links  um unten mitte  ur unten rechts
--           00 keine Seitenzahl
--   KKK   Kapitel, 000 = keine / unbekannt
--   WW    first 2 letters of the very last word in the whole book (lowercase, ä->a …;
--         one-letter word -> padded with 0, e.g. "i0"; 00 = no text)
--         "…und dann war es still." -> st
--
-- Rules (trigger trg_books_set_phys_code):
--   * The number is derived from width, height, pages, page_num_pos, chapters,
--     last_word as soon as width, height, page_num_pos and last_word are known.
--   * Once a book has a number it is NEVER cleared.
--   * If one of the values is lost (set to NULL), it is restored from the
--     number. So everything can always be derived from the number.
--   * Changing a value on purpose (correction) re-derives the number.
--   * UNIQUE: no two books can share a number.
--
-- Read the values back:  SELECT * FROM public.phys_code_decode('125 210 0950 or 024 st');

-- ---------------------------------------------------------------- columns
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS page_num_pos text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_page_num_pos_valid') THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_page_num_pos_valid
      CHECK (page_num_pos IS NULL OR page_num_pos IN ('ol','om','or','ml','mr','ul','um','ur','00'));
  END IF;
END $$;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS chapters integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_chapters_not_negative') THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_chapters_not_negative
      CHECK (chapters IS NULL OR chapters >= 0);
  END IF;
END $$;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS last_word text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_last_word_valid') THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_last_word_valid
      CHECK (last_word IS NULL OR last_word ~ '^([a-z][a-z0]|00)$');
  END IF;
END $$;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS phys_code text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_phys_code_format') THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_phys_code_format
      CHECK (phys_code IS NULL OR phys_code ~ '^[0-9]{10}(ol|om|or|ml|mr|ul|um|ur|00)[0-9]{3}([a-z][a-z0]|00)$');
  END IF;
END $$;

-- ---------------------------------------------------------------- helpers
-- zero-pad to n digits (never truncates; too long values then fail the format check)
CREATE OR REPLACE FUNCTION public.phys_code_pad(v integer, n integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN length(v::text) >= n THEN v::text ELSE lpad(v::text, n, '0') END
$$;

-- number -> single values
CREATE OR REPLACE FUNCTION public.phys_code_decode(p_code text)
RETURNS TABLE (width_mm integer, height_mm integer, pages integer, page_num_pos text, chapters integer, last_word text)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT substr(c, 1, 3)::int,
         substr(c, 4, 3)::int,
         substr(c, 7, 4)::int,
         substr(c, 11, 2),
         substr(c, 13, 3)::int,
         substr(c, 16, 2)
  FROM (SELECT lower(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) AS c) x
  WHERE c ~ '^[0-9]{10}(ol|om|or|ml|mr|ul|um|ur|00)[0-9]{3}([a-z][a-z0]|00)$'
$$;

-- ---------------------------------------------------------------- trigger
CREATE OR REPLACE FUNCTION public.books_set_phys_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_src text;
BEGIN
  -- 1) restore lost values from the existing number
  v_src := CASE WHEN TG_OP = 'UPDATE' THEN OLD.phys_code ELSE NEW.phys_code END;
  IF v_src ~ '^[0-9]{10}(ol|om|or|ml|mr|ul|um|ur|00)[0-9]{3}([a-z][a-z0]|00)$' THEN
    IF NEW.width        IS NULL THEN NEW.width        := substr(v_src, 1, 3)::int;       END IF;
    IF NEW.height       IS NULL THEN NEW.height       := substr(v_src, 4, 3)::int;       END IF;
    IF NEW.pages        IS NULL THEN NEW.pages        := substr(v_src, 7, 4)::int;       END IF;
    IF NEW.page_num_pos IS NULL THEN NEW.page_num_pos := substr(v_src, 11, 2);           END IF;
    IF NEW.chapters     IS NULL THEN NEW.chapters     := substr(v_src, 13, 3)::int;      END IF;
    IF NEW.last_word    IS NULL THEN NEW.last_word    := substr(v_src, 16, 2);           END IF;
  END IF;

  -- 2) derive the number from the values
  IF NEW.width IS NOT NULL AND NEW.height IS NOT NULL
     AND NEW.page_num_pos IS NOT NULL AND NEW.last_word IS NOT NULL THEN
    NEW.phys_code :=
      public.phys_code_pad(round(NEW.width)::int, 3)  ||
      public.phys_code_pad(round(NEW.height)::int, 3) ||
      public.phys_code_pad(coalesce(NEW.pages, 0), 4) ||
      NEW.page_num_pos                                ||
      public.phys_code_pad(coalesce(NEW.chapters, 0), 3)  ||
      NEW.last_word;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.phys_code := OLD.phys_code;   -- never cleared
  ELSE
    NEW.phys_code := NULL;            -- not complete yet
  END IF;

  RETURN NEW;
END;
$$;

-- Name sorts before trg_prevent_width_height_clear, so lost width/height are
-- restored before that guard runs.
DROP TRIGGER IF EXISTS trg_books_set_phys_code ON public.books;
CREATE TRIGGER trg_books_set_phys_code
  BEFORE INSERT OR UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.books_set_phys_code();

-- ---------------------------------------------------------------- unique
CREATE UNIQUE INDEX IF NOT EXISTS books_phys_code_unique
  ON public.books (phys_code)
  WHERE phys_code IS NOT NULL;

GRANT UPDATE (page_num_pos, chapters, last_word) ON public.books TO rxlog_app;
