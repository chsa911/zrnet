-- =====================================================================
-- Kürzel und Anzeigename sauber trennen
--   abbr          = Kürzel        (z.B. h.)
--   name_display  = Anzeigename   (z.B. Heyne)  -> erscheint in der Oberfläche
--
--   1. name_display bekommt wieder den vollen Verlagsnamen
--      (aus der Zuordnungsliste, sonst aus der Sicherung publishers_rename_20261108)
--   2. Spalte full_name wird entfernt, falls vorhanden (war doppelt)
--   3. Ansicht verlag_kuerzel_uebersicht (Kürzel, Anzeigename, Bücher) – liest name_display
--   4. publisher_aliases: sz. und r. korrigieren
--
-- Ersetzt verlage_kuerzel_uebersicht.sql. Egal, ob jenes schon gelaufen ist oder nicht,
-- und egal, ob btb/cbt/cbj, Lonely Planet und der d./db./rd.-Tausch schon gelaufen sind.
-- Kann jederzeit wiederholt werden.
--
-- Probelauf:
--   psql "$DB" -v ON_ERROR_STOP=1 -f verlage_anzeigename.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_anzeigename.sql | psql "$DB" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

-- Sicherung der aktuellen Anzeigenamen
CREATE TABLE IF NOT EXISTS publishers_display_backup_20261108 AS
  SELECT id, name, name_display, abbr, now() AS saved_at FROM publishers WITH NO DATA;
INSERT INTO publishers_display_backup_20261108 (id, name, name_display, abbr, saved_at)
  SELECT id, name, name_display, abbr, now() FROM publishers;

