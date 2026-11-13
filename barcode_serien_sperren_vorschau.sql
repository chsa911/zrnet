-- =====================================================================
-- VORSCHAU (nur lesend): welche Serien würden gesperrt?
-- Strg+Enter genügt – es ist EINE Abfrage.
--
-- Präfix = Position (d/l/o/r) + Größenfarbe, z. B. lkn = l + kn
-- Regel:  Farbe beginnt mit "k", ist aber NICHT genau "k"
-- Spalte "gesperrt" = was die Sperre treffen würde.
-- Bitte prüfen, ob die Liste so stimmt (v. a. die k-Serie selbst = nein).
-- =====================================================================
WITH inv AS (
  SELECT bi.*,
         lower(regexp_replace(bi.barcode, '[0-9]+$', ''))              AS praefix,
         substr(lower(regexp_replace(bi.barcode, '[0-9]+$', '')), 2)   AS farbe
  FROM barcode_inventory bi
),
gehalten AS (
  SELECT lower(bb.barcode) AS code
  FROM book_barcodes bb JOIN books b ON b.id = bb.book_id
  WHERE b.reading_status = 'in_progress'
  UNION
  SELECT lower(ba.barcode)
  FROM barcode_assignments ba JOIN books b ON b.id = ba.book_id
  WHERE ba.freed_at IS NULL AND b.reading_status = 'in_progress'
)
SELECT inv.praefix,
       inv.farbe,
       (inv.farbe LIKE 'k%' AND inv.farbe <> 'k')                       AS gesperrt,
       count(*)                                                          AS codes,
       count(*) FILTER (WHERE inv.status = 'AVAILABLE')                  AS frei,
       count(*) FILTER (WHERE g.code IS NOT NULL)                        AS an_buch_in_arbeit,
       min(inv.barcode) AS von, max(inv.barcode) AS bis
FROM inv
LEFT JOIN gehalten g ON g.code = lower(inv.barcode)
WHERE inv.farbe LIKE 'k%'          -- alle k-Farben zeigen, auch die, die bleibt
GROUP BY 1, 2, 3
ORDER BY 3 DESC, 2, 1;
