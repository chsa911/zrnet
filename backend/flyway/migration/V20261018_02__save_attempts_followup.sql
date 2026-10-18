-- Offene Vorgänge: abgelehnte Registrierungen bleiben sichtbar, bis sie
-- erledigt sind (erneut registriert oder bewusst verworfen).
--
--   payload          komplette Formulareingabe (zum Vorausfüllen beim
--                    erneuten Registrieren)
--   followup_status  NULL = offen | 'done' = erneut registriert |
--                    'dismissed' = bewusst verworfen
--   followup_note    Notiz beim Verwerfen
--   followup_at      Zeitpunkt der Erledigung
--
-- Mehrfach ausführbar.

BEGIN;

ALTER TABLE public.book_save_attempts
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS followup_status text,
  ADD COLUMN IF NOT EXISTS followup_note text,
  ADD COLUMN IF NOT EXISTS followup_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'book_save_attempts_followup_status_chk'
  ) THEN
    ALTER TABLE public.book_save_attempts
      ADD CONSTRAINT book_save_attempts_followup_status_chk
      CHECK (followup_status IS NULL OR followup_status IN ('done', 'dismissed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_book_save_attempts_open
  ON public.book_save_attempts (created_at)
  WHERE status IS DISTINCT FROM 'success' AND followup_status IS NULL;

COMMIT;
