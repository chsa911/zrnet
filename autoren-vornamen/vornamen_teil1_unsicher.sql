-- Vornamen ergänzen – Teil 1: Sicherheit NIEDRIG – bitte vorher durchsehen, falsche Zeilen löschen
-- 180 Autoren. Nur Einträge, die (noch) keinen Vornamen haben, werden geändert.
-- In DBeaver: Datei öffnen, Verbindung wählen (zuerst Test-Branch!), Alt+X / ⌥X.
-- Erwartet: 180x "Updated rows: 1" (0 = Autor wurde inzwischen schon geändert, das ist ok).

BEGIN;

-- ===== Sicherheit: niedrig (180) =====

-- krypta  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Carl', name_display = 'Carl Amery', last_updated_at = now()
  WHERE id = '8708fefe-2178-4d25-9546-cd534f0e7d5f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Amery';

-- Assessment Center. Erfolgstipps und Übungen für Bewerber.  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Holger', name_display = 'Holger Beitz', last_updated_at = now()
  WHERE id = 'b3f24d7f-f17d-46b4-b72d-facda13b1e6a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beitz';

-- aleppo  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Faisal', name_display = 'Faisal Hamdo', last_updated_at = now()
  WHERE id = 'ee33766a-f185-4a1c-851f-30c27cb19359' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hamdo';

-- Yacca- Fieber. ( Ab 12 J.).  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Marja Roscam', name_display = 'Marja Roscam Abbing', last_updated_at = now()
  WHERE id = 'cc01df76-a666-475b-adbe-ae6d7eeb2ba4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Abbing';

-- dumm  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'Dr. David Perlmutter', title = 'Dr.', last_updated_at = now()
  WHERE id = '2fba00df-baa7-4ef9-9633-8664d36345f9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Perlmutter';

-- solange leben entscheiden  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jehuda', name_display = 'Jehuda Bacon', last_updated_at = now()
  WHERE id = '957629a1-d197-4712-b845-eccc4832194b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bacon';

-- jenseits  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jörg', name_display = 'Jörg Hardy', last_updated_at = now()
  WHERE id = '21cb7fcf-6913-4c42-b0e3-47db3e7daada' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hardy';

-- systemfehler  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Wolf', name_display = 'Wolf Harlander', last_updated_at = now()
  WHERE id = '0aac2492-6171-4a11-9e15-849f8f34735e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Harlander';

-- lean machines  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Chapman', last_updated_at = now()
  WHERE id = 'fd59b629-b2df-40b6-b113-d0dfc426b3b9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chapman';

-- kongo  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Forbath', last_updated_at = now()
  WHERE id = 'fcc0d0e7-11ed-4a48-81a1-d06f6b3590d1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Forbath';

-- tochter windes  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Elizabeth', name_display = 'Elizabeth Haydon', last_updated_at = now()
  WHERE id = '9552c86b-708f-45bb-ae66-a5be87c58e67' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Haydon';

-- unsitten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Hecht', last_updated_at = now()
  WHERE id = 'dce9aa79-7e6f-4751-85dd-87c2ebf62ea5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hecht';

-- dunkle  [OpenLibrary-Titel, 1 Treffer, Alt: Joseph Hayes]
UPDATE public.authors SET first_name = 'Joseph Arnold', name_display = 'Joseph Arnold Hayes', last_updated_at = now()
  WHERE id = '249ba6f4-65b6-4cff-a6f1-fc0255f31d45' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hayes';

-- christi  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrich', name_display = 'Ulrich Hefner', last_updated_at = now()
  WHERE id = '438bd9ef-9c9e-4381-bc94-f1fcdb4d8b7f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hefner';

-- gazelle  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Arash', name_display = 'Arash Hejazi', last_updated_at = now()
  WHERE id = '1c19ecc4-073e-408a-a650-fd9a066e87a7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hejazi';

-- goldenes | kaffeedieb  [OpenLibrary-Titel, 1 Treffer, Alt: Tom Hillenbrand]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Hillenbrand', last_updated_at = now()
  WHERE id = 'fdb9c6a6-0f51-4be6-921a-0902860eea5d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hillenbrand';

-- assessment center  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Silke', name_display = 'Silke Hell', last_updated_at = now()
  WHERE id = '3e9a9d49-7611-4739-a07e-04e99accc425' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hell';

-- stirn gerunzelt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Walter', name_display = 'Walter Henkels', last_updated_at = now()
  WHERE id = '1442b41c-06c5-441d-95a5-4ae6f82235c8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Henkels';

-- bruder kain | sturm  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Horbach', last_updated_at = now()
  WHERE id = '2640500b-70c0-44c9-b5bb-54c20759d571' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Horbach';

-- sollte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard Horne', last_updated_at = now()
  WHERE id = '4b90bca6-a60f-40dc-94b7-dbc824645964' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Horne';

-- elefantenjunge  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sigrid', name_display = 'Sigrid Heuck', last_updated_at = now()
  WHERE id = '4589b4e6-16de-41fd-83d3-09c0b9b55ccf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heuck';

-- business  [OpenLibrary-Titel, 2 Treffer, Alt: Noreena Hertz | Janice Hertz]
UPDATE public.authors SET first_name = 'Leah', name_display = 'Leah Hertz', last_updated_at = now()
  WHERE id = '7ba46cc1-1001-4f13-9dab-ba118e746837' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hertz';