-- ---- 1a. Anzeigenamen aus der Zuordnungsliste (über die Verlags-ID) ----
CREATE TEMP TABLE disp (id uuid PRIMARY KEY, anzeige text NOT NULL) ON COMMIT DROP;
INSERT INTO disp VALUES
  ('6ca0067c-4534-4701-94b5-43528a4ec6c7', 'Heyne'),
  ('5a9ffeef-b6e8-4d56-941e-83602629b015', 'Goldmann'),
  ('659c6159-2f33-447e-b7d9-010db944f575', 'Knaur'),
  ('6baf70b6-345f-4fae-ba7a-950132c48b7f', 'Bertelsmann'),
  ('971066b1-3e8b-4367-8eac-d1a164a17f5f', 'Bastei Lübbe'),
  ('72bf604b-d774-4d95-9e64-686187740805', 'Rowohlt'),
  ('30a9dd07-b238-4291-b985-0b0f8681a250', 'Fischer'),
  ('11b23975-e915-4aef-899a-5642dea427e1', 'Ullstein'),
  ('555b7819-5239-4e36-a5ce-f3b192d18769', 'Piper'),
  ('39ff4f67-23a8-4028-a5b2-29021bb837bc', 'dtv'),
  ('b9dfd975-830e-4266-b7f6-f9d68de9af1a', 'Blanvalet'),
  ('b26666f1-cae0-450f-9a86-905be394a3ca', 'RM Buch und Medien Vertrieb'),
  ('9924ebdf-3935-4b33-8b81-5a6b8050e581', 'Weltbild'),
  ('5f5ba162-e142-4ca7-a38a-2817f07251a0', 'Aufbau'),
  ('f3dcc0aa-db08-4996-bbe0-89d77890314b', 'Suhrkamp'),
  ('04c1021b-603b-4592-8877-629dbda6a81f', 'Kiepenheuer & Witsch'),
  ('97f6227f-9e2b-400a-8726-656e4c7f7c55', 'Econ'),
  ('85a6c574-2eac-4d2b-aa95-de606e73c338', 'Droemer Knaur'),
  ('8738de12-43eb-4aba-b4d7-58b5f9b56ab8', 'Deutscher Bücherbund'),
  ('96201601-fcaa-4a9a-91c9-4319648aa958', 'DuMont'),
  ('9e74a716-cb9d-4e62-8741-13558e0f07f2', 'Hoffmann und Campe'),
  ('fb4c76bc-4a79-4f0c-a751-411fdfc8369a', 'Lingen'),
  ('2454d0b8-3ee2-450d-b4e0-73e408b8dc1f', 'Lübbe'),
  ('452b2b81-8279-4c8d-b8f9-61c663a94fcd', 'Beck'),
  ('46b6e951-98ec-4faf-9228-3b6b804db8f2', 'Ueberreuter'),
  ('d3350bab-7551-4725-958a-87d772ea7e57', 'Diogenes'),
  ('a0cd9e94-076e-4d2e-a613-1e37a24b0065', 'List'),
  ('a6a764e1-fb4e-49af-9170-bfc3bcfe18f3', 'Penguin'),
  ('e9babcb8-e335-466b-8a74-fc9256401e44', 'Carl Hanser'),
  ('a0e046e5-c14e-4518-b5db-a1f8e7fba44f', 'Droemer'),
  ('bb13cf48-dc14-4550-8807-5e1858b13194', 'Herder'),
  ('eac7b309-dd2b-4e82-8c26-4c48741a1aa6', 'Diana'),
  ('4275d656-31b8-41bc-8667-0c38c39f60c3', 'Ravensburger'),
  ('c473a23b-7bd5-45d8-9275-b76e416a53ce', 'Moewig'),
  ('398e8230-991f-469b-83a9-b31392347b39', 'Süddeutsche Zeitung'),
  ('be5de3cb-a798-4249-90e6-a8d713abaa48', 'Hestia'),
  ('14ed3278-34e8-4265-99d3-c768bc9427bf', 'Carlsen'),
  ('94476739-88ab-474b-8a41-7e5f787b4201', 'Büchergilde Gutenberg'),
  ('bfcb66a3-c0ff-419d-b030-ea96a0ccb061', 'Random House'),
  ('ff52d03a-1ff9-4085-b3ec-90d174265ced', 'Deutsche Verlags-Anstalt'),
  ('57ba1849-216c-4eeb-a095-d8e9456b2a8f', 'Gräfe und Unzer'),
  ('52af8f4d-9d0c-41b4-ac3f-9243b9797c34', 'Paul Zsolnay'),
  ('278d9ed9-b34e-4a20-a0c7-bf304a98dde6', 'Deutsche Buchgemeinschaft'),
  ('e2de8ce3-6a63-45c9-ad26-de8fb534732a', 'Wunderlich'),
  ('c94a607d-0f77-410c-945b-46a5ab458c8b', 'Buchgemeinschaft Donauland'),
  ('faf2afa2-0b54-4926-a6a3-e74567d6a178', 'Gustav Lübbe'),
  ('fe4ea2b9-21e1-4ae0-9adc-b7c3458ee95e', 'Bechtermünz'),
  ('e75a64ac-07f2-47b7-b66c-fb7b63fa5f78', 'Rosenheimer'),
  ('789f3e08-e53c-44d1-adac-36cdde247c3f', 'Naumann & Göbel'),
  ('aca9f4e8-352b-4e98-99ee-494e511461f0', 'Schneekluth'),
  ('81bcbb5e-5ab2-47a7-b2ea-771b3f0fb774', 'Franz Schneider'),
  ('b6361bd9-edb0-4343-bae3-4941fdc0e930', 'Scherz'),
  ('d31c1c26-ed3f-491c-88d4-d3ec791a28f6', 'Europäische Bildungsgemeinschaft'),
  ('705aaea0-0648-4941-9158-e8a5bc156387', 'Schwarzkopf & Schwarzkopf'),
  ('fc253436-8484-4ceb-8c22-bb9e5250e8f2', 'Marion von Schröder'),
  ('a12e8b1c-635e-432d-b14b-81b5ad1c15e8', 'Thienemann'),
  ('6c113488-dd97-4c4c-b8c5-526201d389cb', 'Schweizer Verlagshaus'),
  ('476e7c32-47f1-4418-92bc-1697b37ee10e', 'Europäische Verlagsanstalt'),
  ('70883008-29d7-4101-b150-8e360a8792ad', 'btb'),
  ('9506f13a-846b-4b02-803a-2cb52935e5cd', 'cbt'),
  ('74c7d0ba-a6ad-41eb-98a4-5faf4361456e', 'cbj'),
  ('b6ae0350-d8ce-4bb7-985e-319fa6ddcbdd', 'Lonely Planet'),
  ('5885561a-137a-4c44-b9e4-38bf798da3a6', 'Reader''s Digest / Das Beste')
