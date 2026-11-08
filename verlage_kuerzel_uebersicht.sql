-- =====================================================================
-- Kürzel-Übersicht in der Datenbank
--   1. neue Spalte publishers.full_name  (voller Verlagsname, z.B. h. -> Heyne)
--   2. Ansicht verlag_kuerzel_uebersicht (Kürzel, voller Name, Bücher – immer aktuell)
--   3. publisher_aliases: sz. und r. korrigieren
--
-- Reihenfolge: egal, ob verlage_alle_als_kuerzel.sql schon gelaufen ist oder nicht.
-- Die vollen Namen werden über die Verlags-ID gesetzt, nicht über den Namen.
-- 58 Kürzel bekommen einen vollen Namen; die übrigen bleiben leer
-- (= noch offen) und können später ergänzt werden:
--   UPDATE publishers SET full_name = 'btb' WHERE name = 'bb.';
--
-- Probelauf:
--   psql "$DB" -v ON_ERROR_STOP=1 -f verlage_kuerzel_uebersicht.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_kuerzel_uebersicht.sql | psql "$DB" -v ON_ERROR_STOP=1
-- Danach jederzeit:
--   psql "$DB" -c "SELECT * FROM verlag_kuerzel_uebersicht"
-- =====================================================================

BEGIN;

-- ---- 1. Spalte für den vollen Namen -----------------------------------
ALTER TABLE publishers ADD COLUMN IF NOT EXISTS full_name text;
COMMENT ON COLUMN publishers.full_name IS 'Ausgeschriebener Verlagsname zum Kürzel (z.B. h. = Heyne)';

CREATE TEMP TABLE fn (id uuid PRIMARY KEY, kuerzel text, full_name text) ON COMMIT DROP;
INSERT INTO fn VALUES
  ('6ca0067c-4534-4701-94b5-43528a4ec6c7', 'h.', 'Heyne'),
  ('5a9ffeef-b6e8-4d56-941e-83602629b015', 'g.', 'Goldmann'),
  ('659c6159-2f33-447e-b7d9-010db944f575', 'k.', 'Knaur'),
  ('6baf70b6-345f-4fae-ba7a-950132c48b7f', 'b.', 'Bertelsmann'),
  ('971066b1-3e8b-4367-8eac-d1a164a17f5f', 'bl.', 'Bastei Lübbe'),
  ('72bf604b-d774-4d95-9e64-686187740805', 'r.', 'Rowohlt'),
  ('30a9dd07-b238-4291-b985-0b0f8681a250', 'f.', 'Fischer'),
  ('11b23975-e915-4aef-899a-5642dea427e1', 'u.', 'Ullstein'),
  ('555b7819-5239-4e36-a5ce-f3b192d18769', 'p.', 'Piper'),
  ('39ff4f67-23a8-4028-a5b2-29021bb837bc', 'dt.', 'dtv (Deutscher Taschenbuch Verlag)'),
  ('b9dfd975-830e-4266-b7f6-f9d68de9af1a', 'bv.', 'Blanvalet'),
  ('b26666f1-cae0-450f-9a86-905be394a3ca', 'rm.', 'RM Buch und Medien Vertrieb'),
  ('9924ebdf-3935-4b33-8b81-5a6b8050e581', 'w.', 'Weltbild'),
  ('5f5ba162-e142-4ca7-a38a-2817f07251a0', 'a.', 'Aufbau'),
  ('f3dcc0aa-db08-4996-bbe0-89d77890314b', 's.', 'Suhrkamp'),
  ('04c1021b-603b-4592-8877-629dbda6a81f', 'kw.', 'Kiepenheuer & Witsch'),
  ('97f6227f-9e2b-400a-8726-656e4c7f7c55', 'e.', 'Econ'),
  ('85a6c574-2eac-4d2b-aa95-de606e73c338', 'dk.', 'Droemer Knaur'),
  ('8738de12-43eb-4aba-b4d7-58b5f9b56ab8', 'd.', 'Deutscher Bücherbund'),
  ('96201601-fcaa-4a9a-91c9-4319648aa958', 'du.', 'DuMont'),
  ('9e74a716-cb9d-4e62-8741-13558e0f07f2', 'hc.', 'Hoffmann und Campe'),
  ('fb4c76bc-4a79-4f0c-a751-411fdfc8369a', 'l.', 'Lingen'),
  ('2454d0b8-3ee2-450d-b4e0-73e408b8dc1f', 'lu.', 'Lübbe'),
  ('452b2b81-8279-4c8d-b8f9-61c663a94fcd', 'be.', 'Beck'),
  ('46b6e951-98ec-4faf-9228-3b6b804db8f2', 'ub.', 'Ueberreuter'),
  ('d3350bab-7551-4725-958a-87d772ea7e57', 'dg.', 'Diogenes'),
  ('a0cd9e94-076e-4d2e-a613-1e37a24b0065', 'ls.', 'List'),
  ('a6a764e1-fb4e-49af-9170-bfc3bcfe18f3', 'pe.', 'Penguin'),
  ('e9babcb8-e335-466b-8a74-fc9256401e44', 'ha.', 'Carl Hanser'),
  ('a0e046e5-c14e-4518-b5db-a1f8e7fba44f', 'dr.', 'Droemer'),
  ('bb13cf48-dc14-4550-8807-5e1858b13194', 'he.', 'Herder'),
  ('eac7b309-dd2b-4e82-8c26-4c48741a1aa6', 'da.', 'Diana'),
  ('4275d656-31b8-41bc-8667-0c38c39f60c3', 'rv.', 'Ravensburger'),
  ('c473a23b-7bd5-45d8-9275-b76e416a53ce', 'm.', 'Moewig'),
  ('398e8230-991f-469b-83a9-b31392347b39', 'sz.', 'Süddeutsche Zeitung'),
  ('be5de3cb-a798-4249-90e6-a8d713abaa48', 'hs.', 'Hestia'),
  ('14ed3278-34e8-4265-99d3-c768bc9427bf', 'c.', 'Carlsen'),
  ('94476739-88ab-474b-8a41-7e5f787b4201', 'bu.', 'Büchergilde Gutenberg'),
  ('bfcb66a3-c0ff-419d-b030-ea96a0ccb061', 'rh.', 'Random House'),
  ('ff52d03a-1ff9-4085-b3ec-90d174265ced', 'dv.', 'Deutsche Verlags-Anstalt'),
  ('57ba1849-216c-4eeb-a095-d8e9456b2a8f', 'Gu.', 'Gräfe und Unzer'),
  ('52af8f4d-9d0c-41b4-ac3f-9243b9797c34', 'z.', 'Paul Zsolnay'),
  ('278d9ed9-b34e-4a20-a0c7-bf304a98dde6', 'dbg.', 'Deutsche Buchgemeinschaft'),
  ('e2de8ce3-6a63-45c9-ad26-de8fb534732a', 'wu.', 'Wunderlich'),
  ('c94a607d-0f77-410c-945b-46a5ab458c8b', 'bd.', 'Buchgemeinschaft Donauland'),
  ('faf2afa2-0b54-4926-a6a3-e74567d6a178', 'gl.', 'Gustav Lübbe'),
  ('fe4ea2b9-21e1-4ae0-9adc-b7c3458ee95e', 'bm.', 'Bechtermünz'),
  ('e75a64ac-07f2-47b7-b66c-fb7b63fa5f78', 'rs.', 'Rosenheimer'),
  ('789f3e08-e53c-44d1-adac-36cdde247c3f', 'n.', 'Naumann & Göbel'),
  ('aca9f4e8-352b-4e98-99ee-494e511461f0', 'sk.', 'Schneekluth'),
  ('81bcbb5e-5ab2-47a7-b2ea-771b3f0fb774', 'sn.', 'Franz Schneider'),
  ('b6361bd9-edb0-4343-bae3-4941fdc0e930', 'scz.', 'Scherz'),
  ('d31c1c26-ed3f-491c-88d4-d3ec791a28f6', 'eb.', 'Europäische Bildungsgemeinschaft'),
  ('705aaea0-0648-4941-9158-e8a5bc156387', 'ss.', 'Schwarzkopf & Schwarzkopf'),
  ('fc253436-8484-4ceb-8c22-bb9e5250e8f2', 'ms.', 'Marion von Schröder'),
  ('a12e8b1c-635e-432d-b14b-81b5ad1c15e8', 't.', 'Thienemann'),
  ('6c113488-dd97-4c4c-b8c5-526201d389cb', 'sv.', 'Schweizer Verlagshaus'),
  ('476e7c32-47f1-4418-92bc-1697b37ee10e', 'ev.', 'Europäische Verlagsanstalt')
