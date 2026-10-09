-- Buch-Nummer (phys_code) darf mehrfach vorkommen.
--
-- Dasselbe physische Buch kann mehrere Einträge haben (z. B. ein abgebrochener
-- Lesedurchgang als Erinnerung + ein neuer Eintrag). Die Nummer identifiziert
-- das Exemplar, nicht den Eintrag. Die App zeigt beim Erfassen nur noch einen
-- Hinweis ("schon N× erfasst"), sperrt aber nicht.

DROP INDEX IF EXISTS public.books_phys_code_unique;

-- Suche/Lookup nach Nummer bleibt schnell
CREATE INDEX IF NOT EXISTS books_phys_code_idx
  ON public.books (phys_code)
  WHERE phys_code IS NOT NULL;