-- dressiert  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Artur', name_display = 'Artur Heye', last_updated_at = now()
  WHERE id = 'ecac7bb4-1bdb-428f-a112-a4762ed9002e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heye';

-- wagt gewinnt  [OpenLibrary-Titel, 1 Treffer, Alt: Edmund Hillary]
UPDATE public.authors SET first_name = 'Edmund', name_display = 'Sir Edmund Hillary', title = 'Sir', last_updated_at = now()
  WHERE id = 'eefafc3b-a57f-49bf-9797-0322a8328ef7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hillary';

-- Die Wirtschaftsunternehmen der Gewerkschaften  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Hirche', last_updated_at = now()
  WHERE id = 'cb13cd4b-6a31-4a18-9ff5-ec08b26562ee' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hirche';

-- luxemburg | pfeife  [OpenLibrary-Titel, 1 Treffer, Alt: Mario Hirsch]
UPDATE public.authors SET first_name = 'Helmut', name_display = 'Helmut Hirsch', last_updated_at = now()
  WHERE id = 'a185d158-ee26-4786-901f-574754f78f52' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hirsch';

-- indien gandhi  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Uwe', name_display = 'Uwe Hoering', last_updated_at = now()
  WHERE id = '1c33f1a2-fadc-4063-b3f6-fda14f17dc18' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hoering';

-- zauberstab  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Hohlbaum', last_updated_at = now()
  WHERE id = '271ae298-450b-4d63-9655-2507304ddb65' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hohlbaum';

-- saigon  [OpenLibrary-Titel, 1 Treffer, Alt: Jean Hougron]
UPDATE public.authors SET first_name = 'Jean', name_display = 'Jean Hougron', last_updated_at = now()
  WHERE id = '3f1baf44-723d-4539-a506-6234a25cddc2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hougron';

-- liebe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'T.', name_display = 'T. Hyde', last_updated_at = now()
  WHERE id = '6d59361a-0948-4a5f-8371-cd0d883cbf99' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hyde';

-- innovators | steve  [OpenLibrary-Titel, 4 Treffer, Alt: Jeffrey A. Isaacson]
UPDATE public.authors SET first_name = 'Walter', name_display = 'Walter Isaacson', last_updated_at = now()
  WHERE id = '95e1da0d-823c-44e9-8575-9771f58c31ab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Isaacson';

-- rockmusik  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Klaus', name_display = 'Klaus Humann', last_updated_at = now()
  WHERE id = '390482e4-e08b-46d8-bcce-06460e08ad5d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Humann';

-- lied befreiung neschans  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Ralf', name_display = 'Ralf Isau', last_updated_at = now()
  WHERE id = '190c31cd-094e-4dc3-a09a-50f42957de95' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Isau';

-- salomes sommer  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Urban', name_display = 'Urban Blau', last_updated_at = now()
  WHERE id = 'fda0a8d5-d0d1-4947-b722-731fd8630002' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Blau';

-- Orpheus und Sibirien  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Annette', name_display = 'Annette Berr', last_updated_at = now()
  WHERE id = 'ef128910-77e1-4d60-89c7-8805d4076759' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Berr';

-- southeast asia shoestring  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Greg', name_display = 'Greg Bloom', last_updated_at = now()
  WHERE id = '74369f14-120d-42ce-bdd9-76e2554cbb6d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bloom';

-- dies | russland  [OpenLibrary-Titel, 5 Treffer, Alt: Anna Block]
UPDATE public.authors SET first_name = 'Lawrence', name_display = 'Lawrence Block', last_updated_at = now()
  WHERE id = '640cfa91-e909-44df-a952-2c49b742cbfa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Block';

-- mustergatte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Doris', name_display = 'Doris Jannausch', last_updated_at = now()
  WHERE id = 'b5f28a4f-f73c-4108-955a-4b24d2b5019d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jannausch';

-- kunst jung bleiben  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Willy', name_display = 'Willy Breinholst', last_updated_at = now()
  WHERE id = '42d400d2-455c-4ac8-90f4-7ce4cdda0fe2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Breinholst';

-- norma  [OpenLibrary-Titel, 1 Treffer, Alt: Brigette Burmeister]
UPDATE public.authors SET first_name = 'Brigitte', name_display = 'Brigitte Burmeister', last_updated_at = now()
  WHERE id = '4777140b-8b0b-46d0-90b0-dfea31dffb26' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Burmeister';

-- rittersagen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Johannes', name_display = 'Johannes Carstensen', last_updated_at = now()
  WHERE id = 'aa8ec8cb-25c2-42a3-ac13-49f366f2128a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Carstensen';

-- beruf familie  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Nicole', name_display = 'Nicole Beste-Fopma', last_updated_at = now()
  WHERE id = 'e2a207c0-729f-43bb-84dc-a946b19c5aec' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beste-Fopma';

-- theorie neoliberalismus  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Biebricher', last_updated_at = now()
  WHERE id = '019caca5-c85e-4ac9-8025-937e358ea335' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Biebricher';

-- palmen warschau  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Annette', name_display = 'Annette Dittert', last_updated_at = now()
  WHERE id = 'a7fa10b9-ddf8-4ee2-bddf-4bd745380ed6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dittert';

