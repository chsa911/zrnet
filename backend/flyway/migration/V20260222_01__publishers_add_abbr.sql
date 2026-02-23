-- Add a preferred abbreviation for each publisher (optional)
ALTER TABLE public.publishers
  ADD COLUMN abbr text NULL;

-- Prevent blank strings
ALTER TABLE public.publishers
  ADD CONSTRAINT publishers_abbr_not_blank_chk
  CHECK (abbr IS NULL OR btrim(abbr) <> '');

-- Optional: enforce uniqueness ignoring case + punctuation (e.g. "H." == "h")
CREATE UNIQUE INDEX publishers_abbr_norm_uq
  ON public.publishers (
    (regexp_replace(lower(abbr), '[^a-z0-9]+', '', 'g'))
  )
  WHERE abbr IS NOT NULL AND btrim(abbr) <> '';

-- Optional: speed up lookup by abbreviation
CREATE INDEX publishers_abbr_lower_idx
  ON public.publishers (lower(abbr))
  WHERE abbr IS NOT NULL;