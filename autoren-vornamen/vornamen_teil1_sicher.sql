-- Vornamen ergänzen – Teil 1: Sicherheit hoch + mittel
-- 419 Autoren. Nur Einträge, die (noch) keinen Vornamen haben, werden geändert.
-- In DBeaver: Datei öffnen, Verbindung wählen (zuerst Test-Branch!), Alt+X / ⌥X.
-- Erwartet: 419x "Updated rows: 1" (0 = Autor wurde inzwischen schon geändert, das ist ok).

BEGIN;

-- ===== Sicherheit: hoch (279) =====

-- Die Girls von Riad  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rajaa', name_display = 'Rajaa Alsanea', last_updated_at = now()
  WHERE id = 'e33273af-ac48-4d59-8479-cc2c9dd97bcd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alsanea';

-- Schindler's ark | schindlers  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Keneally', last_updated_at = now()
  WHERE id = '681d5c78-1b9e-41dc-8ec7-188f76ba4db5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Keneally';

-- Malik der Wolf | malik  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'George', name_display = 'George Halban', last_updated_at = now()
  WHERE id = '52458e00-cde4-4efb-ab63-66b66efcaeba' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Halban';

-- The captive press in the Third Reich  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Oron J.', name_display = 'Oron J. Hale', last_updated_at = now()
  WHERE id = '19f5bd84-b025-4605-bc10-b2f544bc88f0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hale';

-- City on fire  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Garth Risk', name_display = 'Garth Risk Hallberg', last_updated_at = now()
  WHERE id = 'd137b683-b8ae-48a4-97f3-2172e1a8577e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hallberg';

-- Fliegen kann jeder  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Günther Maria', name_display = 'Günther Maria Halmer', last_updated_at = now()
  WHERE id = 'c91d88d1-0e2d-4320-a953-3e3003c2d180' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Halmer';

-- Der Mund  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Laurence', name_display = 'Laurence Haloche', last_updated_at = now()
  WHERE id = '08650ac7-4af2-4a32-8a0b-da1acee8b4b3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Haloche';

-- Elisabeth | mozart  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Brigitte', name_display = 'Brigitte Hamann', last_updated_at = now()
  WHERE id = 'a4d3da1e-8b29-4654-b03a-1e34e550d53f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hamann';

-- Portugal. Richtig reisen. Reise- Handbuch  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gerd', name_display = 'Gerd Hammer', last_updated_at = now()
  WHERE id = 'c8825873-d29f-4b47-996b-3016e5d1a06e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hammer';

-- Treffen sich zwei  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Iris', name_display = 'Iris Hanika', last_updated_at = now()
  WHERE id = '993b2dc9-706c-4163-857d-90ece32e63f5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hanika';

-- PHP und MySQL fu r Kids  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Johann-Christian', name_display = 'Johann-Christian Hanke', last_updated_at = now()
  WHERE id = '575eff1b-0f90-4e2f-989a-820fc2b98edb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hanke';

-- House of the Wind  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Titania', name_display = 'Titania Hardie', last_updated_at = now()
  WHERE id = '87f9415f-abf0-4248-bcbe-52fecdad2ce2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hardie';

-- Sensei  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Charney', last_updated_at = now()
  WHERE id = '698b0df4-3614-49c3-bf5b-b09d33f1873c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Charney';

-- Drei Jäger auf dem Meeresgrund | Unberührte Tiefen | Unter Korallen un  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Hass', last_updated_at = now()
  WHERE id = 'f8be7a22-00a4-4c63-8683-15d51726d361' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hass';

-- schwarzrotgeld  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bodo H.', name_display = 'Bodo H. Hauser', last_updated_at = now()
  WHERE id = '649be336-354b-4e46-80ba-e2c3b643705c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hauser';

-- Hin und weg  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ethan', name_display = 'Ethan Hawke', last_updated_at = now()
  WHERE id = '3c1fe37e-a69d-48dd-991d-0f27e97b3a97' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hawke';

-- The Girl on the Train  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Paula', name_display = 'Paula Hawkins', last_updated_at = now()
  WHERE id = '6ff510f2-760a-485b-ba74-9beaf2d45d1a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hawkins';

-- Erdoğan  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Çiğdem', name_display = 'Çiğdem Akyol', last_updated_at = now()
  WHERE id = '0ca9c7fc-bcf7-450c-a094-80c146c69f87' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Akyol';

-- Building a Second Brain  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tiago', name_display = 'Tiago Forte', last_updated_at = now()
  WHERE id = '675e0784-3b92-40aa-ac9b-0728a9a0e5f0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Forte';

-- Die Feuer von Glenlochy  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Constance', name_display = 'Constance Heaven', last_updated_at = now()
  WHERE id = 'd3870e71-4039-4b04-bfa9-43adac0b3152' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heaven';

-- Keine Angst vor der Angst | frau  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Klaus', name_display = 'Klaus Heilmann', last_updated_at = now()
  WHERE id = '11a18612-16f0-4005-8010-94b4c42aaa76' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heilmann';

-- Unser Charly, Ein Affe ermittelt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anna', name_display = 'Anna Heincke', last_updated_at = now()
  WHERE id = 'dcefe686-9e87-4042-a6c7-217fa4bfc092' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heincke';

-- Finale der Pippenspieler  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Uwe A. O.', name_display = 'Uwe A. O. Heinlein', last_updated_at = now()
  WHERE id = 'cdc27fa6-b6e7-4b48-964b-3bff0a0212b4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heinlein';

-- Das Ende der Geduld: Konsequent gegen jugendliche Gewalttäter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kirsten', name_display = 'Kirsten Heisig', last_updated_at = now()
  WHERE id = '36ce6443-fc51-48c8-a1a1-6f11104b29ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heisig';

-- Ritus  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Markus', name_display = 'Markus Heitz', last_updated_at = now()
  WHERE id = '09647886-d89b-454e-be3e-0489995038b1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heitz';

-- Die rote Zora und ihre Bande  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Held', last_updated_at = now()
  WHERE id = '3ac13423-c6c6-4ee0-8f16-d2708e70bcaf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Held';

-- Ten thousand saints  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eleanor', name_display = 'Eleanor Henderson', last_updated_at = now()
  WHERE id = '3ac40c36-4c2d-4672-8247-a7c8493665d5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Henderson';

-- Nur der Himmel ist höher. Mein Weg auf den Mount Everest  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Helga', name_display = 'Helga Hengge', last_updated_at = now()
  WHERE id = 'affa0c41-2204-4065-9b2f-a319f52d1047' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hengge';

-- Der verirrte Messias  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Henisch', last_updated_at = now()
  WHERE id = 'b1e71420-87ca-4866-aab9-cce93605e9ed' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Henisch';

-- Die Ethik des Erfolgs. Spielregeln für die globalisierte Gesellschaft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans-Olaf', name_display = 'Hans-Olaf Henkel', last_updated_at = now()
  WHERE id = '9a09b705-4ad0-4ddc-97bb-641c3d3ca086' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Henkel';

-- Dolce Madonna Bionda  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eckhard', name_display = 'Eckhard Henscheid', last_updated_at = now()
  WHERE id = '45334530-328a-4fb5-b931-4c541672183b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Henscheid';

-- How to Be Good  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nick', name_display = 'Nick Hornby', last_updated_at = now()
  WHERE id = '6f1fe0d0-0aa2-4ca8-8445-e7a1a4650d4f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hornby';

-- futebol  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Alex', name_display = 'Alex Bellos', last_updated_at = now()
  WHERE id = '2c4b68aa-6416-42fb-aebb-155a63f9f7e1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bellos';

-- Liebe im Schatten der Krone | schatten florenz  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eleanor', name_display = 'Eleanor Herman', last_updated_at = now()
  WHERE id = 'e7faf449-e32e-4987-8d04-330596715663' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Herman';

-- Unbekannter Nachbar Sowjetunion  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Regula', name_display = 'Regula Heusser', last_updated_at = now()
  WHERE id = 'ea43bb1b-c1d4-4475-959d-2a962a9d0177' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heusser';

-- Der Himmel so fern | spaet  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kajsa', name_display = 'Kajsa Ingemarsson', last_updated_at = now()
  WHERE id = '94921718-68cb-4d93-9633-44614a9f9f11' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ingemarsson';

-- Ahasver  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Heym', last_updated_at = now()
  WHERE id = '400f1da7-06cf-4ae2-96de-9a09ec8847ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heym';

-- Die Alpen im Luftbild | zugspitze  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Toni', name_display = 'Toni Hiebeler', last_updated_at = now()
  WHERE id = '42e410da-3b70-48f5-a029-1cc2d0c887a3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hiebeler';

-- williwaw  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tom', name_display = 'Tom Bodett', last_updated_at = now()
  WHERE id = '3cad6978-5a22-4f26-8189-f9f02b06de5a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bodett';

-- sibirski punk  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Merle', name_display = 'Merle Hilbk', last_updated_at = now()
  WHERE id = '6f9302bf-5768-43fc-8edd-81f2147f218c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hilbk';

-- Das Lied der Brandung  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joanna', name_display = 'Joanna Hines', last_updated_at = now()
  WHERE id = 'fa216f58-7ce7-410c-842e-cfea7b8581f6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hines';

-- The Outsiders | kampffische  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'S. E.', name_display = 'S. E. Hinton', last_updated_at = now()
  WHERE id = 'adc7622b-1d09-4a54-97df-518df314800b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hinton';

