-- Admin escape hatch for the "physical barcode doesn't match the system"
-- case (e.g. dik030 painted on a book the ledger says belongs to
-- Boarderlines). This does NOT touch book_barcodes or barcode_assignments,
-- so it cannot create the kind of duplicate-owner desync those tables are
-- protected against. It just records "this barcode was also observed on
-- this book, unresolved" so the book isn't lost while the conflict is
-- sorted out by hand later.
--
-- Works for an EXISTING book row (already registered, with or without its
-- own real barcode) -- you are not creating a second live link, just a
-- flagged note attached to that book_id.

CREATE TABLE IF NOT EXISTS public.barcode_conflict_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolution_note text
);

CREATE INDEX IF NOT EXISTS idx_barcode_conflict_observations_barcode
  ON public.barcode_conflict_observations (lower(barcode));

CREATE INDEX IF NOT EXISTS idx_barcode_conflict_observations_book_id
  ON public.barcode_conflict_observations (book_id);

CREATE INDEX IF NOT EXISTS idx_barcode_conflict_observations_unresolved
  ON public.barcode_conflict_observations (lower(barcode))
  WHERE resolved = false;
