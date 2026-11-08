-- =====================================================================
-- Doppelte Autoren zusammenführen – nur die SICHEREN Fälle
-- 116 Gruppen, 119 Einträge werden in den jeweils behaltenen Autor überführt.
-- Erzeugt am 08.11.2026 aus dem Backup rxlog_2026_11_08.bak
--
-- ABLAUF:
--   1. Liste unten durchsehen. Zeilen, die KEINE Duplikate sind
--      (z.B. zwei verschiedene Personen gleichen Namens), einfach löschen.
--   2. Skript laufen lassen. Es endet mit ROLLBACK = Probelauf, nichts wird gespeichert.
--      Die Ausgabe am Ende zeigt, was passieren würde.
--   3. Wenn alles passt: letzte Zeile ROLLBACK durch COMMIT ersetzen und erneut ausführen.
--
-- Was passiert pro Paar (alt -> behalten):
--   - leere Felder beim behaltenen Autor werden aus dem alten ergänzt
--     (Geburts-/Sterbedatum, Nationalität, Geschlecht, Geburtsort, Kürzel, ...)
--   - books.author_id, book_authors, bestseller_entries, author_genre_rules werden umgehängt
--   - der alte Autor wird gelöscht
--   - Sicherung: authors_backup_merge_20261108 und books_author_merge_20261108
--     (alte Zuordnung Buch -> Autor), damit alles rückgängig gemacht werden kann
--   - jede Buchänderung landet zusätzlich über den Trigger in books_audit
-- =====================================================================

BEGIN;

CREATE TEMP TABLE merge_map (drop_id uuid PRIMARY KEY, keep_id uuid NOT NULL) ON COMMIT DROP;

