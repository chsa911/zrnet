-- =====================================================================
-- Neues Barcode-System (23.11.2026): fehlende Serien anlegen
--
-- 9 Farben x 4 Positionen = 36 Serien:
--   Farben:     i b s g p n k t u
--   Positionen: d (unten) o (oben) l (links) r (rechts)
--   -> di do li ri, db ob lb rb, ... , du ou lu ru
--
-- Fehlt eine Serie ganz oder fehlen einzelne Nummern, werden sie angelegt.
-- Vorlage für Nummern und rank_in_inventory ist die größte vorhandene Serie
-- DERSELBEN Farbe (z. B. für "rk" die größte von dk/ok/lk). Gibt es für eine
-- Farbe noch gar keine Serie, wird die größte der 36 Serien als Vorlage
-- genommen.
-- Vorhandene Codes werden NICHT verändert. Alte Barcodes bleiben wie sie sind.
--
-- DBeaver:
--   * VORHER oben in der Leiste von "Auto" auf "Manual Commit" umstellen
--   * ganzes Skript ausführen: Alt+X  (NICHT Strg+Enter)
--   * Probelauf: endet mit ROLLBACK -> nichts wird gespeichert.
--     Ergebnis = letzter Tab: alle 36 Serien mit Anzahl (neu angelegt / frei).
--   * Echt: unten ROLLBACK; durch COMMIT; ersetzen und erneut Alt+X.
--
-- Rückgängig (falls nötig):
--   DELETE FROM barcode_inventory bi USING barcode_inventory_neu_20261123 n
--   WHERE lower(bi.barcode) = lower(n.barcode);
--
-- Mehrfach ausführbar.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF now() = statement_timestamp() THEN
    RAISE EXCEPTION 'Abbruch: DBeaver steht auf Auto-Commit. Bitte oben in der Leiste von "Auto" auf "Manual Commit" umstellen und das Skript erneut ausführen.';
  END IF;
END $$;

