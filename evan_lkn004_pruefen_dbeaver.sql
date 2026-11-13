-- =====================================================================
-- Was ist mit den drei "Evan…"-Zeilen passiert?  (nur lesend, ändert nichts)
--
-- DBeaver: ganzes Skript mit Alt+X ausführen -> 3 Ergebnis-Tabs
--   1) die betroffenen Bücher (alle Spalten)
--   2) Barcode-Zuordnungen dieser Bücher bzw. mit "lkn004"
--   3) book_barcodes dieser Bücher bzw. mit "lkn004"
-- =====================================================================

-- 1) Bücher: Autor enthält "evan" ODER irgendein Feld enthält "lkn004"
SELECT b.*
FROM books b
LEFT JOIN authors a ON a.id = b.author_id
WHERE row_to_json(a)::text ILIKE '%evan%'
   OR row_to_json(b)::text ILIKE '%lkn004%'
ORDER BY b.pages, b.id;

-- 2) Barcode-Zuordnungen (inkl. freigegebener)
SELECT ba.*
FROM barcode_assignments ba
WHERE row_to_json(ba)::text ILIKE '%lkn004%'
   OR ba.book_id IN (
        SELECT b.id FROM books b LEFT JOIN authors a ON a.id = b.author_id
        WHERE row_to_json(a)::text ILIKE '%evan%'
           OR row_to_json(b)::text ILIKE '%lkn004%');

-- 3) book_barcodes
SELECT bb.*
FROM book_barcodes bb
WHERE row_to_json(bb)::text ILIKE '%lkn004%'
   OR bb.book_id IN (
        SELECT b.id FROM books b LEFT JOIN authors a ON a.id = b.author_id
        WHERE row_to_json(a)::text ILIKE '%evan%'
           OR row_to_json(b)::text ILIKE '%lkn004%');