INSERT INTO merge_map (drop_id, keep_id) VALUES
  ('16b043a3-1710-41dd-b211-e970fcbbaaf9'::uuid, 'd7013798-9f78-4d4a-8ada-069bd509f4dd'::uuid),  -- A. E. Johann (1 B.)  ->  A.E. Johann (1 B.)
  ('ceea7a0c-14d0-491f-9554-0094730d5628'::uuid, '7b452c4d-c5da-4a53-9372-989a0dc3aae9'::uuid),  -- Albert Speer (1 B.)  ->  Albert Speer (1 B.)
  ('1e6f2c73-5c33-4bf3-8562-0d7ed3e1c0cc'::uuid, '228c4edf-1b7a-49af-a1af-373393fd3b83'::uuid),  -- Alice Munro (1 B.)  ->  Alice Munro (1 B.)
  ('3a74d61b-c80e-4374-a1f2-0d7bc595eace'::uuid, 'e1630736-3254-4ee5-81ca-ea37eca39885'::uuid),  -- Anita Shreve (2 B.)  ->  Anita Shreve (5 B.)
  ('e4737ab0-d89c-46b9-8e4d-f5fd6bf6af92'::uuid, 'c80b00aa-3047-4ff7-a0a6-88c6feff178c'::uuid),  -- Antje Babendererde (1 B.)  ->  Antje Babendererde (3 B.)
  ('6ba50468-ddf2-4e1f-a8b4-ae4eee08e806'::uuid, '0a45b347-fd12-46de-881b-6692145ec4bb'::uuid),  -- Arturo Pérez-Reverte (2 B.)  ->  Arturo Perez-Reverte (4 B.)
  ('ab6b2d2f-1800-410d-acb6-0274760762ba'::uuid, '8a107f92-6823-49dd-ae06-6fc5a02f0dd3'::uuid),  -- Assia Djebar (1 B.)  ->  Assia Djebar (2 B.)
  ('3af8e00c-fa93-4bcb-be94-40667a27bd50'::uuid, 'b047f67e-36a9-47ad-9d9f-f439f48c0271'::uuid),  -- Barbara Noack (1 B.)  ->  Barbara Noack (2 B.)
  ('25987b6b-4b51-4923-b8e5-6e15b6783384'::uuid, '540e696f-4f94-47d7-a2b7-2daac17bd347'::uuid),  -- Bartos Hoeppner (1 B.)  ->  Bartos-Hoeppner (1 B.)
  ('e4184bcb-9ebb-4d99-8e48-4e268e56d4c9'::uuid, '1d89014a-0716-44c6-92a1-4bae2fdb023d'::uuid),  -- Betty Mahmoody (0 B.)  ->  Betty Mahmoody (2 B.)
  ('9f2f3f7e-c1c9-47f2-b937-b176c53d7e19'::uuid, '1d89014a-0716-44c6-92a1-4bae2fdb023d'::uuid),  -- Betty Mahmoody (0 B.)  ->  Betty Mahmoody (2 B.)
  ('bb2d138e-541c-4813-aaa0-0f740e46287a'::uuid, 'edfcfd8d-0b2e-439c-a4e9-ea8795038aec'::uuid),  -- Bill Clinton (1 B.)  ->  Bill Clinton (1 B.)
  ('65110228-c389-4d0e-9f8a-099e9fc68180'::uuid, 'f0440fef-9386-4698-8bf1-e0e58acad4b9'::uuid),  -- Bill Gates (1 B.)  ->  Bill Gates (2 B.)
  ('027e346b-07c5-4f17-91dd-e9a1e530644e'::uuid, 'ed309325-0eba-4014-9688-a1280797eb59'::uuid),  -- Boris Jelzin (1 B.)  ->  Boris Jelzin (1 B.)
  ('a38f660c-72c1-47b6-929d-2841108025ea'::uuid, '852aaa97-150f-415b-b188-e3c2ace08172'::uuid),  -- Bram Stoker (1 B.)  ->  Bram Stoker (1 B.)
  ('a4d3da1e-8b29-4654-b03a-1e34e550d53f'::uuid, '80645ef3-c0b5-43a4-9745-673bb5b04550'::uuid),  -- Brigitte Hamann (2 B.)  ->  Brigitte Hamann (2 B.)
  ('b7d39325-fb84-4be6-b35b-4c767bd9f1a0'::uuid, '7be0bfce-6673-49ac-9961-9b6fcd80d3a8'::uuid),  -- Brigitte Riebe (1 B.)  ->  Brigitte Riebe (8 B.)
  ('556d9ba4-409d-45da-8636-18f94b6927b6'::uuid, 'd34bce8e-ca1f-4c29-9a48-b541d7ba9121'::uuid),  -- Bruno Jonas (2 B.)  ->  Bruno Jonas (2 B.)
  ('d5f7310a-e237-4ef4-9e64-63a5fc1fff04'::uuid, 'f28042a1-ae84-4229-98d4-d2eb578c3826'::uuid),  -- Bruno Tacconi (1 B.)  ->  Bruno Tacconi (2 B.)
  ('1a08865c-8ac4-4360-824a-99c1a8ff9cbc'::uuid, '8708fefe-2178-4d25-9546-cd534f0e7d5f'::uuid),  -- Carl Amery (1 B.)  ->  Carl Amery (2 B.)
  ('02e766fa-709e-46c3-884c-00cf4b8e8dc5'::uuid, '231205c6-5121-49a7-aa9a-925939c73dff'::uuid),  -- Carlo Levi (1 B.)  ->  Carlo Levi (2 B.)
  ('b4b26f1a-d573-4081-a422-e1d1cda3d498'::uuid, '04cb25ea-12f6-4222-ab18-d1e7937d8de9'::uuid),  -- Claus-Peter Leonhardt (1 B.)  ->  Claus-Peter Leonhardt (1 B.)
  ('d1d351dc-4481-4186-89cb-f3a11ad1de45'::uuid, '3ba3b421-df92-4969-82e2-57d90681498f'::uuid),  -- Colin Forbes (1 B.)  ->  Colin Forbes (4 B.)
  ('9f5ab6fb-6653-4316-8b25-7b930e6f52a8'::uuid, '96954264-74af-4114-b7f1-c11a6ba5bedc'::uuid),  -- Curry-Lindahl (1 B.)  ->  Curry Lindahl (1 B.)
  ('17b5609b-5863-47c9-baff-42c5dbeda4f4'::uuid, '0e774119-0925-4929-a156-7e7273573c48'::uuid),  -- Dacia Maraini (2 B.)  ->  Dacia Maraini (2 B.)
  ('0fe32d37-2dbb-4265-9c72-5e55eb79eb65'::uuid, '30a1f8d1-5f1e-454b-ac92-b5942440bf6c'::uuid),  -- Sijie Dai (2 B.)  ->  Dai Sijie (4 B.)
  ('4003f104-06ed-4f20-9c23-e5b3523be47a'::uuid, 'cbfe39ba-d7e6-4ae0-816e-814371cb885f'::uuid),  -- Daniel Kehlmann (1 B.)  ->  Daniel Kehlmann (2 B.)
  ('9f184f7d-4a8b-4004-a618-fd20512c568b'::uuid, 'd1164de2-cb27-4673-a49b-c8eeeb8e12e0'::uuid),  -- David Servan-Schreiber (1 B.)  ->  David Servan-Schreiber (1 B.)
  ('8a809f27-2935-4d60-a48d-20196231e1f8'::uuid, 'b64955c5-1b84-4ca0-ae3f-40fd10669d31'::uuid),  -- De va Gantt (1 B.)  ->  DeVa Gantt (1 B.)
  ('c436eb2a-12ac-4243-bc6c-68af925bedd8'::uuid, 'ad57c586-8af6-4d9e-8abb-56cc8ef898cc'::uuid),  -- Dieter Moor (1 B.)  ->  Dieter Moor (1 B.)
  ('a4751fa0-8523-41cf-9650-217cd252f8d4'::uuid, '967b83ae-eeaf-43c3-a6bf-ff3a0d62970b'::uuid),  -- Dirk Müller (1 B.)  ->  Dirk Müller (4 B.)
  ('fb7c5b25-1712-4032-99b3-af5e4bacdac8'::uuid, 'a3dd38af-2ef7-409c-8bd0-9b79c2c99721'::uuid),  -- Dirk Rossmann (1 B.)  ->  Dirk Rossmann (2 B.)
  ('ce20f7a9-f8ad-4ccc-ad6a-eece3dd69714'::uuid, 'a3dd38af-2ef7-409c-8bd0-9b79c2c99721'::uuid),  -- Dirk Roßmann (1 B.)  ->  Dirk Rossmann (2 B.)
  ('3e3ca14e-899f-4a1a-93fc-41185caf3dce'::uuid, 'b7afcfed-f335-49ce-8905-3eb4785236f1'::uuid),  -- Edward Bulwer-Lytton (1 B.)  ->  Edward Bulwer-Lytton (4 B.)
  ('436fea34-a3d8-42ce-bac4-59d6a877aa7e'::uuid, 'a5da8727-1efc-4027-9929-c79e7b7e71de'::uuid),  -- Frederik Hetmann (1 B.)  ->  Frederik Hetmann (2 B.)
  ('2ff01246-530b-4806-87f9-4a43222ab591'::uuid, '80a9269f-ff0e-472d-b136-56ebf780f6d9'::uuid),  -- Friedrich Dürrenmatt (1 B.)  ->  Friedrich Dürrenmatt (4 B.)
  ('16949687-08bb-46e7-9fc6-c9db977d4ea4'::uuid, 'dcd5f7d0-9dfb-41f5-9c5e-8754023e9c21'::uuid),  -- Gabriel García Márquez (1 B.)  ->  Gabriel García Marquez (2 B.)
  ('91f55185-e77d-4e96-af3b-a3adb0959e87'::uuid, '04e80c19-8e84-4671-bd0f-df917459280d'::uuid),  -- Georg Popp (1 B.)  ->  Georg Popp (1 B.)
  ('a49f64d0-2ef4-4e73-a925-87f87dc274ce'::uuid, '4a2dad9d-0a05-4def-8e1a-85855ff4321a'::uuid),  -- Gerhard Prause (1 B.)  ->  Gerhard Prause (1 B.)
  ('3641f7c0-30c8-4dbe-888c-6c203b177146'::uuid, 'e41da0a2-e7f7-4340-af17-abd536f6df51'::uuid),  -- Gilbert Sinoué (1 B.)  ->  Gilbert Sinoue (4 B.)
  ('dff35bfd-e796-4ac0-b303-b6d57fc3dd85'::uuid, '9d1bb8c5-9c57-4477-8c27-be56bbe9d363'::uuid),  -- Günter Liehr (1 B.)  ->  Günter Liehr (1 B.)
  ('3c289233-8103-46a0-af35-c31a4baa7727'::uuid, '1b2264cc-8a4d-44aa-8d7c-6c703b9946ad'::uuid),  -- Hans Hoefer (2 B.)  ->  Hans Höfer (2 B.)
  ('199d97f8-a92a-4fab-94d5-175ad53e0f8b'::uuid, '7b1bd7ea-df6f-4077-86b1-99db74d5b180'::uuid),  -- Hans-Otto Meissner (2 B.)  ->  Hans Otto Meissner (14 B.)
  ('009fc668-f60a-4d5f-94c9-f6ddb55a8843'::uuid, 'f924bcbe-f742-48cb-bcb3-432e0eb41d61'::uuid),  -- Harald Lesch (1 B.)  ->  Harald Lesch (2 B.)
  ('25b51825-361f-4784-bdc5-365c13f48ee4'::uuid, 'ba780d9d-017f-47ae-98cd-99c9578005b3'::uuid),  -- Howard Carpendale (1 B.)  ->  Howard Carpendale (1 B.)
  ('191016e2-293e-44f0-8448-6f64459cf72c'::uuid, 'efda43bf-6531-43f2-8de2-a3f62b234000'::uuid),  -- Hubert Messner (0 B.)  ->  Hubert Messner (5 B.)
  ('eab6d386-1768-48e4-a65c-08be07ebf422'::uuid, 'a651117e-a8a4-4ddb-984c-4e1bb702a422'::uuid),  -- Ines Thorn (1 B.)  ->  Ines Thorn (3 B.)
  ('23bdbdac-d1c2-4ed3-a3aa-6f280d0e7447'::uuid, 'f51f6194-7ae9-4d03-aa4e-8f5786fa7d0c'::uuid),  -- Isabel Allende (5 B.)  ->  Isabel Allende (40 B.)
  ('c23c1a96-23c1-4b97-9716-754296b26b48'::uuid, 'acef7ffa-1832-4c91-b0db-3be84d57ff27'::uuid),  -- Ivar Lissner (1 B.)  ->  Ivar Lissner (2 B.)
  ('861e0442-d133-4295-9d8a-feb774e86316'::uuid, '7fb08327-d8f2-4bd8-9fe7-5e2d61abfcde'::uuid),  -- Jana Frey (2 B.)  ->  Jana Frey (3 B.)
  ('fde41bb7-7b6e-4b5f-86dc-8a840641fe6a'::uuid, '77430ba0-8b54-4011-8006-ba1c48727b2f'::uuid),  -- Jaume Cabre (1 B.)  ->  Jaume Cabré (1 B.)
  ('3f1baf44-723d-4539-a506-6234a25cddc2'::uuid, 'abc43496-95aa-4f37-a56f-be2d0251001a'::uuid),  -- Jean Hougron (1 B.)  ->  Jean Hougron (1 B.)
  ('76e170e0-7f6e-41fe-b572-23380bd4adbd'::uuid, '78d4ecaf-02d5-4632-8c96-20e40596f576'::uuid),  -- Jodi Picoult (1 B.)  ->  Jodi Picoult (3 B.)
  ('30e65378-241b-479a-b215-a5a92899efba'::uuid, '71934bdf-38c6-40d2-acd2-53e3789bade2'::uuid),  -- John Green (2 B.)  ->  John Green (4 B.)
  ('90b462f2-450f-4de4-b16f-ee9948a60c00'::uuid, '04c6073e-4315-426f-bc2d-08ad896fac20'::uuid),  -- John Maddox Roberts (1 B.)  ->  John Maddox Roberts (8 B.)
  ('8009673a-1fdd-45ae-85df-335149201ed4'::uuid, 'df2ed202-3832-4b80-9253-4dd3f750d3ef'::uuid),  -- Jonathan Tropper (1 B.)  ->  Jonathan Tropper (1 B.)
  ('3df2248f-005e-4781-a21c-a1018b46d3c0'::uuid, '5cbce452-99b5-44e7-b09c-4337de15800b'::uuid),  -- Josef Nyary (1 B.)  ->  Josef Nyary (3 B.)
  ('9f32eed5-ef5f-4890-be91-1015b456d031'::uuid, '5cbce452-99b5-44e7-b09c-4337de15800b'::uuid),  -- Josef Nyáry (1 B.)  ->  Josef Nyary (3 B.)
  ('e20e7923-0f01-4c58-83a1-a57c18024a14'::uuid, '5c73a861-3047-423e-ac1c-895566b49140'::uuid),  -- Joseph Eichendorff (1 B.)  ->  Joseph Eichendorff (1 B.)
  ('13b53d4d-33f3-4603-8135-557327ae63fb'::uuid, '64b9fa2e-504c-4d1c-884b-2dca1e8cceb2'::uuid),  -- Joseph Murphy (2 B.)  ->  Joseph Murphy (3 B.)
  ('b1ecd64c-117c-4edf-a5f1-40b283d1965b'::uuid, '7d8c53c4-a78f-4621-89f4-5e1dbe870e89'::uuid),  -- Josie LLoyd (1 B.)  ->  Josie Lloyd (2 B.)
  ('4bb56251-c123-4888-a21d-4bd019cbc520'::uuid, 'c30b2cbc-0e55-4aac-98cd-fa2bbccae992'::uuid),  -- Jostein Gaarder (2 B.)  ->  Jostein Gaarder (2 B.)
  ('315c75ae-6f63-4364-87d3-bde271bb7b83'::uuid, '23ae1954-909f-4bcc-960c-3fa69cbaf0c7'::uuid),  -- Jörg Niessen (1 B.)  ->  Jörg Nießen (1 B.)
  ('1d1e3012-43d4-4548-bb62-95508d7e7853'::uuid, '382befff-6648-491e-91e2-bb688cf01831'::uuid),  -- Kathleen Winsor (1 B.)  ->  Kathleen Winsor (1 B.)
  ('2ebbbd91-76e7-46d9-bd43-ff0ebce3d02b'::uuid, '38bbf8e8-801e-4262-92fc-1660aea8604d'::uuid),  -- Kurt Reinke (1 B.)  ->  Kurt Reinke (1 B.)
  ('d2628bf9-1255-42c9-b72b-3ce260af1091'::uuid, 'c3620a93-0b41-4f70-968f-abb47d23e152'::uuid),  -- Kurt Tepperwein (1 B.)  ->  Kurt Tepperwein (1 B.)
  ('72975893-fbc4-4eb6-8935-f4cffc35867b'::uuid, '7b2d8572-9957-41d8-b1d6-f01cfb2dd3ff'::uuid),  -- Laura Walden (2 B.)  ->  Laura Walden (5 B.)
  ('b7afe799-f9ed-4428-8aef-be3bd3a2dd89'::uuid, 'f71c86d8-b744-4b3d-ae5d-36c820fe19f2'::uuid),  -- Leena Lehtolainen (1 B.)  ->  Leena Lehtolainen (2 B.)
  ('05bfa836-7179-476e-a7d5-cc7d401e0b9f'::uuid, 'ea35df8b-4dcb-4ec5-b3e4-ed1b09d370a1'::uuid),  -- Lisa See (2 B.)  ->  Lisa See (2 B.)
  ('b89be062-dc68-4609-8f67-94375b9c1df3'::uuid, '3d701997-1112-40a8-95ec-c45bb30f94f9'::uuid),  -- Lucinda Riley (1 B.)  ->  Lucinda Riley (2 B.)
  ('2c9295b3-1118-40bf-829c-707dc8c16c1c'::uuid, 'a9d99d0c-8df0-42b0-b441-5ca9b78b3dcd'::uuid),  -- Manfred Braunger (1 B.)  ->  Manfred Braunger (1 B.)
  ('098df362-875a-443e-b59b-bc55fda26bce'::uuid, '02070a32-18e5-45ff-9a73-335ffa85eeab'::uuid),  -- Marianne Fredriksson (1 B.)  ->  Marianne Fredriksson (4 B.)
  ('d65ec937-167f-4dcf-ade6-12d0e3a42af0'::uuid, 'b537a5e7-dfa7-4beb-b5bb-977c171ccd7f'::uuid),  -- Marie Louise-Fischer (3 B.)  ->  Marie Louise Fischer (5 B.)
  ('a22b3748-69b2-4afb-86b4-63a4b971d0cc'::uuid, 'a25f239f-2e12-4933-8a97-56716b986033'::uuid),  -- Marlen Haushofer (1 B.)  ->  Marlen Haushofer (2 B.)
  ('9d9fd631-209c-4916-b61e-928c23d9eff4'::uuid, '1054d771-5ba1-41fd-a7aa-8980d8d9959e'::uuid),  -- Matthew Reilly (1 B.)  ->  Matthew Reilly (2 B.)
  ('fd70093e-98f0-47c3-bce9-d784a0e12ccb'::uuid, '27337f9a-9389-4cf1-9387-010ed477269f'::uuid),  -- Max Frisch (1 B.)  ->  Max Frisch (3 B.)
  ('89e6ac1d-7d03-48d5-bf24-6f973ac1580c'::uuid, '62e724ba-5684-4589-bca1-846c0a529720'::uuid),  -- Mirjam Pressler (1 B.)  ->  Mirjam Pressler (2 B.)
  ('382471d5-3b05-41b9-a1b1-f77dac939bb0'::uuid, '8704bd03-2f04-43d4-8ec9-5ec2e3b28f75'::uuid),  -- Nadine Gordimer (1 B.)  ->  Nadine Gordimer (1 B.)
  ('47c82695-d899-4dda-ac24-0c83710e215d'::uuid, 'a883be06-c5a5-43b7-afe2-76b0198556fe'::uuid),  -- Noah Gordon (1 B.)  ->  Noah Gordon (17 B.)
  ('c671c6b7-89b7-455d-b3e4-ec7fcf087ca6'::uuid, 'd07c675a-3ab7-4bce-bf3b-e380cff4bd40'::uuid),  -- Oliver Uschmann (1 B.)  ->  Oliver Uschmann (1 B.)
  ('816f8df3-e138-4821-88d1-df2a17ed9309'::uuid, '2dcb544a-c9f5-4722-839f-d0c6a128be10'::uuid),  -- Olivier Guez (1 B.)  ->  Olivier Guez (2 B.)
  ('f66dec9d-9354-4592-8615-94f5122ad5b5'::uuid, '125be179-bc4c-4ff0-9051-522ef5feabe9'::uuid),  -- Oriana Fallaci (2 B.)  ->  Oriana Fallaci (2 B.)
  ('574142e8-fbe3-473d-89b7-313fa46abf99'::uuid, '14b5a56a-f059-4ad5-8273-06681a902a3b'::uuid),  -- Patricia Schultz (2 B.)  ->  Patricia Schultz (3 B.)
  ('fdafe93b-7bc9-4ecd-b154-0d64c10589f6'::uuid, '203d3bfd-4d51-4015-a2b0-05205e64d0e6'::uuid),  -- Paul Bowles (1 B.)  ->  Paul Bowles (3 B.)
  ('87e167d9-bb0f-4126-8dda-af9dd756f65a'::uuid, '8d2cb273-37ca-4609-bc20-31073fd3c47a'::uuid),  -- Pu Yi (1 B.)  ->  Pu Yi (1 B.)
  ('302c913c-da15-401b-a6f2-85e8706fb05f'::uuid, '4d0c988e-e918-4d79-9918-9629b918e585'::uuid),  -- Ray Müller (1 B.)  ->  Ray Müller (1 B.)
  ('da1e939d-99c1-45f8-896c-a87000013c98'::uuid, 'e9a6c8a7-b2be-4c60-a933-ff80602a8fa4'::uuid),  -- Robert Schneider (2 B.)  ->  Robert Schneider (3 B.)
  ('854bfae9-1271-4d4f-ba42-7c2939066acf'::uuid, '7eb4c01b-8ce7-4c5e-b32e-b59fcb946d61'::uuid),  -- Rosie Swale (1 B.)  ->  Rosie Swale (2 B.)
  ('7d24fd7b-d588-44d0-b438-cf2e7678ce14'::uuid, '782c1699-d863-40ac-a870-464d1897541f'::uuid),  -- Rudolf Braunburg (1 B.)  ->  Rudolf Braunburg (4 B.)
  ('79895324-f941-4a9b-9a6a-10ffa41ea8b2'::uuid, '93c0da98-7abb-4b60-91e9-b62577947f80'::uuid),  -- Rudolf Harms (1 B.)  ->  Rudolf Harms (1 B.)
  ('18b88e88-e13e-453c-80d9-1ad4eb240043'::uuid, 'ec77367a-ff32-4eec-9326-4f858b284ba5'::uuid),  -- Rudolf Kippenhahn (1 B.)  ->  Rudolf Kippenhahn (1 B.)
  ('bbc69802-80cb-4124-8ca6-fffe777a2b24'::uuid, '2fad61e5-7f6b-4fc8-9191-b60cd44f2a58'::uuid),  -- Rupert Lay (1 B.)  ->  Rupert Lay (1 B.)
  ('95e91111-e5ba-411a-824d-f8b786b5d17e'::uuid, '9646d3bd-68df-4dae-8780-723bb3c8fcbf'::uuid),  -- Rüdiger Nehberg (1 B.)  ->  Rüdiger Nehberg (5 B.)
  ('a34570b5-fea9-422e-ba03-fdaa5353082e'::uuid, 'b4784075-37e4-4632-ab75-a851913c6956'::uuid),  -- Salman Rushdie (2 B.)  ->  Salman Rushdie (3 B.)
  ('35689fe1-ab42-4cec-900d-6d354713e75d'::uuid, 'ef87fb96-5c75-4a17-be12-924a0da23b55'::uuid),  -- Santa Montefiore (2 B.)  ->  Santa Montefiore (3 B.)
  ('5604066f-1c24-4946-bb15-92f523b367df'::uuid, '93a48bca-adfb-40ca-b39f-1cf82b3f687f'::uuid),  -- Sattareh Farman Farmaian (1 B.)  ->  Sattareh Farman-Farmaian (1 B.)
  ('9ee8ee31-cea0-4362-bd9e-4b39706ec78c'::uuid, 'd9fdedd3-a6b6-40c9-a213-a550ff557bcd'::uuid),  -- Scott ODell (1 B.)  ->  Scott O'Dell (2 B.)
  ('40607a44-222c-4b08-83a1-b059848d8be7'::uuid, '7faec4c1-4c8f-465a-b591-7a3a688394be'::uuid),  -- Sebastian Fitzek (5 B.)  ->  Sebastian Fitzek (9 B.)
  ('cff1472e-92e8-4d13-a605-5f5fada69b7e'::uuid, '1991a190-edc8-4e83-89f4-8613f156dda2'::uuid),  -- Siegfried Obermeier (3 B.)  ->  Siegfried Obermeier (3 B.)
  ('884cf8a3-0a22-47c0-b9c9-a3a0a7e1c48c'::uuid, '469097fa-d57f-4956-9138-86516b2cb6c2'::uuid),  -- Simon Richmond (1 B.)  ->  Simon Richmond (2 B.)
  ('d3b8ea99-a252-4eb4-8fd0-632cf8f7af97'::uuid, '97c3190e-776b-4a24-8056-0cce811ed548'::uuid),  -- stefan loose (1 B.)  ->  Stefan Loose (4 B.)
  ('9ba382d5-53c4-4f59-956d-c56f213d68c4'::uuid, '680120e1-daae-4482-8398-d56ebe35128e'::uuid),  -- Stefan Murr (1 B.)  ->  Stefan Murr (1 B.)
  ('a311192a-b794-403b-9e85-dabb2988486a'::uuid, '17f68802-5b45-41d0-ac11-b1656295a7c9'::uuid),  -- Stephan Orth (2 B.)  ->  Stephan Orth (4 B.)
  ('78636aa9-6745-40c9-9fff-7499268cdf03'::uuid, '9b9d7fbb-39fb-419c-b9bd-22f1734f1810'::uuid),  -- Susanna Kubelka (2 B.)  ->  Susanna Kubelka (4 B.)
  ('37cd9260-8757-4f44-8381-6ab23d56edeb'::uuid, 'c808c00a-cb42-4a04-b3b3-37bcf37aad1f'::uuid),  -- Sveva Casati Modignani (2 B.)  ->  Sveva Casati Modignani (3 B.)
  ('dd811ad5-4728-4236-8cd9-6b997a604b56'::uuid, '667e5bb9-2872-4e14-bf94-620f1970dc55'::uuid),  -- T. Coraghessan Boyle (1 B.)  ->  T. Coraghessan Boyle (1 B.)
  ('b878d738-4592-4042-8504-46a0daa32636'::uuid, 'c88fe1a2-96ec-4fb6-914e-3c58a2531a4f'::uuid),  -- Tehmina Durrani (1 B.)  ->  Tehmina Durrani (2 B.)
  ('94fd0f02-e66a-46f5-a8a3-6c4c43fc0940'::uuid, 'c1d8c8ca-8055-4021-bc3e-bbaf0148e347'::uuid),  -- Tess Gerritsen (1 B.)  ->  Tess Gerritsen (3 B.)
  ('b0c545b8-abb1-4c9f-952d-a783976ec95b'::uuid, 'e2020646-914b-4652-ad19-fbce9e80481c'::uuid),  -- Thomas R. P. Mielke (1 B.)  ->  Thomas R P Mielke (3 B.)
  ('936bc4c5-85e4-44d3-9bf2-c5a2b0b9591c'::uuid, '27571cd5-160e-40da-9460-02a56a91a272'::uuid),  -- Thomas Thiemeyer (1 B.)  ->  Thomas Thiemeyer (2 B.)
  ('1b3b52eb-4bf3-49cc-911a-ac594dc35af5'::uuid, '482fddc3-865f-4645-b366-c710525df108'::uuid),  -- Titus Müller (1 B.)  ->  Titus Müller (2 B.)
  ('d66ffafa-5614-40dd-9cea-1e48397bccb6'::uuid, '7599490a-f076-414d-9916-bd2684cb03ad'::uuid),  -- Tiziano Terzani (2 B.)  ->  Tiziano Terzani (5 B.)
  ('7704d104-4cb1-416b-87dd-72c7b9f9b561'::uuid, '45876ea0-8841-4e75-b269-fe20669d00ea'::uuid),  -- Ulla Hahn (1 B.)  ->  Ulla Hahn (3 B.)
  ('f21778c3-d643-4377-9d93-bb67f5088fd5'::uuid, '73d8fee5-8d74-4499-81c4-a9d582a2e11d'::uuid),  -- Ulli Olvedi (2 B.)  ->  Ulli Olvedi (3 B.)
  ('541ae9ef-16f6-4e9b-9bc6-429b4c8fe795'::uuid, 'b0fc2988-4225-44d0-8c58-dfaa422c21cc'::uuid),  -- Ulrich Wickert (5 B.)  ->  Ulrich Wickert (23 B.)
  ('dd6b7691-8e60-48a3-acab-d54a8a20b21f'::uuid, '17fbbd96-0c6d-471e-ac47-92f3a34757ea'::uuid),  -- Wibke Bruhns (1 B.)  ->  Wibke Bruhns (2 B.)
  ('4cc85b64-8b01-4ff1-bbd1-a301f17ff3a5'::uuid, 'a6281405-321b-4cae-8123-7b73fa1c25bf'::uuid),  -- Wolfgang Schur (1 B.)  ->  Wolfgang Schur (1 B.)
  ('9fe1fcb7-be2f-4103-9535-6029b5e3f17d'::uuid, '78398892-0ff1-45fd-96ac-bbcce23d07a1'::uuid),  -- Ying Hong (1 B.)  ->  Hong Ying (2 B.)
  ('fc000a30-782b-4809-9009-4a6ac7c94a22'::uuid, 'b8fe03a2-9c32-4671-af54-63cb2000d951'::uuid)   -- Zeruya Shalev (1 B.)  ->  Zeruya Shalev (2 B.)
