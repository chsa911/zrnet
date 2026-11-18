-- =====================================================================
-- VORSCHAU (nur lesend): Bücher in_progress ohne vollständigen Barcode.
-- DBeaver: Strg+Enter (eine Abfrage).
--
-- Ein Buch in Arbeit braucht BEIDES:
--   * offene Zeile in barcode_assignments (freed_at leer)  = "hält den Code"
--   * Link in book_barcodes                                = was die Liste zeigt
--
-- Spalte "reparatur" = was in_progress_ohne_barcode_reparieren.sql tun würde.
-- =====================================================================
WITH ip AS (
  SELECT b.id, b.title_display, a.name_display AS autor, b.pages, b.registered_at
  FROM books b
  LEFT JOIN authors a ON a.id = b.author_id
  WHERE b.reading_status = 'in_progress'
),
z AS (
  SELECT ip.*,
         (SELECT ba.barcode FROM barcode_assignments ba
           WHERE ba.book_id = ip.id AND ba.freed_at IS NULL
           ORDER BY ba.assigned_at DESC NULLS LAST LIMIT 1)            AS offener_code,
         (SELECT bb.barcode FROM book_barcodes bb WHERE bb.book_id = ip.id) AS link_code,
         (SELECT ba.barcode || ' (frei seit ' || coalesce(ba.freed_at::date::text, '-') || ')'
            FROM barcode_assignments ba
           WHERE ba.book_id = ip.id
           ORDER BY ba.assigned_at DESC NULLS LAST LIMIT 1)            AS letzter_code
  FROM ip
)
SELECT z.id, z.title_display, z.autor, z.pages, z.registered_at::date AS registriert,
       z.offener_code, z.link_code, z.letzter_code,
       CASE
         WHEN z.offener_code IS NOT NULL AND z.link_code IS NULL
              AND NOT EXISTS (SELECT 1 FROM book_barcodes bb JOIN books o ON o.id = bb.book_id
                              WHERE lower(bb.barcode) = lower(z.offener_code)
                                AND o.reading_status = 'in_progress')
           THEN 'Link ergänzen (' || z.offener_code || ')'
         WHEN z.link_code IS NOT NULL AND z.offener_code IS NULL
              AND NOT EXISTS (SELECT 1 FROM barcode_assignments ba JOIN books o ON o.id = ba.book_id
                              WHERE lower(ba.barcode) = lower(z.link_code) AND ba.freed_at IS NULL
                                AND ba.book_id <> z.id AND o.reading_status = 'in_progress')
           THEN 'Offene Zeile ergänzen (' || z.link_code || ')'
         WHEN z.letzter_code IS NULL AND z.link_code IS NULL
           THEN 'MANUELL: nie ein Barcode erfasst'
         ELSE 'NEUER CODE gleicher Serie -> neu bekleben'
       END AS reparatur
FROM z
WHERE z.offener_code IS NULL OR z.link_code IS NULL
ORDER BY z.registered_at;