-- strasse  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Thyde', name_display = 'Thyde Monnier', last_updated_at = now()
  WHERE id = 'c08f6c1d-21d2-415c-96f2-2debd92811ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Monnier';

-- nazareth  [OpenLibrary-Titel, 1 Treffer, Alt: C. C. Martin]
UPDATE public.authors SET first_name = 'Maria', name_display = 'Maria Martin', last_updated_at = now()
  WHERE id = '5685c8ad-6a79-4b59-9d60-686059e7ff39' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Martin';

-- akte rosenthal  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hanni', name_display = 'Hanni Muenzer', last_updated_at = now()
  WHERE id = 'aac7e85b-aea5-4498-a85e-f723c61aea99' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Muenzer';

-- Die roten Patriarchen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Emil', name_display = 'Emil Muhler', last_updated_at = now()
  WHERE id = 'a2c08afc-1e1a-40e9-876c-ae5bd3c5b933' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Muhler';

-- attentat  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Harry', name_display = 'Harry Mulisch', last_updated_at = now()
  WHERE id = '7ebf0d39-c0a7-401b-86a2-263de02f6446' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mulisch';

-- Wandern--bergab | huette  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Walter', name_display = 'Walter Pause', last_updated_at = now()
  WHERE id = 'fb10db17-5407-4dd9-9d5e-bc6be001d790' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pause';

-- taoisten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Payne', last_updated_at = now()
  WHERE id = 'ab51668c-e33d-4aa8-be03-03140495a1c8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Payne';

-- grabbing  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Brenda', name_display = 'Brenda Pearce', last_updated_at = now()
  WHERE id = 'd7fb8efc-56c7-46d3-9fd3-2f0674e34f01' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pearce';

-- scipio  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Iain', name_display = 'Iain Pears', last_updated_at = now()
  WHERE id = '8606d9f0-5b48-479c-a822-f85e5ff98742' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pears';

-- es | verlorene  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'David J.', name_display = 'David J. Pelzer', last_updated_at = now()
  WHERE id = 'a12c1c4f-9c5b-4974-906b-4592cad0c504' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pelzer';

-- crashtest  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Frederic', name_display = 'Frederic Vester', last_updated_at = now()
  WHERE id = '9b9ee9fd-e1fc-425a-af2a-8dfad86fe1cb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Vester';

-- joghurt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Marita', name_display = 'Marita Vollborn', last_updated_at = now()
  WHERE id = 'd3eb9d54-69b7-4163-b6af-6349d893f6de' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Vollborn';

-- unfreien  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Arz', last_updated_at = now()
  WHERE id = '62ff21b2-585b-44fc-971c-155d9737f6ea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Arz';

-- toskana  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Maureen', name_display = 'Maureen Ashley', last_updated_at = now()
  WHERE id = '5832bfb9-bc53-46d7-9080-53e245ba3fcf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ashley';

-- asien  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jeannine', name_display = 'Jeannine Auboyer', last_updated_at = now()
  WHERE id = '0bc124ce-c36c-4b7f-8b65-4126fe3fd5a1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Auboyer';

-- Deutschland  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Waldemar', name_display = 'Waldemar Augustiny', last_updated_at = now()
  WHERE id = 'c8cb412e-8ba5-444c-8999-6fdb8a5781ac' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Augustiny';

-- aprilhexe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Majgull', name_display = 'Majgull Axelsson', last_updated_at = now()
  WHERE id = '937ba5b3-5405-4f34-b681-a1c72937edcb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Axelsson';

-- geburt europas  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Magnus', name_display = 'Magnus Backes', last_updated_at = now()
  WHERE id = '23533ea8-bdef-4da9-b59e-b44bccd0b519' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Backes';

-- Die Tatarenpredigt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Andreas', name_display = 'Andreas Birkner', last_updated_at = now()
  WHERE id = 'b6598264-1738-422f-bdea-827e96252ebe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Birkner';

-- brille  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Harry', name_display = 'Harry Benjamin', last_updated_at = now()
  WHERE id = '85dcaf17-43cc-46a9-b26b-ea4fa41bc4ba' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benjamin';

-- falkland | uncommon  [OpenLibrary-Titel, 3 Treffer, Alt: B. J. Bennett | Alan Bennett | Geoffrey Martin Ben]
UPDATE public.authors SET first_name = 'Geoffrey', name_display = 'Geoffrey Bennett', last_updated_at = now()
  WHERE id = '76f5c7c6-0a18-46e0-8c3e-44bb35e5e346' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bennett';

-- sousceyrac  [OpenLibrary-Titel, 2 Treffer, Alt: Benoit - Pierre Benoit | Henri Benoit | P. Benoit]
UPDATE public.authors SET first_name = 'Pierre', name_display = 'Pierre Benoit', last_updated_at = now()
  WHERE id = '19f3e73e-e57a-410b-bbeb-3c583ceed882' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benoit';

-- vergessenen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Wasseli', name_display = 'Wasseli Peskow', last_updated_at = now()
  WHERE id = 'e8db1b0f-74df-45d1-a986-6307c72b3e20' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Peskow';

-- beste | schlangenhaus  [OpenLibrary-Titel, 2 Treffer, Alt: Vivienne Bolton | Clyde Bolton]
UPDATE public.authors SET first_name = 'Lesley', name_display = 'Lesley Bolton', last_updated_at = now()
  WHERE id = '9a1f64bb-a62d-4918-b2a8-b429b9c8a542' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bolton';