;

-- ---- Sicherheitsprüfungen -------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM merge_map m
   WHERE NOT EXISTS (SELECT 1 FROM authors WHERE id = m.drop_id)
      OR NOT EXISTS (SELECT 1 FROM authors WHERE id = m.keep_id);
  IF n > 0 THEN RAISE EXCEPTION '% IDs existieren nicht (mehr) – Liste ist veraltet, bitte neu erzeugen', n; END IF;

  SELECT count(*) INTO n FROM merge_map WHERE drop_id = keep_id
     OR keep_id IN (SELECT drop_id FROM merge_map);
  IF n > 0 THEN RAISE EXCEPTION '% Einträge sind gleichzeitig behalten und zu löschen', n; END IF;
END $$;

-- ---- Sicherung -------------------------------------------------------
CREATE TABLE IF NOT EXISTS authors_backup_merge_20261108 AS
  SELECT a.*, m.keep_id AS merged_into, now() AS merged_at
  FROM authors a JOIN merge_map m ON m.drop_id = a.id WITH NO DATA;
INSERT INTO authors_backup_merge_20261108
  SELECT a.*, m.keep_id, now() FROM authors a JOIN merge_map m ON m.drop_id = a.id;

CREATE TABLE IF NOT EXISTS books_author_merge_20261108
  (book_id uuid, old_author_id uuid, new_author_id uuid, quelle text, merged_at timestamptz DEFAULT now());