-- Wenn der Job zur Hölle wird. Seelische Gewalt am Arbeitsplatz und wie   [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marie-France', name_display = 'Marie-France Hirigoyen', last_updated_at = now()
  WHERE id = '2813a079-49d7-4304-934f-46ccc74ab19d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hirigoyen';

-- Kabul  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'M. E.', name_display = 'M. E. Hirsh', last_updated_at = now()
  WHERE id = '17675a98-b55a-42ca-89a9-0e2e876c6cbc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hirsh';

-- frauen liebe | report  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Shere', name_display = 'Shere Hite', last_updated_at = now()
  WHERE id = 'ee7666fd-447c-409b-aa95-7e213b5939ae' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hite';

-- fleischfabrik  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anton', name_display = 'Anton Hofreiter', last_updated_at = now()
  WHERE id = '8f73a019-7746-4eaf-8120-c7d2c10419b2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hofreiter';

-- Roter Schnee  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Günther', name_display = 'Günther Hofe', last_updated_at = now()
  WHERE id = 'd4a73f6c-0a18-45cb-8212-aff9a0c1c9ab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hofe';

-- Die Entfesselung des zweiten Weltkrieges  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Walther', name_display = 'Walther Hofer', last_updated_at = now()
  WHERE id = 'cea2401d-0bc0-4965-b2e1-a94b1f11fc02' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hofer';

-- australien  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Edgar P.', name_display = 'Edgar P. Hoff', last_updated_at = now()
  WHERE id = '65a7a420-16cf-467e-a5cf-7d8ff62ffc07' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hoff';

-- Boston Jane und der unheimliche Fremde. | waeldern  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jennifer L.', name_display = 'Jennifer L. Holm', last_updated_at = now()
  WHERE id = '7605bed8-e02f-4b0c-9520-4a37a7ee2a9f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Holm';

-- Friedrich II., der Staufer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eberhard', name_display = 'Eberhard Horst', last_updated_at = now()
  WHERE id = 'c0bc6cfd-d200-482c-8426-c95fba89f1e8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Horst';

-- Bring It!  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tony', name_display = 'Tony Horton', last_updated_at = now()
  WHERE id = 'e16325ef-1ee1-41f3-a81a-08ece536f35c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Horton';

-- Glueckliche Reise | trendbuero  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Matthias', name_display = 'Matthias Horx', last_updated_at = now()
  WHERE id = '342e6b5f-a87e-4deb-807c-0d4b1837c808' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Horx';

-- Die Geschichte der arabischen Völker  [OpenLibrary-ISBN, 2 Treffer, Alt: Albert Habib Hourani]
UPDATE public.authors SET first_name = 'Albert', name_display = 'Albert Hourani', last_updated_at = now()
  WHERE id = 'f15947e7-a650-4292-9e0d-ee216e803204' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hourani';

-- penmarric | reichen anders  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Susan', name_display = 'Susan Howatch', last_updated_at = now()
  WHERE id = '7a5f51f3-edd5-4b5c-b011-6922ff60cf15' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Howatch';

-- Delivering happiness  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tony', name_display = 'Tony Hsieh', last_updated_at = now()
  WHERE id = '9b9acbf0-12cd-4403-bab6-28cd75da6522' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hsieh';

-- Dianetik  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'L. Ron', name_display = 'L. Ron Hubbard', last_updated_at = now()
  WHERE id = '3bf3844d-8f9d-4442-8656-bdc524f138b2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hubbard';

-- Der Apfelbaum  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Berkel', last_updated_at = now()
  WHERE id = '020382eb-7c61-4065-b854-102378b3d832' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Berkel';

-- Das Bermuda Dreieck - Fenster zum Kosmos? | kontinent  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Charles', name_display = 'Charles Berlitz', last_updated_at = now()
  WHERE id = '7650e2a9-57a6-437d-a011-be74a3bbd50d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Berlitz';

-- Kampf der Kulturen: Die Neugestaltung der Weltpolitik im 21. Jahrhunde  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Samuel P.', name_display = 'Samuel P. Huntington', last_updated_at = now()
  WHERE id = '1ac1550e-11be-4c6b-a605-91f4fcea356a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Huntington';

-- The Blazing World  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Siri', name_display = 'Siri Hustvedt', last_updated_at = now()
  WHERE id = '59611b76-fd52-4af9-b50a-a47c7ed6e034' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hustvedt';

-- asja  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Ignatieff', last_updated_at = now()
  WHERE id = '200c9a4c-422f-4426-aea2-aae09ad7cc5d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ignatieff';

-- Scotland the best  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Irvine', last_updated_at = now()
  WHERE id = '445c7b56-77b3-4687-ba61-679408e4d96b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Irvine';

-- After all these years  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Susan', name_display = 'Susan Isaacs', last_updated_at = now()
  WHERE id = '7287aa2a-789c-47fd-a1c4-5d060cceb9e0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Isaacs';

-- ketzer | phropheten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Mattias', name_display = 'Mattias Gerwald', last_updated_at = now()
  WHERE id = '7abc7944-9f3f-4972-94e5-bd021a5cadf8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gerwald';

-- Suleika öffnet die Augen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gusel', name_display = 'Gusel Jachina', last_updated_at = now()
  WHERE id = 'd918bd18-b643-4760-a278-126f9f9e9cc4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jachina';

-- Das Labyrinth von London  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Benedict', name_display = 'Benedict Jacka', last_updated_at = now()
  WHERE id = '46e22c7b-1f47-462a-bb17-b6406e886b5f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jacka';

-- Die Festung | fettloeserin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Henry', name_display = 'Henry Jaeger', last_updated_at = now()
  WHERE id = 'bd4b5bcc-0abc-420b-9166-79390fef7bf5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jaeger';

-- Der neue Minuten Manager  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kenneth', name_display = 'Kenneth Blanchard', last_updated_at = now()
  WHERE id = '8067faa4-e4ff-4e21-99bc-bd62b48e7fe0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Blanchard';

-- Die Königin der Seidenstraße | koenigin seidenstrasse  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Agnes', name_display = 'Agnes Imhof', last_updated_at = now()
  WHERE id = '6c7ab422-5fcf-48cb-82d8-53b4848fff22' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Imhof';

-- neuengland  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eleanor', name_display = 'Eleanor Berman', last_updated_at = now()
  WHERE id = '6271c9bf-b0f9-4a08-a232-10cd7a410ae8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Berman';

-- onedin kapitaen reeder | romanleserin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Pearl', name_display = 'Pearl Abraham', last_updated_at = now()
  WHERE id = '84d01cd1-ee51-4e68-bd69-440d417671a8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Abraham';

-- medici-siegel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Theresa', name_display = 'Theresa Breslin', last_updated_at = now()
  WHERE id = '3e5db8ed-37ee-4067-bfcb-e0fb0f0baa46' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Breslin';

-- Gebrauchsanweisung für Brasilien  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Burghardt', last_updated_at = now()
  WHERE id = '75b1f013-ea7f-47a2-8877-53b6d5ab4ecb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Burghardt';

-- Willst du normal sein oder glücklich?  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Betz', last_updated_at = now()
  WHERE id = 'abec6b2d-48bc-4925-9016-9f6658773d50' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Betz';

-- Mittelreich  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Josef', name_display = 'Josef Bierbichler', last_updated_at = now()
  WHERE id = '0a4844cc-c661-4f97-a563-b975401f357c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bierbichler';

-- Die Wiedergeburten des Tao  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wesley', name_display = 'Wesley Chu', last_updated_at = now()
  WHERE id = '1c344e47-0880-4a99-9690-f9b11d4d5b50' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chu';

-- Als Der Blues Begann  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Janice', name_display = 'Janice Deaner', last_updated_at = now()
  WHERE id = '04937aa3-9085-4e4d-8534-affeb9f911b1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Deaner';

-- Die Phantasie ist eine Frau. Sechsundzwanzig Originalerzählungen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ingeborg', name_display = 'Ingeborg Mues', last_updated_at = now()
  WHERE id = '96020883-6524-417f-b272-c6412b9361ac' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mues';

-- Das Tor zum Garten der Zambranos. | Die Wolke  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Gudrun', name_display = 'Gudrun Pausewang', last_updated_at = now()
  WHERE id = '0994bf8f-ad85-49c9-9e2c-3ca077db8983' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pausewang';

-- Tokio besetzte Stadt | tokio jahr null  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Peace', last_updated_at = now()
  WHERE id = '748cc2a1-d3b8-45c1-bf61-006bb5cbfd0b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Peace';

-- Adel vernichtet. Ein Malaussene- Roman  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Daniel', name_display = 'Daniel Pennac', last_updated_at = now()
  WHERE id = '1c4bfee3-d446-4e34-ac4b-3b3b416c0e35' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pennac';

-- Das Leben ist keine Waldorfschule  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Mischa-Sarim', name_display = 'Mischa-Sarim Verollet', last_updated_at = now()
  WHERE id = '50f0be17-2c0c-42a0-8897-086626ffadff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Verollet';

-- Sport in der Klassengesellschaft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gerhard', name_display = 'Gerhard Vinnai', last_updated_at = now()
  WHERE id = '749ded22-22d0-4fdd-a5a3-56e7f41c8f49' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Vinnai';

-- Die Natur des Menschen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eckart', name_display = 'Eckart Voland', last_updated_at = now()
  WHERE id = '48bebc3f-bcdf-4b61-8b5a-29db514c5bf9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Voland';

-- Indien im Monsun  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Vera', name_display = 'Vera Vuckovacki', last_updated_at = now()
  WHERE id = '25622aa9-cdba-4293-8ae6-ac05482c0413' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Vuckovacki';

-- Hunger nach weniger. Geschichte einer Magersucht.  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jessica', name_display = 'Jessica Antonis', last_updated_at = now()
  WHERE id = 'c84f3e70-3e8e-4fdf-9e8c-070438fa7ab9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Antonis';

-- Alte Sorten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ewald', name_display = 'Ewald Arenz', last_updated_at = now()
  WHERE id = '4868d1ad-54ab-4fb5-9127-45b3419c68e9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Arenz';

-- Die Erde von oben - Tag fur Tag  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Yann', name_display = 'Yann Arthus-Bertrand', last_updated_at = now()
  WHERE id = 'b6566d20-6f1f-42a1-a537-14cd37faffec' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Arthus-Bertrand';

-- Kurdistan  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Namo', name_display = 'Namo Aziz', last_updated_at = now()
  WHERE id = '666644c5-75a4-4674-9381-03edc8150322' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Aziz';

-- Erotische Geschichten aus China  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Adrian', name_display = 'Adrian Baar', last_updated_at = now()
  WHERE id = '62eebd18-e9fa-4d6f-a9ec-d99210905cc3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Baar';

-- Lakota Moon  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Antje', name_display = 'Antje Babendererde', last_updated_at = now()
  WHERE id = 'c80b00aa-3047-4ff7-a0a6-88c6feff178c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Babendererde';

-- Dann fahr doch gleich nach Haus! | gummibaerchen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dietmar', name_display = 'Dietmar Bittrich', last_updated_at = now()
  WHERE id = 'bb1af159-6e21-41cb-b3d3-b646990aa78a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bittrich';

-- Stadt der Diebe | alles anfang  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Benioff', last_updated_at = now()
  WHERE id = '76f1a952-a10a-4f36-9838-4211fc40fc80' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benioff';

-- Das Leben, ein Klang  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joachim Ernst', name_display = 'Joachim Ernst Berendt', last_updated_at = now()
  WHERE id = '83d4811f-db15-4bcd-bfc4-56730e2ea598' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Berendt';

-- Ulrich Wickert  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Cornelia', name_display = 'Cornelia Bolesch', last_updated_at = now()
  WHERE id = '97d15a60-77ec-4e06-92c9-b38166a96e25' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bolesch';

-- Porsche  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marc', name_display = 'Marc Bongers', last_updated_at = now()
  WHERE id = '97f26df2-a289-4215-9a0b-2802fe479053' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bongers';

-- Dies ist nicht mein Land | hoehenwege  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lea', name_display = 'Lea Fleischmann', last_updated_at = now()
  WHERE id = '3116127b-f5eb-485a-8f01-58de28bae2d7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fleischmann';

-- Verschlusssache Jesus | verschlusssache  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Baigent', last_updated_at = now()
  WHERE id = '01420254-59fb-4775-9dd1-3f44aadf6117' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Baigent';

-- Koraloona | Magari | Tanamera  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Noel', name_display = 'Noel Barber', last_updated_at = now()
  WHERE id = '757f4be4-fd33-45a0-873e-e957f043812b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barber';

-- alleinsein  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans Eckehard', name_display = 'Hans Eckehard Bahr', last_updated_at = now()
  WHERE id = '178d6d84-ced3-4fc5-bdf7-ffa49451eddc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bahr';

-- Bretonische Brandung  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jean-Luc', name_display = 'Jean-Luc Bannalec', last_updated_at = now()
  WHERE id = '02362ca0-a826-4012-b5ec-d29ed3641a76' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bannalec';

-- Wo das Herz wohnt. Meine verlorene Heimat am Hindukusch | herz  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Homera', name_display = 'Homera Barak', last_updated_at = now()
  WHERE id = 'a36c06d6-51b1-4bb5-a7fc-dfbf476428ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barak';

-- Psychoanalyse des Geldes  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ernest', name_display = 'Ernest Borneman', last_updated_at = now()
  WHERE id = '9cf9aa3e-e2e8-49cf-9bd9-c74be20f169b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Borneman';

-- Die Katharer | Lebensformen im Mittelalter  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Arno', name_display = 'Arno Borst', last_updated_at = now()
  WHERE id = '6967ea2d-9f36-49c6-b2e2-4f38ab6a07ae' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Borst';

-- Der Kandidat F. J. Strauss  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Manfred', name_display = 'Manfred Bosch', last_updated_at = now()
  WHERE id = '8d6fddcb-9a72-4d1f-ade5-bf73180af120' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bosch';

-- Geschichte des Mittelalters  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Karl', name_display = 'Karl Bosl', last_updated_at = now()
  WHERE id = '19e66814-4183-4cc0-bc87-9ada1bbd6805' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bosl';

-- Gesammelte Werke 2. So mag er fallen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Bowles', last_updated_at = now()
  WHERE id = 'fdafe93b-7bc9-4ecd-b154-0d64c10589f6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bowles';

-- South American handbook  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ben', name_display = 'Ben Box', last_updated_at = now()
  WHERE id = '6f1b4755-5eb7-4b67-8a4e-55f5598cebe0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Box';

-- Eisenvogel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Yangzom', name_display = 'Yangzom Brauen', last_updated_at = now()
  WHERE id = 'ac80e714-3e6e-4a39-9444-a8793d77b65b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brauen';

-- drachensturz | international | landschaft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Braunburg', last_updated_at = now()
  WHERE id = '782c1699-d863-40ac-a870-464d1897541f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Braunburg';

-- Südwesten USA  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Manfred', name_display = 'Manfred Braunger', last_updated_at = now()
  WHERE id = '2c9295b3-1118-40bf-829c-707dc8c16c1c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Braunger';

-- Willst Du glücklich sein im Leben. Geschichten von gestern - Geschicht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ilse Gräfin', name_display = 'Ilse Gräfin von Bredow', namenszusatz = 'von', last_updated_at = now()
  WHERE id = '659fcb4b-c6d2-4783-b55d-707ab45b7c06' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bredow';

-- Uganda | kinderleicht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Philip', name_display = 'Philip Briggs', last_updated_at = now()
  WHERE id = 'f4030ec2-736c-4982-a6e4-703cd5be4135' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Briggs';

-- canaris  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'André', name_display = 'André Brissaud', last_updated_at = now()
  WHERE id = 'e8fd6a1c-20a9-435b-8eca-29691abf9300' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brissaud';

-- Diebin der Nacht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Connie', name_display = 'Connie Brockway', last_updated_at = now()
  WHERE id = '7629531b-c745-41dc-a3e6-26051c8be31e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brockway';

-- Die Vergeltung - Rhoon 1944  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jan', name_display = 'Jan Brokken', last_updated_at = now()
  WHERE id = 'e385d083-4dd6-47e6-9af3-08e068f9df36' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brokken';

-- Meines Vaters Land (German Edition)  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wibke', name_display = 'Wibke Bruhns', last_updated_at = now()
  WHERE id = '17fbbd96-0c6d-471e-ac47-92f3a34757ea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bruhns';

-- USA - der Osten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Horst', name_display = 'Horst Brummer', last_updated_at = now()
  WHERE id = '65629bf5-c743-4152-892e-f048ed10412d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brummer';

-- Impfen. Das Geschäft mit der Angst  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gerhard', name_display = 'Gerhard Buchwald', last_updated_at = now()
  WHERE id = 'b52717d0-4f34-43c9-994f-5a9db2bb935d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Buchwald';

-- Geschichte der Raumfahrt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Buedeler', last_updated_at = now()
  WHERE id = '950851c1-3e29-4ec9-8bbd-cdb6fcc0a30f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Buedeler';

-- Spanien  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hanns', name_display = 'Hanns Buisman', last_updated_at = now()
  WHERE id = 'cb30385f-1b4b-447f-8793-312ee6eba21f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Buisman';

-- Hollywood. Roman | eisgang  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Charles', name_display = 'Charles Bukowski', last_updated_at = now()
  WHERE id = '667cb2aa-ab17-4cef-a37a-7a4274d5f4ab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bukowski';

-- Tarzan  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Edgar Rice', name_display = 'Edgar Rice Burroughs', last_updated_at = now()
  WHERE id = '67b7b6d5-20d9-4f00-870c-d74e7d56d224' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Burroughs';

-- Plötzlich Prinzessin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Meg', name_display = 'Meg Cabot', last_updated_at = now()
  WHERE id = 'ebd950c8-f89f-494d-aa69-1044f648893f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cabot';

-- Aus Liebe zum Wahnsinn  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Georg', name_display = 'Georg Cadeggianini', last_updated_at = now()
  WHERE id = '27af4cbe-8099-478b-ab64-debdc4e8df92' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cadeggianini';

-- Blue River  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ethan', name_display = 'Ethan Canin', last_updated_at = now()
  WHERE id = '35930752-e819-44c6-ae2a-68dfb352dec0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Canin';

-- A tree of night: and other stories | tiffany  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Truman', name_display = 'Truman Capote', last_updated_at = now()
  WHERE id = '52112dbf-08ae-4743-bd15-54fad0b152c6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Capote';

-- Verbrannte Erde. Die Schlacht zwichen Wolga und Weichsel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Carell', last_updated_at = now()
  WHERE id = '71be7aab-00d1-4c29-a724-c244cc592fe4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Carell';

-- Elfenbein  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Massimo', name_display = 'Massimo Carra', last_updated_at = now()
  WHERE id = 'b7fde6b1-00c3-498c-835d-d7ebee2fcd08' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Carra';

-- mill-farm  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Elisabeth', name_display = 'Elisabeth Castonier', last_updated_at = now()
  WHERE id = '73e8f7c2-113e-400a-8894-37f01463dd11' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Castonier';

-- Ankommen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bülent', name_display = 'Bülent Ceylan', last_updated_at = now()
  WHERE id = 'aa65797b-4ade-4168-85ea-61ce443c8363' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ceylan';

-- aufschrei  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Truddi', name_display = 'Truddi Chase', last_updated_at = now()
  WHERE id = '57b99b32-85c8-4cec-8380-1817a765dfe7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chase';

-- Kulturschock China.  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hanne', name_display = 'Hanne Chen', last_updated_at = now()
  WHERE id = 'dc1a8b65-9ca1-4e01-b6ef-778aa06ef386' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chen';

-- Das Mädchen mit dem Perlenohrring  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tracy', name_display = 'Tracy Chevalier', last_updated_at = now()
  WHERE id = '14c7f38b-b10b-4171-8fdb-7509e2bc21a4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chevalier';

-- Eure Ehre - unser Leid | toechter ehre  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Serap', name_display = 'Serap Cileli', last_updated_at = now()
  WHERE id = '685ecf03-2526-483a-83fe-69a9cbf7d28b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cileli';

-- Merde Actually | merde actually  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Stephen', name_display = 'Stephen Clarke', last_updated_at = now()
  WHERE id = '2ce18ce3-ae04-4ea5-a83f-f278e70c6975' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Clarke';

-- The World According to Clarkson  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jeremy', name_display = 'Jeremy Clarkson', last_updated_at = now()
  WHERE id = '86844439-40da-41a1-87e9-6f852d82bb53' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Clarkson';

-- Der reichste Mann von Babylon | reichste  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'George S.', name_display = 'George S. Clason', last_updated_at = now()
  WHERE id = 'e3c0552d-352f-4a42-8876-4325a6aa6e5d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Clason';

-- pharaonen | revolution  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter A.', name_display = 'Peter A. Clayton', last_updated_at = now()
  WHERE id = 'b7283ca5-3e7a-4a0d-b8c8-5851715a1cf7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Clayton';

-- Diana-Taschenbücher, Nr.57, Eine Liebe in Indien | indien  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Catherine', name_display = 'Catherine Clement', last_updated_at = now()
  WHERE id = '466d6ee9-c4e3-403d-b820-2aeab7a2c38a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Clement';

-- Mein Leben  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bill', name_display = 'Bill Clinton', last_updated_at = now()
  WHERE id = 'bb2d138e-541c-4813-aaa0-0f740e46287a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Clinton';

-- Ebola  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'William Dr', name_display = 'William Dr Close', last_updated_at = now()
  WHERE id = '7ac65287-aff0-4043-80c2-f85be50166c8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Close';

-- Das Leben - Live  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sam', name_display = 'Sam Colman', last_updated_at = now()
  WHERE id = '09af479c-55b4-4aeb-86e8-2d87ba2ab08c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Colman';

-- Atlantia | Cassia & Ky -- Die Auswahl  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Ally', name_display = 'Ally Condie', last_updated_at = now()
  WHERE id = '3848ae3e-a60d-4e0f-b4e4-fdd31b3fb027' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Condie';

-- The Mammoth Book Of Drug Barons Pablo Escobar Howard Marks The Cali Ca  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Copperwaite', last_updated_at = now()
  WHERE id = '62417da3-cd7b-4bbe-894e-5404a2add6d3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Copperwaite';

-- Kursbuch Gesundheit  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Verena', name_display = 'Verena Corazza', last_updated_at = now()
  WHERE id = '0691d002-a4ae-47ba-b951-85dcb50d010b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Corazza';

-- Die Geigenspielerin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Laurel', name_display = 'Laurel Corona', last_updated_at = now()
  WHERE id = 'b0dd803a-8611-4b8b-91f3-895f4d5c0b2e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Corona';

-- Das Vermächtnis der Keltin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'William V.', name_display = 'William V. Crockett', last_updated_at = now()
  WHERE id = '42fedbb1-0fdb-49c7-adeb-664e1dc518cb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Crockett';

-- Dubai  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Charles', name_display = 'Charles Crowell', last_updated_at = now()
  WHERE id = '906a16d4-e487-490a-9bdf-1d42c9adadf5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Crowell';

-- kiesbett  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sabine', name_display = 'Sabine Csampai', last_updated_at = now()
  WHERE id = 'c83d759d-ee36-46ff-8c3c-1e82116b6c8d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Csampai';

-- Jacobs Frauen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Utta', name_display = 'Utta Danella', last_updated_at = now()
  WHERE id = '67e7f260-cbd9-4d4b-94cc-fa6199784cb7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Danella';

-- DuMont direkt Reiseführer Istanbul  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Daners', last_updated_at = now()
  WHERE id = '50e2a9f6-f9c6-4dfd-86f5-0551d893480f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Daners';

-- Bitter fruit  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Achmat', name_display = 'Achmat Dangor', last_updated_at = now()
  WHERE id = 'cb1a464a-568b-4682-af80-26f24cd20190' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dangor';

-- Die acht Gesichter am Biwasee  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Max', name_display = 'Max Dauthendey', last_updated_at = now()
  WHERE id = 'e242fe81-b2de-458b-a0e8-66e406af90ab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dauthendey';

-- Mein Weg durch Himmel und Höllen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Alexandra', name_display = 'Alexandra David-Neel', last_updated_at = now()
  WHERE id = 'b51cdb11-589c-44c0-9c1d-db0d2a6e593a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'David-Neel';

-- You and I, me and you | rose  tibet  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'MaryJanice', name_display = 'MaryJanice Davidson', last_updated_at = now()
  WHERE id = 'fb0aebf2-9839-4e69-98da-d1fa68419737' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Davidson';

-- Tippi aus Afrika. Das Mädchen, das mit den Tieren spricht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tippi', name_display = 'Tippi Degre', last_updated_at = now()
  WHERE id = '4449b669-4c59-4c37-ae3c-23212fca84e7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Degre';

-- Der Kuss Kunst Und Lebeb Der Camille Cla  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anne', name_display = 'Anne Delbee', last_updated_at = now()
  WHERE id = 'e20a96ae-7cdb-44a6-8240-89d3c16939b7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Delbee';

-- Was die Cowboys noch wußten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kerstin', name_display = 'Kerstin Diacont', last_updated_at = now()
  WHERE id = '966a8362-1ed8-4b94-a587-f736a7b60bbe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Diacont';

-- Rossini  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Helmut', name_display = 'Helmut Dietl', last_updated_at = now()
  WHERE id = '2e68ab6b-a031-413a-84b7-228fd2c70f53' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dietl';

-- kleidermacherin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anna', name_display = 'Anna Dion', last_updated_at = now()
  WHERE id = 'f3f89054-2135-48db-8737-dd459946ebd5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dion';

-- bitterkalter | buddha  [OpenLibrary-ISBN, 2 Treffer, Alt: Anne. Donovan | ANNE Donovan]
UPDATE public.authors SET first_name = 'Anne', name_display = 'Anne Donovan', last_updated_at = now()
  WHERE id = '0d275c6d-48ff-4dcd-9915-282643a0b383' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Donovan';

-- Continuity and change in African cultures  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'William Russell', name_display = 'William Russell Bascom', last_updated_at = now()
  WHERE id = '83d0a169-e20c-4a77-a351-980aeb374435' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bascom';

-- Geschichte der Geheimwissenschaften  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Friedrich W.', name_display = 'Friedrich W. Doucet', last_updated_at = now()
  WHERE id = '0a96a714-6a17-4773-b1a2-85bed684f8c2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Doucet';

-- Die Meute  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Heike', name_display = 'Heike Doutine', last_updated_at = now()
  WHERE id = '20ffe850-2e62-4c63-b2ac-fd445e381315' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Doutine';

-- sydney  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Dragicevich', last_updated_at = now()
  WHERE id = '0349cf31-4a35-4ded-8704-408341c4d6ca' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dragicevich';

-- Im Dschungel. Afrika, Affen und andere Leidenschaften  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dirk', name_display = 'Dirk Draulans', last_updated_at = now()
  WHERE id = '1a9d7597-b964-4b76-b972-e101c50ae959' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Draulans';

-- Meine Rechte als Mieter. Was Mieter und Vermieter wissen sollten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gerald', name_display = 'Gerald Drews', last_updated_at = now()
  WHERE id = '8c43f4cc-f5e4-4498-80a9-1f3ff389ff79' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Drews';

-- Rundwanderungen Oberbayern  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Helmut', name_display = 'Helmut Dumler', last_updated_at = now()
  WHERE id = '065c6712-a180-43a0-af6e-6ee567e4c7ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dumler';

-- Beauté de la Bourgogne  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Pierre', name_display = 'Pierre Dupuy', last_updated_at = now()
  WHERE id = 'e18eb07e-eba8-43ce-ab78-78890c23b53e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dupuy';

-- Australien  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Roland', name_display = 'Roland Dusik', last_updated_at = now()
  WHERE id = '8d80fcb6-7fc3-4603-8a91-de469f33151b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dusik';

-- Achter Achter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Ebmeyer', last_updated_at = now()
  WHERE id = 'fd369ce9-110a-4b8a-bf6d-5a65f0ac1dfe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ebmeyer';

-- Reisen ans Ende der Welt 1325 - 1353. Das größte Abenteuer des Mittela  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ibn', name_display = 'Ibn Battuta', last_updated_at = now()
  WHERE id = 'e6f9874e-94ba-4964-9d93-f0a52050f4a9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Battuta';

-- Wolfsspinne  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Horst', name_display = 'Horst Eckert', last_updated_at = now()
  WHERE id = 'edaa7553-b343-413b-9cd6-4f540cb7c5cb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eckert';

-- Das leise Lächeln des Siegers  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Günter', name_display = 'Günter Ederer', last_updated_at = now()
  WHERE id = 'fc707a86-1027-4dad-b22e-33177d24c964' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ederer';

-- malindi  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Troy', name_display = 'Troy Blacklaws', last_updated_at = now()
  WHERE id = 'f460e608-7937-4a21-879d-793eda1ebc07' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Blacklaws';

-- Hinter dem Schleier der Tränen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Choga Regina', name_display = 'Choga Regina Egbeme', last_updated_at = now()
  WHERE id = 'ca203714-af8b-43da-98b8-fc40dde9a4ab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Egbeme';

-- Leaving the Frame  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Maria', name_display = 'Maria Ehrich', last_updated_at = now()
  WHERE id = 'b5b868f6-360f-4b26-82e5-a1b1371fdb80' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ehrich';

-- Digitales Erzählen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dennis', name_display = 'Dennis Eick', last_updated_at = now()
  WHERE id = '6251b77e-4486-4cf2-acb4-7edd415df2e2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eick';

-- steiermark  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jost', name_display = 'Jost Eisenhardt', last_updated_at = now()
  WHERE id = '9aab2a3a-b1fa-4c31-b37c-894d9fd5799b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eisenhardt';

-- dynastie | mandarin  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Robert S.', name_display = 'Robert S. Elegant', last_updated_at = now()
  WHERE id = 'd5fad14f-11aa-408f-832f-7dbf4752d6e0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elegant';

-- Tangram  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joost', name_display = 'Joost Elffers', last_updated_at = now()
  WHERE id = '4966d920-9bff-4bf2-83e4-0e3c7b7c605a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elffers';

-- Neuroleadership  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christian E.', name_display = 'Christian E. Elger', last_updated_at = now()
  WHERE id = '463b20b5-1dc3-4639-85fb-ea67792aaee4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elger';

-- BLACKOUT - Morgen ist es zu spät  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marc', name_display = 'Marc Elsberg', last_updated_at = now()
  WHERE id = '269698da-1a89-4ce3-a9a2-c13ed9a6c177' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elsberg';

-- unmoralisches  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jack', name_display = 'Jack Engelhard', last_updated_at = now()
  WHERE id = '38f987be-84ec-406e-bca5-41ea35287d70' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Engelhard';

-- Haie! | falschen zeit ort  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Horst', name_display = 'Horst Engels', last_updated_at = now()
  WHERE id = '471e343b-c614-484a-9dd7-6a424dc8318a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Engels';

-- Frauen im Mittelalter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Edith', name_display = 'Edith Ennen', last_updated_at = now()
  WHERE id = 'b43f664c-3d0e-41f7-b3d3-469f0bb03633' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ennen';

-- magische route  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wilfried', name_display = 'Wilfried Erdmann', last_updated_at = now()
  WHERE id = '1ee1229a-84ab-4b81-929a-979f0b575574' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Erdmann';

-- Hollywood animal  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joe', name_display = 'Joe Eszterhas', last_updated_at = now()
  WHERE id = 'f43b9b02-c05e-447e-aef7-e16bb563ac8c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eszterhas';

-- Der König von Berlin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Horst', name_display = 'Horst Evers', last_updated_at = now()
  WHERE id = '39654709-d044-48f2-ae7d-cfe6068ee30e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Evers';

-- Alles über Lulu  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jonathan', name_display = 'Jonathan Evison', last_updated_at = now()
  WHERE id = '43a204eb-cedb-4825-9824-556e9d6f9e60' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Evison';

-- Club der roten Bänder  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Albert', name_display = 'Albert Espinosa', last_updated_at = now()
  WHERE id = 'b7cd88ea-e492-4524-893b-1a169008c9e2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Espinosa';

-- kleopatra | pharaonin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Karen', name_display = 'Karen Essex', last_updated_at = now()
  WHERE id = 'c85031d5-f6f2-48e5-b966-0470298e62f6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Essex';

-- Western Turkey  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dana', name_display = 'Dana Facaros', last_updated_at = now()
  WHERE id = 'b8575a4b-f26b-4c86-aec0-d7ef21af6d3c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Facaros';

-- Augenblicke im Paradies  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Urs', name_display = 'Urs Faes', last_updated_at = now()
  WHERE id = '1d356612-1885-45a6-b6d7-a4d4c047e626' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Faes';

-- Brief an ein nie geborenes Kind | inschallah  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Oriana', name_display = 'Oriana Fallaci', last_updated_at = now()
  WHERE id = 'f66dec9d-9354-4592-8615-94f5122ad5b5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fallaci';

-- Dann mach ich eben Schluss  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christine', name_display = 'Christine Feher', last_updated_at = now()
  WHERE id = 'acda956f-2920-4abb-b85b-f86b2be8cb49' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Feher';

-- Die Entdeckung der Currywurst. Jubiläumsausgabe | morenga | schatz pag  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Uwe', name_display = 'Uwe Timm', last_updated_at = now()
  WHERE id = 'b469dd1a-1bfc-438d-8017-e128210460b4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Timm';

-- Die Macht der Disziplin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Roy F.', name_display = 'Roy F. Baumeister', last_updated_at = now()
  WHERE id = 'd6b809d8-a225-4af2-ab4e-f686f97e33dc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Baumeister';

-- The 4-Hour Workweek  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Timothy', name_display = 'Timothy Ferriss', last_updated_at = now()
  WHERE id = '62437b2f-db8d-4980-9180-e9585f8ccc26' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ferriss';

-- Tellergericht | billionenpoker  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ullrich', name_display = 'Ullrich Fichtner', last_updated_at = now()
  WHERE id = '951642cd-ab07-4141-8819-6e340ab197e3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fichtner';

-- Die Profanen Stunden Des Glucks  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Renate', name_display = 'Renate Feyl', last_updated_at = now()
  WHERE id = 'ae600050-de4a-48f5-922d-caacd2a9ca7e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Feyl';

-- Moskau Connection | verraeter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joseph', name_display = 'Joseph Finder', last_updated_at = now()
  WHERE id = '7d4a11a4-4739-46a2-acff-8d598281f8b8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Finder';

-- Alternatives Leben | siebenten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Claudia', name_display = 'Claudia Fischer', last_updated_at = now()
  WHERE id = '8aa37038-ea27-40a8-a903-74f80f5b5fab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fischer';

-- Briefe aus dem Regierungslager  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Henning', name_display = 'Henning Venske', last_updated_at = now()
  WHERE id = 'c43818f7-1ce0-49b1-a55e-7cbb34554076' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Venske';

-- Sonst noch Fragen?  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ranga', name_display = 'Ranga Yogeshwar', last_updated_at = now()
  WHERE id = '18d1cfea-9ac3-43b9-af65-775021c0d348' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yogeshwar';

-- Parade  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Shuichi', name_display = 'Shuichi Yoshida', last_updated_at = now()
  WHERE id = '06e2a10d-9e55-484e-84d4-4e778a891f60' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yoshida';

-- Musashi | murashi  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eiji', name_display = 'Eiji Yoshikawa', last_updated_at = now()
  WHERE id = '2d9e7086-3074-46ad-bb5d-699f0712a663' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yoshikawa';

-- Der Streit um die Intelligenz: IQ, ererbt oder erworben?  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dieter E.', name_display = 'Dieter E. Zimmer', last_updated_at = now()
  WHERE id = '0dc4543d-0f42-4d06-b940-833d769c0dae' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zimmer';

-- Geschichte der Staatsideen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Reinhold', name_display = 'Reinhold Zippelius', last_updated_at = now()
  WHERE id = '677da302-3f23-4574-86b7-f376916e2639' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zippelius';

-- belagerung  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Flanagan', last_updated_at = now()
  WHERE id = '35715585-e002-4329-9d96-39eccdaa8484' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Flanagan';

-- Der Gegenschlag | gone  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Vince', name_display = 'Vince Flynn', last_updated_at = now()
  WHERE id = '7619f475-6955-4d49-a6af-5330bb41a65f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Flynn';

-- Seefahrt ist not!  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gorch', name_display = 'Gorch Fock', last_updated_at = now()
  WHERE id = '56fc6c57-44fd-4786-8a7a-16f37f5eed94' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fock';

-- The Power of Feedback  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joseph R.', name_display = 'Joseph R. Folkman', last_updated_at = now()
  WHERE id = 'ce277756-2137-49e3-bb90-e3bd98b728ec' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Folkman';

-- Lockruf Saudia  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Teresa', name_display = 'Teresa Fortis', last_updated_at = now()
  WHERE id = '137df7a8-5aaf-4157-a080-f5203b14f08d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fortis';

-- Mehr Kraft zum Loslassen. Neue Meditationen zur inneren Heilung.  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Melody', name_display = 'Melody Beattie', last_updated_at = now()
  WHERE id = '6dc251fe-c175-4642-902f-bad12719c2fa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beattie';

-- Stumme Schreie  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Karin', name_display = 'Karin Fossum', last_updated_at = now()
  WHERE id = '8adfd3ef-aded-40d1-bc42-c5d548e3eebb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fossum';

-- Einer wie ich  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Franz', name_display = 'Franz Beckenbauer', last_updated_at = now()
  WHERE id = 'f527c6a2-7609-4f07-b6fc-72510f465062' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beckenbauer';

-- Die Totenleserin | teufelshaube  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ariana', name_display = 'Ariana Franklin', last_updated_at = now()
  WHERE id = 'df4119ea-918a-4904-a6d5-ea512353e3f0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Franklin';

-- Unschuld  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jonathan', name_display = 'Jonathan Franzen', last_updated_at = now()
  WHERE id = '1011a9d6-93cf-41d0-ac9f-14adeb595d03' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Franzen';

-- Der Mensch vor der Frage nach dem Sinn : eine Auswahl aus dem Gesamtwe  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Viktor Emil', name_display = 'Viktor Emil Frankl', last_updated_at = now()
  WHERE id = '65132b7e-37cf-4f60-b24d-2672f03fe219' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Frankl';

-- Geliebte Tochter | Hannas Töchter | Marcus und Eneides  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marianne', name_display = 'Marianne Fredriksson', last_updated_at = now()
  WHERE id = '02070a32-18e5-45ff-9a73-335ffa85eeab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fredriksson';

-- Im Schatten der Alhambra  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eduard', name_display = 'Eduard Freundlinger', last_updated_at = now()
  WHERE id = '6f4544e0-53f2-4784-8c9d-4c99d8568e50' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Freundlinger';

-- Sackgasse Freiheit | Verrückt vor Angst. Noras Geschichte | Wenn Haie   [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jana', name_display = 'Jana Frey', last_updated_at = now()
  WHERE id = '7fb08327-d8f2-4bd8-9fe7-5e2d61abfcde' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Frey';

-- Manns genug, Frau zu sein  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Vera', name_display = 'Vera Freyberg', last_updated_at = now()
  WHERE id = 'cec5b449-9ae1-428c-ab7a-cc44005b7459' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Freyberg';

-- Die Frauen von Deh Koh  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Erika', name_display = 'Erika Friedl', last_updated_at = now()
  WHERE id = 'b4748d6d-ab05-4ca5-b699-01bcb299002f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Friedl';

-- Oskar und das Geheimnis des Klosters  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Claudia', name_display = 'Claudia Frieser', last_updated_at = now()
  WHERE id = '3a3840cf-bf59-45a0-aaa6-5a644fabb885' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Frieser';

-- Die verbogene Raum-Zeit | Eine Formel verändert die Welt  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Harald', name_display = 'Harald Fritzsch', last_updated_at = now()
  WHERE id = '169a95e2-c457-44b3-addf-137002efeb4c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fritzsch';

-- caledonia  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Laurie', name_display = 'Laurie Fullerton', last_updated_at = now()
  WHERE id = '7304d6a2-5760-44cb-8358-942cb89c17c2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fullerton';

-- Encyclopedia of Aviation  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Beaver', last_updated_at = now()
  WHERE id = '88bef365-4e16-4879-9d83-30d5458ab519' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beaver';

-- Glücklich durch positives Denken | rote frau  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrich', name_display = 'Ulrich Beer', last_updated_at = now()
  WHERE id = 'c315f393-4408-4b44-a8ae-382236ea0797' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beer';

-- Kreta  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Klaus', name_display = 'Klaus Gallas', last_updated_at = now()
  WHERE id = 'da2cb310-3509-4478-954c-d2152802b111' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gallas';

-- American Gods  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Neil', name_display = 'Neil Gaiman', last_updated_at = now()
  WHERE id = '91fcc502-1240-459a-a171-7bd09c13ea86' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gaiman';

-- Griechenland ohne Säulen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Johannes', name_display = 'Johannes Gaitanides', last_updated_at = now()
  WHERE id = 'b447bd5b-bf7c-43b1-b758-041487ad60a1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gaitanides';

-- masada  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ernest K.', name_display = 'Ernest K. Gann', last_updated_at = now()
  WHERE id = 'e03c7aba-c474-47c7-b35f-894e26aee244' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gann';

-- Wirklich wichtig sind die Schuhe  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Elīna', name_display = 'Elīna Garanca', last_updated_at = now()
  WHERE id = '4e94f890-89ea-4f0f-aba4-a29b503e7918' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Garanca';

-- MINI | sieht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Simon', name_display = 'Simon Garfield', last_updated_at = now()
  WHERE id = '3bbfecd2-2789-4956-811a-704e2df40491' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Garfield';

-- Gnade  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Julie', name_display = 'Julie Garwood', last_updated_at = now()
  WHERE id = '4b342e8d-8b83-4e43-bfa0-9322c16c6a4f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Garwood';

-- Randi und das halbe Dutzend  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lise', name_display = 'Lise Gast', last_updated_at = now()
  WHERE id = 'cd07026a-b2d6-4c29-8ba4-158a2b591845' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gast';

-- Winter im Sommer-Frühling im Herbst  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joachim', name_display = 'Joachim Gauck', last_updated_at = now()
  WHERE id = 'ea26b815-1a1d-4f44-91a2-dd2a6ad0528e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gauck';

-- Core JavaServer faces  [OpenLibrary-ISBN, 1 Treffer, Alt: David Geary]
UPDATE public.authors SET first_name = 'David M.', name_display = 'David M. Geary', last_updated_at = now()
  WHERE id = 'b9d38096-6f46-4de2-8900-5dca6e942f38' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Geary';

-- Das Spiel ist aus  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Holger', name_display = 'Holger Gertz', last_updated_at = now()
  WHERE id = '1d82b8c2-58d1-4a68-8711-d9c24a10cf65' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gertz';

-- Die Moguln | soehne  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans-Georg', name_display = 'Hans-Georg Behr', last_updated_at = now()
  WHERE id = 'fa8b04d7-3810-48c7-aa3e-6bff9d06c9dc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Behr';

-- Aquila | Assassini | Protector  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Gifford', last_updated_at = now()
  WHERE id = '05cd6c7f-df81-468c-98c8-ed34e095c67a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gifford';

-- gremlins | zukunft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'George', name_display = 'George Gipe', last_updated_at = now()
  WHERE id = 'e8e09a7f-24f5-45de-87fe-6cb6a2b66a81' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gipe';

-- Westwall – Auf welcher Seite willst du stehen?  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Benedikt', name_display = 'Benedikt Gollhardt', last_updated_at = now()
  WHERE id = '9228fcd8-9cd5-41c5-8379-bf6926f874b1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gollhardt';

-- Heiliges Land  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Andrea', name_display = 'Andrea Gorys', last_updated_at = now()
  WHERE id = '43d73092-9e5b-4e12-9607-db48a803aeb1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gorys';

-- Ill wind  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gary', name_display = 'Gary Gottesfeld', last_updated_at = now()
  WHERE id = 'e35f4171-6beb-48dc-8f27-c1f5ca7a6f94' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gottesfeld';

-- jumper  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Steven', name_display = 'Steven Gould', last_updated_at = now()
  WHERE id = 'd0113416-a116-473a-89b8-bee3290f0b8a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gould';

-- Der goldene Sohn | geheime  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Shilpi Somaya', name_display = 'Shilpi Somaya Gowda', last_updated_at = now()
  WHERE id = '7229ce13-a541-40fc-94c0-1f9faf84d035' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gowda';

-- Das Leben der Wikinger. Krieger, Händler und Entdecker  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'James', name_display = 'James Graham-Campbell', last_updated_at = now()
  WHERE id = '0152b2f1-a356-4282-8b85-1b56367834fc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Graham-Campbell';

-- schliemanns  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gisela', name_display = 'Gisela Graichen', last_updated_at = now()
  WHERE id = '3feb26a4-1b3c-4e85-a076-16c3dafc938e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Graichen';

-- caesaren | cleopatra  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Grant', last_updated_at = now()
  WHERE id = '6758ceb3-b32f-4aae-9d89-396375dead70' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grant';

-- Hypermoral  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Alexander', name_display = 'Alexander Grau', last_updated_at = now()
  WHERE id = '1238eebf-44e4-4fe7-a721-2c8cbd7bc7a5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grau';

-- New York /Le Meilleur Guide Sur New York [Broché]  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Beth', name_display = 'Beth Greenfield', last_updated_at = now()
  WHERE id = 'e84763e2-75e9-4101-8e3e-391dcfdf1172' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Greenfield';

-- Das Leben ist nichts für Feiglinge | Robert Zimmermann wundert sich ï¿  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Gernot', name_display = 'Gernot Gricksch', last_updated_at = now()
  WHERE id = 'a4014243-2218-4d6e-a50f-cf976e9e5e80' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gricksch';

-- Abschied am hohen Ufer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Agnes-Marie', name_display = 'Agnes-Marie Grisebach', last_updated_at = now()
  WHERE id = '65ecc997-51b5-4e53-a3ee-610c615418c5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grisebach';

-- forrest gump  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Winston', name_display = 'Winston Groom', last_updated_at = now()
  WHERE id = '07acb4ea-b6a8-4977-9aed-20781aa2666a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Groom';

-- Balkankrieg  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Johannes', name_display = 'Johannes Grotzky', last_updated_at = now()
  WHERE id = '1e1d78aa-5270-4ef0-8cb4-909990247ee5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grotzky';

-- Kanarische Inseln  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bernd F.', name_display = 'Bernd F. Gruschwitz', last_updated_at = now()
  WHERE id = 'd71a4b7f-1860-476e-9c84-7c27408acda7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gruschwitz';

-- schleyer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lutz', name_display = 'Lutz Hachmeister', last_updated_at = now()
  WHERE id = '62a0c70a-8331-4237-bb34-2aea1e43b7cc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hachmeister';

-- German Amok  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Feridun', name_display = 'Feridun Zaimoglu', last_updated_at = now()
  WHERE id = '2ed67526-5cc8-4fd9-80c2-4133e632e3ac' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zaimoglu';

-- leuchtturm alexandria  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gillian', name_display = 'Gillian Bradshaw', last_updated_at = now()
  WHERE id = 'bb0b0922-1c09-4171-95da-c26d6f780bdc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bradshaw';

-- Christine von Schweden  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Oskar', name_display = 'Oskar von Wertheimer', namenszusatz = 'von', last_updated_at = now()
  WHERE id = '8a329ab0-75f3-4676-8a0a-b7c068421f37' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wertheimer';

-- Granada and the Alhambra  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rafael Hierro', name_display = 'Rafael Hierro Calleja', last_updated_at = now()
  WHERE id = '12114e90-005f-4e74-8049-38d1aa9aa161' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Calleja';

-- Cäsars Druide  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Claude', name_display = 'Claude Cueni', last_updated_at = now()
  WHERE id = 'd609f197-c59d-4a29-9fb5-b3cd70b12e2a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cueni';

-- Hinter Kairo wird es besser. Die Reise einer Frau auf der Suche nach s  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Trudy', name_display = 'Trudy Culross', last_updated_at = now()
  WHERE id = '0501b058-200c-4ddf-80b0-0b84df2abfe1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Culross';

-- Wild orchids: A Novel | orchideen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jude', name_display = 'Jude Deveraux', last_updated_at = now()
  WHERE id = '00d9e999-add3-4e95-b0c8-b1fcc64bd341' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Deveraux';

-- Das Inferno | Die Generalin | Precipice  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Colin', name_display = 'Colin Forbes', last_updated_at = now()
  WHERE id = '3ba3b421-df92-4969-82e2-57d90681498f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Forbes';

-- Die Offenbarung | natuerlich schwanger | podgoriza  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Schneider', last_updated_at = now()
  WHERE id = 'e9a6c8a7-b2be-4c60-a933-ff80602a8fa4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schneider';

-- Die Kaffeeprinzessin | alpen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Karin', name_display = 'Karin Engel', last_updated_at = now()
  WHERE id = 'd0a972fc-f842-4b77-b4d5-371a4524c190' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Engel';

-- Siemens  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wilfried', name_display = 'Wilfried Feldenkirchen', last_updated_at = now()
  WHERE id = '6bcbcbda-9872-41a6-91ea-80a59040f030' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Feldenkirchen';

-- Hornblower in the West Indies | The African Queen | The Man in the Yel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'C. S.', name_display = 'C. S. Forester', last_updated_at = now()
  WHERE id = '21154f52-0463-47b3-801c-007f56fff337' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Forester';

-- Die Autobiographie des Fidel Castro | moerderwald  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Norberto', name_display = 'Norberto Fuentes', last_updated_at = now()
  WHERE id = '639a4b90-f9d7-4583-8497-a2d363fb28f0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fuentes';

-- marathon  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'William', name_display = 'William Goldman', last_updated_at = now()
  WHERE id = '2044ac7f-5db8-4f1f-a8b0-27d899aebcfd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Goldman';

-- knieschule  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joachim', name_display = 'Joachim Grifka', last_updated_at = now()
  WHERE id = '02e7f3a0-3281-4768-8adb-a56f4e49b76c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grifka';

-- vergebung  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tim', name_display = 'Tim Griggs', last_updated_at = now()
  WHERE id = '7dd5e2e7-6718-46d9-a238-484ae5519179' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Griggs';

-- The Curious Incident of the Dog in the Night-Time  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Mark', name_display = 'Mark Haddon', last_updated_at = now()
  WHERE id = '8999b1c5-de72-4ed6-a349-466c47c04caa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Haddon';

-- ===== Sicherheit: mittel (140) =====

-- first | rambo 3 | verschwoerung  [OpenLibrary-Titel, 7 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Morrell', last_updated_at = now()
  WHERE id = '0ae66e8b-9a96-4478-a8b9-f0ebbdd8f3da' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Morrell';

-- surinam  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Linda', name_display = 'Linda Belago', last_updated_at = now()
  WHERE id = '57f73f83-ab95-4796-999a-2d27e7790272' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Belago';

-- wall-street  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Jordan', name_display = 'Jordan Belfort', last_updated_at = now()
  WHERE id = 'fb3f0f17-7b4e-4585-84ac-2c73ca000fb2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Belfort';

-- geheimnisse jerusalem | messias  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Marek', name_display = 'Marek Halter', last_updated_at = now()
  WHERE id = '00036e54-dbe6-4996-89c2-b1c39ee06322' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Halter';

-- africa  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Anthony', name_display = 'Anthony Ham', last_updated_at = now()
  WHERE id = '21f46ffc-ef98-4fbd-9374-2f5236374ac7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ham';

-- Gedanken und Erinnerungen  [OpenLibrary-Titel, 3 Treffer, Alt: Otto Fürst von Bismarck | Otto Bismarck]
UPDATE public.authors SET first_name = 'Otto', name_display = 'Otto von Bismarck', namenszusatz = 'von', last_updated_at = now()
  WHERE id = '804211dd-17a0-448b-af8e-a2231b042f57' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bismarck';

-- Marco Polo  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Harms', last_updated_at = now()
  WHERE id = '79895324-f941-4a9b-9a6a-10ffa41ea8b2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Harms';

-- minik  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Kenn', name_display = 'Kenn Harper', last_updated_at = now()
  WHERE id = 'd2c640fa-37ef-4c3d-88e3-f86b52068018' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Harper';

-- abenteuer  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Jaroslav', name_display = 'Jaroslav Hasek', last_updated_at = now()
  WHERE id = '064e3e80-f060-4ea1-949d-937349498613' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hasek';

-- zoya  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Follain', last_updated_at = now()
  WHERE id = 'c5b91bef-03b3-4a33-88cd-80362449c548' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Follain';

-- habitat economy society  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Cyril Daryll', name_display = 'Cyril Daryll Forde', last_updated_at = now()
  WHERE id = 'c7de5d5d-043c-42ce-91b3-a1b53db4a73b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Forde';

-- wand  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Marlen', name_display = 'Marlen Haushofer', last_updated_at = now()
  WHERE id = 'a25f239f-2e12-4933-8a97-56716b986033' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Haushofer';

-- vernichtungskrieg  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hannes', name_display = 'Hannes Heer', last_updated_at = now()
  WHERE id = '85db82d7-62cd-4334-ba50-4802eca87591' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heer';

-- nuja  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Ingeborg', name_display = 'Ingeborg Heidrich', last_updated_at = now()
  WHERE id = 'bdf221e1-3162-447a-b7de-c0b6d2d770a8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heidrich';

-- gezeichneten | palermo  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Willi', name_display = 'Willi Heinrich', last_updated_at = now()
  WHERE id = 'a9c4f48d-c23f-46d4-8f37-36f48e43812c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Heinrich';

-- focusing  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Eugene T.', name_display = 'Eugene T. Gendlin', last_updated_at = now()
  WHERE id = '8ed07265-71dd-4ed7-8950-d535453e493e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gendlin';

-- Das verborgene Herz Afrikas | Die weiße Leopardin  [OpenLibrary-ISBN, 1 Treffer, Alt: Peter Hilliges]
UPDATE public.authors SET first_name = 'Ilona Maria', name_display = 'Ilona Maria Hilliges', last_updated_at = now()
  WHERE id = '0e5823c0-ce5b-4e55-99d0-4cbdee346ef2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hilliges';

-- kanada  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Ole', name_display = 'Ole Helmhausen', last_updated_at = now()
  WHERE id = 'bdb3b27e-1527-40c8-b4fc-888893b54cf8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Helmhausen';

-- indianer | king  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Frederik', name_display = 'Frederik Hetmann', last_updated_at = now()
  WHERE id = 'a5da8727-1efc-4027-9929-c79e7b7e71de' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hetmann';

-- Nanga Parbat  [OpenLibrary-Titel, 3 Treffer, Alt: Karl M. Herrligkoffer | K M Herrligkoffer]
UPDATE public.authors SET first_name = 'Karl Maria', name_display = 'Karl Maria Herrligkoffer', last_updated_at = now()
  WHERE id = 'dbc8c64e-4187-46c6-a595-d904f2fe725e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Herrligkoffer';

-- tschick  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Herrndorf', last_updated_at = now()
  WHERE id = '04b86b80-6427-4321-8808-0df6f24c2193' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Herrndorf';

-- epiphany  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Hewson', last_updated_at = now()
  WHERE id = '5a638e23-ec1a-4a73-ab9e-6524969f2acd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hewson';

-- leben  [OpenLibrary-Titel, 2 Treffer, Alt: Ingmar Bergman]
UPDATE public.authors SET first_name = 'Ingrid', name_display = 'Ingrid Bergman', last_updated_at = now()
  WHERE id = '6b286b11-a2fe-4487-aae1-aeb0902aaba9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bergman';

-- auschwitz  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Hoess', last_updated_at = now()
  WHERE id = 'b681403a-8dfb-4ddc-99f4-a60510286fd6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hoess';

-- du  ganze leben | kann auch immer  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Simone', name_display = 'Simone Elkeles', last_updated_at = now()
  WHERE id = '88ff02c5-3423-49b3-9533-d6d22784a721' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elkeles';

-- umsonst  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Holzach', last_updated_at = now()
  WHERE id = 'c64c74d0-ede8-4b5a-8911-0eea7c1e61a7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Holzach';

-- eminenz | world  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Aldous', name_display = 'Aldous Huxley', last_updated_at = now()
  WHERE id = 'c325c9d3-5247-42b8-87ab-42c16cf728c6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Huxley';

-- amerikanische karriere | iacocca  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Lee A.', name_display = 'Lee A. Iacocca', last_updated_at = now()
  WHERE id = '4f0bb054-9f57-49fa-927b-a8f196ce189d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Iacocca';

-- boleyn  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'C. C.', name_display = 'C. C. Humphreys', last_updated_at = now()
  WHERE id = 'e3152460-eda5-4f1d-81c0-4ff1b3c71d09' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Humphreys';

-- American Journey by Rail  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Timothy', name_display = 'Timothy Jacobson', last_updated_at = now()
  WHERE id = '92e3b7ba-f75b-4fcb-b0c1-799d174908b6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jacobson';

-- wolf  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'James Carlos', name_display = 'James Carlos Blake', last_updated_at = now()
  WHERE id = 'f27d22c9-754a-40a1-9e7c-0f9b58e77cae' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Blake';

-- rosen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Lucien', name_display = 'Lucien Bodard', last_updated_at = now()
  WHERE id = '117a1968-92a4-47f1-ade7-e426c0f6a9cf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bodard';

-- asien  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Louis', name_display = 'Louis Barcata', last_updated_at = now()
  WHERE id = '9779f1cd-2eff-448f-b639-4b4526f5aeee' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barcata';

-- holzschiff  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Hans Henny', name_display = 'Hans Henny Jahnn', last_updated_at = now()
  WHERE id = '516ae5ef-d21c-419f-a507-c2dd3d1a332a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jahnn';

-- templars  [OpenLibrary-Titel, 3 Treffer, Alt: Paul. Christopher]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Christopher', last_updated_at = now()
  WHERE id = '87a67c7b-81bf-46b3-80f8-efccfc76a863' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Christopher';

-- guardiola  [OpenLibrary-Titel, 3 Treffer, Alt: Marti Perarnau]
UPDATE public.authors SET first_name = 'Martí', name_display = 'Martí Perarnau', last_updated_at = now()
  WHERE id = '8fd235a5-0c48-4228-9283-e13fbdfd98bc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Perarnau';

-- troubadour  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Giuseppe', name_display = 'Giuseppe Verdi', last_updated_at = now()
  WHERE id = '44035d23-a5cb-458b-9a17-8a01ad4b79b4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Verdi';

-- klingsor  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Jorge', name_display = 'Jorge Volpi', last_updated_at = now()
  WHERE id = 'b79f2dee-8e66-413a-9731-c275c02a4e5e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Volpi';

-- aisha  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Katherine', name_display = 'Katherine Applegate', last_updated_at = now()
  WHERE id = 'ad2fc812-68d5-4e59-949a-050d316846b4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Applegate';

-- baader | pirat  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Aust', last_updated_at = now()
  WHERE id = '29c9f5cd-99e3-4199-9161-20b0590035a5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Aust';

-- engelsgift  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Susanne', name_display = 'Susanne Ayoub', last_updated_at = now()
  WHERE id = 'a8041487-761c-4815-94fe-410462c1380e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ayoub';

-- erfolg  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Vera F.', name_display = 'Vera F. Birkenbihl', last_updated_at = now()
  WHERE id = 'bda246e8-0415-43b0-a5a6-ef35109339cf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Birkenbihl';

-- Krebs gang  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Karen', name_display = 'Karen Bischof', last_updated_at = now()
  WHERE id = '3c715782-9dab-40dd-943b-474fe626bca2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bischof';

-- goliath | hoellenschlund | meg  [OpenLibrary-Titel, 9 Treffer]
UPDATE public.authors SET first_name = 'Steve', name_display = 'Steve Alten', last_updated_at = now()
  WHERE id = '226264cb-8649-4414-a2fc-593a82c0d245' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alten';

-- satans augen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Nortrud', name_display = 'Nortrud Boge-Erli', last_updated_at = now()
  WHERE id = '27156b74-077a-48f6-8d48-1727a7014057' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Boge-Erli';

-- alhambra  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Kirsten', name_display = 'Kirsten Boie', last_updated_at = now()
  WHERE id = '95075721-67bc-46d8-bc43-45ae38d6aadd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Boie';

-- stell herz sommerzeit | wuehltisch  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Erma', name_display = 'Erma Bombeck', last_updated_at = now()
  WHERE id = 'de178862-4742-4e46-ba5d-f4afc4a7ca20' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bombeck';

-- fine balance | gleichgewicht  [OpenLibrary-Titel, 3 Treffer, Alt: Rihinton Mistry]
UPDATE public.authors SET first_name = 'Rohinton', name_display = 'Rohinton Mistry', last_updated_at = now()
  WHERE id = '2ba22920-63d1-464e-9a09-6581150cd876' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mistry';

-- tao | weisheit  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'George J.', name_display = 'George J. Nicholson', last_updated_at = now()
  WHERE id = '2950defe-e38b-4cfd-9693-381249a02ef8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nicholson';

-- alternative  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Bahro', last_updated_at = now()
  WHERE id = 'edc1477b-c64c-4c19-b764-1c03817a5734' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bahro';

-- lesotho  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'James', name_display = 'James Bainbridge', last_updated_at = now()
  WHERE id = '6571e2bf-5f46-495f-abb1-536a8f6e1506' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bainbridge';

-- titanic  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Robert D.', name_display = 'Robert D. Ballard', last_updated_at = now()
  WHERE id = '14ea7441-ea20-4bcf-8a22-a1c104e08bee' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ballard';

-- terranauten  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'T. Coraghessan', name_display = 'T. Coraghessan Boyle', last_updated_at = now()
  WHERE id = 'dd811ad5-4728-4236-8cd9-6b997a604b56' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Boyle';

-- virginity  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard Branson', last_updated_at = now()
  WHERE id = '036b8990-e123-4d4a-b6c5-b602f3b4dff6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Branson';

-- york  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Margit', name_display = 'Margit Brinke', last_updated_at = now()
  WHERE id = '72041de3-b244-480c-bd9c-8d13a4b84113' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brinke';

-- acid  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Rolf Dieter', name_display = 'Rolf Dieter Brinkmann', last_updated_at = now()
  WHERE id = 'bc5a6371-8940-4361-a9fa-e2b8e7c7a335' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brinkmann';

-- rettung  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Fritz', name_display = 'Fritz Brustat-Naval', last_updated_at = now()
  WHERE id = 'be8404b9-5ecd-4900-95b4-ceb67f5d087a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brustat-Naval';

-- woyzeck  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Georg', name_display = 'Georg Buechner', last_updated_at = now()
  WHERE id = 'fbbf6810-8979-43fa-b1e2-3c7359cf5474' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Buechner';

-- Die Fernen Königreiche.  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Chris', name_display = 'Chris Bunch', last_updated_at = now()
  WHERE id = '25865659-86be-4d84-ba22-298bac11334d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bunch';

-- hongkong | letzten tage hongkong  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Burdett', last_updated_at = now()
  WHERE id = 'b0945e6f-c4c5-4af0-866e-1b304e10067e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Burdett';

-- moritz  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Wilhelm', name_display = 'Wilhelm Busch', last_updated_at = now()
  WHERE id = '68fe3d8c-7920-475e-abaf-c94b3d6b3045' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Busch';

-- witch  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Caidin', last_updated_at = now()
  WHERE id = '5d8994f2-7e6f-4d4b-8c14-8dde34c6acaf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Caidin';

-- fashion  [OpenLibrary-Titel, 2 Treffer, Alt: Jan McBride Carlton]
UPDATE public.authors SET first_name = 'Jan', name_display = 'Jan Carlton', last_updated_at = now()
  WHERE id = 'bd1df85c-5b6c-4c48-9978-fb85512effa5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Carlton';

-- oben  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Howard', name_display = 'Howard Carpendale', last_updated_at = now()
  WHERE id = '25b51825-361f-4784-bdc5-365c13f48ee4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Carpendale';

-- Jackie Chan. Mein Leben voller Action. Die Autobiographie.  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Jackie', name_display = 'Jackie Chan', last_updated_at = now()
  WHERE id = '0d479e25-53c3-4b73-880c-1707f8c5e7e0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chan';

-- lebens  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Charles', name_display = 'Charles Chaplin', last_updated_at = now()
  WHERE id = 'e0cfd266-1136-4158-9622-c8848fe064a3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chaplin';

-- teresa  [OpenLibrary-Titel, 4 Treffer, Alt: NAVIN Chawla]
UPDATE public.authors SET first_name = 'Navin', name_display = 'Navin Chawla', last_updated_at = now()
  WHERE id = '4557853b-818c-4716-b1f3-499f2490001e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chawla';

-- pater  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Gilbert Keith', name_display = 'Gilbert Keith Chesterton', last_updated_at = now()
  WHERE id = '0dc1ac6d-6595-45b9-b69a-999a412ddd56' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chesterton';

-- marsch  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Rafael', name_display = 'Rafael Chirbes', last_updated_at = now()
  WHERE id = 'a3ac4285-6935-43fb-b7bc-18bc74cc33e8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chirbes';

-- learning  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Francois', name_display = 'Francois Chollet', last_updated_at = now()
  WHERE id = 'ff7f8ded-0818-4ee6-bd1e-3dee3d6f66cf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Chollet';

-- vertreibung paradies  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Halima', name_display = 'Halima Alaiyan', last_updated_at = now()
  WHERE id = 'd59dacca-c2f5-4c3b-b8f3-4aea21331462' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alaiyan';

-- fanny-hill  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Cleland', last_updated_at = now()
  WHERE id = '6a659894-5397-46a2-b52c-0766f8efb227' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cleland';

-- jesuiten  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Manfred', name_display = 'Manfred Barthel', last_updated_at = now()
  WHERE id = '377561c8-e84e-4e1c-b99e-0017f4aef31d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barthel';

-- manager | manager-knigge  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Heinz', name_display = 'Heinz Commer', last_updated_at = now()
  WHERE id = '6ce3545e-1c45-4096-892a-24740af1bfea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Commer';

-- witness  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Connelly', last_updated_at = now()
  WHERE id = '938988b9-8ee2-44cb-ac76-c525ef00d399' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Connelly';

-- eyes | frauen  [OpenLibrary-Titel, 6 Treffer]
UPDATE public.authors SET first_name = 'Shirley', name_display = 'Shirley Conran', last_updated_at = now()
  WHERE id = '1519f3d9-b4f3-481f-b2ae-b5356883b456' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Conran';

-- first  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Cormier', last_updated_at = now()
  WHERE id = '58ca9575-f318-4c02-b5de-713ccb6eadc4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cormier';

-- dresden  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Henri', name_display = 'Henri Coulonges', last_updated_at = now()
  WHERE id = 'b837470a-19cb-40a9-9798-84c918b0d7e5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Coulonges';

-- sofa  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Claude-Prosper Jolyot', name_display = 'Claude-Prosper Jolyot de Crebillon', namenszusatz = 'de', last_updated_at = now()
  WHERE id = '877b8aa1-c5e5-4bc9-83ba-5cc9efd6968b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Crebillon';

-- picasso  [OpenLibrary-Titel, 3 Treffer, Alt: Jean-Paul Crespelle]
UPDATE public.authors SET first_name = 'Jean Paul', name_display = 'Jean Paul Crespelle', last_updated_at = now()
  WHERE id = 'ead01527-43f5-49c5-aac8-b96f784606db' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Crespelle';

-- alaska  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Wolf-Ulrich', name_display = 'Wolf-Ulrich Cropp', last_updated_at = now()
  WHERE id = '81f97d55-b1cc-491f-a02c-23abe565f868' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cropp';

-- zaida  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Anne', name_display = 'Anne Cuneo', last_updated_at = now()
  WHERE id = 'bfc10ddd-7bbc-46e2-aaf5-d88c681d6e1f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cuneo';

-- letzte  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'György', name_display = 'György Dalos', last_updated_at = now()
  WHERE id = 'a89ab006-7d1c-443a-a148-ca0ab1fd1eee' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dalos';

-- schweden  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Reinhold', name_display = 'Reinhold Dey', last_updated_at = now()
  WHERE id = '703da74e-cd66-448c-8ada-bbc58acc6af4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dey';

-- Afra  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Eva', name_display = 'Eva Demski', last_updated_at = now()
  WHERE id = 'c9bb4f99-b6a5-421a-b6b0-1a84ccccc4e1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Demski';

-- cosa nostra | geschichte  [OpenLibrary-Titel, 9 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Dickie', last_updated_at = now()
  WHERE id = '4d1a68b9-bcd1-4d0a-aaff-e80c3ea1180f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dickie';

-- china  [OpenLibrary-Titel, 2 Treffer, Alt: Klaus A. Dietsch]
UPDATE public.authors SET first_name = 'Klaus Andreas', name_display = 'Klaus Andreas Dietsch', last_updated_at = now()
  WHERE id = '19c7c5cf-b8df-48be-a851-228279dc156a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dietsch';

-- inka  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hans Dietrich', name_display = 'Hans Dietrich Disselhoff', last_updated_at = now()
  WHERE id = 'b39a89ad-503e-497a-b993-fc1ba2370b58' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Disselhoff';

-- pocahontas  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Susan', name_display = 'Susan Donnell', last_updated_at = now()
  WHERE id = '455898b1-fd8b-4c31-a31b-6d556e8c4d70' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Donnell';

-- aristotle justice  [OpenLibrary-Titel, 2 Treffer, Alt: Margaret Doody]
UPDATE public.authors SET first_name = 'Margaret Anne', name_display = 'Margaret Anne Doody', last_updated_at = now()
  WHERE id = 'f8ea44d7-0067-4664-84a0-f58f0d5a45de' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Doody';

-- Change Management. Den Unternehmenswandel gestalten.  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Klaus', name_display = 'Klaus Doppler', last_updated_at = now()
  WHERE id = 'a5cc7ce0-2667-4e2f-8554-bfb2067e03e6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Doppler';

-- gandhi  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Eknath', name_display = 'Eknath Easwaran', last_updated_at = now()
  WHERE id = 'ae78478a-b6f0-46ee-820d-726eca7c2baa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Easwaran';

-- buddha | clifton kapuzen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Ecke', last_updated_at = now()
  WHERE id = 'ed7e7e8d-5d89-4fc9-9031-5ad2d1597563' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ecke';

-- qin  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'L. G.', name_display = 'L. G. Bass', last_updated_at = now()
  WHERE id = 'd5b8f0dc-2d17-46bd-b6d4-ff2fdac278bb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bass';

-- finzi  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Giorgio', name_display = 'Giorgio Bassani', last_updated_at = now()
  WHERE id = 'f4bade7c-f206-4d02-82b7-4b3a4e4a17c2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bassani';

-- treck kinder  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Tom', name_display = 'Tom Eidson', last_updated_at = now()
  WHERE id = 'c9b8ccf9-9905-44da-8e53-5e4996b45654' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eidson';

-- evolution  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Albert', name_display = 'Albert Einstein', last_updated_at = now()
  WHERE id = 'af79220b-6fa4-49b8-ac31-10ddf9650a3e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Einstein';

-- pilger reisenden  [OpenLibrary-Titel, 3 Treffer, Alt: Alice Maria Ekert-Rotholz]
UPDATE public.authors SET first_name = 'Alice', name_display = 'Alice Ekert-Rotholz', last_updated_at = now()
  WHERE id = '1f0d9dd2-afc3-44eb-b393-4d25a42d610e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ekert-Rotholz';

-- knopf | lokomotivfuehrer  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Ende', last_updated_at = now()
  WHERE id = '34e93dfc-fc80-4fa6-ab45-9ad675d92db5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ende';

-- letzten amerika | schnitt  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Erdman', last_updated_at = now()
  WHERE id = 'a1da36d8-3e05-41fe-86a6-3939a240391c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Erdman';

-- python  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Johannes', name_display = 'Johannes Ernesti', last_updated_at = now()
  WHERE id = 'f88f73f9-7a64-4ae4-b1b9-09697f036c2f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ernesti';

-- glatte  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Ann', name_display = 'Ann Fairbairn', last_updated_at = now()
  WHERE id = '08dd8ae4-bab1-4a91-b39f-6c7b29e8b996' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fairbairn';

-- kuerbisfloete | schiff apulien  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Beatrice', name_display = 'Beatrice Ferolli', last_updated_at = now()
  WHERE id = 'e8c3388e-a8cc-43ed-b810-584d3a9ca3f2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ferolli';

-- alter narr nun  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Finck', last_updated_at = now()
  WHERE id = '0b3be66b-0eaf-4d20-ac87-ee8a7fe89008' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Finck';

-- Die 85 Methoden, eine Krawatte zu binden. | kainszeichen  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Fink', last_updated_at = now()
  WHERE id = '7f91b3d1-8cf8-43f2-ad34-b403044b511b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fink';

-- northern territory  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Hugh', name_display = 'Hugh Finlay', last_updated_at = now()
  WHERE id = 'b7723651-0384-42e7-bd16-9ed92150dbbf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Finlay';

-- dogs rome  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Conor', name_display = 'Conor Fitzgerald', last_updated_at = now()
  WHERE id = '417f78c6-9cfb-4c48-bb34-196b389cec8e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fitzgerald';

-- macht  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Amy', name_display = 'Amy Yurk', last_updated_at = now()
  WHERE id = '8695ca28-5338-45e7-b3f0-993efcd50156' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yurk';

-- explosion  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Hans Heinrich', name_display = 'Hans Heinrich Ziemann', last_updated_at = now()
  WHERE id = 'e9077a59-e26e-4770-900c-200019c6ea13' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ziemann';

-- neverness  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Zindell', last_updated_at = now()
  WHERE id = 'b4d50ed6-8167-40e8-8064-987e72080694' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zindell';

-- vietnam  [OpenLibrary-Titel, 3 Treffer, Alt: Masou Florence]
UPDATE public.authors SET first_name = 'Mason', name_display = 'Mason Florence', last_updated_at = now()
  WHERE id = '688a1629-8982-4aab-9e2f-b63b9e954f58' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Florence';

-- chasing monsoon  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Alexander', name_display = 'Alexander Frater', last_updated_at = now()
  WHERE id = '9bd25261-a85c-4b68-ad8b-b5c9c7434eff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Frater';

-- wohnsitz  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Carlo', name_display = 'Carlo Fruttero', last_updated_at = now()
  WHERE id = 'eea85134-2c06-4d92-9488-86017aebff71' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Fruttero';

-- titanic  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Lawrence', name_display = 'Lawrence Beesley', last_updated_at = now()
  WHERE id = '49d46ca3-8039-40c0-9d0d-d75dfafc1487' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beesley';

-- geschichtenverkaeufer | sofies  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Jostein', name_display = 'Jostein Gaarder', last_updated_at = now()
  WHERE id = '4bb56251-c123-4888-a21d-4bd019cbc520' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gaarder';

-- letzten  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Adolf', name_display = 'Adolf Galland', last_updated_at = now()
  WHERE id = '4d57853d-3397-47bb-8dfb-aa4dc9bceea9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Galland';

-- nascondo  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Gerd', name_display = 'Gerd Gaiser', last_updated_at = now()
  WHERE id = 'd237bc33-f301-464d-9142-9fc7238acca2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gaiser';

-- lebens  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Catherine', name_display = 'Catherine Gaskin', last_updated_at = now()
  WHERE id = 'fff69764-43cd-4644-adf0-b7925c47d347' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gaskin';

-- Der Weg nach vorn. Die Zukunft der Informationsgesellschaft. | vorn  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Bill', name_display = 'Bill Gates', last_updated_at = now()
  WHERE id = 'f0440fef-9386-4698-8bf1-e0e58acad4b9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gates';

-- prophet  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Kahlil', name_display = 'Kahlil Gibran', last_updated_at = now()
  WHERE id = 'fd1ea7df-5b0f-4e07-8884-e167351d1ba2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gibran';

-- legenden  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Gilman', last_updated_at = now()
  WHERE id = '74ea4e4b-75b4-4858-9810-dfe9af0278b8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gilman';

-- inquisition  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Godman', last_updated_at = now()
  WHERE id = '09b794c1-fa5a-4d20-867b-b4d443ce8482' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Godman';

-- Der Horizont hat Flügel | Wie ein Vogel im Aquarium  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Daniel', name_display = 'Daniel Goeudevert', last_updated_at = now()
  WHERE id = '23289b86-b6bd-46e1-8f1a-2df1c2416295' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Goeudevert';

-- schwierigen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Nancy', name_display = 'Nancy Good', last_updated_at = now()
  WHERE id = '69333d9b-b471-4ae3-84b0-42916b4f2d9b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Good';

-- weg weissen wolken  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Anagarika', name_display = 'Anagarika Govinda', last_updated_at = now()
  WHERE id = '47a7e18b-19e5-4ba6-abd7-37b11d8171d5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Govinda';

-- november  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Bill', name_display = 'Bill Granger', last_updated_at = now()
  WHERE id = '999535be-d17b-481f-a0b2-0f1ac8cdf274' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Granger';

-- blechtrommel | raettin  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Günter', name_display = 'Günter Grass', last_updated_at = now()
  WHERE id = '47d73da0-0d6e-4de4-bf51-6a1f10dd4657' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grass';

-- sins  [OpenLibrary-Titel, 6 Treffer]
UPDATE public.authors SET first_name = 'Andrew M.', name_display = 'Andrew M. Greeley', last_updated_at = now()
  WHERE id = 'a67e6e6a-cfc5-4fe1-8cc2-a9894b20c96d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Greeley';

-- landstreicherin  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hans Jakob Christoffel', name_display = 'Hans Jakob Christoffel von Grimmelshausen', namenszusatz = 'von', last_updated_at = now()
  WHERE id = '98b0e96f-be1b-42f1-afd4-1d69635e4b57' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Grimmelshausen';

-- Im Netz | Off Limits | Tod in Texas  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Habe', last_updated_at = now()
  WHERE id = '88a69d08-64c2-4e91-8117-1daa46c9f7f8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Habe';

-- karl  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Karl', name_display = 'Karl Brandi', last_updated_at = now()
  WHERE id = '57714eb4-34fd-4b9f-8036-8b7a733e1cb6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Brandi';

-- avignon  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Marianne', name_display = 'Marianne Calmann', last_updated_at = now()
  WHERE id = '8f99ca55-2749-4c41-adcd-0ecc01378425' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Calmann';

-- fuechsin | storyville  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Frank', name_display = 'Frank Yerby', last_updated_at = now()
  WHERE id = '58902686-0a2f-4f63-a3d6-e9b7f34afe46' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yerby';

-- Die Stalinorgel  [OpenLibrary-Titel, 2 Treffer, Alt: Gert - Ledig]
UPDATE public.authors SET first_name = 'Gert', name_display = 'Gert Ledig', last_updated_at = now()
  WHERE id = 'a9f6d8a4-f271-49f2-a28d-7f2c5dd3f2b6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ledig';

-- reisen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Milo', name_display = 'Milo Dor', last_updated_at = now()
  WHERE id = 'f0357381-f2f2-458b-9988-0ba4a3e99478' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Dor';

-- iran  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Shirin', name_display = 'Shirin Ebadi', last_updated_at = now()
  WHERE id = 'd338574b-0f0b-4090-a906-ae18efe01b60' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ebadi';

-- aufbruch | chip  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Erich J.', name_display = 'Erich J. Lejeune', last_updated_at = now()
  WHERE id = 'f68c4b19-a31b-46d1-ae86-19c79f59b3b2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lejeune';

-- Denktraining | Gottes sanfte Rebellen  [OpenLibrary-ISBN, 1 Treffer, Alt: Paul Feldmann]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Feldmann', last_updated_at = now()
  WHERE id = '619f0cb9-ac1b-47eb-83a4-361320371ba6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Feldmann';

-- ziel  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Eliyahu M.', name_display = 'Eliyahu M. Goldratt', last_updated_at = now()
  WHERE id = '44e52ef1-1186-4977-bfbe-9db85ca3251f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Goldratt';

-- weltmacht  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Hacke', last_updated_at = now()
  WHERE id = '71a08dca-9f29-422d-97e8-ccf056e6c2e8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hacke';

COMMIT;

-- Kontrolle danach:
-- SELECT count(*) FROM public.authors WHERE NULLIF(btrim(first_name),'') IS NULL;
