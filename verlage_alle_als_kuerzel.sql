-- =====================================================================
-- Überall das Kürzel verwenden:
-- Jeder Verlag mit einem Kürzel (Feld abbr) bekommt das Kürzel als internen Namen (name).
-- Der Anzeigename (name_display, z.B. "Knaur") bleibt unverändert.
--
-- Als LETZTES ausführen, nach den Merge-Skripten:
--   verlage_merge_ullstein.sql
--   verlage_merge_fischer_econ_rowohlt.sql
--   verlage_merge_heyne.sql
--   verlage_merge_unter_kuerzel.sql
-- Kann jederzeit wiederholt werden (z.B. nach neuen Einträgen).
--
-- Verlage, bei denen das Kürzel schon als eigener Eintrag existiert
-- (z.B. weil ein Merge-Skript noch nicht lief), werden übersprungen
-- und am Ende aufgelistet.
--
-- Probelauf:
--   psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f verlage_alle_als_kuerzel.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_alle_als_kuerzel.sql | psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

CREATE TEMP TABLE ren ON COMMIT DROP AS
SELECT p.id, p.name AS alt_name, p.name_display AS alt_anzeige, btrim(p.abbr) AS kuerzel,
       EXISTS (SELECT 1 FROM publishers q WHERE q.name = btrim(p.abbr) AND q.id <> p.id) AS konflikt
FROM publishers p
WHERE p.abbr IS NOT NULL AND btrim(p.abbr) <> ''
  AND p.name IS DISTINCT FROM btrim(p.abbr);

-- alte Namen sichern
CREATE TABLE IF NOT EXISTS publishers_rename_20261108 AS
  SELECT id, name, name_display, abbr, now() AS renamed_at FROM publishers WITH NO DATA;
INSERT INTO publishers_rename_20261108
  SELECT p.id, p.name, p.name_display, p.abbr, now()
  FROM publishers p JOIN ren r ON r.id = p.id WHERE NOT r.konflikt;

UPDATE publishers p SET name = r.kuerzel
FROM ren r WHERE p.id = r.id AND NOT r.konflikt;

-- ---- Ergebnis ----------------------------------------------------------
SELECT r.kuerzel, coalesce(nullif(r.alt_anzeige,''), r.alt_name) AS vorher,
       count(b.id) AS buecher,
       CASE WHEN r.konflikt THEN 'ÜBERSPRUNGEN: Kürzel existiert schon als eigener Eintrag' ELSE 'umbenannt' END AS status
FROM ren r LEFT JOIN books b ON b.publisher_id = r.id
GROUP BY r.kuerzel, r.alt_anzeige, r.alt_name, r.konflikt
ORDER BY r.konflikt DESC, count(b.id) DESC;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
