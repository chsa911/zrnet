-- Genauigkeit für Geburts-/Todesdatum der Autoren (wie books.first_publish_date_precision
-- und characters.birth_date_precision): 'year' = nur Jahr bekannt (Datum = JJJJ-01-01),
-- 'month' = Monat + Jahr (Datum = JJJJ-MM-01), 'day' = genaues Datum.

ALTER TABLE public.authors
  ADD COLUMN IF NOT EXISTS birth_date_precision public.date_precision NULL,
  ADD COLUMN IF NOT EXISTS death_date_precision public.date_precision NULL;

-- Bestehende Daten: 01.01. gilt als "nur Jahr bekannt", alles andere als genaues Datum.
UPDATE public.authors
   SET birth_date_precision = CASE
         WHEN EXTRACT(month FROM birth_date) = 1 AND EXTRACT(day FROM birth_date) = 1 THEN 'year'::public.date_precision
         ELSE 'day'::public.date_precision
       END
 WHERE birth_date IS NOT NULL AND birth_date_precision IS NULL;

UPDATE public.authors
   SET death_date_precision = CASE
         WHEN EXTRACT(month FROM death_date) = 1 AND EXTRACT(day FROM death_date) = 1 THEN 'year'::public.date_precision
         ELSE 'day'::public.date_precision
       END
 WHERE death_date IS NOT NULL AND death_date_precision IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authors_birth_date_precision_chk') THEN
    ALTER TABLE public.authors ADD CONSTRAINT authors_birth_date_precision_chk CHECK (
      (birth_date IS NULL AND birth_date_precision IS NULL)
      OR (birth_date IS NOT NULL AND (
           birth_date_precision = 'day'::public.date_precision
        OR (birth_date_precision = 'month'::public.date_precision AND EXTRACT(day FROM birth_date) = 1)
        OR (birth_date_precision = 'year'::public.date_precision AND EXTRACT(month FROM birth_date) = 1 AND EXTRACT(day FROM birth_date) = 1)
      ))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authors_death_date_precision_chk') THEN
    ALTER TABLE public.authors ADD CONSTRAINT authors_death_date_precision_chk CHECK (
      (death_date IS NULL AND death_date_precision IS NULL)
      OR (death_date IS NOT NULL AND (
           death_date_precision = 'day'::public.date_precision
        OR (death_date_precision = 'month'::public.date_precision AND EXTRACT(day FROM death_date) = 1)
        OR (death_date_precision = 'year'::public.date_precision AND EXTRACT(month FROM death_date) = 1 AND EXTRACT(day FROM death_date) = 1)
      ))
    );
  END IF;
END $$;