-- generation doof  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Bonner', last_updated_at = now()
  WHERE id = '403e4f04-b38b-4c93-a385-49113aef68d8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bonner';

-- Südafrika | Zypern | geschichte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Iwanowski', last_updated_at = now()
  WHERE id = '24c0bad7-c921-441d-b71a-ffd54fb7e362' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Iwanowski';

-- boeser | untergang  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jacques', name_display = 'Jacques Jacobs', last_updated_at = now()
  WHERE id = '532b4411-5b22-41c2-aef7-6f8e2bf9f6f7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jacobs';

-- berater | book  [OpenLibrary-Titel, 1 Treffer, Alt: Melissa Mertz | Joshua Mertz | Tessa Mertz]
UPDATE public.authors SET first_name = 'Erick W.', name_display = 'Erick W. Mertz', last_updated_at = now()
  WHERE id = '81c9c963-b80c-47ab-87dd-6723523391ca' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mertz';

-- neuseeland | zealand  [OpenLibrary-Titel, 3 Treffer, Alt: Brydie Walker Bain | Andrew Bain]
UPDATE public.authors SET first_name = 'Carolyn', name_display = 'Carolyn Bain', last_updated_at = now()
  WHERE id = '575ee9dd-fa75-4405-99c1-9ef2492c3408' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bain';

-- gesund bleiben  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hademar', name_display = 'Hademar Bankhofer', last_updated_at = now()
  WHERE id = '7b938736-dc8f-4686-a28a-73994281cbe9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bankhofer';

-- kill | sohn schamanen  [OpenLibrary-Titel, 3 Treffer, Alt: Martin Booth | Martin. Booth | Edwin Booth]
UPDATE public.authors SET first_name = 'Stephen', name_display = 'Stephen Booth', last_updated_at = now()
  WHERE id = '43d79f66-aa70-4aa9-82f3-63f886906820' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Booth';

-- mauern chantalon  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Alice', name_display = 'Alice Borchardt', last_updated_at = now()
  WHERE id = 'a2b56632-a02d-4ac5-8ea1-cc8ff266141e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Borchardt';

-- buch weiblichkeit  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Joan', name_display = 'Joan Borysenko', last_updated_at = now()
  WHERE id = '48aced2e-973c-4ee7-9003-dca5dbc0f61b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Borysenko';

-- norm  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Andrea', name_display = 'Andrea Brackmann', last_updated_at = now()
  WHERE id = '1d8fd628-3923-47dd-bd55-02172f17f13e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brackmann';

-- kleopatra  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Joachim', name_display = 'Joachim Brambach', last_updated_at = now()
  WHERE id = '3e6eb846-35b2-48bc-afbd-00c6de15e3f2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brambach';

-- eyre  [OpenLibrary-Titel, 5 Treffer, Alt: Emily Bronte | Anne Bronte]
UPDATE public.authors SET first_name = 'Charlotte', name_display = 'Charlotte Bronte', last_updated_at = now()
  WHERE id = 'd5345e5f-c79f-419c-9bd0-586a7d7e1a3e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bronte';

-- venus  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Elisabeth', name_display = 'Elisabeth Barille', last_updated_at = now()
  WHERE id = '8b8f8d48-51a8-4d86-ab13-83376ed99e44' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barille';

-- gesang zikaden  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Annie', name_display = 'Annie Bruel', last_updated_at = now()
  WHERE id = '5238a4a5-e705-4837-9d11-dc0dc5d69d54' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bruel';

-- nahrung  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'M.o', name_display = 'Dr. med. M.o Bruker', title = 'Dr. med.', last_updated_at = now()
  WHERE id = '9b6d8900-efc1-490a-a33f-d0dda4aec8a2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bruker';

-- Große Sprünge. 22 Short Stories.  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Judy', name_display = 'Judy Budnitz', last_updated_at = now()
  WHERE id = '724c2675-1a95-42e9-8271-b544aebddda7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Budnitz';

-- achttausend  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hermann', name_display = 'Hermann Buhl', last_updated_at = now()
  WHERE id = '8d566dc3-0218-4828-a193-ac7332710e07' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Buhl';

-- scheide kann | waffen susan  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Julie', name_display = 'Julie Burchill', last_updated_at = now()
  WHERE id = '958fb865-d55d-44f8-a939-c18b86d13f9a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Burchill';

-- sarah's  [OpenLibrary-Titel, 1 Treffer, Alt: Suzanne Burns]
UPDATE public.authors SET first_name = 'Janice A.', name_display = 'Janice A. Burns', last_updated_at = now()
  WHERE id = 'dc6291ed-aeb8-4fac-81b2-501800a7961b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Burns';

-- tiere  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Maurice', name_display = 'Maurice Burton', last_updated_at = now()
  WHERE id = '62933c3a-4d63-4f72-be81-f25530757222' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Burton';

-- geliebte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Monika', name_display = 'Monika Buschey', last_updated_at = now()
  WHERE id = 'afa0a52d-85a6-4d5a-b590-24ce478fe142' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Buschey';

-- Woll-lust dolores  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Blanca', name_display = 'Blanca Busquets', last_updated_at = now()
  WHERE id = '63117397-e86a-4542-960e-b57d2d6356e0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Busquets';

