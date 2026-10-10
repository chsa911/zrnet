-- =====================================================================
-- authors: Namensfelder automatisch aus name_display ableiten
--
-- Wenn du name_display setzt (z. B. "Heinrich von Kleist"), füllt die DB:
--   title         = "Dr." / "Prof." / "Dr. med." …   (falls vorangestellt)
--   first_name    = "Heinrich"
--   namenszusatz  = "von"  (von, van, de, der, zu, la, le, di, du …)
--   last_name     = "Kleist"
-- Umgekehrt: name_display leer -> wird aus den Teilen gebaut.
--
-- Wann wird abgeleitet?
--   * first_name ist leer, ODER
--   * first_name/last_name sind nur die simple "letztes Wort = Nachname"-
--     Aufteilung (so schickt es die App), ODER
--   * name_display wurde geändert, die Namensteile im selben Befehl aber nicht.
-- Setzt du first_name/last_name bewusst anders (z. B. "Gabriel" + "García Márquez"),
-- bleibt deine Eingabe unangetastet.
-- Mehrere Autoren in einem Feld ("A; B", "A & B", "A / B", "A und B")
-- werden nicht zerlegt, sondern mit needs_review = true markiert.
-- Ebenso Namen mit 3+ Wörtern ohne Zusatz (Doppelnamen unklar).
--
-- Ersetzt Teil 3a aus authors_name_display.sql. Teil 3b (CHECK) bleibt.
-- Zuerst im Neon-Test-Branch ausführen.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.split_author_name(
  p_display text,
  OUT title text, OUT first_name text, OUT namenszusatz text, OUT last_name text,
  OUT multi boolean, OUT ambiguous boolean)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s text := regexp_replace(btrim(coalesce(p_display, '')), '\s+', ' ', 'g');
  t text[];
  n int;
  i int := 1;
  j int;
  pstart int := NULL;
  pend int;
  particles constant text[] := ARRAY['von','vom','van','de','der','den','del','della','di','da','das','dos','du','la','le','zu','zur','ten','ter'];
BEGIN
  multi := false; ambiguous := false;
  IF s = '' THEN RETURN; END IF;

  -- mehrere Autoren -> nicht zerlegen
  IF s ~ '[;&/]' OR s ~* '\s(und|and)\s' THEN
    multi := true; RETURN;
  END IF;

  -- "Nachname, Vorname" -> "Vorname Nachname"
  IF s ~ '^[^,]+,[^,]+$' THEN
    s := btrim(split_part(s, ',', 2)) || ' ' || btrim(split_part(s, ',', 1));
  END IF;

  t := string_to_array(s, ' ');
  n := array_length(t, 1);

  -- Titel am Anfang (Dr., Prof., med., phil., Dipl.-Ing. …)
  WHILE i < n AND t[i] ~* '^(dr|prof|med|phil|rer|nat|jur|dent|vet|h\.?c|dipl\.?-?[a-zä]*|mag|sir|dame)\.?$' LOOP
    title := concat_ws(' ', title, t[i]);
    i := i + 1;
  END LOOP;

  IF i = n THEN               -- nur ein Wort übrig
    last_name := t[n];
    RETURN;
  END IF;

  -- erster Zusatz (nicht als letztes Wort)
  FOR j IN i .. n - 1 LOOP
    IF lower(t[j]) = ANY (particles) THEN pstart := j; EXIT; END IF;
  END LOOP;

  IF pstart IS NOT NULL THEN
    pend := pstart;
    WHILE pend + 1 < n AND lower(t[pend + 1]) = ANY (particles) LOOP pend := pend + 1; END LOOP;
    IF pstart > i THEN first_name := array_to_string(t[i:pstart - 1], ' '); END IF;
    namenszusatz := array_to_string(t[pstart:pend], ' ');
    last_name := array_to_string(t[pend + 1:n], ' ');
  ELSE
    first_name := array_to_string(t[i:n - 1], ' ');
    last_name := t[n];
    -- 3+ Namenswörter: Vorname oder Doppelname? (z. B. García Márquez)
    ambiguous := (n - i + 1) >= 3 AND first_name !~ '\.';  -- "John R. R. Tolkien" ist eindeutig
  END IF;
END $$;


CREATE OR REPLACE FUNCTION public.authors_sync_name_parts() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  disp text := NULLIF(regexp_replace(btrim(coalesce(NEW.name_display, '')), '\s+', ' ', 'g'), '');
  naive_first text;
  naive_last text;
  derive boolean := false;
  r record;
BEGIN
  NEW.name_display := disp;

  IF disp IS NOT NULL THEN
    -- So teilt die App heute auf (letztes Wort = Nachname)
    naive_last  := regexp_replace(disp, '^.* ', '');
    naive_first := NULLIF(regexp_replace(disp, ' ?[^ ]+$', ''), '');

    derive :=
         NULLIF(btrim(NEW.first_name), '') IS NULL
      OR (NEW.first_name IS NOT DISTINCT FROM naive_first AND NEW.last_name IS NOT DISTINCT FROM naive_last)
      OR (TG_OP = 'UPDATE'
          AND NEW.name_display IS DISTINCT FROM OLD.name_display
          AND NEW.first_name   IS NOT DISTINCT FROM OLD.first_name
          AND NEW.last_name    IS NOT DISTINCT FROM OLD.last_name
          AND NEW.namenszusatz IS NOT DISTINCT FROM OLD.namenszusatz);

    IF derive THEN
      r := public.split_author_name(disp);
      IF r.multi THEN
        NEW.needs_review := true;          -- mehrere Autoren: nicht anfassen
      ELSIF r.last_name IS NOT NULL THEN
        NEW.first_name   := r.first_name;
        NEW.last_name    := r.last_name;
        NEW.namenszusatz := r.namenszusatz;
        NEW.name_particle := NULL;         -- Zusatz steht jetzt in namenszusatz
        IF NULLIF(btrim(NEW.title), '') IS NULL THEN NEW.title := r.title; END IF;
        IF r.ambiguous THEN NEW.needs_review := true; END IF;
      END IF;
    END IF;
  ELSE
    -- name_display leer -> aus den Teilen bauen
    NEW.name_display := NULLIF(concat_ws(' ',
        NULLIF(btrim(NEW.title), ''), NULLIF(btrim(NEW.first_name), ''),
        NULLIF(btrim(NEW.namenszusatz), ''), NULLIF(btrim(NEW.name_particle), ''),
        NULLIF(btrim(NEW.last_name), '')), '');
  END IF;

  RETURN NEW;
END $$;

-- alten Trigger aus authors_name_display.sql (Teil 3a) ersetzen
DROP TRIGGER IF EXISTS trg_authors_fill_name_display ON public.authors;
DROP FUNCTION IF EXISTS public.authors_fill_name_display();

DROP TRIGGER IF EXISTS trg_authors_sync_name_parts ON public.authors;
CREATE TRIGGER trg_authors_sync_name_parts
  BEFORE INSERT OR UPDATE OF name_display, first_name, last_name, title, namenszusatz, name_particle
  ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.authors_sync_name_parts();


-- ---------------------------------------------------------------------
-- Schnelltest (ändert nichts, nur Anzeige):
-- SELECT d, (public.split_author_name(d)).*
-- FROM unnest(ARRAY['Heinrich von Kleist','Dr. med. Thomas Heim','Kleist, Heinrich von',
--   'Ursula K. Le Guin','Gabriel García Márquez','Volker Klüpfel / Michael Kobr','Keneally']) d;
-- ---------------------------------------------------------------------
