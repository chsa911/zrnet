-- Fix: Barcode "dgk-0002" steht falsch im Vorrat (barcode_inventory), richtig ist "dgk002".
-- DBeaver (Mac): Cursor in eine Abfrage setzen -> Ctrl+Enter (control, NICHT cmd)
--   oder oranges Dreieck links ("Execute SQL statement").
--   Teil 2: alles ab BEGIN markieren -> Alt+X (Skript ausführen)

-- =========================================================== 1a) Wo steht der Code?
SELECT 'barcode_inventory' AS tbl, barcode, NULL::uuid AS book_id, status::text AS info
  FROM public.barcode_inventory WHERE lower(barcode) IN ('dgk-0002','dgk002')
UNION ALL
SELECT 'book_barcodes', barcode, book_id, NULL
  FROM public.book_barcodes WHERE lower(barcode) IN ('dgk-0002','dgk002')
UNION all
SELECT 'barcode_assignments', barcode, book_id,
       'assigned ' || assigned_at::text || ' / freed ' || coalesce(freed_at::text, 'OFFEN')
  FROM public.barcode_assignments WHERE lower(barcode) IN ('dgk-0002','dgk002')
ORDER BY 1, 2;

-- =========================================================== 1b) Gibt es weitere kaputte Codes im Vorrat?
-- Erwartet: Buchstaben + 3 Ziffern (z. B. dgk002)
SELECT barcode, status, rank_in_inventory
  FROM public.barcode_inventory
 WHERE barcode !~* '^[a-z]+[0-9]{3}$'
 ORDER BY barcode;

-- =========================================================== 2) Korrigieren
BEGIN;

DO $$
DECLARE
  v_old text := 'dgk-0002';
  v_new text := 'dgk002';
  v_book uuid;
  n int;
BEGIN
  SELECT book_id INTO v_book FROM public.book_barcodes WHERE lower(barcode) = v_old;

  -- dgk002 darf nicht schon an einem ANDEREN Buch hängen
  SELECT count(*) INTO n FROM public.book_barcodes
   WHERE lower(barcode) = v_new AND book_id IS DISTINCT FROM v_book;
  IF n > 0 THEN RAISE EXCEPTION '% hängt schon an einem anderen Buch (book_barcodes)', v_new; END IF;
  SELECT count(*) INTO n FROM public.barcode_assignments
   WHERE lower(barcode) = v_new AND freed_at IS NULL AND book_id IS DISTINCT FROM v_book;
  IF n > 0 THEN RAISE EXCEPTION '% ist bei einem anderen Buch noch offen', v_new; END IF;

  -- Vorrat: gibt es dgk002 schon?
  SELECT count(*) INTO n FROM public.barcode_inventory WHERE lower(barcode) = v_new;
  IF n = 0 THEN
    -- nein -> den falschen Eintrag einfach umbenennen (behält Rang, Größe, Status)
    UPDATE public.barcode_inventory SET barcode = v_new, updated_at = now()
     WHERE lower(barcode) = v_old;
    RAISE NOTICE 'Vorrat: % in % umbenannt', v_old, v_new;
  ELSE
    -- ja -> dgk002 übernimmt den Status des falschen Eintrags
    UPDATE public.barcode_inventory n2
       SET status = o.status, updated_at = now()
      FROM public.barcode_inventory o
     WHERE lower(n2.barcode) = v_new AND lower(o.barcode) = v_old;
  END IF;

  -- Buch + Verlauf umhängen
  UPDATE public.book_barcodes       SET barcode = v_new WHERE lower(barcode) = v_old;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'book_barcodes: %', n;
  UPDATE public.barcode_assignments SET barcode = v_new WHERE lower(barcode) = v_old;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'barcode_assignments: %', n;

  -- falschen Vorrats-Eintrag entfernen (falls noch vorhanden)
  DELETE FROM public.barcode_inventory WHERE lower(barcode) = v_old;
END $$;

-- Kontrolle: darf nur noch dgk002 zeigen
SELECT 'barcode_inventory' AS tbl, barcode, NULL::uuid AS book_id FROM public.barcode_inventory
 WHERE lower(barcode) IN ('dgk-0002','dgk002')
UNION ALL
SELECT 'book_barcodes', barcode, book_id FROM public.book_barcodes
 WHERE lower(barcode) IN ('dgk-0002','dgk002')
UNION ALL
SELECT 'barcode_assignments', barcode, book_id FROM public.barcode_assignments
 WHERE lower(barcode) IN ('dgk-0002','dgk002');

COMMIT;   -- falls die Kontrolle falsch aussieht: stattdessen ROLLBACK;
