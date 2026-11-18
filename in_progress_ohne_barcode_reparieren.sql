-- =====================================================================
-- Reparatur: Bücher in_progress ohne Barcode bekommen IHREN EIGENEN Code
-- zurück (den, der physisch auf dem Buch klebt). Es wird KEIN neuer Code
-- vergeben, niemand muss neu bekleben.
--
-- Ursache: Altlast-Codes klebten auf zwei Büchern. Als eins fertig wurde,
-- hat der alte Freigabe-Code (Feb–Mai 2026) auch die Zeile des anderen,
-- noch gelesenen Buchs geschlossen. Teils wurde der Code danach neu
-- vergeben (z. B. dpk001 -> Plastic Planet).
--
-- DBeaver:
--   * oben von "Auto" auf "Manual Commit" umstellen
--   * ganzes Skript: Alt+X  (NICHT Strg+Enter)
--   * Probelauf: endet mit ROLLBACK -> nichts wird gespeichert.
--     Ergebnis = letzter Tab: was mit welchem Buch passiert (wäre).
--   * Echt: unten ROLLBACK; durch COMMIT; ersetzen und erneut Alt+X.
--
-- Pro Buch:
--   * keine offene Zeile -> die zuletzt (fälschlich) geschlossene Zeile
--     wird wieder geöffnet (freed_at = NULL).
--   * kein Link -> Link anlegen, sofern kein ANDERES Buch in Arbeit den
--     Link dieses Codes hat. Sonst bleibt es ein Code-Doppel: das Buch hält
--     den Code über die offene Zeile, die Liste zeigt ihn nach dem
--     App-Update trotzdem an.
--   * Inventar des Codes -> ASSIGNED (damit er nicht mehr vergeben wird).
--
-- Sicherung vorher in *_backup_20261118. Mehrfach ausführbar.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF now() = statement_timestamp() THEN
    RAISE EXCEPTION 'Abbruch: DBeaver steht auf Auto-Commit. Bitte oben in der Leiste von "Auto" auf "Manual Commit" umstellen und das Skript erneut ausführen.';
  END IF;
END $$;

-- Code-Doppel (Altlast) und gesperrte Serien bewusst zulassen – nur in
-- dieser Transaktion.
SET LOCAL zrnet.allow_legacy_multicopy = 'on';
SET LOCAL zrnet.allow_retired_barcode = 'on';

-- Sicherung -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barcode_assignments_backup_20261118 AS
  SELECT * FROM public.barcode_assignments WITH NO DATA;
CREATE TABLE IF NOT EXISTS public.book_barcodes_backup_20261118 AS
  SELECT * FROM public.book_barcodes WITH NO DATA;
CREATE TABLE IF NOT EXISTS public.barcode_inventory_backup_20261118 AS
  SELECT * FROM public.barcode_inventory WITH NO DATA;

CREATE TEMP TABLE betroffen ON COMMIT DROP AS
SELECT b.id
FROM public.books b
WHERE b.reading_status = 'in_progress'
  AND (NOT EXISTS (SELECT 1 FROM public.barcode_assignments ba
                   WHERE ba.book_id = b.id AND ba.freed_at IS NULL)
       OR NOT EXISTS (SELECT 1 FROM public.book_barcodes bb WHERE bb.book_id = b.id));

CREATE TEMP TABLE betroffene_codes ON COMMIT DROP AS
SELECT DISTINCT lower(ba.barcode) AS code
FROM public.barcode_assignments ba
WHERE ba.book_id IN (SELECT id FROM betroffen);

INSERT INTO public.barcode_assignments_backup_20261118
SELECT * FROM public.barcode_assignments
WHERE lower(barcode) IN (SELECT code FROM betroffene_codes);
INSERT INTO public.book_barcodes_backup_20261118
SELECT * FROM public.book_barcodes
WHERE lower(barcode) IN (SELECT code FROM betroffene_codes)
   OR book_id IN (SELECT id FROM betroffen);
INSERT INTO public.barcode_inventory_backup_20261118
SELECT * FROM public.barcode_inventory
WHERE lower(barcode) IN (SELECT code FROM betroffene_codes);

CREATE TEMP TABLE reparatur_ergebnis (
  book_id uuid, titel text, code text, aktion text, code_auch_bei text
) ON COMMIT DROP;

DO $$
DECLARE
  r        record;
  v_row    record;
  v_code   text;
  v_aktion text;
  v_holder text;
BEGIN
  FOR r IN
    SELECT b.id, b.title_display
    FROM public.books b
    WHERE b.id IN (SELECT id FROM betroffen)
    ORDER BY b.registered_at NULLS LAST, b.id
  LOOP
    v_aktion := '';

    -- 1) offene Zeile ------------------------------------------------------
    SELECT ba.barcode INTO v_code
    FROM public.barcode_assignments ba
    WHERE ba.book_id = r.id AND ba.freed_at IS NULL
    ORDER BY ba.assigned_at DESC NULLS LAST LIMIT 1;

    IF v_code IS NULL THEN
      SELECT ba.id, ba.barcode INTO v_row
      FROM public.barcode_assignments ba
      WHERE ba.book_id = r.id
      ORDER BY ba.assigned_at DESC NULLS LAST, ba.freed_at DESC NULLS LAST
      LIMIT 1;

      IF v_row.id IS NULL THEN
        INSERT INTO reparatur_ergebnis VALUES (r.id, r.title_display, NULL,
          'MANUELL: nie ein Barcode erfasst', NULL);
        CONTINUE;
      END IF;

      UPDATE public.barcode_assignments SET freed_at = NULL WHERE id = v_row.id;
      v_code := v_row.barcode;
      v_aktion := 'Zeile wieder geöffnet';
    END IF;

    -- 2) Link ----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM public.book_barcodes WHERE book_id = r.id) THEN
      IF EXISTS (SELECT 1 FROM public.book_barcodes bb
                 JOIN public.books o ON o.id = bb.book_id
                 WHERE lower(bb.barcode) = lower(v_code)
                   AND bb.book_id <> r.id
                   AND o.reading_status = 'in_progress')
      THEN
        v_aktion := concat_ws(' + ', nullif(v_aktion, ''),
                              'kein Link (Code-Doppel, Liste zeigt ihn nach App-Update)');
      ELSE
        -- veralteter Link dieses Codes an einem Buch, das nicht mehr in Arbeit ist
        DELETE FROM public.book_barcodes WHERE lower(barcode) = lower(v_code);
        INSERT INTO public.book_barcodes (book_id, barcode) VALUES (r.id, v_code);
        v_aktion := concat_ws(' + ', nullif(v_aktion, ''), 'Link angelegt');
      END IF;
    END IF;

    -- 3) Inventar: nicht mehr frei -------------------------------------------
    UPDATE public.barcode_inventory
    SET status = 'ASSIGNED', updated_at = now()
    WHERE lower(barcode) = lower(v_code)
      AND status = 'AVAILABLE';

    SELECT string_agg(o.title_display, ', ') INTO v_holder
    FROM public.barcode_assignments ba
    JOIN public.books o ON o.id = ba.book_id
    WHERE lower(ba.barcode) = lower(v_code)
      AND ba.freed_at IS NULL
      AND ba.book_id <> r.id
      AND o.reading_status = 'in_progress';

    INSERT INTO reparatur_ergebnis VALUES (r.id, r.title_display, v_code, v_aktion, v_holder);
  END LOOP;
END $$;

-- Ergebnis --------------------------------------------------------------------
SELECT titel, code, aktion, code_auch_bei, book_id
FROM reparatur_ergebnis
ORDER BY code;

ROLLBACK;
