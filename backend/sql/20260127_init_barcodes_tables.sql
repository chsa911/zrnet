-- barcodes schema (minimal, to support /api/barcodes/preview-barcode)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.size_rules (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,          -- e.g. 'gk', 'ak', ...
  min_width   int  NOT NULL,          -- mm
  max_width   int  NOT NULL,          -- mm
  min_height  int  NOT NULL,          -- mm threshold for 'd' vs 'o'
  eq_heights  int[] NOT NULL DEFAULT ARRAY[205,210,215]  -- mm for 'l'
);

CREATE TABLE IF NOT EXISTS public.barcodes (
  code         text PRIMARY KEY,      -- e.g. 'dgk001'
  size_rule_id bigint NOT NULL REFERENCES public.size_rules(id),
  status       text NOT NULL DEFAULT 'AVAILABLE',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barcode_numbers (
  num           char(3) PRIMARY KEY,  -- '000'..'999'
  rank_in_series int NOT NULL
);

-- seed barcode_numbers if empty
INSERT INTO public.barcode_numbers (num, rank_in_series)
SELECT lpad(gs::text, 3, '0')::char(3), gs
FROM generate_series(0, 999) gs
ON CONFLICT (num) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.book_barcodes (
  book_id uuid NOT NULL,
  barcode text NOT NULL REFERENCES public.barcodes(code),
  PRIMARY KEY (book_id),
  UNIQUE (barcode)
);