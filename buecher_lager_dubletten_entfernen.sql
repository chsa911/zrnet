-- =====================================================================
-- Doppelte Lagereinträge entfernen
-- Bücher, die bei der Registrierung NEU angelegt wurden, obwohl schon ein
-- Lagereintrag (in_stock) mit gleicher ISBN und Seitenzahl existierte.
-- 41 Lagereinträge, 41 Paare (Lagereintrag -> registriertes Buch).
-- Nicht enthalten: 1Q84/"IQ84 (Buch 3)" und "Mein Gefängnis hat viele Mauern"/
-- "Vierteljahresberichte" (abweichender Titel – bitte selbst prüfen) sowie Fälle,
-- in denen der Lagereintrag erst NACH der Registrierung angelegt wurde, und
-- "James Bond - Zurück kommt nur der Tod" / "Geschichte der Inquisition im
-- Mittelalter" (mehrere Exemplare – Zuordnung Foto/Exemplar nicht eindeutig).
--
-- Vorher auf dem Server die Cover übernehmen: dubletten_cover_uebernehmen.sh
--
-- Pro Paar:
--   - leere Felder des registrierten Buchs (ISBN-13/-10, Kauf-Link, Sprache)
--     werden aus dem Lagereintrag ergänzt
--   - der Lagereintrag wird gelöscht (vorher gesichert in
--     books_lager_dubletten_backup_20261108)
-- Übersprungen wird ein Paar, wenn der Lagereintrag inzwischen nicht mehr
-- in_stock ist, einen Barcode hat oder ISBN/Seitenzahl nicht mehr passen.
--
-- Probelauf:
--   psql "$DB" -v ON_ERROR_STOP=1 -f buecher_lager_dubletten_entfernen.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' buecher_lager_dubletten_entfernen.sql | psql "$DB" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

