-- Automatisches Ausfüllen von Region (action_continent), Land (action_country)
-- und Bundesland (action_state):
--
--   Landschaft wird einem Buch zugeordnet (book_landscapes)
--     K2                -> Asien, PK          (Karakorum ergibt sich aus der Hierarchie)
--     Mount Everest     -> Asien, NEP
--     Zugspitze         -> Mitteleuropa, D, Bayern
--     Bayerischer Wald  -> Mitteleuropa, D, Bayern
--     Himalaya          -> Asien              (mehrere Länder: Land bleibt offen)
--
--   Epoche wird einem Buch zugeordnet (book_time_eras)
--     Kulturrevolution  -> Asien, C
--     Mittelalter       -> nichts             (mehrere Regionen: bleibt offen)
--
-- Regeln:
--   * Es wird NUR ausgefüllt, was am Buch noch leer ist. Eingetragene Werte
--     werden nie überschrieben. Steht am Buch schon eine ANDERE Region, wird
--     gar nichts ergänzt (Widerspruch -> von Hand klären).
--   * Region: Wert der Landschaft/Epoche, sonst vom Oberbegriff (K2 -> Karakorum).
--     Bei Epochen nur, wenn genau eine Region hinterlegt ist.
--   * Land: default_country, sonst das Land, wenn genau eines hinterlegt ist,
--     sonst vom Oberbegriff.
--   * Bundesland: default_state – nur wenn das Land des Buchs dazu passt
--     (Zugspitze bei einem Buch mit Land A ergibt kein "Bayern").
--   * Gilt für alle Wege: Formular, Handy-Sync, Skripte.
--
-- Mehrfach ausführbar.

BEGIN;

-- (Spalten kommen aus V20261109_01/_02; hier nur zur Sicherheit)
ALTER TABLE public.landscapes ADD COLUMN IF NOT EXISTS default_country text NULL;
ALTER TABLE public.landscapes ADD COLUMN IF NOT EXISTS default_state   text NULL;
ALTER TABLE public.time_eras  ADD COLUMN IF NOT EXISTS default_country text NULL;

-- ---- Ort aus einer Landschaft ermitteln (geht die Oberbegriffe hoch) -------
DROP FUNCTION IF EXISTS public.landscape_place(uuid);
CREATE FUNCTION public.landscape_place(p_id uuid, OUT continent int2, OUT country text, OUT state text)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r record;
  cur uuid := p_id;
  depth int := 0;
BEGIN
  WHILE cur IS NOT NULL AND depth < 10 LOOP
    SELECT l.parent_id, l.continent, l.default_country, l.default_state, l.countries INTO r
    FROM public.landscapes l WHERE l.id = cur;
    EXIT WHEN NOT FOUND;
    continent := coalesce(continent, r.continent);
    IF country IS NULL THEN
      country := coalesce(r.default_country, CASE WHEN cardinality(r.countries) = 1 THEN r.countries[1] END);
      -- Bundesland nur zusammen mit "seinem" Land übernehmen
      IF country IS NOT NULL THEN state := r.default_state; END IF;
    END IF;
    EXIT WHEN continent IS NOT NULL AND country IS NOT NULL;
    cur := r.parent_id;
    depth := depth + 1;
  END LOOP;
END $$;

-- ---- Ort aus einer Epoche ermitteln (geht die Oberbegriffe hoch) -----------
DROP FUNCTION IF EXISTS public.time_era_place(uuid);
CREATE FUNCTION public.time_era_place(p_id uuid, OUT continent int2, OUT country text, OUT state text)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r record;
  cur uuid := p_id;
  depth int := 0;
BEGIN
  state := NULL;
  WHILE cur IS NOT NULL AND depth < 10 LOOP
    SELECT e.parent_id, e.continents, e.default_country, e.countries INTO r
    FROM public.time_eras e WHERE e.id = cur;
    EXIT WHEN NOT FOUND;
    continent := coalesce(continent, CASE WHEN cardinality(r.continents) = 1 THEN r.continents[1] END);
    country   := coalesce(country, r.default_country,
                          CASE WHEN cardinality(r.countries) = 1 THEN r.countries[1] END);
    EXIT WHEN continent IS NOT NULL AND country IS NOT NULL;
    cur := r.parent_id;
    depth := depth + 1;
  END LOOP;
END $$;

-- ---- leere Ortsfelder am Buch füllen ---------------------------------------
DROP FUNCTION IF EXISTS public.books_fill_place(uuid, int2, text);
CREATE OR REPLACE FUNCTION public.books_fill_place(p_book uuid, p_continent int2, p_country text, p_state text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_continent IS NULL AND p_country IS NULL AND p_state IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.books b SET
    action_continent = coalesce(b.action_continent, p_continent),
    action_country   = coalesce(nullif(btrim(b.action_country), ''), p_country),
    action_state     = CASE
                         WHEN nullif(btrim(b.action_state), '') IS NOT NULL THEN b.action_state
                         WHEN p_state IS NOT NULL
                          AND upper(coalesce(nullif(btrim(b.action_country), ''), p_country, '')) = upper(coalesce(p_country, ''))
                           THEN p_state
                         ELSE b.action_state
                       END,
    updated_at       = now()
  WHERE b.id = p_book
    -- widerspricht die eingetragene Region, wird gar nichts ergänzt
    AND NOT (b.action_continent IS NOT NULL AND p_continent IS NOT NULL
             AND b.action_continent <> p_continent)
    AND (   (b.action_continent IS NULL AND p_continent IS NOT NULL)
         OR (nullif(btrim(b.action_country), '') IS NULL AND p_country IS NOT NULL)
         OR (nullif(btrim(b.action_state), '') IS NULL AND p_state IS NOT NULL
             AND upper(coalesce(nullif(btrim(b.action_country), ''), p_country, '')) = upper(coalesce(p_country, ''))));
END $$;

CREATE OR REPLACE FUNCTION public.book_landscapes_autofill_trg()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p record;
BEGIN
  p := public.landscape_place(NEW.landscape_id);
  PERFORM public.books_fill_place(NEW.book_id, p.continent, p.country, p.state);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.book_time_eras_autofill_trg()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p record;
BEGIN
  p := public.time_era_place(NEW.time_era_id);
  PERFORM public.books_fill_place(NEW.book_id, p.continent, p.country, p.state);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_book_landscapes_autofill ON public.book_landscapes;
CREATE TRIGGER trg_book_landscapes_autofill
  AFTER INSERT OR UPDATE OF landscape_id ON public.book_landscapes
  FOR EACH ROW EXECUTE FUNCTION public.book_landscapes_autofill_trg();

DROP TRIGGER IF EXISTS trg_book_time_eras_autofill ON public.book_time_eras;
CREATE TRIGGER trg_book_time_eras_autofill
  AFTER INSERT OR UPDATE OF time_era_id ON public.book_time_eras
  FOR EACH ROW EXECUTE FUNCTION public.book_time_eras_autofill_trg();

REVOKE ALL ON FUNCTION public.books_fill_place(uuid, int2, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.landscape_place(uuid) TO rxlog_app;
GRANT EXECUTE ON FUNCTION public.time_era_place(uuid)  TO rxlog_app;

-- ---- bereits vorhandene Zuordnungen einmal nachziehen ----------------------
SELECT public.books_fill_place(bl.book_id, p.continent, p.country, p.state)
FROM public.book_landscapes bl, LATERAL public.landscape_place(bl.landscape_id) p;

SELECT public.books_fill_place(bt.book_id, p.continent, p.country, p.state)
FROM public.book_time_eras bt, LATERAL public.time_era_place(bt.time_era_id) p;

COMMIT;