;

UPDATE publishers p SET full_name = f.full_name
FROM fn f WHERE p.id = f.id AND p.full_name IS NULL;

-- Verlage ohne Kürzel (ausgeschrieben): voller Name = bisheriger Anzeigename
UPDATE publishers SET full_name = coalesce(nullif(btrim(name_display), ''), name)
WHERE full_name IS NULL
  AND abbr IS NULL
  AND name !~ '^[A-Za-zÄÖÜäöü]{1,4}\.{1,2}$'
  AND name NOT LIKE '\_\_LEGACY\_\_%';

-- ---- 2. Übersicht als Ansicht -----------------------------------------
CREATE OR REPLACE VIEW verlag_kuerzel_uebersicht AS
SELECT coalesce(p.abbr, p.name)             AS kuerzel,
       p.full_name                          AS verlag,
       count(b.id)                          AS buecher,
       CASE WHEN p.full_name IS NULL THEN 'offen' ELSE 'zugeordnet' END AS status,
       p.id
FROM publishers p
LEFT JOIN books b ON b.publisher_id = p.id
WHERE p.abbr IS NOT NULL
   OR p.name ~ '^[A-Za-zÄÖÜäöü]{1,4}\.{1,2}$'
GROUP BY p.id, p.abbr, p.name, p.full_name
ORDER BY count(b.id) DESC;

COMMENT ON VIEW verlag_kuerzel_uebersicht IS 'Alle Verlagskürzel mit vollem Namen und Buchanzahl';

-- ---- 3. publisher_aliases korrigieren ---------------------------------
UPDATE publisher_aliases SET full_name = 'Süddeutsche Zeitung', "full" = 'sueddeutsche zeitung' WHERE abbr_norm = 'sz';
UPDATE publisher_aliases SET full_name = 'Rowohlt',             "full" = 'rowohlt'              WHERE abbr_norm = 'r';

-- ---- Ergebnis ----------------------------------------------------------
SELECT status, count(*) AS kuerzel, sum(buecher) AS buecher
FROM verlag_kuerzel_uebersicht GROUP BY status ORDER BY status DESC;

SELECT kuerzel, verlag, buecher FROM verlag_kuerzel_uebersicht LIMIT 15;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