;
UPDATE publishers p SET name_display = d.anzeige
FROM disp d WHERE p.id = d.id AND p.name_display IS DISTINCT FROM d.anzeige;

-- ---- 1b. übrige Kürzel-Verlage: alten Anzeigenamen aus der Sicherung zurückholen
DO $$
BEGIN
  IF to_regclass('publishers_rename_20261108') IS NOT NULL THEN
    UPDATE publishers p SET name_display = r.alt
    FROM (SELECT DISTINCT ON (id) id, coalesce(nullif(btrim(name_display), ''), name) AS alt
          FROM publishers_rename_20261108
          WHERE coalesce(nullif(btrim(name_display), ''), name) !~ '^[A-Za-zÄÖÜäöü]{1,4}\.{1,2}$'
          ORDER BY id, renamed_at) r
    WHERE p.id = r.id
      AND NOT EXISTS (SELECT 1 FROM disp d WHERE d.id = p.id)
      AND (p.name_display IS NULL OR p.name_display ~ '^[A-Za-zÄÖÜäöü]{1,4}\.{1,2}$' OR p.name_display = p.abbr);
  END IF;
END $$;

-- ---- 1c. Kürzel-Einträge ohne bekannten Namen: Anzeigename leer lassen statt Kürzel doppelt
UPDATE publishers SET name_display = NULL
WHERE name_display IS NOT NULL AND (name_display = abbr OR (name_display = name AND name ~ '^[A-Za-zÄÖÜäöü]{1,4}\.{1,2}$'));

-- ---- 2. Spalte full_name entfernen (falls angelegt) --------------------
DROP VIEW IF EXISTS verlag_kuerzel_uebersicht;
ALTER TABLE publishers DROP COLUMN IF EXISTS full_name;

-- ---- 3. Übersicht -------------------------------------------------------
CREATE VIEW verlag_kuerzel_uebersicht AS
SELECT coalesce(p.abbr, p.name)   AS kuerzel,
       p.name_display             AS verlag,
       count(b.id)                AS buecher,
       CASE WHEN p.name_display IS NULL THEN 'offen' ELSE 'zugeordnet' END AS status,
       p.id
FROM publishers p
LEFT JOIN books b ON b.publisher_id = p.id
WHERE p.abbr IS NOT NULL OR p.name ~ '^[A-Za-zÄÖÜäöü]{1,4}\.{1,2}$'
GROUP BY p.id, p.abbr, p.name, p.name_display
ORDER BY count(b.id) DESC;

COMMENT ON VIEW verlag_kuerzel_uebersicht IS 'Alle Verlagskürzel mit Anzeigename und Buchanzahl';

-- ---- 4. publisher_aliases korrigieren -----------------------------------
UPDATE publisher_aliases SET full_name = 'Süddeutsche Zeitung', "full" = 'sueddeutsche zeitung' WHERE abbr_norm = 'sz';
UPDATE publisher_aliases SET full_name = 'Rowohlt',             "full" = 'rowohlt'              WHERE abbr_norm = 'r';

-- ---- Ergebnis ----------------------------------------------------------
SELECT status, count(*) AS kuerzel, sum(buecher) AS buecher
FROM verlag_kuerzel_uebersicht GROUP BY status ORDER BY status DESC;

SELECT kuerzel, verlag, buecher FROM verlag_kuerzel_uebersicht LIMIT 15;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