INSERT INTO books_author_merge_20261108 (book_id, old_author_id, new_author_id, quelle)
  SELECT b.id, m.drop_id, m.keep_id, 'books' FROM books b JOIN merge_map m ON m.drop_id = b.author_id
  UNION ALL
  SELECT x.book_id, m.drop_id, m.keep_id, 'book_authors' FROM book_authors x JOIN merge_map m ON m.drop_id = x.author_id;

-- ---- 1. Leere Felder beim behaltenen Autor ergänzen -------------------
-- Kürzel (abbr) ist eindeutig: erst beim alten Eintrag freigeben
CREATE TEMP TABLE abbr_move ON COMMIT DROP AS
  SELECT DISTINCT ON (m.keep_id) m.keep_id, d.abbr
  FROM merge_map m JOIN authors d ON d.id = m.drop_id JOIN authors k ON k.id = m.keep_id
  WHERE k.abbr IS NULL AND d.abbr IS NOT NULL
  ORDER BY m.keep_id, d.created_at;
UPDATE authors SET abbr = NULL WHERE id IN (SELECT drop_id FROM merge_map) AND abbr IS NOT NULL;

UPDATE authors k SET
  birth_date               = coalesce(k.birth_date,               s.birth_date),
  death_date               = coalesce(k.death_date,               s.death_date),
  author_nationality       = coalesce(k.author_nationality,       s.author_nationality),
  male_female              = coalesce(k.male_female,              s.male_female),
  place_of_birth           = coalesce(k.place_of_birth,           s.place_of_birth),
  published_titles         = coalesce(k.published_titles,         s.published_titles),
  number_of_millionsellers = coalesce(k.number_of_millionsellers, s.number_of_millionsellers),
  full_name                = coalesce(k.full_name,                s.full_name),
  namenszusatz             = coalesce(k.namenszusatz,             s.namenszusatz),
  title                    = coalesce(k.title,                    s.title),
  name_particle            = coalesce(k.name_particle,            s.name_particle),
  abbr                     = coalesce(k.abbr, (SELECT am.abbr FROM abbr_move am WHERE am.keep_id = k.id))
