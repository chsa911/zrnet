-- Alten Eintrag mit kaputtem Barcode "dgk-0002" entfernen (Buch mit 378 Seiten).
-- Reihenfolge:
--   1) Abfrage A ausführen (Ctrl+Enter) -> Daten notieren
--   2) Buch in der App NEU registrieren, neuen Aufkleber kleben
--   3) Block B markieren -> Alt+X

-- ===================================================== A) Alte Daten ansehen
SELECT * FROM public.books WHERE id = 'aae444a8-99d8-43a6-9f81-fedf627d1741';

-- ===================================================== B) Alten Eintrag löschen
BEGIN;
DELETE FROM public.book_barcodes
 WHERE book_id = 'aae444a8-99d8-43a6-9f81-fedf627d1741';
DELETE FROM public.barcode_assignments
 WHERE book_id = 'aae444a8-99d8-43a6-9f81-fedf627d1741';
DELETE FROM public.books
 WHERE id = 'aae444a8-99d8-43a6-9f81-fedf627d1741';
-- Kontrolle: muss 0 Zeilen liefern
SELECT barcode, book_id FROM public.book_barcodes WHERE lower(barcode) = 'dgk-0002'
UNION ALL
SELECT barcode, book_id FROM public.barcode_assignments WHERE lower(barcode) = 'dgk-0002';
COMMIT;
