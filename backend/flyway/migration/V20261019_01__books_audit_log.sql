-- Änderungsprotokoll für public.books
--
-- Jede Änderung an einem Buch wird in public.books_audit festgehalten –
-- egal über welchen Weg (Admin-UI, Mobile-Sync, Skripte, DBeaver):
--
--   changed_at        Zeitpunkt
--   op                INSERT | UPDATE | DELETE
--   book_id           betroffenes Buch
--   changes           nur die GEÄNDERTEN Felder: {"feld": {"alt": …, "neu": …}}
--                     (bei INSERT/DELETE die komplette Zeile unter "neu" bzw. "alt")
--   db_user           Datenbank-Benutzer (z. B. rxlog_app = Web-App)
--   application_name  Programm, das verbunden ist (DBeaver trägt sich hier ein)
--   client_addr       IP-Adresse der Verbindung (soweit Neon sie liefert)
--   txid              Transaktion – Änderungen mit gleicher txid gehören zusammen
--
-- Ignoriert werden reine Rechen-/Suchspalten (dedupe_*, *tsv*, *search*),
-- damit das Protokoll lesbar bleibt. Der Trigger ist ein AFTER-Trigger und
-- sieht daher die endgültig gespeicherten Werte – inklusive allem, was andere
-- Trigger (z. B. trg_books_set_phys_code) noch verändert haben.
--
-- Kein Backfill: es gibt keine Historie; protokolliert wird ab Einspielen.
-- Mehrfach ausführbar.
--
-- Abfragen:
--   SELECT changed_at AT TIME ZONE 'Europe/Berlin', op, db_user, application_name, changes
--   FROM public.books_audit WHERE book_id = '<ID>' ORDER BY changed_at;

BEGIN;

CREATE TABLE IF NOT EXISTS public.books_audit (
  id               bigserial PRIMARY KEY,
  changed_at       timestamptz NOT NULL DEFAULT clock_timestamp(),
  op               text        NOT NULL,
  book_id          uuid        NOT NULL,
  changes          jsonb       NOT NULL,
  db_user          text        NOT NULL DEFAULT current_user,
  application_name text        NULL,
  client_addr      inet        NULL,
  txid             bigint      NOT NULL DEFAULT txid_current()
);

CREATE INDEX IF NOT EXISTS idx_books_audit_book_time ON public.books_audit (book_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_audit_time      ON public.books_audit (changed_at DESC);

CREATE OR REPLACE FUNCTION public.books_audit_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER            -- schreibt auch, wenn rxlog_app keine Rechte auf books_audit hat
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
       AND k !~ '(tsv|search)';
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

DROP TRIGGER IF EXISTS trg_zzz_books_audit ON public.books;
CREATE TRIGGER trg_zzz_books_audit
AFTER INSERT OR UPDATE OR DELETE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.books_audit_trg();

-- Web-App darf das Protokoll lesen, aber nicht verändern
GRANT SELECT ON public.books_audit TO rxlog_app;

COMMIT;