FROM (
  SELECT m.keep_id,
         (array_agg(d.birth_date)               FILTER (WHERE d.birth_date IS NOT NULL))[1]               birth_date,
         (array_agg(d.death_date)               FILTER (WHERE d.death_date IS NOT NULL))[1]               death_date,
         (array_agg(d.author_nationality)       FILTER (WHERE d.author_nationality IS NOT NULL))[1]       author_nationality,
         (array_agg(d.male_female)              FILTER (WHERE d.male_female IS NOT NULL))[1]              male_female,
         (array_agg(d.place_of_birth)           FILTER (WHERE d.place_of_birth IS NOT NULL))[1]           place_of_birth,
         (array_agg(d.published_titles)         FILTER (WHERE d.published_titles IS NOT NULL))[1]         published_titles,
         (array_agg(d.number_of_millionsellers) FILTER (WHERE d.number_of_millionsellers IS NOT NULL))[1] number_of_millionsellers,
         (array_agg(d.full_name)                FILTER (WHERE d.full_name IS NOT NULL))[1]                full_name,
         (array_agg(d.namenszusatz)             FILTER (WHERE d.namenszusatz IS NOT NULL))[1]             namenszusatz,
         (array_agg(d.title)                    FILTER (WHERE d.title IS NOT NULL))[1]                    title,
         (array_agg(d.name_particle)            FILTER (WHERE d.name_particle IS NOT NULL))[1]            name_particle
  FROM merge_map m JOIN authors d ON d.id = m.drop_id
  GROUP BY m.keep_id
) s
WHERE k.id = s.keep_id;