-- Die Stimmen des Flusses  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jaume', name_display = 'Jaume Cabre', last_updated_at = now()
  WHERE id = 'fde41bb7-7b6e-4b5f-86dc-8a840641fe6a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cabre';

-- liebst  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'J. M.', name_display = 'J. M. Calder', last_updated_at = now()
  WHERE id = 'c9407f2c-3d5a-41c2-860e-395a2ebdd881' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Calder';

-- geheimgesellschaften  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'E. R.', name_display = 'E. R. Carmin', last_updated_at = now()
  WHERE id = 'd258cf66-5728-4edc-9cd1-79ca4a71a229' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Carmin';

-- seele  [OpenLibrary-Titel, 1 Treffer, Alt: José Carreras | Jose Carreras]
UPDATE public.authors SET first_name = 'José', name_display = 'José Carreras', last_updated_at = now()
  WHERE id = 'f5323ea3-0806-4dc2-992f-5c133c296ed0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Carreras';

-- valle  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rosa', name_display = 'Rosa Cerrato', last_updated_at = now()
  WHERE id = 'a51b3e5f-ea61-4da5-a28e-927d7f4d7d1c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cerrato';

-- china pulver  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Herbert', name_display = 'Herbert Cerutti', last_updated_at = now()
  WHERE id = 'ca4679ce-05d4-468d-b778-d8fc0c28ebf7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cerutti';

-- leonella  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rosy', name_display = 'Rosy Chabbert', last_updated_at = now()
  WHERE id = '457e251e-061c-4361-9c16-99a4111e35c7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chabbert';

-- hurricane  [OpenLibrary-Titel, 3 Treffer, Alt: Terry Swinton Sam Chaiton]
UPDATE public.authors SET first_name = 'Sam', name_display = 'Sam Chaiton', last_updated_at = now()
  WHERE id = 'e111f475-513e-43df-b2ab-1d0656b932f8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chaiton';

-- Rom  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Eric R.', name_display = 'Eric R. Chamberlin', last_updated_at = now()
  WHERE id = '264044e2-b276-4ff0-86d2-b53cb1de851a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chamberlin';

-- sklavenkind  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Urmila', name_display = 'Urmila Chaudhary', last_updated_at = now()
  WHERE id = '4ab364f1-1ff4-4787-bd43-d2cba8d513ca' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chaudhary';

-- Mein Indien  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard Christ', last_updated_at = now()
  WHERE id = '4ac77b5d-1786-48c1-9748-80516311c2e6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Christ';

-- pelikan  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Chwin', last_updated_at = now()
  WHERE id = '77c8811f-b50c-4ed2-8ac7-5482e6d9abed' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chwin';

-- tolteken  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Norbert', name_display = 'Norbert Classen', last_updated_at = now()
  WHERE id = '7fc33a54-7a2b-457a-8bf0-fd5d156af2f3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Classen';

-- gefangene  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Nick', name_display = 'Nick Cole', last_updated_at = now()
  WHERE id = 'be97cc43-2237-4c02-9377-a1aacbe8394c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cole';

-- wind  [OpenLibrary-Titel, 1 Treffer, Alt: Markus S. Conley | Kevin Conley | Anne Conley]
UPDATE public.authors SET first_name = 'Robert J.', name_display = 'Robert J. Conley', last_updated_at = now()
  WHERE id = '5b237abc-2869-4f73-b68c-4fd7b5ac1f26' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Conley';

-- anaxandra | eiserne  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Eleanor', name_display = 'Eleanor Cooney', last_updated_at = now()
  WHERE id = '4424b6c4-9534-474f-9d2b-624855312d87' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cooney';

-- dente  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Marte', name_display = 'Marte Cormann', last_updated_at = now()
  WHERE id = '94d3fa57-b102-48d0-b387-58d7b8210063' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cormann';

-- beginenfeuer  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Marie', name_display = 'Marie Cristen', last_updated_at = now()
  WHERE id = 'd1e0be8e-38c6-4eae-9fc3-ce1538c510fd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cristen';

-- gabe | gabe true  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Alison', name_display = 'Alison Croggon', last_updated_at = now()
  WHERE id = '43ff6a59-c6fb-4ec2-b914-45985f0215aa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Croggon';

-- rides  [OpenLibrary-Titel, 1 Treffer, Alt: Caleb Crowther | Jan Crowther]
UPDATE public.authors SET first_name = 'Nicky', name_display = 'Nicky Crowther', last_updated_at = now()
  WHERE id = '1c199b68-5861-4166-95e9-a767824cda2f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Crowther';

-- bibliothek verlorenen | girifalco  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Domenico', name_display = 'Domenico Dara', last_updated_at = now()
  WHERE id = 'bf1e7e20-3dcb-4758-b05d-a2361f55e260' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dara';

-- tal lebens  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Darnton', last_updated_at = now()
  WHERE id = 'bb92a2e8-5cd3-497d-8906-10293ac7513b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Darnton';

-- bonsai  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Horst', name_display = 'Horst Daute', last_updated_at = now()
  WHERE id = '0f23bea8-e14a-416e-a274-2e8502cf5118' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Daute';

