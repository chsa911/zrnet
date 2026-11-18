-- Harte Regel: Ein Buch mit reading_status = 'in_progress' hält IMMER einen
-- Barcode, d. h. mindestens eine offene Zeile in barcode_assignments
-- (freed_at IS NULL).
--
-- Freigegeben wird ein Barcode weiterhin NUR, wenn das Buch fertig,
-- abgebrochen oder verloren ist (finished / abandoned / lost) – daran ändert
-- sich nichts.
--
-- Anlass: Altlast-Codes klebten auf zwei Büchern (z. B. dpk001 auf Mertens
-- und Gilliard). Als eins fertig wurde, hat der damalige Freigabe-Code auch
-- die Zeile des anderen, noch gelesenen Buchs geschlossen. Der Code galt als
-- frei und wurde neu vergeben; 14 Bücher in Arbeit standen ohne Barcode da
-- (repariert am 18.11.2026 mit in_progress_ohne_barcode_reparieren.sql).
--
-- Der Link in book_barcodes wird bewusst NICHT verlangt: bei einem
-- Code-Doppel (Altlast) kann nur eines der Bücher den Link haben.
--
-- Die Prüfung läuft als DEFERRED Constraint-Trigger erst beim COMMIT. Abläufe,
-- die innerhalb EINER Transaktion kurz ohne offene Zeile sind (Registrierung:
-- Status setzen, dann Barcode vergeben), funktionieren weiter. Es scheitert
-- nur, was am Ende ein Buch in Arbeit ohne Barcode hinterlassen würde – egal
-- über welchen Weg (Admin-UI, Mobile-Sync, Skripte, DBeaver).
--
-- Bewusste Ausnahme (nur für Reparaturen, nur in der aktuellen Transaktion):
--   SET LOCAL zrnet.allow_in_progress_without_barcode = 'on';
--
-- Mehrfach ausführbar.

BEGIN;

CREATE OR REPLACE FUNCTION public.assert_in_progress_has_barcode(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_book_id IS NULL THEN
    RETURN;
  END IF;

  IF coalesce(current_setting('zrnet.allow_in_progress_without_barcode', true), '') = 'on' THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.books
             WHERE id = p_book_id AND reading_status = 'in_progress')
     AND NOT EXISTS (SELECT 1 FROM public.barcode_assignments
                     WHERE book_id = p_book_id AND freed_at IS NULL)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514', -- check_violation
      MESSAGE = 'in_progress_requires_barcode',
      DETAIL  = format('book_id=%s', p_book_id),
      HINT    = 'Ein Buch in Arbeit braucht einen Barcode. Freigegeben wird er nur durch fertig / abgebrochen / verloren.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_in_progress_has_barcode()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'books' THEN
    PERFORM public.assert_in_progress_has_barcode(NEW.id);
  ELSE
    PERFORM public.assert_in_progress_has_barcode(OLD.book_id);
    IF TG_OP = 'UPDATE' AND NEW.book_id IS DISTINCT FROM OLD.book_id THEN
      PERFORM public.assert_in_progress_has_barcode(NEW.book_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

-- Buch wird (neu) in_progress
DROP TRIGGER IF EXISTS trg_in_progress_requires_barcode_books ON public.books;
CREATE CONSTRAINT TRIGGER trg_in_progress_requires_barcode_books
AFTER INSERT OR UPDATE OF reading_status
ON public.books
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.check_in_progress_has_barcode();

-- offene Zeile wird geschlossen, umgehängt oder gelöscht
DROP TRIGGER IF EXISTS trg_in_progress_requires_barcode_ledger ON public.barcode_assignments;
CREATE CONSTRAINT TRIGGER trg_in_progress_requires_barcode_ledger
AFTER UPDATE OF freed_at, book_id OR DELETE
ON public.barcode_assignments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.check_in_progress_has_barcode();

COMMIT;
