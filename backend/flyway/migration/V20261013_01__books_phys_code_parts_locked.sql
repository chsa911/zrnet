-- Buch-Nummer (phys_code): alle Teile sind feste Bestandteile und bleiben erhalten.
--
--   BBB HHH SSSS PP KKK WW   (Breite, Höhe, Seiten, Seitenzahl-Position, Kapitel, letztes Wort)
--
-- Änderungen gegenüber V20261009_03:
--   1) Seiten (pages) und Kapitel (chapters) sind PFLICHT für die Nummer.
--      Fehlen sie, wird keine Nummer gebildet (vorher: stillschweigend 0000 / 000).
--      0 ist weiterhin erlaubt, muss aber bewusst eingetragen werden
--      (0000 = keine Seitenzahl, 000 = keine Kapitel).
--   2) Kein Teil kann mehr geleert werden – auch nicht, solange die Nummer
--      noch fehlt. Wird ein gesetzter Wert auf NULL gesetzt (App, Mobile-Sync,
--      DBeaver), bleibt der alte Wert stehen. Korrigieren (anderer Wert) geht
--      weiterhin und bildet die Nummer neu.
--   3) Eine einmal vergebene Nummer wird nie geleert (unverändert).
--      Bestehende Nummern mit 0000 / 000 bleiben, wie sie sind.
--
-- Ersetzt den fehlenden Trigger trg_prevent_width_height_clear
-- (backend/sql/20260620_lock_width_height.sql war nicht eingespielt).
--
-- Mehrfach ausführbar.

CREATE OR REPLACE FUNCTION public.books_set_phys_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_src text;
BEGIN
  -- 1) gesetzte Werte können nicht geleert werden
  IF TG_OP = 'UPDATE' THEN
    IF NEW.width        IS NULL THEN NEW.width        := OLD.width;        END IF;
    IF NEW.height       IS NULL THEN NEW.height       := OLD.height;       END IF;
    IF NEW.pages        IS NULL THEN NEW.pages        := OLD.pages;        END IF;
    IF NEW.page_num_pos IS NULL THEN NEW.page_num_pos := OLD.page_num_pos; END IF;
    IF NEW.chapters     IS NULL THEN NEW.chapters     := OLD.chapters;     END IF;
    IF NEW.last_word    IS NULL THEN NEW.last_word    := OLD.last_word;    END IF;
  END IF;

  -- 2-Buchstaben-Code aus dem ganzen Wort
  IF NEW.last_word IS NOT NULL THEN
    NEW.last_word_code := public.phys_code_word(NEW.last_word);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.last_word_code := coalesce(NEW.last_word_code, OLD.last_word_code);
  END IF;

  -- 2) verlorene Werte aus der vorhandenen Nummer zurückholen
  v_src := CASE WHEN TG_OP = 'UPDATE' THEN OLD.phys_code ELSE NEW.phys_code END;
  IF v_src ~ '^[0-9]{10}(ol|om|or|ml|mr|ul|um|ur|00)[0-9]{3}([a-z][a-z0]|00)$' THEN
    IF NEW.width          IS NULL THEN NEW.width          := substr(v_src, 1, 3)::int;  END IF;
    IF NEW.height         IS NULL THEN NEW.height         := substr(v_src, 4, 3)::int;  END IF;
    IF NEW.pages          IS NULL THEN NEW.pages          := substr(v_src, 7, 4)::int;  END IF;
    IF NEW.page_num_pos   IS NULL THEN NEW.page_num_pos   := substr(v_src, 11, 2);      END IF;
    IF NEW.chapters       IS NULL THEN NEW.chapters       := substr(v_src, 13, 3)::int; END IF;
    IF NEW.last_word_code IS NULL THEN NEW.last_word_code := substr(v_src, 16, 2);      END IF;
  END IF;

  -- 3) Nummer bilden – nur wenn ALLE sechs Teile da sind
  IF NEW.width IS NOT NULL AND NEW.height IS NOT NULL
     AND NEW.pages IS NOT NULL AND NEW.page_num_pos IS NOT NULL
     AND NEW.chapters IS NOT NULL AND NEW.last_word_code IS NOT NULL THEN
    NEW.phys_code :=
      public.phys_code_pad(round(NEW.width)::int, 3)  ||
      public.phys_code_pad(round(NEW.height)::int, 3) ||
      public.phys_code_pad(NEW.pages, 4)              ||
      NEW.page_num_pos                                ||
      public.phys_code_pad(NEW.chapters, 3)           ||
      NEW.last_word_code;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.phys_code := OLD.phys_code;   -- nie geleert
  ELSE
    NEW.phys_code := NULL;            -- noch nicht vollständig
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger existiert schon (V20261009_01); zur Sicherheit neu anlegen
DROP TRIGGER IF EXISTS trg_books_set_phys_code ON public.books;
CREATE TRIGGER trg_books_set_phys_code
  BEFORE INSERT OR UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.books_set_phys_code();