-- azteken | leidenschaft  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Nigel', name_display = 'Nigel Davies', last_updated_at = now()
  WHERE id = '5efa9ade-32d6-41ad-8d6f-536803239060' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Davies';

-- kunstdenkmaeler  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Georg Gottfried', name_display = 'Georg Gottfried Dehio', last_updated_at = now()
  WHERE id = '18efdcc8-95c3-4449-8b68-5efd058c82c8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dehio';

-- mississippi  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Maurice', name_display = 'Maurice Denuziere', last_updated_at = now()
  WHERE id = '7fe6ad09-37f9-4912-95e4-bcc497f44025' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Denuziere';

-- verborgene sprache blumen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Vanessa', name_display = 'Vanessa Diffenbaugh', last_updated_at = now()
  WHERE id = 'bd26402f-7e1c-4823-8292-7835c6a57927' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Diffenbaugh';

-- traumstrasse welt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Domnick', last_updated_at = now()
  WHERE id = 'ecd0453d-615e-4229-9a5a-685b87bf08ac' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Domnick';

-- internets  [OpenLibrary-Titel, 1 Treffer, Alt: Stephen Payne | E. Payne]
UPDATE public.authors SET first_name = 'Frances', name_display = 'Frances Payne', last_updated_at = now()
  WHERE id = 'cbb5da06-0819-4d86-aeb5-a4ecb0cd41ad' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Payne';

-- java  [OpenLibrary-Titel, 3 Treffer, Alt: Alexander Dunn]
UPDATE public.authors SET first_name = 'Douglas', name_display = 'Douglas Dunn', last_updated_at = now()
  WHERE id = '1d63b65a-3ad8-4a21-8f07-093fd33758d7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dunn';

-- keltennadel | society  [OpenLibrary-Titel, 1 Treffer, Alt: Timothy Dunne | Peter Dunne | Tim Dunne]
UPDATE public.authors SET first_name = 'Elisabeth', name_display = 'Elisabeth Dunne', last_updated_at = now()
  WHERE id = '7803595b-6e72-4492-b27f-3e68403ad544' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dunne';

-- gebieter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Tehmina', name_display = 'Tehmina Durrani', last_updated_at = now()
  WHERE id = 'c88fe1a2-96ec-4fb6-914e-3c58a2531a4f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Durrani';

-- Balthazar  [OpenLibrary-Titel, 1 Treffer, Alt: LAWRENCE Durrell]
UPDATE public.authors SET first_name = 'Lawrence', name_display = 'Lawrence Durrell', last_updated_at = now()
  WHERE id = '5b2775d9-3542-41ba-bfa7-d10a16ed24ba' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Durrell';

-- java swing  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Eckstein', last_updated_at = now()
  WHERE id = '93c38003-d586-411e-94aa-7d59e6a23cb9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eckstein';

-- leuchtende  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Eddings', last_updated_at = now()
  WHERE id = '2b2b9b55-7f8c-4b3c-92b4-2f2a673f1c4f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eddings';

-- fotografen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kim', name_display = 'Kim Edwards', last_updated_at = now()
  WHERE id = 'e7ac3166-f4e3-4ca7-b148-86091557b9a2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Edwards';

-- tokio  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Barry', name_display = 'Barry Eisler', last_updated_at = now()
  WHERE id = '493ce4cb-f878-40c1-a8f1-f67f08004bb0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eisler';

-- zirkel  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sara Bergmark', name_display = 'Sara Bergmark Elfgren', last_updated_at = now()
  WHERE id = 'a9800e9e-befb-438a-b3eb-2e767045f380' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elfgren';

-- easy santa barbara  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jörg Andrees', name_display = 'Jörg Andrees Elten', last_updated_at = now()
  WHERE id = 'cbe6057b-f6b2-43e3-a974-57152a3e773a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elten';

-- Das Anti-Pauk-Buch  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Endres', last_updated_at = now()
  WHERE id = '0c9c647f-4baf-4ae4-a9b9-ec08e170f750' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Endres';

-- osterinsel  [OpenLibrary-Titel, 1 Treffer, Alt: Sebastian Englert]
UPDATE public.authors SET first_name = 'Sebastián', name_display = 'Sebastián Englert', last_updated_at = now()
  WHERE id = '1f02416c-282f-4d3d-85f5-b1362c8b6492' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Englert';

-- strategen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Tobias', name_display = 'Tobias Escher', last_updated_at = now()
  WHERE id = '0667984c-3c04-4556-985f-e3acb6f75afb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Escher';

-- scheherzerade | stadt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Lilian', name_display = 'Lilian Faschinger', last_updated_at = now()
  WHERE id = '6fbebbf5-60b4-4259-8480-c30c1a959959' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Faschinger';

-- december  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sebastian', name_display = 'Sebastian Faulks', last_updated_at = now()
  WHERE id = '45710cc1-7d26-4031-ba0b-dbf13e56eeb5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Faulks';

-- sowjetunion  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Walter', name_display = 'Walter Feichtner', last_updated_at = now()
  WHERE id = '56be12d5-8210-49f6-90f2-87c2dce15533' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Feichtner';

-- weg derwisch  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Reshad', name_display = 'Reshad Feild', last_updated_at = now()
  WHERE id = 'c99687f1-ece8-4ba3-8713-3df30d7eec23' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Feild';

