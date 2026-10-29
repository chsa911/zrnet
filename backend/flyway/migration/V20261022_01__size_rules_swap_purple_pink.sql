-- Swap the suggested colour for two size groups:
--   the size group that used to suggest 'i' (purple, width up to 12.5 cm)
--     now suggests 'p' (pink)
--   the size group that used to suggest 'p' (pink) now suggests 'i' (purple)
--
-- The barcode suggestion (preview-barcode + auto-pick on save) builds the
-- prefix as <pos><size_rules.name>, e.g. 'd' + 'p' -> 'dp###'. So renaming
-- the rules is all that is needed. Existing barcodes / books are NOT touched:
-- a book already labelled 'dik030' keeps that code.
--
-- A temporary name is used so a unique constraint on name can't trip.

DO $$
DECLARE
  n_i int;
  n_p int;
BEGIN
  SELECT count(*) INTO n_i FROM public.size_rules WHERE lower(trim(name)) = 'i';
  SELECT count(*) INTO n_p FROM public.size_rules WHERE lower(trim(name)) = 'p';

  -- Idempotent: if the 125-129 mm group is already 'p', the swap was
  -- applied before (e.g. run by hand in DBeaver) -> do nothing.
  IF EXISTS (SELECT 1 FROM public.size_rules
             WHERE min_width = 125 AND lower(trim(name)) = 'p') THEN
    RAISE NOTICE 'purple/pink swap already applied, skipping';
    RETURN;
  END IF;

  IF n_i <> 1 OR n_p <> 1 THEN
    RAISE EXCEPTION 'expected exactly one size_rule named i and one named p, found i=% p=%', n_i, n_p;
  END IF;

  UPDATE public.size_rules SET name = '__swap_tmp__' WHERE lower(trim(name)) = 'i';
  UPDATE public.size_rules SET name = 'i'            WHERE lower(trim(name)) = 'p';
  UPDATE public.size_rules SET name = 'p'            WHERE name = '__swap_tmp__';
END $$;
