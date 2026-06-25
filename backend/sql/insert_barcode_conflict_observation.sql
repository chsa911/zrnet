-- Run after registering the book normally (with no barcode).
-- Replace the two placeholders, then run.

INSERT INTO public.barcode_conflict_observations (book_id, barcode, note)
VALUES (
  '<paste-new-book-id>'::uuid,
  'dik030',
  'Painted on physical book, currently linked to Boarderlines. Unclear if same copy.'
)
RETURNING id, book_id, barcode, observed_at, resolved;
