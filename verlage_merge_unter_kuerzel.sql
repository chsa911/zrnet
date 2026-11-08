-- =====================================================================
-- Verlage unter ihr Kürzel zusammenführen (wie Heyne -> h.)
-- 50 Kürzel, 128 Einträge werden aufgelöst.
-- Behalten wird jeweils der Kürzel-Eintrag (z.B. "g.") bzw. der Verlag mit dem
-- Kürzel im Kürzel-Feld (z.B. Knaur = k.). Danach verlage_alle_als_kuerzel.sql
-- laufen lassen, damit überall der Kürzel-Name steht.
-- Ausgeschriebene Namen inkl. Taschenbuch-Varianten (Goldmann TB, Knaur TB, Aufbau Tb …)
-- Kürzel-Bedeutungen aus publisher_aliases, publisher_aliases_stage und tmp_pub_abbr
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- NICHT enthalten (bitte selbst entscheiden):
--   ki.  (11 B.) laut publisher_aliases "kiwi" = Kiepenheuer & Witsch, also wie kw.
--   bg.  (14 B.) Beltz & Gelberg – aber "Gulliver" hat ebenfalls das Kürzel bg.
--   br.  (6 B.)  "Berlin" – der Eintrag "Berlin" (4 B.) hat ebenfalls das Kürzel br.
--   dbg. (22 B.) Deutsche Buchgemeinschaft – kein ausgeschriebener Eintrag vorhanden
--   eb.  (11 B.) Europ. Bildungsgemeinschaft – kein ausgeschriebener Eintrag vorhanden
--   Scherz (bleibt eigener Verlag – sz. ist die Süddeutsche Zeitung, nicht Scherz)
--   Gustav Kiepenheuer, Scherz u. Goverts, Econ Ullstein List, Penguin Viking/India/…
--
-- Zeilen, die nicht passen, einfach löschen.
--
-- Probelauf:
--   psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f verlage_merge_unter_kuerzel.sql
-- Echt:
--   sed 's/^ROLLBACK;$/COMMIT;/' verlage_merge_unter_kuerzel.sql | psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -v ON_ERROR_STOP=1
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE keep_abbr (keep_id uuid PRIMARY KEY, abbr text NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  -- hc.  (behalten: hc., 48 Bücher)  ->  danach 73   [aus publisher_aliases_stage / tmp_pub_abbr]
  ('838de92a-a808-4ab2-8ab7-f568e62005f9', '9e74a716-cb9d-4e62-8741-13558e0f07f2'),  -- hoffmann u campe (2)
  ('8c5da176-162b-47ca-8a86-cdec596efc7f', '9e74a716-cb9d-4e62-8741-13558e0f07f2'),  -- Hoffmann u Campe Vlg GmbH (2)
  ('e9cb70bd-4679-46d9-ba26-e00b7287a049', '9e74a716-cb9d-4e62-8741-13558e0f07f2'),  -- Hoffmann und Campe (10)
  ('cc846113-f569-4588-97fc-b245a739f00a', '9e74a716-cb9d-4e62-8741-13558e0f07f2'),  -- Hoffmann u. Campe (4)
  ('359e621b-e1c1-4f47-9e04-d99b73340339', '9e74a716-cb9d-4e62-8741-13558e0f07f2'),  -- Hoffmann & Campe (7)
  -- gl.  (behalten: gl., 19 Bücher)  ->  danach 20   [aus publisher_aliases_stage / tmp_pub_abbr]
  ('fb3012be-2f7e-4d80-9e59-670d7b1a75cc', 'faf2afa2-0b54-4926-a6a3-e74567d6a178'),  -- G. Lübbe (1)
  -- n.  (behalten: n., 15 Bücher)  ->  danach 18   [aus publisher_aliases_stage / tmp_pub_abbr]
  ('0372c734-9425-4438-98ce-82b2fbd6847d', '789f3e08-e53c-44d1-adac-36cdde247c3f'),  -- Naumann & Göbel (3)
  -- ms.  (behalten: ms., 6 Bücher)  ->  danach 8   [aus publisher_aliases_stage / tmp_pub_abbr]
  ('dcd9456f-1534-4f45-b0e8-f70df5092f8c', 'fc253436-8484-4ceb-8c22-bb9e5250e8f2'),  -- marion v. Schroeder (2)
  -- g.  (behalten: g., 460 Bücher)  ->  danach 621
  ('0ebfbf9e-9b54-4489-b5ca-0556bf7dbdb1', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Goldmann (145)
  ('e567455b-d4fe-4fac-aff7-2cc5c30826b0', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Wilhelm Goldmann Verlag GmbH (6)
  ('f53361f9-0d15-4388-bc57-45ffaff297eb', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Goldmann Verlag (3)
  ('34b6c85a-94ca-4c02-baee-f028ae3bc11a', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Goldmann-Verlag (2)
  ('78930954-601b-4a26-a55f-20bd8414930e', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Goldmann Wilhelm GmbH (1)
  ('7a21439c-d6c0-444a-9ada-d7390707aced', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- W. Goldmann (1)
  ('c842c110-f11f-408d-8d1c-ff600b011076', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Wilhelm Goldmann Verlag (1)
  ('3005587c-fd9b-4399-bb21-72e967fb3f4d', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Goldmann TB (1)
  ('eda68537-06d3-4196-bc0c-c17d1134077d', '5a9ffeef-b6e8-4d56-941e-83602629b015'),  -- Goldmann, Spiegel Buchverlag (1)
  -- k.  (behalten: Knaur, 498 Bücher)  ->  danach 515
  ('51e34bba-d1e8-4058-bce5-5ae24885f9d7', '659c6159-2f33-447e-b7d9-010db944f575'),  -- Knaur-Taschenbuch-Verl. (10)
  ('d2b3e14e-d9ff-46d8-bbe3-a64ca3360047', '659c6159-2f33-447e-b7d9-010db944f575'),  -- Knaur Taschenbuch Verlag (3)
  ('1ed74b65-e257-4e30-8af7-f484ee4e1c84', '659c6159-2f33-447e-b7d9-010db944f575'),  -- Knaur Taschenbuch (2)
  ('b7813a73-f1fb-45f2-94a1-afd8304146ec', '659c6159-2f33-447e-b7d9-010db944f575'),  -- Brand: Knaur Taschenbuch Verlag (1)
  ('978c7281-ab26-4171-848d-c1f1ed8524ba', '659c6159-2f33-447e-b7d9-010db944f575'),  -- Knaur HC (1)
  -- b.  (behalten: Bertelsmann Verlag, 459 Bücher)  ->  danach 468
  ('dbed7cf1-a901-4d09-837e-391d4bce4667', '6baf70b6-345f-4fae-ba7a-950132c48b7f'),  -- Bertelsmann (5)
  ('c9cc2bae-2349-4413-b720-ebc22501f0bc', '6baf70b6-345f-4fae-ba7a-950132c48b7f'),  -- Bertelsmann, München (3)
  ('c78de5e3-e012-43d3-93f6-7ea30f42d573', '6baf70b6-345f-4fae-ba7a-950132c48b7f'),  -- C. Bertelsmann Verlag (1)
  -- bl.  (behalten: Bastei Lübbe Verlag, 434 Bücher)  ->  danach 444
  ('5f204307-20be-4bcc-8c9f-1a6e48f5175b', '971066b1-3e8b-4367-8eac-d1a164a17f5f'),  -- Bastei Lübbe (5)
  ('eb0ea147-3ed9-4c88-bc98-cc01eb496b0d', '971066b1-3e8b-4367-8eac-d1a164a17f5f'),  -- Bastei Lubbe (2)
  ('ef531046-302c-417a-b2f5-b59734555b32', '971066b1-3e8b-4367-8eac-d1a164a17f5f'),  -- Bastei Lübbe Taschenbuch (1)
  ('3f437a80-4379-456a-8a7c-e81bf5d73cf3', '971066b1-3e8b-4367-8eac-d1a164a17f5f'),  -- Bastei-Verlag Lübbe (1)
  ('b5492d46-9cc3-4a49-8881-488da035113a', '971066b1-3e8b-4367-8eac-d1a164a17f5f'),  -- Bastei-Lübbe (1)
  -- p.  (behalten: Piper, 294 Bücher)  ->  danach 298
  ('0c27b4f0-498b-4b4f-9b5d-dc21abeb9ca2', '555b7819-5239-4e36-a5ce-f3b192d18769'),  -- Piper Verlag GmbH (2)
  ('cc59a3ec-80da-4e35-a2a8-698dd49b0380', '555b7819-5239-4e36-a5ce-f3b192d18769'),  -- piper nordiska (1)
  ('8a6b967d-0e1e-4999-9768-2d495872fed1', '555b7819-5239-4e36-a5ce-f3b192d18769'),  -- __LEGACY__ (Text "Piper") (1)
  -- bv.  (behalten: Blanvalet, 181 Bücher)  ->  danach 186
  ('cef06061-b2de-4651-a0e0-fc84b5770b62', 'b9dfd975-830e-4266-b7f6-f9d68de9af1a'),  -- Blanvalet Taschenbuchverl (2)
  ('b8714ab6-246a-4637-b37d-ca84370ae76c', 'b9dfd975-830e-4266-b7f6-f9d68de9af1a'),  -- Blanvalet Taschenbuch Verlag (1)
  ('b13d7861-4c48-420a-b7d5-16266472bc3b', 'b9dfd975-830e-4266-b7f6-f9d68de9af1a'),  -- Blanvalet Paperback (1)
  ('3da3dd0b-ff15-4ba2-8d02-06984295221b', 'b9dfd975-830e-4266-b7f6-f9d68de9af1a'),  -- Blanvalet Verlag (1)
  -- rm.  (behalten: Buch Und Medien Vertrieb, 58 Bücher)  ->  danach 176
  ('f9b9599c-6f4b-4b07-88bd-8aa2bb317abe', 'b26666f1-cae0-450f-9a86-905be394a3ca'),  -- __LEGACY__ (Text "rm.") (118)
  -- w.  (behalten: Weltbild, 154 Bücher)  ->  danach 156
  ('fed400dd-b138-4a2f-9753-b1a709941031', '9924ebdf-3935-4b33-8b81-5a6b8050e581'),  -- Weltbild Verlag (2)
  -- a.  (behalten: a., 97 Bücher)  ->  danach 124
  ('03764f40-97ae-4239-aef9-81873cf2384c', '5f5ba162-e142-4ca7-a38a-2817f07251a0'),  -- Aufbau (16)
  ('007a7213-aff4-4005-a6ad-acab5aecdac1', '5f5ba162-e142-4ca7-a38a-2817f07251a0'),  -- Aufbau Tb (5)
  ('c7c06435-4522-4b41-8bbe-79cb03f03a52', '5f5ba162-e142-4ca7-a38a-2817f07251a0'),  -- Aufbau-Taschenbuch-Verl. (4)
  ('6e043984-27f1-4b95-b899-ad1bf141fa95', '5f5ba162-e142-4ca7-a38a-2817f07251a0'),  -- Aufbau Taschenbuch Verlag (1)
  ('123988cb-9e57-41ef-ba57-5a98ec06e917', '5f5ba162-e142-4ca7-a38a-2817f07251a0'),  -- Aufbau Taschenbuch (1)
  -- s.  (behalten: Suhrkamp, 108 Bücher)  ->  danach 109
  ('237dbd6a-5c21-4dc7-b290-40535794f2cc', 'f3dcc0aa-db08-4996-bbe0-89d77890314b'),  -- Suhrkamp Verlag GmbH (1)
  -- kw.  (behalten: kw., 74 Bücher)  ->  danach 102
  ('5e2ab6f1-50fe-4bf9-9c72-9f09925cca0e', '04c1021b-603b-4592-8877-629dbda6a81f'),  -- Kiepenheuer & Witsch GmbH (13)
  ('f003a982-add4-480e-99eb-6b5e8cb13d8d', '04c1021b-603b-4592-8877-629dbda6a81f'),  -- Kiepenheuer & Witsch (10)
  ('dfa1e749-6190-4c16-951d-b9ac2ec8f4f8', '04c1021b-603b-4592-8877-629dbda6a81f'),  -- Kiepenheuer und Witsch (3)
  ('6fb866dc-c6b3-4c28-988c-4eec543c61d7', '04c1021b-603b-4592-8877-629dbda6a81f'),  -- kiepenheuer u witsch (1)
  ('c6298a4b-36df-479b-9ecb-4f1c0bf53a04', '04c1021b-603b-4592-8877-629dbda6a81f'),  -- Kiepenheuer & Witsch GmbH & Company KG, Verlag (1)
  -- dk.  (behalten: dk., 55 Bücher)  ->  danach 89
  ('720986ef-b785-41f3-a21b-a5fe14ca3139', '85a6c574-2eac-4d2b-aa95-de606e73c338'),  -- Droemer Knaur (22)
  ('1e15816b-d09a-482d-8d89-da0f13df650d', '85a6c574-2eac-4d2b-aa95-de606e73c338'),  -- Droemersche Verlagsanstalt Th. Knaur Nachf., GmbH & Co. (7)
  ('0523e85d-ff05-453a-9e1b-f82f65565f72', '85a6c574-2eac-4d2b-aa95-de606e73c338'),  -- Droemersche Verlagsanstalt Th. Knaur Nachf. GmbH & Co (2)
  ('21a4adc2-8c73-40b9-adef-130293959557', '85a6c574-2eac-4d2b-aa95-de606e73c338'),  -- Droemersche Verlagsanstalt Knaur (2)
  ('1d971cfe-3778-4baf-8f88-3259e03ac87a', '85a6c574-2eac-4d2b-aa95-de606e73c338'),  -- Droemersche Verlagsanstalt Th. Knaur Nacht, München (1)
  -- d.  (behalten: d., 65 Bücher)  ->  danach 78
  ('57708e97-4a65-426e-8758-f113b205ae89', '8738de12-43eb-4aba-b4d7-58b5f9b56ab8'),  -- Deutscher Buecherbund (13)
  -- du.  (behalten: du., 52 Bücher)  ->  danach 73
  ('99675dee-4f90-4fcc-b592-5e59f57b7ce0', '96201601-fcaa-4a9a-91c9-4319648aa958'),  -- DuMont (13)
  ('f3d89336-addf-4517-aa9f-6b31b1e0722b', '96201601-fcaa-4a9a-91c9-4319648aa958'),  -- __LEGACY__ (Text "dumont") (4)
  ('9b24d765-2aea-493d-9093-253f190687b7', '96201601-fcaa-4a9a-91c9-4319648aa958'),  -- DuMont Reiseverlag (3)
  ('f2826159-6fb9-43a6-976a-0ec30da5df1d', '96201601-fcaa-4a9a-91c9-4319648aa958'),  -- DuMont-Schauberg (1)
  -- l.  (behalten: l., 58 Bücher)  ->  danach 70
  ('8be37165-8aa3-45e9-ad41-6f9c819032f8', 'fb4c76bc-4a79-4f0c-a751-411fdfc8369a'),  -- Lingen (12)
  -- u.  (behalten: Ullstein, 69 Bücher)  ->  danach 70
  ('a9ba0b2f-17e6-4e09-a124-df15f124289e', '11b23975-e915-4aef-899a-5642dea427e1'),  -- __LEGACY__ (Text "ullstein") (1)
  -- lu.  (behalten: lu., 29 Bücher)  ->  danach 61
  ('ffa32517-924e-4b04-960c-ebcbee6ddc76', '2454d0b8-3ee2-450d-b4e0-73e408b8dc1f'),  -- Lübbe (30)
  ('12d11bf0-c89b-4f99-9a43-ac0f402f1b7c', '2454d0b8-3ee2-450d-b4e0-73e408b8dc1f'),  -- Luebbe Verlagsgruppe (1)
  -- be.  (behalten: be., 24 Bücher)  ->  danach 54
  ('1a31f707-7141-499b-93bb-34e368866588', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- Beck (16)
  ('67ce4965-a7ed-46c1-9761-1eedb155ae32', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- C.H.Beck (8)
  ('77d79b47-34b2-45c4-aaaf-c5099095f818', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- C.H. Beck (2)
  ('7ecb6b23-8904-4a27-9485-932842a2dfaa', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- Beck C. H. (1)
  ('708bbd04-173e-43f6-a2f2-3e48b85004e6', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- C. H. Beck (1)
  ('13522465-3270-4773-b52f-608aed2b1c74', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- Verlag C. H. Beck (1)
  ('4d79a222-6cdb-4f02-9c89-db950307103b', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- C. H. Beck Verlag (1)
  ('7ecf19ef-284a-4444-877b-dd4b4d6bba0b', '452b2b81-8279-4c8d-b8f9-61c663a94fcd'),  -- be (0)
  -- ub.  (behalten: ub., 28 Bücher)  ->  danach 53
  ('7d0d7fcc-1aee-447d-8a62-0571bf271a72', '46b6e951-98ec-4faf-9228-3b6b804db8f2'),  -- Ueberreuter (25)
  -- dg.  (behalten: dg., 37 Bücher)  ->  danach 52
  ('3e29119b-a74f-47e5-9b84-8788ad805be7', 'd3350bab-7551-4725-958a-87d772ea7e57'),  -- Diogenes (12)
  ('6e6c540c-e004-49ce-b081-bfdbc3ecaf30', 'd3350bab-7551-4725-958a-87d772ea7e57'),  -- __LEGACY__ (Text "diogenes") (2)
  ('63d8eb43-01f0-4ad6-8da5-7e096839a15b', 'd3350bab-7551-4725-958a-87d772ea7e57'),  -- Diogenes Verlag AG,Switzerland (1)
  -- ls.  (behalten: ls., 33 Bücher)  ->  danach 52
  ('f96952fc-f4ae-4a71-9c30-53a0d9c8b5da', 'a0cd9e94-076e-4d2e-a613-1e37a24b0065'),  -- List (18)
  ('4d93d6bc-2720-4930-8d2b-babd1c6a5134', 'a0cd9e94-076e-4d2e-a613-1e37a24b0065'),  -- List Tb. (1)
  -- ha.  (behalten: ha., 33 Bücher)  ->  danach 51
  ('12d92996-446f-4d97-809a-d85f52207177', 'e9babcb8-e335-466b-8a74-fc9256401e44'),  -- Carl Hanser Verlag (7)
  ('248b000b-77ff-4c5d-915a-0d80fecd9748', 'e9babcb8-e335-466b-8a74-fc9256401e44'),  -- Hanser (6)
  ('1937dbaa-365f-4289-b089-8f35ddc7ec09', 'e9babcb8-e335-466b-8a74-fc9256401e44'),  -- Carl Hanser (4)
  ('c579be1a-3c9a-42ea-ac91-1304c516cfc9', 'e9babcb8-e335-466b-8a74-fc9256401e44'),  -- Hanser Fachbuch (1)
  -- pe.  (behalten: pe., 32 Bücher)  ->  danach 51
  ('d488d3db-ead7-4c8f-8be0-df34b693edd5', 'a6a764e1-fb4e-49af-9170-bfc3bcfe18f3'),  -- Penguin (16)
  ('2964b654-0372-4de1-8557-76496a167514', 'a6a764e1-fb4e-49af-9170-bfc3bcfe18f3'),  -- Penguin Books (3)
  -- dr.  (behalten: dr., 39 Bücher)  ->  danach 44
  ('0d2a80fa-a89d-42e7-9525-bb83fde797df', 'a0e046e5-c14e-4518-b5db-a1f8e7fba44f'),  -- Droemer Taschenbuch (3)
  ('eeace49d-6d18-4cd3-adda-955b990458dd', 'a0e046e5-c14e-4518-b5db-a1f8e7fba44f'),  -- Droemer HC (1)
  ('504aa463-e981-4529-8a8e-01a99cec8855', 'a0e046e5-c14e-4518-b5db-a1f8e7fba44f'),  -- Droemer (1)
  -- he.  (behalten: he., 21 Bücher)  ->  danach 41
  ('4929c8b0-9c34-47d9-bc02-4e597c04e28e', 'bb13cf48-dc14-4550-8807-5e1858b13194'),  -- Herder (16)
  ('217f7868-3229-4bdc-8d51-4239379b39e5', 'bb13cf48-dc14-4550-8807-5e1858b13194'),  -- Herder, Freiburg (3)
  ('b2f42e3b-0709-4038-8ee2-6222b7a63159', 'bb13cf48-dc14-4550-8807-5e1858b13194'),  -- Verlag Herder GmbH (1)
  -- sz.  (Süddeutsche Zeitung, 23 Bücher)  ->  danach 27   [publisher_aliases sagt fälschlich "Scherz"]
  ('1a5e1662-66de-40b0-a6e4-a777b7cb1edb', '398e8230-991f-469b-83a9-b31392347b39'),  -- Sueddeutsche Zeitung (4)
  -- da.  (behalten: da., 23 Bücher)  ->  danach 33
  ('a6af6e0e-ddd7-4e64-8735-cbf11e088c56', 'eac7b309-dd2b-4e82-8c26-4c48741a1aa6'),  -- Diana (8)
  ('145f9c15-5016-4a74-a85d-9c7ee1449be5', 'eac7b309-dd2b-4e82-8c26-4c48741a1aa6'),  -- Diana Verlag (2)
  -- m.  (behalten: m., 16 Bücher)  ->  danach 29
  ('6c9e0da9-5e23-4c34-bcca-b11ffcad5f6e', 'c473a23b-7bd5-45d8-9275-b76e416a53ce'),  -- Moewig (12)
  ('e323d284-05df-49c4-a69b-6defb615a45c', 'c473a23b-7bd5-45d8-9275-b76e416a53ce'),  -- pabel-moewig (1)
  -- rv.  (behalten: Ravensburger, 25 Bücher)  ->  danach 29
  ('21c75465-5791-4272-8f39-c3c42a6caf85', '4275d656-31b8-41bc-8667-0c38c39f60c3'),  -- Ravensburger Buchverlag (4)
  -- hs.  (behalten: hs., 25 Bücher)  ->  danach 26
  ('07597a1f-0c47-494c-a8bd-fe19ffcac03e', 'be5de3cb-a798-4249-90e6-a8d713abaa48'),  -- hestia (1)
  -- c.  (behalten: c., 17 Bücher)  ->  danach 25
  ('042e9b4d-880b-4323-8339-874b10e35870', '14ed3278-34e8-4265-99d3-c768bc9427bf'),  -- Carlsen (7)
  ('273d5d92-55a6-4402-9ed5-e396a9db6703', '14ed3278-34e8-4265-99d3-c768bc9427bf'),  -- Carlsen Verlag GmbH (1)
  -- bu.  (behalten: bu., 19 Bücher)  ->  danach 24
  ('90f3d326-c416-4503-a040-eb1c0c2c1f68', '94476739-88ab-474b-8a41-7e5f787b4201'),  -- Büchergilde Gutenberg (3)
  ('3489b6c4-1002-4714-b21b-136b7631fa26', '94476739-88ab-474b-8a41-7e5f787b4201'),  -- Buechergilde Gutenberg (2)
  -- dv.  (behalten: dv., 11 Bücher)  ->  danach 23
  ('9b37e74e-6046-4ac1-a05d-e360ca27b08b', 'ff52d03a-1ff9-4085-b3ec-90d174265ced'),  -- Deutsche Verlags-Anstalt (12)
  -- rh.  (behalten: Random House, 22 Bücher)  ->  danach 23
  ('0b22e5a7-0c31-4cae-b6b6-d689a34b2177', 'bfcb66a3-c0ff-419d-b030-ea96a0ccb061'),  -- century random house (1)
  -- z.  (behalten: z., 11 Bücher)  ->  danach 22
  ('09fac632-9c78-407c-8290-7785b0e11ae2', '52af8f4d-9d0c-41b4-ac3f-9243b9797c34'),  -- Paul Zsolnay (7)
  ('a6524bcd-213f-4415-95e7-cd792c64f2c9', '52af8f4d-9d0c-41b4-ac3f-9243b9797c34'),  -- Zsolnay (3)
  ('48601f5b-d04e-414c-82ca-5c83ac0af905', '52af8f4d-9d0c-41b4-ac3f-9243b9797c34'),  -- Paul Zsolnay Verlag (1)
  -- Gu.  (behalten: Gu., 1 Bücher)  ->  danach 22
  ('fb808210-c805-49ba-a210-f6f181e92ee6', '57ba1849-216c-4eeb-a095-d8e9456b2a8f'),  -- GRÄFE UND UNZER (9)
  ('902e5c7e-82a3-4b36-a262-effff19b4a35', '57ba1849-216c-4eeb-a095-d8e9456b2a8f'),  -- __LEGACY__ (Text "gu.") (8)
  ('0f5164ce-0054-41ca-9e3c-723be670e197', '57ba1849-216c-4eeb-a095-d8e9456b2a8f'),  -- graefe u unzer (1)
  ('e83d1005-3fb0-4f67-b9bb-5164781af08a', '57ba1849-216c-4eeb-a095-d8e9456b2a8f'),  -- GRÄFE UND UNZER Verlag GmbH (1)
  ('9d8eac68-7c86-456e-8eaa-7c53216bdee5', '57ba1849-216c-4eeb-a095-d8e9456b2a8f'),  -- Graefe und Unzer Verlag (1)
  ('e2aa1afb-6096-4f1e-985f-fafe4b449cfe', '57ba1849-216c-4eeb-a095-d8e9456b2a8f'),  -- Gräfe & Unzer (1)
  -- bd.  (behalten: bd., 18 Bücher)  ->  danach 21
  ('7ac79a23-89b8-44e2-81d1-02714ab9b1d2', 'c94a607d-0f77-410c-945b-46a5ab458c8b'),  -- Buchgemeinschaft Donauland (3)
  -- wu.  (behalten: wu., 16 Bücher)  ->  danach 21
  ('a235ed1c-438d-4746-8098-e44a9b7513dd', 'e2de8ce3-6a63-45c9-ad26-de8fb534732a'),  -- Wunderlich (3)
  ('2108ff89-7e59-4e12-a4f2-75c96c083a1f', 'e2de8ce3-6a63-45c9-ad26-de8fb534732a'),  -- Wunderlich Verlag (1)
  ('2056c44b-ba5d-4572-bb32-d3c383c647bf', 'e2de8ce3-6a63-45c9-ad26-de8fb534732a'),  -- Wunderlich im Rowohlt (1)
  -- bm.  (behalten: bm., 14 Bücher)  ->  danach 19
  ('ae4377c9-8e1e-4fd5-9b25-f574e4c962e5', 'fe4ea2b9-21e1-4ae0-9adc-b7c3458ee95e'),  -- Bechtermuenz (5)
  -- rs.  (behalten: rs., 12 Bücher)  ->  danach 18
  ('22d1ade4-e9a0-4da5-8307-eb6241429b58', 'e75a64ac-07f2-47b7-b66c-fb7b63fa5f78'),  -- Rosenheimer (3)
  ('bcc21b91-d1c4-4f8d-bafc-bcf00a7232e4', 'e75a64ac-07f2-47b7-b66c-fb7b63fa5f78'),  -- Rosenheimer Verlagshaus (3)
  -- sk.  (behalten: sk., 11 Bücher)  ->  danach 17
  ('172fe13b-6851-4d77-90d5-5ee8be334402', 'aca9f4e8-352b-4e98-99ee-494e511461f0'),  -- Schneekluth (6)
  -- sn.  (behalten: sn., 8 Bücher)  ->  danach 15
  ('3f09e14f-b8b4-49f3-8a36-22312faa2f65', '81bcbb5e-5ab2-47a7-b2ea-771b3f0fb774'),  -- franz schneider (7)
  -- ss.  (behalten: ss., 6 Bücher)  ->  danach 10
  ('1e802781-4a6f-4479-ad6f-55efe4edfa95', '705aaea0-0648-4941-9158-e8a5bc156387'),  -- schwarzkopf u schwarzkopf (1)
  ('06131714-823e-4887-80c7-80ff10700773', '705aaea0-0648-4941-9158-e8a5bc156387'),  -- Schwarzkopf und Schwarzkopf (1)
  ('d04d189f-2301-4d89-8a2c-c7b63a21a668', '705aaea0-0648-4941-9158-e8a5bc156387'),  -- Schwarzkopf & Schwarzkopf (1)
  ('d9757431-1b35-419e-8c9d-665cc98b6cf3', '705aaea0-0648-4941-9158-e8a5bc156387'),  -- Schwarzkopf + Schwarzkopf (1)
  -- t.  (behalten: t., 7 Bücher)  ->  danach 8
  ('a6af18f5-e46b-4dbc-83e8-fad3bbe89daf', 'a12e8b1c-635e-432d-b14b-81b5ad1c15e8'),  -- Thienemann (1)
  -- sv.  (behalten: sv., 1 Bücher)  ->  danach 3
  ('a7145c5c-360a-4888-a6e7-7b8a531a17e5', '6c113488-dd97-4c4c-b8c5-526201d389cb'),  -- schweizer (2)
  -- ev.  (behalten: ev., 1 Bücher)  ->  danach 2
  ('adaae93b-8bcc-4c67-91c1-90900063e151', '476e7c32-47f1-4418-92bc-1697b37ee10e')   -- europ. verlagsanstalt (1)
;

INSERT INTO keep_abbr (keep_id, abbr) VALUES
  ('9e74a716-cb9d-4e62-8741-13558e0f07f2', 'hc.'),
  ('faf2afa2-0b54-4926-a6a3-e74567d6a178', 'gl.'),
  ('789f3e08-e53c-44d1-adac-36cdde247c3f', 'n.'),
  ('fc253436-8484-4ceb-8c22-bb9e5250e8f2', 'ms.'),
  ('5a9ffeef-b6e8-4d56-941e-83602629b015', 'g.'),
  ('659c6159-2f33-447e-b7d9-010db944f575', 'k.'),
  ('6baf70b6-345f-4fae-ba7a-950132c48b7f', 'b.'),
  ('971066b1-3e8b-4367-8eac-d1a164a17f5f', 'bl.'),
  ('555b7819-5239-4e36-a5ce-f3b192d18769', 'p.'),
  ('b9dfd975-830e-4266-b7f6-f9d68de9af1a', 'bv.'),
  ('b26666f1-cae0-450f-9a86-905be394a3ca', 'rm.'),
  ('9924ebdf-3935-4b33-8b81-5a6b8050e581', 'w.'),
  ('5f5ba162-e142-4ca7-a38a-2817f07251a0', 'a.'),
  ('f3dcc0aa-db08-4996-bbe0-89d77890314b', 's.'),
  ('04c1021b-603b-4592-8877-629dbda6a81f', 'kw.'),
  ('85a6c574-2eac-4d2b-aa95-de606e73c338', 'dk.'),
  ('8738de12-43eb-4aba-b4d7-58b5f9b56ab8', 'd.'),
  ('96201601-fcaa-4a9a-91c9-4319648aa958', 'du.'),
  ('fb4c76bc-4a79-4f0c-a751-411fdfc8369a', 'l.'),
  ('11b23975-e915-4aef-899a-5642dea427e1', 'u.'),
  ('2454d0b8-3ee2-450d-b4e0-73e408b8dc1f', 'lu.'),
  ('452b2b81-8279-4c8d-b8f9-61c663a94fcd', 'be.'),
  ('46b6e951-98ec-4faf-9228-3b6b804db8f2', 'ub.'),
  ('d3350bab-7551-4725-958a-87d772ea7e57', 'dg.'),
  ('a0cd9e94-076e-4d2e-a613-1e37a24b0065', 'ls.'),
  ('e9babcb8-e335-466b-8a74-fc9256401e44', 'ha.'),
  ('a6a764e1-fb4e-49af-9170-bfc3bcfe18f3', 'pe.'),
  ('a0e046e5-c14e-4518-b5db-a1f8e7fba44f', 'dr.'),
  ('bb13cf48-dc14-4550-8807-5e1858b13194', 'he.'),
  ('398e8230-991f-469b-83a9-b31392347b39', 'sz.'),
  ('eac7b309-dd2b-4e82-8c26-4c48741a1aa6', 'da.'),
  ('c473a23b-7bd5-45d8-9275-b76e416a53ce', 'm.'),
  ('4275d656-31b8-41bc-8667-0c38c39f60c3', 'rv.'),
  ('be5de3cb-a798-4249-90e6-a8d713abaa48', 'hs.'),
  ('14ed3278-34e8-4265-99d3-c768bc9427bf', 'c.'),
  ('94476739-88ab-474b-8a41-7e5f787b4201', 'bu.'),
  ('ff52d03a-1ff9-4085-b3ec-90d174265ced', 'dv.'),
  ('bfcb66a3-c0ff-419d-b030-ea96a0ccb061', 'rh.'),
  ('52af8f4d-9d0c-41b4-ac3f-9243b9797c34', 'z.'),
  ('57ba1849-216c-4eeb-a095-d8e9456b2a8f', 'Gu.'),
  ('c94a607d-0f77-410c-945b-46a5ab458c8b', 'bd.'),
  ('e2de8ce3-6a63-45c9-ad26-de8fb534732a', 'wu.'),
  ('fe4ea2b9-21e1-4ae0-9adc-b7c3458ee95e', 'bm.'),
  ('e75a64ac-07f2-47b7-b66c-fb7b63fa5f78', 'rs.'),
  ('aca9f4e8-352b-4e98-99ee-494e511461f0', 'sk.'),
  ('81bcbb5e-5ab2-47a7-b2ea-771b3f0fb774', 'sn.'),
  ('705aaea0-0648-4941-9158-e8a5bc156387', 'ss.'),
  ('a12e8b1c-635e-432d-b14b-81b5ad1c15e8', 't.'),
  ('6c113488-dd97-4c4c-b8c5-526201d389cb', 'sv.'),
  ('476e7c32-47f1-4418-92bc-1697b37ee10e', 'ev.')
;

-- ---- Sicherheitsprüfung ----------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM merge_map m
   WHERE NOT EXISTS (SELECT 1 FROM publishers WHERE id = m.drop_id)
      OR NOT EXISTS (SELECT 1 FROM publishers WHERE id = m.keep_id);
  IF n > 0 THEN RAISE EXCEPTION '% IDs existieren nicht (mehr) – schon gelaufen oder Liste veraltet', n; END IF;
  SELECT count(*) INTO n FROM merge_map WHERE keep_id IN (SELECT drop_id FROM merge_map);
  IF n > 0 THEN RAISE EXCEPTION '% Einträge sind gleichzeitig behalten und zu löschen', n; END IF;
END $$;

-- ---- Sicherung -------------------------------------------------------
CREATE TABLE IF NOT EXISTS publishers_backup_merge_20261108 AS
  SELECT p.id, p.name, p.name_display, p.abbr, m.keep_id AS merged_into, now() AS merged_at
  FROM publishers p JOIN merge_map m ON m.drop_id = p.id WITH NO DATA;
INSERT INTO publishers_backup_merge_20261108 (id, name, name_display, abbr, merged_into, merged_at)
  SELECT p.id, p.name, p.name_display, p.abbr, m.keep_id, now() FROM publishers p JOIN merge_map m ON m.drop_id = p.id;

CREATE TABLE IF NOT EXISTS books_publisher_merge_20261108
  (book_id uuid, old_publisher_id uuid, new_publisher_id uuid, merged_at timestamptz DEFAULT now());
INSERT INTO books_publisher_merge_20261108 (book_id, old_publisher_id, new_publisher_id)
  SELECT b.id, m.drop_id, m.keep_id FROM books b JOIN merge_map m ON m.drop_id = b.publisher_id;

-- ---- Bücher umhängen, alte Einträge löschen, Kürzel setzen -----------
UPDATE books b SET publisher_id = m.keep_id
FROM merge_map m WHERE b.publisher_id = m.drop_id;

DELETE FROM publishers p USING merge_map m WHERE p.id = m.drop_id;

UPDATE publishers p SET abbr = k.abbr
FROM keep_abbr k WHERE p.id = k.keep_id AND p.abbr IS DISTINCT FROM k.abbr;

-- ---- Ergebnis ----------------------------------------------------------
SELECT p.name AS kuerzel, p.name_display, count(b.id) AS buecher_jetzt
FROM keep_abbr k JOIN publishers p ON p.id = k.keep_id
LEFT JOIN books b ON b.publisher_id = p.id
GROUP BY p.name, p.name_display
ORDER BY count(b.id) DESC;

SELECT 'Verlage gelöscht' AS was, count(*) AS anzahl FROM merge_map
UNION ALL
SELECT 'Bücher umgehängt', count(*) FROM books b JOIN merge_map m ON m.keep_id = b.publisher_id
  JOIN books_publisher_merge_20261108 x ON x.book_id = b.id AND x.old_publisher_id = m.drop_id
UNION ALL
SELECT 'Verlage gesamt jetzt', count(*) FROM publishers;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