-- Protokoll: welche Codes hat dieses Skript angelegt
CREATE TABLE IF NOT EXISTS public.barcode_inventory_neu_20261123 (
  barcode    text PRIMARY KEY,
  vorlage    text NOT NULL,
  angelegt_am timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  v_colors    text[] := ARRAY['i','b','s','g','p','n','k','t','u'];
  v_positions text[] := ARRAY['d','o','l','r'];
  v_color     text;
  v_pos       text;
  v_prefix    text;
  v_template  text;
  v_band      text;
  v_copy_cols text;   -- Spalten, die 1:1 aus der Vorlage übernommen werden
  v_n         int;
  v_all_new   text[] := ARRAY[]::text[];
BEGIN
  FOREACH v_color IN ARRAY v_colors LOOP
    FOREACH v_pos IN ARRAY v_positions LOOP
      v_all_new := v_all_new || (v_pos || v_color);
    END LOOP;
  END LOOP;

  -- Spalten der Vorlage, die mitkopiert werden: alles außer den Spalten, die
  -- wir selbst setzen, und außer Spalten mit Default (z. B. id/serial).
  -- rank_in_inventory wird immer kopiert (ohne Rang wird ein Code nie vorgeschlagen).
  SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinal_position)
    INTO v_copy_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'barcode_inventory'
    AND c.column_name NOT IN ('barcode','status','band','sizegroup','size_rule_id',
                              'created_at','updated_at','rank_in_inventory')
    AND c.column_default IS NULL
    AND c.is_generated = 'NEVER';

  FOREACH v_color IN ARRAY v_colors LOOP
    -- Vorlage: größte vorhandene Serie derselben Farbe
    SELECT p INTO v_template
    FROM (
      SELECT lower(regexp_replace(barcode, '[0-9]+$', '')) AS p, count(*) AS n
      FROM public.barcode_inventory
      WHERE lower(regexp_replace(barcode, '[0-9]+$', '')) IN
            ('d'||v_color, 'o'||v_color, 'l'||v_color, 'r'||v_color)
        AND rank_in_inventory IS NOT NULL
      GROUP BY 1
    ) t
    ORDER BY n DESC, p
    LIMIT 1;

    -- Notfall: größte der 36 neuen Serien überhaupt
    IF v_template IS NULL THEN
      SELECT p INTO v_template
      FROM (
        SELECT lower(regexp_replace(barcode, '[0-9]+$', '')) AS p, count(*) AS n
        FROM public.barcode_inventory
        WHERE lower(regexp_replace(barcode, '[0-9]+$', '')) = ANY(v_all_new)
          AND rank_in_inventory IS NOT NULL
        GROUP BY 1
      ) t
      ORDER BY n DESC, p
      LIMIT 1;
    END IF;

    IF v_template IS NULL THEN
      RAISE EXCEPTION 'Keine Vorlage-Serie gefunden (Farbe %). Bitte melden.', v_color;
    END IF;

    FOREACH v_pos IN ARRAY v_positions LOOP
      v_prefix := v_pos || v_color;
      v_band := CASE v_pos WHEN 'l' THEN 'special' WHEN 'o' THEN 'high' ELSE 'low' END;

      IF v_prefix = v_template THEN
        CONTINUE;
      END IF;

      EXECUTE format($q$
        WITH tpl AS (
          SELECT t.*, substring(t.barcode FROM '[0-9]+$') AS num
          FROM public.barcode_inventory t
          WHERE lower(regexp_replace(t.barcode, '[0-9]+$', '')) = %L
            AND t.rank_in_inventory IS NOT NULL
        ),
        missing AS (
          SELECT tpl.* FROM tpl
          WHERE NOT EXISTS (
            SELECT 1 FROM public.barcode_inventory x
            WHERE lower(x.barcode) = lower(%L || tpl.num)
          )
        ),
        ins AS (
          INSERT INTO public.barcode_inventory
            (barcode, status, band, rank_in_inventory %s)
          SELECT %L || m.num, 'AVAILABLE', %L, m.rank_in_inventory %s
          FROM missing m
          RETURNING barcode
        )
        INSERT INTO public.barcode_inventory_neu_20261123 (barcode, vorlage)
        SELECT barcode, %L FROM ins
        ON CONFLICT (barcode) DO NOTHING
      $q$,
        v_template,
        v_prefix,
        CASE WHEN v_copy_cols IS NULL THEN '' ELSE ', ' || v_copy_cols END,
        v_prefix, v_band,
        CASE WHEN v_copy_cols IS NULL THEN '' ELSE ', m.' || replace(v_copy_cols, ', ', ', m.') END,
        v_template
      );

      GET DIAGNOSTICS v_n = ROW_COUNT;
      RAISE NOTICE 'Serie %: % neu angelegt (Vorlage %)', v_prefix, v_n, v_template;
    END LOOP;
  END LOOP;
END $$;

-- Ergebnis: alle 36 Serien in Vergabe-Reihenfolge -------------------------
WITH s(farbe, kuerzel, gruppe) AS (
  VALUES ('lila','i',1),('blau','b',1),('schwarz','s',1),('grün','g',1),('pink','p',1),
         ('orange','n',2),('Kugelschreiber','k',2),('rot','t',2),('grau','u',2)
),
p AS (
  SELECT s.*, x.pos, x.ord, x.pos || s.kuerzel AS praefix
  FROM s
  CROSS JOIN LATERAL (
    SELECT * FROM unnest(
      CASE s.gruppe WHEN 1 THEN ARRAY['d','o','l','r'] ELSE ARRAY['r','l','d','o'] END
    ) WITH ORDINALITY AS u(pos, ord)
  ) x
)
SELECT p.farbe, p.gruppe, p.ord AS reihenfolge, p.praefix,
       count(bi.barcode)                                        AS codes_gesamt,
       count(bi.barcode) FILTER (WHERE bi.status = 'AVAILABLE') AS status_frei,
       count(n.barcode)                                         AS neu_angelegt
FROM p
LEFT JOIN public.barcode_inventory bi
       ON lower(regexp_replace(bi.barcode, '[0-9]+$', '')) = p.praefix
LEFT JOIN public.barcode_inventory_neu_20261123 n
       ON lower(n.barcode) = lower(bi.barcode)
GROUP BY p.farbe, p.gruppe, p.ord, p.praefix, p.kuerzel
ORDER BY array_position(ARRAY['i','b','s','g','p','n','k','t','u'], p.kuerzel), p.ord;

ROLLBACK;