-- ---- 2. Verknüpfungen umhängen --------------------------------------
UPDATE books b SET author_id = m.keep_id
FROM merge_map m WHERE b.author_id = m.drop_id;

INSERT INTO book_authors (book_id, author_id, sort_order)
SELECT x.book_id, m.keep_id, x.sort_order
FROM book_authors x JOIN merge_map m ON m.drop_id = x.author_id
ON CONFLICT (book_id, author_id) DO NOTHING;
DELETE FROM book_authors x USING merge_map m WHERE x.author_id = m.drop_id;

UPDATE bestseller_entries e SET author_id = m.keep_id
FROM merge_map m WHERE e.author_id = m.drop_id;

INSERT INTO author_genre_rules (author_id, genre_id, confidence, source, created_at)
SELECT DISTINCT ON (m.keep_id) m.keep_id, r.genre_id, r.confidence, r.source, r.created_at
FROM author_genre_rules r JOIN merge_map m ON m.drop_id = r.author_id
ORDER BY m.keep_id, r.confidence DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;
-- (die alten Regeln werden beim Löschen des Autors per CASCADE entfernt)

DELETE FROM author_lastname_equals_abbr_queue q USING merge_map m WHERE q.author_id = m.drop_id;

-- ---- 3. Alte Einträge löschen ---------------------------------------
DELETE FROM authors a USING merge_map m WHERE a.id = m.drop_id;

-- ---- Ergebnis ----------------------------------------------------------
SELECT 'Autoren gelöscht'       AS was, count(*) AS anzahl FROM authors_backup_merge_20261108 WHERE merged_at >= now() - interval '1 minute'
UNION ALL
SELECT 'Buchzuordnungen umgehängt', count(*) FROM books_author_merge_20261108 WHERE merged_at >= now() - interval '1 minute'
UNION ALL
SELECT 'verbleibende Verweise auf gelöschte IDs',
       (SELECT count(*) FROM books b JOIN merge_map m ON m.drop_id = b.author_id)
     + (SELECT count(*) FROM book_authors x JOIN merge_map m ON m.drop_id = x.author_id)
UNION ALL
SELECT 'Autoren gesamt jetzt', count(*) FROM authors;

-- Probelauf: nichts wird gespeichert. Für den echten Lauf durch COMMIT; ersetzen.
ROLLBACK;