CREATE TEMP TABLE paar (stub_id uuid, book_id uuid, isbn text, pages int) ON COMMIT DROP;
INSERT INTO paar VALUES
  ('054687b8-60b1-4a68-bfc0-0ffb51825447', '8d081450-df04-4a38-bda5-364de25d34a8', '9783800052349', 251),  -- Emmas Weg in die Freiheit
  ('848feb15-4757-40c1-9184-44cc4ae4afcd', '9db942df-6d37-4113-ac60-9a4d59f97894', '9783404152742', 637),  -- Die Früchte der Erde
  ('88d39603-2e7f-48ba-bde6-43a02c50675a', 'a26de963-a9de-4bf5-a382-3208eeb63ad1', '9783404632091', 479),  -- Die Löwin Elsa und ihre Jungen
  ('9dad54e9-c9ec-4c89-be4a-b34617287c6c', '2e30bd46-356a-4add-b6c7-21d571881c5c', '9783100024466', 270),  -- Generation Allah
  ('bc625c11-fc11-4d52-bb2a-c4cf1a0ee6c7', 'd11698e7-af9e-457e-b6f5-1e404d2012c4', '9783548372099', 203),  -- Freiheit
  ('4b1db0f6-67fd-487a-9399-2b017b4360b9', '2b97d192-9a36-4295-9ab4-1e5c0640e2fc', '9783499625756', 253),  -- Wann darf ich klatschen?
  ('58dd3e52-dab1-49b9-a16e-0ffa21daeadf', '23366b0d-5ae4-4aa1-b518-525926b8b7eb', '9783954030255', 205),  -- Die Kultur der Unhöflichkeit
  ('67a221c4-b6be-418d-a918-90df00c09c4f', '0deaf85f-15fe-4822-8d86-188a8a5a1436', '9783570021576', 443),  -- Raubritter
  ('f02a15e3-daf6-441d-9749-bd81d52ab920', '440109bb-ef1c-4d47-9dc3-95716290f812', '9783463008516', 255),  -- Und brennend stürzen Vögel vom Himmel
  ('480fcea1-75e5-479b-b360-7b6d9a77357c', 'b8da22d8-5cb1-4801-b06b-7a635cff2617', '9783426662434', 791),  -- Die Rose von Asturien
  ('e9df1e3a-9428-48fa-9c11-c74f9bea509e', '28acd268-fc18-4d7a-a35f-a2415ec95757', '9783401021508', 475),  -- Das Geheimnis der weißen Mönche.
  ('bb340759-83f4-4a60-ab72-46cf1ad681a5', '9b631f8b-29f9-4bec-a269-0da3ac436d4b', '9783444104268', 192),  -- Kinder heilen - ohne Chemie
  ('11a3b14d-00e7-4e56-8987-51c686f0feca', '0fb7daa7-c83a-4111-bdb2-c88dcc3a9c81', '9783898972697', 350),  -- Die Siedler - Australien Saga 2
  ('5c695a29-3811-48b4-a66e-d01757025b06', 'ef8ea512-a8d0-4898-a944-e80479f8bffd', '9783492054201', 282),  -- Schossgebete
  ('061e9589-4415-422a-8161-a88ee2f1e48c', '4cf73e3b-56a8-4a30-b4e3-824dd7c83324', '9783785527566', 148),  -- Ich will doch leben!
  ('cf3204e6-e25c-4aa0-9497-2bab8a117f2f', '957fa08f-1a4d-43cc-b345-dd2478a4f12b', '9783505073427', 222),  -- Segeln in der Arktis
  ('2c6054c0-2fee-4245-bccb-b224ee7dee0d', 'd6284278-a64a-4a2a-9dd0-a9e035f67ebf', '9783875315042', 96),  -- Kenia
  ('c98cea92-8d5d-4678-a214-d5c14165f9e6', '6ab1f0ef-7caa-4f83-a26a-b560759363b8', '9783784418087', 304),  -- Volksaufstand
  ('a32a6e9d-8d8d-4e88-8d39-35a557e4723c', '71b3c8b4-35f9-41cb-b237-44574c487cc0', '9780006510420', 378),  -- Sharpe's Waterloo
  ('4a0df06e-9f64-47e4-bff8-3ad6c51e1819', 'b8020d40-7ade-418e-9520-01971d5848fb', '9783895020889', 187),  -- Tango
  ('a398be0a-71c8-495e-a0b2-bc6b9b3ed884', '1a18cc02-163c-4023-8e82-05a3b58910cc', '9783746623320', 438),  -- Ein Gebet für die Verdammten
  ('b2682403-3095-46f5-a2f2-a31c522a40c0', 'a5d60917-a20e-443d-af4a-0d281a85d972', '9783943309256', 172),  -- Homöopathische Eselsbrücken
  ('1bddfdea-9590-4147-9c88-d52becd4be58', '2f96e3b7-619b-4ddb-95d7-5047a0404311', '9787045851071', 127),  -- Flucht in die Sucht
  ('5eb99249-cf6a-4c9d-b8e6-5b3763fd74f5', 'b68f7ba8-93a5-4195-bcb9-32f9ddfc23ba', '9783426028704', 594),  -- .. und baute ihr einen Tempel
  ('a1cd673c-ac19-4ab1-876d-5d33170041b5', '3a308088-5a35-4c21-a79a-21c42d6e1f91', '9783352009686', 394),  -- Der Sturm
  ('727ed247-3d3a-4b7e-be93-262cec9aa3d0', 'a8bc477a-59a8-4376-a300-95f47404ca05', '9783423017695', 233),  -- Christus kam nur bis Eboli
  ('50bf498b-b8a4-45a8-a049-944a7f773c0d', '97f9ea05-61ed-4d7f-95f2-0c8a1f04e933', '9783492304863', 172),  -- Ein allzu braves Mädchen
  ('7ad093b9-890b-4329-bcba-d4faeb24b1de', 'e10e4308-87d7-4c37-ade9-f4929c46176c', '9783899011036', 237),  -- Coaching für die Seele
  ('438bb47e-7085-4ac8-a516-e383dd7d3da3', '52de2bf2-00ad-479f-8cc8-2f097e1d71df', '9783939238003', 368),  -- Endlich glücklich
  ('d42d1450-779d-4934-a3c1-d0928bdafd42', 'e70ee058-2858-4b3a-bc2e-fdeed4edd0ff', '9780061472770', 268),  -- The witch of Portobello
  ('f514d43f-53bf-411b-a0aa-8200dbb1ba54', '8c7c8ccd-f1a4-46f0-ae7d-65712aa04401', '9783832164201', 270),  -- Reise durch einen einsamen Kontinent
  ('b975361e-6cf7-4875-94e3-c9a0351aaffa', '1cade828-4dc8-4c13-891a-4f0137e18c57', '9783492113403', 298),  -- Ich hatte Angst
  ('a69ece9c-dbf2-4648-ae6a-fe0c9454b51d', '26dc4bb9-f051-4a24-8a54-937220bf7dde', '9783453014923', 254),  -- Brigade der Verdammten
  ('a7c3ec0a-5c74-49c7-9fcc-45e3af0a55e6', '065d2990-60e1-4d4f-846e-25f7e5c82086', '9783453354258', 567),  -- Die Hexengabe
  ('1be21e11-05bc-49ed-a30d-15096145b639', 'b464af07-5f85-4ba1-a3f1-53d0e8098e54', '9783548269269', 635),  -- Die Au-pairs
  ('a6fbfb04-6c7d-4a8f-bfd3-6a27b36039b4', '97f7c8bc-df67-4e9b-8c65-833ac8906b35', '9783293206793', 254),  -- Bali fürs Handgepäck
  ('a2c672e6-6879-4f85-bee7-f9f49c60e980', 'caf94715-77db-4e77-b379-44fd3fad7f78', '9783442068821', 349),  -- Palomino.
  ('0fcb4fb7-f761-475b-9f70-818bb9e44d70', 'b9785f4f-3e96-4f5d-a953-471325f76aab', '9783442099214', 403),  -- Der Preis des Glücks
  ('8985b757-7ecf-4c47-80d9-b2a404022b9e', '19846cdb-d4b5-4036-bab5-79168476a474', '9783811831711', 256),  -- Ein Mann und sein Boot.
  ('9904130e-2dcc-4f9a-8c3b-7cf165108a81', 'f775b950-dbfc-492f-ae75-42a9b8cce039', '9783596175116', 656),  -- Die Kathedrale des Meeres
  ('1b677a81-b087-4b12-b7f6-8ee86bb43283', '3ec89112-14af-462e-83ab-d21cc7c37cfd', '9783453195240', 239)   -- Verliebt, verlobt – verrückt?
