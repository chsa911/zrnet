-- trg_books_set_updated_at soll NICHT feuern, wenn reviewed_at gestempelt wird.
-- Sonst würde jedes Öffnen per ✎ (stampReviewed) auch updated_at setzen und
-- das Buch in "Letzte Aktion" nach oben schieben.
--
-- Bisherige Definition (aus der DB gelesen, 13.11.2026):
--   CREATE TRIGGER trg_books_set_updated_at BEFORE UPDATE ON public.books
--   FOR EACH ROW EXECUTE FUNCTION set_books_updated_at()
--
-- Hinweis: Ein Vergleich der ganzen Zeile (to_jsonb(NEW)) ist in einem
-- BEFORE-Trigger nicht erlaubt, weil books generierte Spalten hat.
-- Deshalb die einfache Regel: Ändert ein UPDATE reviewed_at, wird updated_at
-- nicht angefasst. reviewed_at wird nur von stampReviewed geschrieben,
-- und zwar immer allein.
-- Die Funktion set_books_updated_at() bleibt unverändert. Mehrfach ausführbar.

DROP TRIGGER IF EXISTS trg_books_set_updated_at ON public.books;

CREATE TRIGGER trg_books_set_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
WHEN (OLD.reviewed_at IS NOT DISTINCT FROM NEW.reviewed_at)
EXECUTE FUNCTION public.set_books_updated_at();

-- Kontrolle:
-- SELECT pg_get_triggerdef(oid) FROM pg_trigger
-- WHERE tgrelid = 'public.books'::regclass AND tgname = 'trg_books_set_updated_at';
