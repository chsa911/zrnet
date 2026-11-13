-- reviewed_at: Zeitpunkt, an dem ein Buch zuletzt im Admin ANGESCHAUT wurde –
-- entweder per Suche gefunden (Trefferliste in GET /api/books?q=…)
-- oder einzeln geöffnet (GET /api/books/:id, z. B. Bearbeiten-Formular).
--
-- Gesetzt wird die Spalte ausschließlich vom Backend (booksPgController.js,
-- stampReviewed). Kein Trigger, kein Backfill: gezählt wird ab Einspielen.
--
-- Nebenwirkungen bewusst ausgeschlossen:
--   * enriched_at: Spalte endet auf _at -> zählt dort schon nicht als "Anreicherung"
--   * updated_at / last_action_at: werden nicht angefasst (nur reviewed_at wird geschrieben)
--   * books_audit: reviewed_at wird ignoriert, sonst würde jedes Anschauen
--     einen Protokolleintrag erzeugen (siehe unten, Funktion neu angelegt)
--
-- Mehrfach ausführbar.

BEGIN;

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_books_reviewed_at
  ON public.books (reviewed_at DESC NULLS LAST);

-- Web-App hat nur spaltenweise UPDATE-Rechte auf books (V20260220_10)
GRANT UPDATE (reviewed_at) ON public.books TO rxlog_app;

-- Audit-Trigger aus V20261019_01: zusätzlich reviewed_at ignorieren.
CREATE OR REPLACE FUNCTION public.books_audit_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  o jsonb;
  n jsonb;
  diff jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n := to_jsonb(NEW);
    diff := jsonb_build_object('neu', n);
  ELSIF TG_OP = 'DELETE' THEN
    o := to_jsonb(OLD);
    diff := jsonb_build_object('alt', o);
  ELSE
    o := to_jsonb(OLD);
    n := to_jsonb(NEW);
    SELECT coalesce(jsonb_object_agg(k, jsonb_build_object('alt', o -> k, 'neu', n -> k)), '{}'::jsonb)
      INTO diff
      FROM jsonb_object_keys(n) AS k
     WHERE (o -> k) IS DISTINCT FROM (n -> k)
       AND k !~ '^dedupe_'
       AND k !~ '(tsv|search)'
       AND k <> 'reviewed_at';
    IF diff = '{}'::jsonb THEN
      RETURN NULL;          -- nichts Relevantes geändert
    END IF;
  END IF;

  INSERT INTO public.books_audit (op, book_id, changes, db_user, application_name, client_addr)
  VALUES (
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    diff,
    session_user,
    nullif(current_setting('application_name', true), ''),
    inet_client_addr()
  );

  RETURN NULL;
END;
$function$;

COMMIT;