;

-- nur Paare, die noch genau so in der Datenbank stehen
CREATE TEMP TABLE ok ON COMMIT DROP AS
SELECT p.*
FROM paar p
JOIN books s ON s.id = p.stub_id
JOIN books b ON b.id = p.book_id
WHERE s.reading_status = 'in_stock'
  AND s.pages = p.pages
  AND (   p.isbn = regexp_replace(upper(coalesce(s.isbn13, '')), '[^0-9X]', '', 'g')
       OR p.isbn = regexp_replace(upper(coalesce(s.isbn13_raw, '')), '[^0-9X]', '', 'g')
       OR left(p.isbn, 12) = '978' || left(regexp_replace(upper(coalesce(s.isbn10, '')), '[^0-9X]', '', 'g'), 9)
       OR left(p.isbn, 12) = '978' || left(regexp_replace(upper(coalesce(s.isbn13_raw, '')), '[^0-9X]', '', 'g'), 9))
  AND NOT EXISTS (SELECT 1 FROM barcode_assignments ba WHERE ba.book_id = p.stub_id AND ba.freed_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM book_barcodes bb WHERE bb.book_id = p.stub_id);

-- ---- Sicherung ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS books_lager_dubletten_backup_20261108 AS
  SELECT b.*, NULL::uuid AS ersetzt_durch, now() AS entfernt_am FROM books b WITH NO DATA;
INSERT INTO books_lager_dubletten_backup_20261108
  SELECT DISTINCT ON (b.id) b.*, o.book_id, now()
  FROM books b JOIN ok o ON o.stub_id = b.id
  ORDER BY b.id;

-- ---- leere Felder des registrierten Buchs ergänzen -----------------------
UPDATE books b SET
  isbn13          = coalesce(b.isbn13, s.isbn13),
  isbn10          = coalesce(b.isbn10, s.isbn10),
  purchase_url    = coalesce(b.purchase_url, s.purchase_url),
  original_language = coalesce(b.original_language, s.original_language)
FROM ok o JOIN books s ON s.id = o.stub_id
WHERE b.id = o.book_id
  AND (b.isbn13 IS NULL OR b.isbn10 IS NULL OR b.purchase_url IS NULL OR b.original_language IS NULL);

-- ---- Lagereinträge löschen ----------------------------------------------
DELETE FROM books b USING (SELECT DISTINCT stub_id FROM ok) o WHERE b.id = o.stub_id;

-- ---- Ergebnis -------------------------------------------------------------
SELECT 'Paare in der Liste' AS was, count(*) AS anzahl FROM paar
UNION ALL SELECT 'Lagereinträge entfernt', count(DISTINCT stub_id) FROM ok
UNION ALL SELECT 'übersprungen (nicht mehr passend)', count(*) FROM paar WHERE stub_id NOT IN (SELECT stub_id FROM ok)
UNION ALL SELECT 'Bücher jetzt in_stock', count(*) FROM books WHERE reading_status = 'in_stock';

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