-- schnees  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sabine', name_display = 'Sabine Felmy', last_updated_at = now()
  WHERE id = '0f486d9d-048a-47fa-83ce-9005936b3076' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Felmy';

-- secret  [OpenLibrary-Titel, 4 Treffer, Alt: Urbanus Edmund Baughman]
UPDATE public.authors SET first_name = 'Dorothy', name_display = 'Dorothy Baughman', last_updated_at = now()
  WHERE id = '13bc754f-1d6d-4e83-8a9e-0bf870e0d143' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Baughman';

-- bint-anat  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Birgit', name_display = 'Birgit Fiolka', last_updated_at = now()
  WHERE id = '7c1928a0-4674-4df6-b27c-a1a9109472a6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fiolka';

-- klang  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Liv', name_display = 'Liv Winterberg', last_updated_at = now()
  WHERE id = 'f40e6c32-ffa6-477b-a741-0b0130196f0c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winterberg';

-- zilgrei  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Adriana', name_display = 'Adriana Zillo', last_updated_at = now()
  WHERE id = '39cb8452-3fff-45f4-8be2-874a373a7670' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zillo';

-- was menschenrechte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Fleiner', last_updated_at = now()
  WHERE id = '20452a24-16d0-47c8-960e-1b893f92080f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fleiner';

-- julia  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Anne', name_display = 'Anne Fortier', last_updated_at = now()
  WHERE id = '89525750-2906-48e7-a3aa-51dae43b086a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fortier';

-- kleinasien  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'George Ewart', name_display = 'George Ewart Bean', last_updated_at = now()
  WHERE id = '0040f2c1-51a4-4ec3-9d69-a831ad2378ce' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bean';

-- Das Reich der braunen Jakobiner  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Emil', name_display = 'Emil Franzel', last_updated_at = now()
  WHERE id = '2928ee62-015c-4ceb-b4ea-0c967d02fd04' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Franzel';

-- nabob  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Irène', name_display = 'Irène Frain', last_updated_at = now()
  WHERE id = '24b3f336-819c-4d61-a166-78775070d87c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Frain';

-- herzchirurgie  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Herbert W.', name_display = 'Herbert W. Franke', last_updated_at = now()
  WHERE id = 'ff12c3a4-8fbf-4dcf-8105-df66fcbfdce1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Franke';

-- himmelsbraut  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Astrid', name_display = 'Astrid Fritz', last_updated_at = now()
  WHERE id = 'ca56fc88-16c8-4f08-a3eb-2d2005bc4456' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fritz';

-- letzte herausforderung  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Lene', name_display = 'Lene Gammelgaard', last_updated_at = now()
  WHERE id = '6b222084-ec07-4733-b520-cea19ae61a47' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gammelgaard';

-- verratene  [OpenLibrary-Titel, 1 Treffer, Alt: Heinrich Gerlach]
UPDATE public.authors SET first_name = 'Heinrich', name_display = 'Heinrich Gerlach', last_updated_at = now()
  WHERE id = '3dbaf032-5b89-4536-a7d4-e909f58bbd81' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gerlach';

-- flusspiraten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Friedrich', name_display = 'Friedrich Gerstaecker', last_updated_at = now()
  WHERE id = '7b43170c-8719-47b6-83cb-a9fa62f870b9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gerstaecker';

-- tibetern  [OpenLibrary-Titel, 2 Treffer, Alt: Brigitte Gillessen]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Gillessen', last_updated_at = now()
  WHERE id = '6660b8f5-6b88-45f0-88ed-01638f8f5684' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gillessen';

-- tod  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Barbara M.', name_display = 'Barbara M. Gill', last_updated_at = now()
  WHERE id = 'a714c6cc-5b5f-435e-931a-52956d18c682' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gill';

-- Die ewigen Mayas; Zivilisation und Geschichte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rafael', name_display = 'Rafael Girard', last_updated_at = now()
  WHERE id = '21e124fe-b25c-4fb0-a5e2-28603fb5de88' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Girard';

-- Questions I have Always Wanted to ask  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Gitt', last_updated_at = now()
  WHERE id = 'e825b2a8-a397-4beb-b253-8ab82d9d9a92' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gitt';

-- alaska  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul H', name_display = 'Paul H Glaser', last_updated_at = now()
  WHERE id = 'bc375661-c668-469c-9735-3be723b38b65' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Glaser';

-- qumran  [OpenLibrary-Titel, 1 Treffer, Alt: Norman Golb]
UPDATE public.authors SET first_name = 'Raphael', name_display = 'Raphael Golb', last_updated_at = now()
  WHERE id = '1de5cac1-5867-4011-85a4-7c010f2010eb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Golb';

-- schreiben | whoopi  [OpenLibrary-Titel, 5 Treffer, Alt: Alexander Goldberg | A. Goldberg]
UPDATE public.authors SET first_name = 'Whoopi', name_display = 'Whoopi Goldberg', last_updated_at = now()
  WHERE id = '10eb7a6a-f6df-4d79-b908-4ee7e1bc19ba' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Goldberg';

-- angelique | rebellin  [OpenLibrary-Titel, 4 Treffer, Alt: Sergeanne Golon]
UPDATE public.authors SET first_name = 'Anne', name_display = 'Anne Golon', last_updated_at = now()
  WHERE id = 'e5c50f4e-0896-453d-9aad-22a153130cdc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Golon';

-- propheten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Terry', name_display = 'Terry Goodkind', last_updated_at = now()
  WHERE id = '6a4544f1-0d15-454b-a807-dbcc6da87dd8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Goodkind';

-- werbung  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Howard Luck', name_display = 'Howard Luck Gossage', last_updated_at = now()
  WHERE id = '03159e9a-8c93-4ce7-98c6-5e3d22c51ccf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gossage';

-- gladiator | perfect  [OpenLibrary-Titel, 4 Treffer, Alt: Peter Gram]
UPDATE public.authors SET first_name = 'Dewey', name_display = 'Dewey Gram', last_updated_at = now()
  WHERE id = '3eba45a1-d1a2-443d-98d6-3cf57f026dcd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gram';

-- liebe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Almudena', name_display = 'Almudena Grandes', last_updated_at = now()
  WHERE id = 'a15f6753-d5ca-4481-94e9-12961c3da1c5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grandes';

-- Das ABC des Call Center Management. Die wichtigsten Fachbegriffe rund   [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Günter', name_display = 'Günter Greff', last_updated_at = now()
  WHERE id = '4fc297ce-7f3c-4e7c-af19-7a9ec58c37c0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Greff';

-- prinzip  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hélène', name_display = 'Hélène Gremillon', last_updated_at = now()
  WHERE id = 'f0302281-5388-491a-8ff9-8e4bae83065e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gremillon';

-- frequenz ekstase  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Chris', name_display = 'Chris Griscom', last_updated_at = now()
  WHERE id = '0db38eb7-1b5d-4f67-a25d-61d0d6f670c1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Griscom';

-- revolution | rot  [OpenLibrary-Titel, 1 Treffer, Alt: S. M. Zeller | Christian Zeller | Hermann Zeller]
UPDATE public.authors SET first_name = 'Jules Sylvain', name_display = 'Jules Sylvain Zeller', last_updated_at = now()
  WHERE id = 'd0bfda64-6883-4598-b3a9-0c9a3a6032e2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zeller';

-- koskas  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Olivier', name_display = 'Olivier Guez', last_updated_at = now()
  WHERE id = '816f8df3-e138-4821-88d1-df2a17ed9309' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Guez';

-- zypressen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Yael', name_display = 'Yael Guiladi', last_updated_at = now()
  WHERE id = '78f5b874-a910-46af-a68d-5c3453f6e525' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Guiladi';

-- fahndung | rentenplaner | verborgene  [OpenLibrary-Titel, 3 Treffer, Alt: Johann Friedrich Hahn]
UPDATE public.authors SET first_name = 'Ulla', name_display = 'Ulla Hahn', last_updated_at = now()
  WHERE id = '45876ea0-8841-4e75-b269-fe20669d00ea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hahn';

-- wirklich wichtig  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Hahne', last_updated_at = now()
  WHERE id = '4ef8834a-c711-4fac-9d6c-9f550934d01c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hahne';

-- radio journalismus  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Walther', name_display = 'Walther von La Roche', namenszusatz = 'von La', last_updated_at = now()
  WHERE id = '6ff5dd4e-d2d3-4649-a35f-d69e384d7b22' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Roche';

-- schriftsteller  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Dorothea', name_display = 'Dorothea Brande', last_updated_at = now()
  WHERE id = 'b68c2da3-a9df-4d8a-b5e5-148fc5d892b3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brande';

-- mass  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard North Patterson', last_updated_at = now()
  WHERE id = '22cd3d50-e198-4ac8-aae9-339ada8d4bb1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'North Patterson';

-- vorfahren  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Siegfried', name_display = 'Siegfried von Vegesack', namenszusatz = 'von', last_updated_at = now()
  WHERE id = '78191b7b-5a71-47b1-a61a-abeaf2611cf1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Vegesack';

-- banditen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Phoolan', name_display = 'Phoolan Devi', last_updated_at = now()
  WHERE id = '7be4ae6e-d623-4b60-9a50-d738b83220f8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Devi';

-- kleopatra  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Georg Moritz', name_display = 'Georg Moritz Ebers', last_updated_at = now()
  WHERE id = '098842fc-6ab2-48ee-91c0-23a06933593c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ebers';

-- ritual  [OpenLibrary-Titel, 1 Treffer, Alt: Margaret Smith | Brian K. Smith | Judith Smith]
UPDATE public.authors SET first_name = 'Susan Marie', name_display = 'Susan Marie Smith', last_updated_at = now()
  WHERE id = '445381f9-04d0-45f3-a581-4d0b1a180cc7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Smith';

-- caen | story  [OpenLibrary-Titel, 5 Treffer, Alt: Robert Mckee | David Mckee]
UPDATE public.authors SET first_name = 'Alexander', name_display = 'Alexander Mckee', last_updated_at = now()
  WHERE id = 'ccc72f2f-796c-458a-b47f-7e68bbdd7d3e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mckee';

-- gong kaiser  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Monnica', name_display = 'Monnica Hackl', last_updated_at = now()
  WHERE id = '25164bc8-16c2-4b3a-9bd7-67652827dd8d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hackl';

COMMIT;

-- Kontrolle danach:
-- SELECT count(*) FROM public.authors WHERE NULLIF(btrim(first_name),'') IS NULL;
