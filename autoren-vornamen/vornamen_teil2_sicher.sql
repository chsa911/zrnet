-- Vornamen ergänzen – Teil 2: Sicherheit hoch + mittel
-- 570 Autoren. Nur Einträge, die (noch) keinen Vornamen haben, werden geändert.
-- In DBeaver: Datei öffnen, Verbindung wählen (zuerst Test-Branch!), Alt+X / ⌥X.
-- Erwartet: 570x "Updated rows: 1" (0 = Autor wurde inzwischen schon geändert, das ist ok).

BEGIN;

-- ===== Sicherheit: hoch (331) =====

-- Soledad oder Im Süden unten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Futscher', last_updated_at = now()
  WHERE id = '44d4813b-121c-4bf9-8f59-5de62cdb0bd0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Futscher';

-- Atlantis | Das Kreuzfahrer-Gold  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David J. L.', name_display = 'David J. L. Gibbins', last_updated_at = now()
  WHERE id = 'e09b2b3b-125d-4826-b072-1198a9208836' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gibbins';

-- Wege Zum Gleichgewicht | unbequeme  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Al', name_display = 'Al Gore', last_updated_at = now()
  WHERE id = '677fc672-a6af-48e9-a9a6-4478a872c483' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gore';

-- nachkrisenzeit  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Daniel', name_display = 'Daniel Gros', last_updated_at = now()
  WHERE id = '149893ae-73ac-4cf7-b6f1-8f1a0e9472ce' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gros';

-- Ausverkauft!  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Siegfried', name_display = 'Siegfried Haider', last_updated_at = now()
  WHERE id = '3761a703-5028-4cc9-b8a4-f9fc6659bdf9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Haider';

-- Cuba | heilen schnelltempo  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Frank-Peter', name_display = 'Frank-Peter Herbst', last_updated_at = now()
  WHERE id = 'c81d15e2-2514-4dab-a6da-428c70e0e22c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Herbst';

-- Die geheimen Schriften von Clairet 01. Die Herrin ohne Land  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Andrea H.', name_display = 'Andrea H. Japp', last_updated_at = now()
  WHERE id = '7aca34a5-8d0a-46e0-a257-6f97a00e3e23' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Japp';

-- Der Geschmack von Apfelkernen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Katharina', name_display = 'Katharina Hagena', last_updated_at = now()
  WHERE id = 'f863263b-31b4-4221-8942-9d0153054acb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hagena';

-- Indonesien | Mexiko | Südamerika  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Helfritz', last_updated_at = now()
  WHERE id = '3e499a7f-bee8-45a9-95b7-0f7284c4d20a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Helfritz';

-- Aufzeichnungen Eines Unbequemen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Boris', name_display = 'Boris Jelzin', last_updated_at = now()
  WHERE id = '027e346b-07c5-4f17-91dd-e9a1e530644e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jelzin';

-- How to Take Smart Notes: One Simple Technique to Boost Writing, Learni  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sönke', name_display = 'Sönke Ahrens', last_updated_at = now()
  WHERE id = '4e6dd754-71b5-4d97-8341-8cd966615b55' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ahrens';

-- "Er steht einfach nicht auf dich!"  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Greg', name_display = 'Greg Behrendt', last_updated_at = now()
  WHERE id = '04951a97-1b59-435e-a860-7489485e8fbf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Behrendt';

-- Der islamische Faschismus  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hamed', name_display = 'Hamed Abdel-Samad', last_updated_at = now()
  WHERE id = '7266b894-b7c0-4c33-9585-89d7362b8913' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Abdel-Samad';

-- Das Kaktusland  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Edward', name_display = 'Edward Abbey', last_updated_at = now()
  WHERE id = '97e6946c-5dc7-4916-a3cb-a1532d248cf9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Abbey';

-- maui  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Glenda', name_display = 'Glenda Bendure', last_updated_at = now()
  WHERE id = '5361eefa-111d-4f14-b6b2-2c1cee9f9735' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bendure';

-- Katharsis  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Katharina', name_display = 'Katharina Beta', last_updated_at = now()
  WHERE id = '46c9ad53-8ede-4f06-bbef-927013f37275' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beta';

-- Alexander oder die Verwandlung der Welt | An den Stätten der Christenh  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Bamm', last_updated_at = now()
  WHERE id = 'e7e9a744-a8fc-4bc2-8b67-ae38871ec7d4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bamm';

-- tatham mound  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Piers', name_display = 'Piers Anthony', last_updated_at = now()
  WHERE id = '5dc31c0c-4418-4771-a657-a358619af0f1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Anthony';

-- Die Geheimnisse des Vatikan  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Corrado', name_display = 'Corrado Augias', last_updated_at = now()
  WHERE id = '454f3b2d-81a0-4bed-82db-34c0f2a1dc61' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Augias';

-- Imperator mundi  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Manuel Fernández', name_display = 'Manuel Fernández Alvarez', last_updated_at = now()
  WHERE id = 'ff53f32e-5169-4d7b-b661-05e882dcc4a1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alvarez';

-- DAS SEX-BUCH  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Günter', name_display = 'Günter Amendt', last_updated_at = now()
  WHERE id = 'ed8153ad-a060-4f12-9df9-13cb80912c71' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Amendt';

-- Magie des Tantra  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Margot', name_display = 'Margot Anand', last_updated_at = now()
  WHERE id = '1a2d807e-b505-4290-9a8c-e90c6c366638' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Anand';

-- Sie bezwangen Rom  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ernst F.', name_display = 'Ernst F. Jung', last_updated_at = now()
  WHERE id = '1b2eff3f-60a2-47df-b3d5-993caa382f91' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jung';

-- Der Sturm / The Perfect Storm | belmont  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sebastian', name_display = 'Sebastian Junger', last_updated_at = now()
  WHERE id = '7e3f01b1-b027-4e42-9978-c12808d9276d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Junger';

-- Das Haus Kanzē  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nobuko', name_display = 'Nobuko Albery', last_updated_at = now()
  WHERE id = '3324e6f3-1014-444f-8d95-3349e1efc330' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Albery';

-- Ich: Erfolg kommt von innen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Oliver', name_display = 'Oliver Kahn', last_updated_at = now()
  WHERE id = 'fe22b1d2-b628-443a-b6aa-55f8bd222e13' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kahn';

-- Griechenland  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Annita', name_display = 'Annita Kalpaka', last_updated_at = now()
  WHERE id = '01e2d578-814f-48a6-9e0b-70a79aae0005' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kalpaka';

-- Wolf und Adler (German Edition)  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Iris', name_display = 'Iris Kammerer', last_updated_at = now()
  WHERE id = '6a0b3166-fe22-4050-af30-11a1972f2989' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kammerer';

-- 3096 Tage  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Natascha', name_display = 'Natascha Kampusch', last_updated_at = now()
  WHERE id = 'd6787a07-68ea-4ef6-b4c1-a8592404e2b3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kampusch';

-- Return of Marco Polo's World | aum  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert D.', name_display = 'Robert D. Kaplan', last_updated_at = now()
  WHERE id = '55ae8700-32bf-47b7-bab3-5fefb97033a2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kaplan';

-- Feminismus für Eilige  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Margret', name_display = 'Margret Karsch', last_updated_at = now()
  WHERE id = '72b57de1-5ee0-4476-b098-e0d4829485bc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Karsch';

-- koenigin | phantom  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Susan', name_display = 'Susan Kay', last_updated_at = now()
  WHERE id = 'b6ad6646-b5a8-4c9c-bde6-99a53c4608b1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kay';

-- anatolien  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Elia', name_display = 'Elia Kazan', last_updated_at = now()
  WHERE id = '20c40400-b4e1-43f8-b684-f803f7c78c16' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kazan';

-- tyll | vermessung welt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Daniel', name_display = 'Daniel Kehlmann', last_updated_at = now()
  WHERE id = 'cbfe39ba-d7e6-4ae0-816e-814371cb885f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kehlmann';

-- Die verlorenen Söhne  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Necla', name_display = 'Necla Kelek', last_updated_at = now()
  WHERE id = 'ea359da3-523b-4206-8ddd-dd84ffebb492' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kelek';

-- Die Schuld des Tages an die Nacht | sirenen bagdad  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Yasmina', name_display = 'Yasmina Khadra', last_updated_at = now()
  WHERE id = '17affa47-2f08-49c8-9f45-35200dca912e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Khadra';

-- Das Leben geht weiter | domino | zivilcourage  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Matthias', name_display = 'Matthias Keidtel', last_updated_at = now()
  WHERE id = '441857ea-053d-4598-9ee3-c895234313df' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Keidtel';

-- Sie nahmen mir die Mutter und gaben mir ein Gewehr | traenen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'China', name_display = 'China Keitetsi', last_updated_at = now()
  WHERE id = '5bffa96c-f752-48a6-8c1b-503652a5b0ed' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Keitetsi';

-- Abschied von 1001 Nacht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrich', name_display = 'Ulrich Kienzle', last_updated_at = now()
  WHERE id = 'df2d03c9-f497-4115-a54c-60d46287f77a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kienzle';

-- Als China erwachte  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Egbert', name_display = 'Egbert Kieser', last_updated_at = now()
  WHERE id = '098f61ec-641a-4e2a-923a-177a0dea3436' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kieser';

-- asshole  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Kihn', last_updated_at = now()
  WHERE id = 'b596ea86-dfbf-4115-ac35-adbf30349065' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kihn';

-- Hundert Milliarden Sonnen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Kippenhahn', last_updated_at = now()
  WHERE id = '18b88e88-e13e-453c-80d9-1ad4eb240043' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kippenhahn';

-- Das Gesetz der Hydra  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Kirchhof', last_updated_at = now()
  WHERE id = 'd5fef69e-82ab-489f-94d8-9bf58a54b809' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kirchhof';

-- LADAKH  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Georg', name_display = 'Georg Kirner', last_updated_at = now()
  WHERE id = '17d984ed-8ba3-4f97-b636-2b0c7819582d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kirner';

-- Auf den Spuren grosser Kulturen | archaelogie einfuehrung  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Benesch', last_updated_at = now()
  WHERE id = 'b0104c93-2cb1-4590-bb57-62a64cf52278' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benesch';

-- Aberland  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gertraud', name_display = 'Gertraud Klemm', last_updated_at = now()
  WHERE id = '4ffb613d-6230-4d4a-b75f-35b4b7bcdab1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Klemm';

-- Gebrauchsanweisung für Bayern | schwarzer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bruno', name_display = 'Bruno Jonas', last_updated_at = now()
  WHERE id = '556d9ba4-409d-45da-8636-18f94b6927b6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jonas';

-- Angst vorm Fliegen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Erica', name_display = 'Erica Jong', last_updated_at = now()
  WHERE id = 'a6c9673d-8ece-43d4-8d62-b2750b3afb64' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jong';

-- White Water South Alps | china  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Knowles', last_updated_at = now()
  WHERE id = 'bc1f35c6-604b-4148-8fda-7b0ccf10c84f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Knowles';

-- The Life-Changing Magic of Tidying: A simple, effective way to banish   [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marie', name_display = 'Marie Kondo', last_updated_at = now()
  WHERE id = '7d0d4173-70af-4b91-af21-b81ee4bd3fc6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kondo';

-- Der Wald  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Kopacka', last_updated_at = now()
  WHERE id = '182594a8-0160-4e5c-8e8f-527d1cde448c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kopacka';

-- Als Schisser um die Welt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jan', name_display = 'Jan Kowalsky', last_updated_at = now()
  WHERE id = 'f50afef1-233c-4bc2-a73e-bc6499a2d1d3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kowalsky';

-- Imperium  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Kracht', last_updated_at = now()
  WHERE id = '88202ad5-c2ba-44e6-89ff-b767f97cee4a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kracht';

-- Aufstand der Gettos  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Andrian', name_display = 'Andrian Kreye', last_updated_at = now()
  WHERE id = '3a7e7879-612b-4403-998a-204fd19373ba' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kreye';

-- Das große Heft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ágota', name_display = 'Ágota Kristof', last_updated_at = now()
  WHERE id = '7a01d116-79f4-4b36-84a3-d931e92f53fd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kristof';

-- Green volunteers  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Fabio', name_display = 'Fabio Ausenda', last_updated_at = now()
  WHERE id = '00248504-d696-4772-89c9-dabd2a7b3e7f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ausenda';

-- Tagebuch einer Hospitantin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Annika', name_display = 'Annika Krump', last_updated_at = now()
  WHERE id = '7d7b36fc-f6e8-4f1f-a0bb-a49b78224b08' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Krump';

-- Endlich über vierzig | vierzig spass  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Susanna', name_display = 'Susanna Kubelka', last_updated_at = now()
  WHERE id = '9b9d7fbb-39fb-419c-b9bd-22f1734f1810' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kubelka';

-- Die Menschenja ger von Antares  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Alan Burt', name_display = 'Alan Burt Akers', last_updated_at = now()
  WHERE id = '1689ffa0-065e-47cf-9bef-669bbb18e5b3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Akers';

-- Das Testament des Herrn Napumoceno  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Germano', name_display = 'Germano Almeida', last_updated_at = now()
  WHERE id = 'fbb2d6c5-d343-4f28-9759-4e1d31f61d67' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Almeida';

-- managing brand  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David A.', name_display = 'David A. Aaker', last_updated_at = now()
  WHERE id = 'e41d1d64-be08-4970-b5d9-899d2f887af4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Aaker';

-- Kapital  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Lanchester', last_updated_at = now()
  WHERE id = '71693e7f-4868-48b8-af1d-d3dcffb988f1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lanchester';

-- Der Regler  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Max', name_display = 'Max Landorff', last_updated_at = now()
  WHERE id = '03785fee-5a11-4820-9fc7-fa378bdb22e4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Landorff';

-- Bittere Pillen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Langbein', last_updated_at = now()
  WHERE id = 'c75de96c-f7ef-4d13-9d91-9bff94051578' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Langbein';

-- Stadt der Freude  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dominique', name_display = 'Dominique Lapierre', last_updated_at = now()
  WHERE id = 'cbcab1c3-8cba-4598-9860-2efaf7b0a22e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lapierre';

-- Nackt unter Wölfen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bruno', name_display = 'Bruno Apitz', last_updated_at = now()
  WHERE id = '28ecb19e-a505-4c33-85a8-8859dcf38abf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Apitz';

-- Sand queen | papaya  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Helen', name_display = 'Helen Benedict', last_updated_at = now()
  WHERE id = '30e029b8-90b9-47dd-bae9-cd0cff9ee82a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benedict';

-- Dr. Quinn - Arztin aus Leidenschaft, Sprache des Herzens | blaue leuch  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dorothy', name_display = 'Dorothy Laudan', last_updated_at = now()
  WHERE id = '4b78f020-dcec-4641-b281-170a99ba7704' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Laudan';

-- Mythos Baum  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Doris', name_display = 'Doris Laudert', last_updated_at = now()
  WHERE id = '2c3dd4e2-1773-43ab-9c34-5b90bd72f494' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Laudert';

-- Nichts ausgelassen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Heiner', name_display = 'Heiner Lauterbach', last_updated_at = now()
  WHERE id = '82a92bc9-33ec-4a9a-bbed-d1a11a345be7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lauterbach';

-- Truhen Des Arcimboldo | arcimboldo  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hanjo', name_display = 'Hanjo Lehmann', last_updated_at = now()
  WHERE id = '4a55b8b6-8c8c-4aaf-b111-0185a4247aa8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lehmann';

-- Das letzte Land  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Svenja', name_display = 'Svenja Leiber', last_updated_at = now()
  WHERE id = 'b937f3ee-4477-4f9f-acb3-90737e8157c8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Leiber';

-- Eine Brücke nach Uganda  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Lenhart', last_updated_at = now()
  WHERE id = 'caba73ff-10ad-4467-a3c3-811c3ab5dd5c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lenhart';

-- Zurück zum gesunden Schlaf  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Raphael', name_display = 'Dr. Raphael Lenne', title = 'Dr.', last_updated_at = now()
  WHERE id = 'f2293f33-f812-416a-b7f6-c22d8ee21e0f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lenne';

-- Patient meines Lebens  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bernhard', name_display = 'Bernhard Albrecht', last_updated_at = now()
  WHERE id = '03e2bb4d-974c-4cee-8b10-04a2d5d22ded' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Albrecht';

-- Versuch einer Vermeidung  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eva-Maria', name_display = 'Eva-Maria Alves', last_updated_at = now()
  WHERE id = '3e4243b1-e48f-476e-80b2-72835ecf0333' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alves';

-- Das Haus der fünf Sinne  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nadeem', name_display = 'Nadeem Aslam', last_updated_at = now()
  WHERE id = '6cd2005a-e660-4fc9-8093-cbc8f2d2646a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Aslam';

-- Dunkles Leuchten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David L.', name_display = 'David L. Lindsey', last_updated_at = now()
  WHERE id = 'a5f99027-c1de-40c3-8032-ac16862d4e35' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lindsey';

-- Die Sekte - Dein Albtraum nimmt kein Ende  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Mariette', name_display = 'Mariette Lindstein', last_updated_at = now()
  WHERE id = '9a6c9e35-e954-4ecc-aaed-aa3164a68842' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lindstein';

-- Das Wok Kochbuch  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kenneth H. C.', name_display = 'Kenneth H. C. Lo', last_updated_at = now()
  WHERE id = 'd2fa7595-6e32-40e9-bd8b-addfbf0845ab' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lo';

-- Der Jahrtausendflug: Reisebericht vom Mars  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jürgen', name_display = 'Jürgen Lodemann', last_updated_at = now()
  WHERE id = 'bc47c18d-971c-46f7-9621-16fd03433999' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lodemann';

-- Therapie  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Lodge', last_updated_at = now()
  WHERE id = '7e3faf55-20be-4dab-9de2-4e22ccb63564' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lodge';

-- Sieben Tage für die Ewigkeit | Wo bist du?  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Marc', name_display = 'Marc Levy', last_updated_at = now()
  WHERE id = 'be665ea1-022a-4a62-a967-a6f5bcdb9b79' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Levy';

-- Istanbul  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rosie', name_display = 'Rosie Ayliffe', last_updated_at = now()
  WHERE id = '5db5245b-c607-456c-add2-4b4a0e34e945' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ayliffe';

-- Blutiges Eis  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Giles', name_display = 'Giles Blunt', last_updated_at = now()
  WHERE id = 'e1c767a0-b435-4e1f-a559-9cdb0ce8b13d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Blunt';

-- Black Bazar  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Alain', name_display = 'Alain Mabanckou', last_updated_at = now()
  WHERE id = '3bbbbf04-f39b-454b-aee3-e72d5417e857' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mabanckou';

-- Borneo (World's Wild Places Series)  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Mackinnon', last_updated_at = now()
  WHERE id = 'f85bd75b-c9e5-464e-a6b7-b616404f57cd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mackinnon';

-- Bergauf, bergab. Erzählungen mit Hintergedanken  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hermann', name_display = 'Hermann Magerer', last_updated_at = now()
  WHERE id = '8b0ba61f-5207-49f2-96b9-3a0d14527e7c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Magerer';

-- Rechnung offen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Inger-Maria', name_display = 'Inger-Maria Mahlke', last_updated_at = now()
  WHERE id = '392c3e3d-b43d-4f20-b95e-d328c6e84c87' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mahlke';

-- Secret child  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ann', name_display = 'Ann Major', last_updated_at = now()
  WHERE id = '006420c3-58e0-4dc9-9e36-844683166216' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Major';

-- The Unlikely Pilgrimage of Harold Fry | ulysses  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rachel', name_display = 'Rachel Joyce', last_updated_at = now()
  WHERE id = 'adfd4ed0-7219-4d3a-ba79-9c138c6412aa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Joyce';

-- Kaito  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Kruppa', last_updated_at = now()
  WHERE id = '6a9e4099-c2c4-4f5b-9bfd-6e6428131f12' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kruppa';

-- Kurze Geschichte des Traktors auf Ukrainisch  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marina', name_display = 'Marina Lewycka', last_updated_at = now()
  WHERE id = '938b85d8-4d82-40d0-b733-9aa76313402d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lewycka';

-- Die Geschichte meines Sohnes  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nadine', name_display = 'Nadine Gordimer', last_updated_at = now()
  WHERE id = '382471d5-3b05-41b9-a1b1-f77dac939bb0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gordimer';

-- Der letzte Traum des Pharao | hatscheput | widders  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hanns', name_display = 'Hanns Kneifel', last_updated_at = now()
  WHERE id = '43134d53-9d91-4058-97e5-7da67639207e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kneifel';

-- Der Reich der Königin von Saba  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gabriel', name_display = 'Gabriel Mandel', last_updated_at = now()
  WHERE id = '7f85bb3e-43e5-4952-bd31-c22bcee1126f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mandel';

-- Die Jagd nach dem Wüstengrab. Roman  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Valerio Massimo', name_display = 'Valerio Massimo Manfredi', last_updated_at = now()
  WHERE id = 'ce27a6de-8200-48f6-8c47-0d90a445bc56' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Manfredi';

-- Die stumme Herzogin. Roman  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dacia', name_display = 'Dacia Maraini', last_updated_at = now()
  WHERE id = '17b5609b-5863-47c9-baff-42c5dbeda4f4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Maraini';

-- Im Schatten des Diktators. Mein Leben im Irak  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ashti', name_display = 'Ashti Marben', last_updated_at = now()
  WHERE id = '97b8ac31-39ec-4579-971f-8ace0e6af56d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Marben';

-- Mr Nice  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Howard', name_display = 'Howard Marks', last_updated_at = now()
  WHERE id = '711489bd-061d-48bc-88ac-4c3f265edd28' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Marks';

-- Tal der Loire. von OrlÂans nach Nantes  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Irene', name_display = 'Irene Martschukat', last_updated_at = now()
  WHERE id = '649e9ec4-475d-4ed3-aa55-ca13073424b4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Martschukat';

-- Bittere Mandelblüten. Roman | mandelblueten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sujata', name_display = 'Sujata Massey', last_updated_at = now()
  WHERE id = 'f302e25c-0368-4cdf-aefd-4891b846455a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Massey';

-- Nackt unter Krabben  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marie', name_display = 'Marie Matisek', last_updated_at = now()
  WHERE id = '75351061-4858-4654-8a66-2e46d7e53b95' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Matisek';

-- Felsenfest | felsenfest | tod daneben  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jörg', name_display = 'Jörg Maurer', last_updated_at = now()
  WHERE id = '5bb9219e-0d05-4ec3-87b3-50315cbba64c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Maurer';

-- Die eisernen riegel zerbrechen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Zenta', name_display = 'Zenta Maurina', last_updated_at = now()
  WHERE id = '456c36cc-7e3e-4250-b800-4ba864312b6e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Maurina';

-- flammenbrut | tiere  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Simon', name_display = 'Simon Beckett', last_updated_at = now()
  WHERE id = 'aa015734-5c46-44ad-804a-885fe173a1dc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Beckett';

-- Moby Dick | moby  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Herman', name_display = 'Herman Melville', last_updated_at = now()
  WHERE id = '2b6162ed-71ba-4758-b78f-1400f1e60555' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Melville';

-- Lexikon der Wirtschaftsinformatik  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Mertens', last_updated_at = now()
  WHERE id = 'f3dea26e-6bdf-4cb8-9d42-65e078474996' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mertens';

-- Reiseführer Natur, Kanada  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Mertz', last_updated_at = now()
  WHERE id = 'd89faeab-50ba-40e5-8233-58ec3dace469' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mertz';

-- Der Mann 2000  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Siegfried', name_display = 'Siegfried Meryn', last_updated_at = now()
  WHERE id = '1226d116-b7ee-4d45-97b1-2125ccedf3a5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Meryn';

-- Globalisierung Von Unten: Der Kampf Gegen Die Herrschaft Der Konzerne  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Maria', name_display = 'Maria Mies', last_updated_at = now()
  WHERE id = '5ab8fa8a-2e75-4cba-9035-25aa76dc9008' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mies';

-- Die Feigheit der Frauen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bascha', name_display = 'Bascha Mika', last_updated_at = now()
  WHERE id = 'b35f3175-3552-4ed3-823b-cd9b57871ed1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mika';

-- Saucool | reste meer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Limmer', last_updated_at = now()
  WHERE id = '760c5863-1105-40e9-b714-bacd9c33c8bf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Limmer';

-- A woman to be loved | verweht  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'James', name_display = 'James Mitchell', last_updated_at = now()
  WHERE id = 'e6861563-5ff5-4aa9-982a-0c5e102ef452' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mitchell';

-- Denken wie ein Shaolin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bernhard', name_display = 'Bernhard Moestl', last_updated_at = now()
  WHERE id = '2fe7fd9e-c6d3-4ea7-b5e5-799ddfb5cd91' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Moestl';

-- Handbook of Australian animals  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Averil', name_display = 'Averil Moffat', last_updated_at = now()
  WHERE id = 'eb5408b9-bb32-464f-80b3-6b2f49a62668' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Moffat';

-- Im Banne Buddhas  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Max', name_display = 'Max Mohl', last_updated_at = now()
  WHERE id = 'fde1af2d-5db9-42e9-8abb-060787ed7e35' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mohl';

-- Die Macht Ihres Unterbewußtseins 2003. Abreiß- Kalender | loewenkoenig  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Joseph', name_display = 'Joseph Murphy', last_updated_at = now()
  WHERE id = 'a17521e9-ccd7-4267-8050-46a850720609' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Murphy';

-- Central Park  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Guillaume', name_display = 'Guillaume Musso', last_updated_at = now()
  WHERE id = '9935999f-5fbc-4d8b-a953-a8781ea409da' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Musso';

-- Reading Lolita in Tehran: a memoir in books  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Azar', name_display = 'Azar Nafisi', last_updated_at = now()
  WHERE id = '1b8aa95c-c87a-4400-83f3-d518a6e4c4a6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nafisi';

-- Angstspiel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jonathan', name_display = 'Jonathan Nasaw', last_updated_at = now()
  WHERE id = 'ecd7e8f9-80de-4b86-8576-965aa686f346' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nasaw';

-- Tango-Dimensionen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nicole', name_display = 'Nicole Nau-Klapwijk', last_updated_at = now()
  WHERE id = '6e5451c2-b75b-485c-82ea-ffc5771663fd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nau-Klapwijk';

-- Nett ist die kleine Schwester von Scheiße  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rebecca', name_display = 'Rebecca Niazi-Shahabi', last_updated_at = now()
  WHERE id = '459bf5c8-b761-47c9-816d-b82b5faa3600' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Niazi-Shahabi';

-- Die Tochter der Seidenweberin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ursula', name_display = 'Ursula Niehaus', last_updated_at = now()
  WHERE id = 'd518594d-a5ad-4d57-b995-133414592f3c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Niehaus';

-- Schauen Sie sich mal diese Sauerei an: 20 Wahre Geschichten vom Lebenr  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jörg', name_display = 'Jörg Niessen', last_updated_at = now()
  WHERE id = '315c75ae-6f63-4364-87d3-bde271bb7b83' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Niessen';

-- Der Splitter im Auge Gottes | amateurs  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Larry', name_display = 'Larry Niven', last_updated_at = now()
  WHERE id = '14634f80-201d-48b2-96fd-1e9b0c21ccd2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Niven';

-- Weras Talent  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sabine', name_display = 'Sabine Alt', last_updated_at = now()
  WHERE id = '9b460220-78c1-4e39-8d04-028a9e531249' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alt';

-- Lempriere's Wörterbuch  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lawrence', name_display = 'Lawrence Norfolk', last_updated_at = now()
  WHERE id = '97c10cb9-68a2-40d8-8f5b-6d9194a4cbaf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Norfolk';

-- London. Kunst - Reiseführer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ingrid', name_display = 'Ingrid Nowel', last_updated_at = now()
  WHERE id = '6d18485f-45a6-46d3-b5a2-a7978f0b2a4f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nowel';

-- Wo Legenden sterben  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kem', name_display = 'Kem Nunn', last_updated_at = now()
  WHERE id = 'f6b7149a-6aca-48c6-bcbf-b84f90321362' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nunn';

-- Sturmtief  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hannes', name_display = 'Hannes Nygaard', last_updated_at = now()
  WHERE id = 'c5a4ea29-6e0a-4be6-94e9-4ee2e2d8aceb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nygaard';

-- Programming in Scala: Updated for Scala 2.12  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Odersky', last_updated_at = now()
  WHERE id = 'b42c7c05-e25f-46ae-bb15-47204a66299f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Odersky';

-- Stockholm  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Becky', name_display = 'Becky Ohlsen', last_updated_at = now()
  WHERE id = '38cbd7d2-abae-4145-bb76-087db4343400' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ohlsen';

-- Wie in einem Traum | yogini  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulli', name_display = 'Ulli Olvedi', last_updated_at = now()
  WHERE id = 'f21778c3-d643-4377-9d93-bb67f5088fd5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Olvedi';

-- Die Kirschen in Nachbars Garten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Julia', name_display = 'Julia Onken', last_updated_at = now()
  WHERE id = 'b88459bb-c244-4ec9-800e-3f40dc23cf91' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Onken';

-- Unter Wasser atmen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Julie', name_display = 'Julie Orringer', last_updated_at = now()
  WHERE id = '15ceaf99-71f8-419b-b133-028419245059' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Orringer';

-- Couchsurfing im Iran | couchsurfing  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Stephan', name_display = 'Stephan Orth', last_updated_at = now()
  WHERE id = 'a311192a-b794-403b-9e85-dabb2988486a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Orth';

-- All the rivers run  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nancy', name_display = 'Nancy Cato', last_updated_at = now()
  WHERE id = '3131c402-d9c2-495c-905e-a43755f5de5d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cato';

-- Der perfekte Liebhaber. Sextechniken, die sie verrückt machen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lou', name_display = 'Lou Paget', last_updated_at = now()
  WHERE id = '1d48948c-e00a-4c0a-8d88-a6d9491a89a9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Paget';

-- Pole to pole with Michael Palin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Palin', last_updated_at = now()
  WHERE id = '48789745-2bde-4fa1-a875-d3c296eb9f95' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Palin';

-- Die Erbschaft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Connie', name_display = 'Connie Palmen', last_updated_at = now()
  WHERE id = 'e0008bc3-eb61-4636-a7dd-667221ef2aa6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Palmen';

-- Die Farben des Stahls 1. Stadt der Schwerter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'K. J.', name_display = 'K. J. Parker', last_updated_at = now()
  WHERE id = '219272a5-4d56-4cbe-8203-607162666507' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Parker';

-- Der Wald ruft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Moritz', name_display = 'Moritz Matthies', last_updated_at = now()
  WHERE id = 'ddeeb519-085f-4fff-8d1b-1354de0bc25f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Matthies';

-- Wir Deutschen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Matthias', name_display = 'Matthias Matussek', last_updated_at = now()
  WHERE id = '504cad59-badc-4c26-be74-a8cd5b43a5e6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Matussek';

-- --und auch nicht anderswo! | schulmeisterlein  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Reimar', name_display = 'Reimar Paul', last_updated_at = now()
  WHERE id = 'fee45af6-8897-4da8-9c41-43791340b85b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Paul';

-- Krypto-Kunst  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kolja', name_display = 'Kolja Reichert', last_updated_at = now()
  WHERE id = 'e82c0ac7-8e73-4ebf-a59d-117e639a3a55' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reichert';

-- Kokainmeere  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ana Lilia', name_display = 'Ana Lilia Perez', last_updated_at = now()
  WHERE id = '05cb1d1e-8f0c-4b63-9640-b030195ac932' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Perez';

-- Neujahr  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Juli', name_display = 'Juli Zeh', last_updated_at = now()
  WHERE id = 'e38e6713-30e2-48c1-8a46-f612a0224640' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zeh';

-- Freak. Verfilmt als 'The Mighty' | herzen1 see  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rodman', name_display = 'Rodman Philbrick', last_updated_at = now()
  WHERE id = '60fba4b6-a836-4403-8bd6-cec0e5045f14' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Philbrick';

-- Das Herz ihrer Tochter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jodi', name_display = 'Jodi Picoult', last_updated_at = now()
  WHERE id = '76e170e0-7f6e-41fe-b572-23380bd4adbd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Picoult';

-- Frauen und Pferde - Eine Leidenschaft  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Melissa', name_display = 'Melissa Pierson', last_updated_at = now()
  WHERE id = '272cf5d7-5cd6-4012-a654-0b281a870cb3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pierson';

-- Assembler  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Trutz Eyke', name_display = 'Trutz Eyke Podschun', last_updated_at = now()
  WHERE id = '3f7ce833-8d0b-40bb-bfbc-c971dab264d0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Podschun';

-- Knaurs grosses Gesundheitslexikon  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Pollak', last_updated_at = now()
  WHERE id = '3bcad460-9d43-4213-99a1-7cbc9a85fba7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pollak';

-- Die Grossen der Liebe  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Georg', name_display = 'Georg Popp', last_updated_at = now()
  WHERE id = '91f55185-e77d-4e96-af3b-a3adb0959e87' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Popp';

-- Die Handschrift von Saragossa  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jan', name_display = 'Jan Potocki', last_updated_at = now()
  WHERE id = '53689bd7-9d30-48bc-aadc-4e015d118ab8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Potocki';

-- Der Wunschzettel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Alexandra', name_display = 'Alexandra Potter', last_updated_at = now()
  WHERE id = '24bea2cb-3d88-419b-bb75-2a625fe0cd39' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Potter';

-- Der Sushimeister  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nani', name_display = 'Nani Power', last_updated_at = now()
  WHERE id = '5f5c8c4f-8e2d-4e56-a1a7-9b7a58e7bfa5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Power';

-- Dead man walking  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Helen', name_display = 'Helen Prejean', last_updated_at = now()
  WHERE id = 'ac87820a-c335-4f2d-904b-3c09bf317d3b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Prejean';

-- Hirn ist aus  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Urban', name_display = 'Urban Priol', last_updated_at = now()
  WHERE id = '5f7fd3a0-0865-459e-a729-9612a2df7b25' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Priol';

-- Der Kuß der Spinnenfrau. Roman | Der schönste Tango der Welt.  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Manuel', name_display = 'Manuel Puig', last_updated_at = now()
  WHERE id = '1c90170b-cb43-47c7-96aa-43ce95c98e65' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Puig';

-- Das Ende unserer Zeit. Aufbruch in das Wassermann- Zeitalter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Paco', name_display = 'Paco Rabanne', last_updated_at = now()
  WHERE id = '3c0b8da8-611a-4050-82d5-2bd0faef3770' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rabanne';

-- Unsere Hochzeiten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dorit', name_display = 'Dorit Rabinyan', last_updated_at = now()
  WHERE id = '878633b0-239e-4965-bfc8-f795417fed96' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rabinyan';

-- Der Schrei des Löwen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ortwin', name_display = 'Ortwin Ramadan', last_updated_at = now()
  WHERE id = '252141e1-7deb-44e6-bac5-50b54f754667' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ramadan';

-- The McKinsey way  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ethan M.', name_display = 'Ethan M. Rasiel', last_updated_at = now()
  WHERE id = '3487669a-0253-4171-8ff3-42c4e5d2cb65' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rasiel';

-- Was will man mehr | kann  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Rath', last_updated_at = now()
  WHERE id = '665b2f55-3eb0-4a51-9081-b298348d2df0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rath';

-- Die verborgene Welt der Geheimbünde | falsche prophet  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrich', name_display = 'Ulrich Rausch', last_updated_at = now()
  WHERE id = '11f41f59-81e9-48af-9f7f-743abbcdb062' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rausch';

-- Living in Spain  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Reay-Smith', last_updated_at = now()
  WHERE id = 'c0f59243-dce2-4aef-8379-9fb48e1fd609' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reay-Smith';

-- Damals in Bolechów  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anatol', name_display = 'Anatol Regnier', last_updated_at = now()
  WHERE id = 'a0b0cddb-f19a-4b31-b49c-6c113f6bd940' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Regnier';

-- Die Wundärztin / Bernsteinerbe | wundaerztin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Heidi', name_display = 'Heidi Rehn', last_updated_at = now()
  WHERE id = '6b3763cd-fd1a-4d99-be0d-97ddb7d612b4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rehn';

-- Die Diamantenkinder  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Annette', name_display = 'Annette Rehrl', last_updated_at = now()
  WHERE id = 'ba78f73e-ed7b-4ebd-a0e0-02463af8f43a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rehrl';

-- Friedrich der Grosse: ein Königtum der Widersprüche  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Theodor', name_display = 'Theodor Schieder', last_updated_at = now()
  WHERE id = 'ddb10351-eb28-44e4-84bb-f9c615a8e32a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schieder';

-- Der Tempel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Matthew', name_display = 'Matthew Reilly', last_updated_at = now()
  WHERE id = '1054d771-5ba1-41fd-a7aa-8980d8d9959e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reilly';

-- Von Kamen nach Corleone | corleone  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Petra', name_display = 'Petra Reski', last_updated_at = now()
  WHERE id = '359ec3b1-5656-4f2e-95ef-0ba1b5acd0ad' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reski';

-- Lost in Fuseta  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gil', name_display = 'Gil Ribeiro', last_updated_at = now()
  WHERE id = '1ca5acc7-0a5a-4788-b3a4-9024bbb30be6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ribeiro';

-- Ich war ein Kind in Afrika  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jo-Anne', name_display = 'Jo-Anne Richards', last_updated_at = now()
  WHERE id = '51bd4221-e65c-4b55-b8e2-9a64b52f9669' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Richards';

-- Schwarze Frau vom Nil  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Brigitte', name_display = 'Brigitte Riebe', last_updated_at = now()
  WHERE id = 'b7d39325-fb84-4be6-b35b-4c767bd9f1a0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Riebe';

-- Lauter starke Jungen. Ein Buch für Eltern. | eltern grenzen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jan-Uwe', name_display = 'Jan-Uwe Rogge', last_updated_at = now()
  WHERE id = '3aeda885-395e-4c0f-b414-93614ae51612' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rogge';

-- Die Schamanin | Lab 47. Gefahr aus dem Labor. | todesbraeute  [OpenLibrary-ISBN, 1 Treffer, Alt: Marcia Rose]
UPDATE public.authors SET first_name = 'Malcom', name_display = 'Malcom Rose', last_updated_at = now()
  WHERE id = '9b6d14a1-b829-4dbf-96ce-95e939b7b537' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rose';

-- Die Nacht der Amazonen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Herbert', name_display = 'Herbert Rosendorfer', last_updated_at = now()
  WHERE id = '24c6cd18-6551-4a64-af51-eff8e8af2bd8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rosendorfer';

-- Magd, Metz' oder Mörderin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulinka', name_display = 'Ulinka Rublack', last_updated_at = now()
  WHERE id = '3960ae05-f951-410a-abac-1dfd9dc5ace7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rublack';

-- Fuck the Möhrchen | moehrchen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Barbara', name_display = 'Barbara Ruscher', last_updated_at = now()
  WHERE id = '15d5c100-83ae-4c1c-a9ba-299ebccd60d0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ruscher';

-- Die Hacker-Bibel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ryan', name_display = 'Ryan Russel', last_updated_at = now()
  WHERE id = 'b8891700-3f4e-4816-8d6d-868cf152c098' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Russel';

-- Diese gottverdammten Träume  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard Russo', last_updated_at = now()
  WHERE id = '4c864554-6ff7-4666-9f59-e45615b2414a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Russo';

-- Gebrauchsanweisung für die USA  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Adriano', name_display = 'Adriano Sack', last_updated_at = now()
  WHERE id = '8c0a0efc-92ec-4fdc-9576-88a9dd291f30' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sack';

-- Aimez-vous Brahms... | Bonjour tristesse | kosmos  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Françoise', name_display = 'Françoise Sagan', last_updated_at = now()
  WHERE id = 'd26aa8f5-5078-421f-a09b-a4c537d44671' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sagan';

-- Schottland | night  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Sager', last_updated_at = now()
  WHERE id = '9e8847cc-82af-4ca5-84bc-3814372a93c6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sager';

-- Memoirs of an invisible man  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'H. F.', name_display = 'H. F. Saint', last_updated_at = now()
  WHERE id = '4e873bc1-4a86-40d2-a8dd-b30ec11e25a8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Saint';

-- Alles richtig gemacht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gregor', name_display = 'Gregor Sander', last_updated_at = now()
  WHERE id = '996c863f-b452-4638-a4ae-ff3f54110e6f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sander';

-- Erde in meiner Hand. Die Geschichte eines rebellischen Lebens  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anneliese', name_display = 'Anneliese Sappl', last_updated_at = now()
  WHERE id = '14cb85e0-6bb0-40d9-8f2c-934f6354d1fd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sappl';

-- Der Geschmack der Tollkirsche | Der Stern der Theophanu  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Beate', name_display = 'Beate Sauer', last_updated_at = now()
  WHERE id = '40c635d3-098d-4df1-a26f-fb7d3c8134ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sauer';

-- Das Lächeln des Cicero  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Steven', name_display = 'Steven Saylor', last_updated_at = now()
  WHERE id = '94cdc7ce-1f57-4a6b-b026-0ff46398c8c7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Saylor';

-- Der genetische Krieg  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christof', name_display = 'Christof Schade', last_updated_at = now()
  WHERE id = 'db236edb-58b1-46e4-8f04-21a94d5b71a2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schade';

-- Adolf-Hitler-Strasse 14  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Max Pierre', name_display = 'Max Pierre Schaeffer', last_updated_at = now()
  WHERE id = '5ccad47c-5b21-419b-ba1a-884814d78914' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schaeffer';

-- Der Hals der Giraffe  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Judith', name_display = 'Judith Schalansky', last_updated_at = now()
  WHERE id = '4cf4419a-f262-4000-a7f9-2ddffbf21b53' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schalansky';

-- Der scharlachrote Gesang. Roman  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Mariama', name_display = 'Mariama Ba', last_updated_at = now()
  WHERE id = 'f83dc16b-1f85-4f18-902a-cf08522b7014' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ba';

-- Franz Josef Strauss  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wilfried', name_display = 'Wilfried Scharnagl', last_updated_at = now()
  WHERE id = '4f08e327-376e-4700-b542-3c01284bb053' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scharnagl';

-- Bevor alles verschwindet  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Annika', name_display = 'Annika Scheffel', last_updated_at = now()
  WHERE id = '164b88b8-5b36-4711-a93e-1dc577f74b7a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scheffel';

-- Der Bergdoktor | Der Bergdoktor III | Ewig fließen die Wasser des Nil  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Susanne', name_display = 'Susanne Scheibler', last_updated_at = now()
  WHERE id = '05703607-ee6c-4d62-be16-c143ba62ce2b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scheibler';

-- Das Nein in der Liebe. Abgrenzung und Hingabe in der erotischen Bezieh  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Schellenbaum', last_updated_at = now()
  WHERE id = 'd8092fb3-38b1-4c81-9a82-95bd1d2ae170' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schellenbaum';

-- 1517  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Heinz A.', name_display = 'Heinz A. Schilling', last_updated_at = now()
  WHERE id = '63c159c9-f65e-4e92-8b6f-e2cb04e657d6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schilling';

-- Zentrale Randlage  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jochen', name_display = 'Jochen Schimmang', last_updated_at = now()
  WHERE id = '333f010d-0698-479c-9ea4-0e557d541fd5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schimmang';

-- Geliebte Brieffeindin | heilkraft gleichgewicht | verweigern  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nina', name_display = 'Nina Schindler', last_updated_at = now()
  WHERE id = 'a4022d17-b011-4e6c-a8ce-fafda6645e9d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schindler';

-- Mein steiler Zahn in Himbeerrot. Münchner Roman der 50er Jahre  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Schlierf', last_updated_at = now()
  WHERE id = '1821c5d4-a3c7-47eb-9a84-1592f59618c0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schlierf';

-- So schön wie hier kanns im Himmel gar nicht sein!  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christoph', name_display = 'Christoph Schlingensief', last_updated_at = now()
  WHERE id = 'bce66308-29de-44f7-afb6-5ec5d0cd0f59' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schlingensief';

-- Liebe | suedwestfrankreich  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wilhelm', name_display = 'Wilhelm Schmid', last_updated_at = now()
  WHERE id = 'b88fe7ab-797f-4d76-8a9d-e36ee88e312d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmid';

-- Die hilflosen Helfer | hilflosen helfer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Schmidbauer', last_updated_at = now()
  WHERE id = 'f0fa9e5d-4d10-4259-8099-b047170e6c90' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmidbauer';

-- Der Patron  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Carl', name_display = 'Carl Schmidt-Polex', last_updated_at = now()
  WHERE id = '16b61b21-1088-46f8-813f-83ad8479c85d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmidt-Polex';

-- Die Stille der Gletscher  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrike', name_display = 'Ulrike Schmitzer', last_updated_at = now()
  WHERE id = 'cfb92c4d-d8de-4590-b6e9-6723aa6e86de' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmitzer';

-- Meine 100 Elefanten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Adam', name_display = 'Adam Stadtmiller', last_updated_at = now()
  WHERE id = '61663d27-ca22-41a1-aec9-28f3429ee9d9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stadtmiller';

-- Die Federn des weissen Adlers  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Klaus', name_display = 'Klaus Staemmler', last_updated_at = now()
  WHERE id = '27d2a565-48a0-483d-9c75-8c19d8865d8c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Staemmler';

-- Oktoberfest  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christoph', name_display = 'Christoph Scholder', last_updated_at = now()
  WHERE id = '21a99365-b750-4027-848c-75f03a36a26b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scholder';

-- Liebesmenüs. Raffinierte Köstlichkeiten für sinnliche Stunden  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Alfons', name_display = 'Alfons Schuhbeck', last_updated_at = now()
  WHERE id = '8f32af6a-fa90-4a2b-a29a-c67f1913b315' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schuhbeck';

-- Das Karl-Valentin-Buch | kontrollverlust | nofret schoene  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Schulte', last_updated_at = now()
  WHERE id = '60e0ce6d-2b42-4c2d-964c-b1765511b28a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schulte';

-- Die schönsten Sagen des klassischen Altertums | leben  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gustav', name_display = 'Gustav Schwab', last_updated_at = now()
  WHERE id = '203952d2-0ce0-47d5-a05d-a4643aa6e93d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schwab';

-- Besiegt, befreit-- | Der SS-Mann: Josef Bl osche - Leben und Sterben e  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Heribert', name_display = 'Heribert Schwan', last_updated_at = now()
  WHERE id = 'edf282e8-55cc-455c-8f74-8759ac1acf8b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schwan';

-- Doran und seine Schwester  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Linda', name_display = 'Linda Scotson', last_updated_at = now()
  WHERE id = '66e0ff02-c029-42ca-b494-70b785d61d04' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scotson';

-- Rote Erde  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Stripp', last_updated_at = now()
  WHERE id = '68cdcbcd-cdc7-4ee6-ac7b-3451dc4c684b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stripp';

-- Auf dem Goldenen Berg. Die Geschichte einer chinesischen Familie  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lisa', name_display = 'Lisa See', last_updated_at = now()
  WHERE id = '05bfa836-7179-476e-a7d5-cc7d401e0b9f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'See';

-- Ins rote Reich des gelben Drachen | marke | schoen junge welt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Seidl', last_updated_at = now()
  WHERE id = 'f4aa606d-f664-4f02-9c7d-14c38125cf79' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Seidl';

-- Stern 111 | stern 111  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lutz', name_display = 'Lutz Seiler', last_updated_at = now()
  WHERE id = 'de1b9262-4f57-4c0b-9407-a5e7de38c5a3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Seiler';

-- Die Neue Medizin der Emotionen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Servan-Schreiber', last_updated_at = now()
  WHERE id = '9f184f7d-4a8b-4004-a618-fd20512c568b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Servan-Schreiber';

-- Eine gute Partie. | Tianchi  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Vikram', name_display = 'Vikram Seth', last_updated_at = now()
  WHERE id = 'bfe7e516-674f-4dd7-898a-836128ba26e2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Seth';

-- Candlelight Döner  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Asli', name_display = 'Asli Sevindim', last_updated_at = now()
  WHERE id = '9a30f3d5-69e1-4ea5-be33-67b821d6eac4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sevindim';

-- Mann und Frau.; | liebesleben  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Zeruya', name_display = 'Zeruya Shalev', last_updated_at = now()
  WHERE id = 'b8fe03a2-9c32-4671-af54-63cb2000d951' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Shalev';

-- Puppenmord oder bis dass ihr Tod ihn scheidet | river violence  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tom', name_display = 'Tom Sharpe', last_updated_at = now()
  WHERE id = '2be96c8f-853c-4633-9f4c-b93b220b03b1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sharpe';

-- In der Mitte des Lebens | lebensphasen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gail', name_display = 'Gail Sheehy', last_updated_at = now()
  WHERE id = '9f6598bd-bef1-4de2-9c34-4b0e05afbd21' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sheehy';

-- Kenya  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Helmtraut', name_display = 'Helmtraut Sheikh-Dilthey', last_updated_at = now()
  WHERE id = 'f1b9b619-9de9-4ca3-bdee-6684f3faf06a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sheikh-Dilthey';

-- The House of God  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Samuel', name_display = 'Samuel Shem', last_updated_at = now()
  WHERE id = '7f2a40c5-aae0-4bf2-a253-3ea42473257f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Shem';

-- China - Burma - India (Time-Life's World War II, Vol. 9) | dschungel m  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Don', name_display = 'Don Moser', last_updated_at = now()
  WHERE id = 'e35743b7-d280-421a-a772-eb9ef8a20d99' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Moser';

-- Das Gewicht des Wassers  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anita', name_display = 'Anita Shreve', last_updated_at = now()
  WHERE id = '3a74d61b-c80e-4374-a1f2-0d7bc595eace' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Shreve';

-- Der Dativ ist dem Genitiv sein Tod  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bastian', name_display = 'Bastian Sick', last_updated_at = now()
  WHERE id = '8b885eb3-fc66-4d70-bbf3-d83fe269e862' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sick';

-- Roter Reis im Paradies  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rüdiger', name_display = 'Rüdiger Siebert', last_updated_at = now()
  WHERE id = '933478a7-8d74-42f9-a081-494395c7cc86' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Siebert';

-- Sombo, Das Madchen Vom Fluss : Erzahlung | fluss dorf  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Nasrin', name_display = 'Nasrin Siege', last_updated_at = now()
  WHERE id = 'efd6dd6d-ddb8-4ab1-984a-868af2bf0033' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Siege';

-- Die Frauen der Nazis 2  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Anna Maria', name_display = 'Anna Maria Sigmund', last_updated_at = now()
  WHERE id = '5b99dc46-2104-41b7-9ccc-957072f0db19' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sigmund';

-- Ist Amerika zu retten?  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Silber', last_updated_at = now()
  WHERE id = '3563b345-e109-4219-884d-487db1ddffe9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Silber';

-- Demand  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Adrian', name_display = 'Adrian Slywotzky', last_updated_at = now()
  WHERE id = '1066d812-409f-4997-b98c-b1c7af475cb7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Slywotzky';

-- Permanent Record  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Edward', name_display = 'Edward Snowden', last_updated_at = now()
  WHERE id = '1c559690-2f78-411d-831b-8f5be7fef504' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Snowden';

-- Das einzige Paradies  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Astrid', name_display = 'Astrid Sozio', last_updated_at = now()
  WHERE id = 'f27fa0a2-f4c5-4811-a51f-7220a4ea8032' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sozio';

-- Die Frauenburg  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Marita', name_display = 'Marita Spang', last_updated_at = now()
  WHERE id = 'bbbb9987-3cfd-4c64-ae7f-d50f0a575633' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Spang';

-- Bella Germania  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Daniel', name_display = 'Daniel Speck', last_updated_at = now()
  WHERE id = '7b7feb78-c3e7-46cb-85a6-30f0be637b5e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Speck';

-- Spandauer Tagebücher  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Albert', name_display = 'Albert Speer', last_updated_at = now()
  WHERE id = 'ceea7a0c-14d0-491f-9554-0094730d5628' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Speer';

-- Heidi  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Johanna', name_display = 'Johanna Spyri', last_updated_at = now()
  WHERE id = '81b2b13a-0b21-4d1f-b8ff-aad1ff0d4cc3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Spyri';

-- Champagner und Kamillentee  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Franziska', name_display = 'Franziska Stalmann', last_updated_at = now()
  WHERE id = '6d4cc043-ef5d-4ffb-9d17-beda627777dc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stalmann';

-- Der grosse Kulturfahrplan | zweitausendeins  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Stein', last_updated_at = now()
  WHERE id = '7c55923e-79df-4cb1-8fb5-15db9002ce7e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stein';

-- Berge erleben  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Steinbichler', last_updated_at = now()
  WHERE id = 'f8d37fa8-9c55-442f-9aa8-b55672570578' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Steinbichler';

-- Tausend Jahre Neue Welt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Harald', name_display = 'Harald Steinert', last_updated_at = now()
  WHERE id = 'd74e9571-c65f-49ff-bd68-32e15a5317da' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Steinert';

-- Weltkrieg um Wohlstand  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gabor', name_display = 'Gabor Steingart', last_updated_at = now()
  WHERE id = 'b4000392-340f-4b6d-8385-ffb78797048e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Steingart';

-- Der Tourist  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Olen', name_display = 'Olen Steinhauer', last_updated_at = now()
  WHERE id = 'c6693eee-b86a-43d2-90ae-7445ee8f3d7d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Steinhauer';

-- Tod im Schärengarten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Viveca', name_display = 'Viveca Sten', last_updated_at = now()
  WHERE id = '72844348-988b-4b3d-99b1-9f634d4aebfd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sten';

-- Gute Geister  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kathryn', name_display = 'Kathryn Stockett', last_updated_at = now()
  WHERE id = '4b419066-de91-48ff-af99-27c941552bb6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stockett';

-- Sie da oben, er da unten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Cordula', name_display = 'Cordula Stratmann', last_updated_at = now()
  WHERE id = '7a657cf0-b900-4f6c-846e-43ff1af21d9a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stratmann';

-- Der große Trip - WILD  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Cheryl', name_display = 'Cheryl Strayed', last_updated_at = now()
  WHERE id = 'bd4a685b-dde3-4545-917b-512c465ea4c5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Strayed';

-- Die Portugiesin  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Enzo', name_display = 'Enzo Striano', last_updated_at = now()
  WHERE id = '82694b24-a5fc-4da9-82cb-a8a79cf19ad9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Striano';

-- Mit Blick aufs Meer: Roman | an meer | meer  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Elizabeth', name_display = 'Elizabeth Strout', last_updated_at = now()
  WHERE id = '0af28f5b-1282-416a-a1a0-ef82d06cb77d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Strout';

-- Forever young, Das Erfolgsprogramm | gesundheit  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrich', name_display = 'Ulrich Strunz', last_updated_at = now()
  WHERE id = 'ecf365e2-0053-485e-b701-29f12dd53e2f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Strunz';

-- The murderous revolution  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Stuart-Fox', last_updated_at = now()
  WHERE id = 'fbe264d6-b55f-46c9-b16f-2e8bf44a98e0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stuart-Fox';

-- Die Summ- Trennkost. Das Original | Trennkost  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Ursula', name_display = 'Ursula Summ', last_updated_at = now()
  WHERE id = '2c087636-b151-4a04-803f-d7b2277cb61e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Summ';

-- Kaiserin der Rosen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Indu', name_display = 'Indu Sundaresan', last_updated_at = now()
  WHERE id = '6d337139-bcb9-48d8-968f-030612bf7b97' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sundaresan';

-- Are you experienced? | falsche  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'William', name_display = 'William Sutcliffe', last_updated_at = now()
  WHERE id = 'c161df56-cc15-462d-8824-dc6428ecdbfa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sutcliffe';

-- Die Dunkle Seite des Mondes  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Suter', last_updated_at = now()
  WHERE id = '3b37b641-524c-4abc-8edd-871944e1d004' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Suter';

-- Neue Abenteuer auf Island mit Nonni und Manni  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jón', name_display = 'Jón Svensson', last_updated_at = now()
  WHERE id = '8bf839d3-0c6e-487e-848a-c742598038a3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Svensson';

-- Die GroBen Kathedralen (German)  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wim', name_display = 'Wim Swaan', last_updated_at = now()
  WHERE id = '7f97425f-be76-47a3-aab5-251df94c7d82' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Swaan';

-- Die Gerechte  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Swanson', last_updated_at = now()
  WHERE id = 'f0f53a66-3028-4222-97ba-72a2daf760f0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Swanson';

-- Mathematik Fur Wirtschaftswissenschaftler Epdf  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Knut', name_display = 'Knut Sydsaeter', last_updated_at = now()
  WHERE id = '9b4f72b4-cf1d-4362-afc9-a7e10ed721ce' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sydsaeter';

-- Glennkill | garou  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Leonie', name_display = 'Leonie Swann', last_updated_at = now()
  WHERE id = 'c48f2b1e-988c-4240-adfb-79399c6cba59' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Swann';

-- Fake History  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jo Hedwig', name_display = 'Jo Hedwig Teeuwisse', last_updated_at = now()
  WHERE id = 'f073ccb8-4eb8-4de0-a41d-31eaaeeb1e1c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Teeuwisse';

-- Verschwende Deine Jugend: Ein Doku-Roman über den deutschen Punk und N  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jürgen', name_display = 'Jürgen Teipel', last_updated_at = now()
  WHERE id = 'ff9b5f84-3dfd-413d-88ff-6a3b1a74841b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Teipel';

-- Im Land des Silberfarns | wahrheit  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Emma', name_display = 'Emma Temple', last_updated_at = now()
  WHERE id = '7baf9d7f-6b58-4367-a44b-032c323c7c8b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Temple';

-- Krise als Chance. Wie man Krisen löst und zukünftig vermeidet  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Tepperwein', last_updated_at = now()
  WHERE id = 'd2628bf9-1255-42c9-b72b-3ce260af1091' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tepperwein';

-- Noch eine Runde auf dem Karussell  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tiziano', name_display = 'Tiziano Terzani', last_updated_at = now()
  WHERE id = 'd66ffafa-5614-40dd-9cea-1e48397bccb6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Terzani';

-- Das grosse James Bond Lexikon | James Bond  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Siegfried', name_display = 'Siegfried Tesche', last_updated_at = now()
  WHERE id = '936db221-0956-46fc-bf23-541edfe98cb1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tesche';

-- Medusa - Roman  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Thiemeyer', last_updated_at = now()
  WHERE id = '27571cd5-160e-40da-9460-02a56a91a272' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thiemeyer';

-- Eine Insel im Meer.  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Annika', name_display = 'Annika Thor', last_updated_at = now()
  WHERE id = '1c33c5f2-dfef-4f9c-8066-65936849448d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thor';

-- Unter dem Teebaum | frevlerhand  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ines', name_display = 'Ines Thorn', last_updated_at = now()
  WHERE id = 'a651117e-a8a4-4ddb-984c-4e1bb702a422' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thorn';

-- Shaft und das Mordkomplott  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ernest', name_display = 'Ernest Tidyman', last_updated_at = now()
  WHERE id = 'bc1c736a-7f20-46c6-9c53-d18308b83d28' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tidyman';

-- Rattentanz  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Tietz', last_updated_at = now()
  WHERE id = 'f9323c7c-974d-48cc-8242-caa834ed50a9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tietz';

-- Drachenwind  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kerstin', name_display = 'Kerstin Tomiak', last_updated_at = now()
  WHERE id = 'b47b7735-89c5-4ca3-9846-8ef34cbb952f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tomiak';

-- Eat That Frog! Cards  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Brian', name_display = 'Brian Tracy', last_updated_at = now()
  WHERE id = '11f3aaf4-7e9b-4f7f-b92c-e6630ef6db29' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tracy';

-- Zukunft ist ein guter Ort  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sina', name_display = 'Sina Trinkwalder', last_updated_at = now()
  WHERE id = 'f668bc12-6cc9-43a7-b178-aeba90c38a02' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Trinkwalder';

-- Afrika und Ozeanien  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Margaret', name_display = 'Margaret Trowell', last_updated_at = now()
  WHERE id = '75e27122-ec38-461d-b40b-01ab4fe1a8b0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Trowell';

-- Der schwarze Pfad. Roman | nacht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Cornell', name_display = 'Cornell Woolrich', last_updated_at = now()
  WHERE id = '0f39d125-edd4-4241-9a88-ba394614c232' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Woolrich';

-- Zerbrochen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Tsokos', last_updated_at = now()
  WHERE id = '325a4dc1-7e8d-45a2-b918-f5e7a22a9ead' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tsokos';

-- Kommissar Pascha  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Su', name_display = 'Su Turhan', last_updated_at = now()
  WHERE id = '91aef0b0-284a-4786-8a20-243aa0650ba5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Turhan';

-- Schantall, tu ma die Omma winken!  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kai', name_display = 'Kai Twilfer', last_updated_at = now()
  WHERE id = '29cece51-317d-4653-8cc9-1b2b9224b6f3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Twilfer';

-- Der Eismann  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Silja', name_display = 'Silja Ukena', last_updated_at = now()
  WHERE id = 'bbe42058-5cf0-4079-9187-d59df6f2fdc0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ukena';

-- Die geweihten Nächte  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Björn', name_display = 'Björn Ulbrich', last_updated_at = now()
  WHERE id = 'e7384b0e-3006-491f-93c2-89334e44604f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ulbrich';

-- Java 7 - mehr als eine Insel  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Ullenboom', last_updated_at = now()
  WHERE id = '71266589-db6c-4976-b240-340fea76710e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ullenboom';

-- Wandelgermanen  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Oliver', name_display = 'Oliver Uschmann', last_updated_at = now()
  WHERE id = 'c671c6b7-89b7-455d-b3e4-ec7fcf087ca6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Uschmann';

-- Flood  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Andrew', name_display = 'Andrew Vachss', last_updated_at = now()
  WHERE id = '958d9c28-ff40-4d8d-99ad-d6a3676ecd36' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Vachss';

-- Elon Musk: Tesla, SpaceX, and the Quest for a Fantastic Future | entsc  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ashlee', name_display = 'Ashlee Vance', last_updated_at = now()
  WHERE id = '2bf77f35-6a86-4319-967d-872b155f7915' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Vance';

-- Lenins Hirn  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Tilman', name_display = 'Tilman Spengler', last_updated_at = now()
  WHERE id = 'd00966ba-28a2-41ee-a9ff-7e3c0dbca75b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Spengler';

-- Das Daimonicon  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Markus', name_display = 'Markus Tillmanns', last_updated_at = now()
  WHERE id = '46493b4d-9def-42d5-a9e4-2802a1cc6eae' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tillmanns';

-- Aroma-Therapie  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert B.', name_display = 'Robert B. Tisserand', last_updated_at = now()
  WHERE id = 'fbb4c30d-2d20-43f4-8318-0120aaa92f9c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tisserand';

-- Ich verweigere den Wehrdienst | knaurs wueste | ost-kanada  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wilhelm', name_display = 'Wilhelm Wagner', last_updated_at = now()
  WHERE id = '40394882-d443-491b-a19b-4f5d129ec2c6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wagner';

-- Wie ein flammender Schrei  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Mats', name_display = 'Mats Wahl', last_updated_at = now()
  WHERE id = 'f079b1fc-604d-43ae-abc8-d68cdf034ab7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wahl';

-- Tage, die Deutschland und die Welt veränderten  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Theo', name_display = 'Theo Waigel', last_updated_at = now()
  WHERE id = 'ca576447-591e-4621-a787-d85a0fe86552' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Waigel';

-- Ich, die Alte--ich, die Junge  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Lore', name_display = 'Lore Walb', last_updated_at = now()
  WHERE id = '7bf9bae2-d2be-4ef1-aa43-5495844a5c8f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Walb';

-- Amazone  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Barbara', name_display = 'Barbara Walker', last_updated_at = now()
  WHERE id = '00da048d-2a14-4a40-976f-d95d2dbbd7a9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Walker';

-- Der Teufel trägt Prada | Die Rache trägt Prada. Der Teufel kehrt zurüc  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Lauren', name_display = 'Lauren Weisberger', last_updated_at = now()
  WHERE id = 'ff1de657-27bd-4a2f-b694-f694a563147d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weisberger';

-- China  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Oskar', name_display = 'Oskar Weggel', last_updated_at = now()
  WHERE id = 'e501360c-991d-4884-b9a5-e4812ec92781' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weggel';

-- Freizeit- Spaß mit Hunden. Spiele. Sport. Tricks  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Angela', name_display = 'Angela Wegmann', last_updated_at = now()
  WHERE id = '5c91de0d-81d1-4c96-92e8-bbd8dca8592e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wegmann';

-- Maria, Ihm Schmeckt's Nicht  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Jan', name_display = 'Jan Weiler', last_updated_at = now()
  WHERE id = 'e88d66df-e771-4780-8185-2971b42e3c79' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weiler';

-- Entschlackung, Entsäuerung, Entgiftung. Das Praxisbuch zur Körperreini  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Otfried D.', name_display = 'Otfried D. Weise', last_updated_at = now()
  WHERE id = '86fb4906-430f-4ae3-bc49-774ca285a47e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weise';

-- Der grosse Augenblick in der Zeitgeschichte  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'B. Uwe', name_display = 'B. Uwe Weller', last_updated_at = now()
  WHERE id = 'e4f3fe95-7223-4e45-819d-5c0ddadcb518' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weller';

-- Die Geschwister von Neapel | musa-dagh  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Franz', name_display = 'Franz Werfel', last_updated_at = now()
  WHERE id = '3aaa6088-f161-4ef9-9c61-0656d08c8c60' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Werfel';

-- Die Scream-Trilogie ... und die Geschichte des Teen-Horrorfilms | azte  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Sascha', name_display = 'Sascha Westphal', last_updated_at = now()
  WHERE id = 'c8493f17-1ecc-4cc9-9560-389276d99ac1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Westphal';

-- Maenner Lassen Lieben | Männer lassen lieben  [OpenLibrary-ISBN, 2 Treffer]
UPDATE public.authors SET first_name = 'Wilfried', name_display = 'Wilfried Wieck', last_updated_at = now()
  WHERE id = '130ee0d7-c9cb-42c6-98d0-4c359f33eef6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wieck';

-- Anders ist besser  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Wendelin', name_display = 'Wendelin Wiedeking', last_updated_at = now()
  WHERE id = '7597065f-552f-4c90-9ef4-e71aaa8e9d0b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wiedeking';

-- Mission und Menschenrechte  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ursula', name_display = 'Ursula Wiesemann', last_updated_at = now()
  WHERE id = 'a4040376-8137-4d3b-88cd-c4610fbf847c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wiesemann';

-- 101 Essays, die dein Leben verändern werden  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Brianna', name_display = 'Brianna Wiest', last_updated_at = now()
  WHERE id = 'f4266097-c86f-4b04-8b9f-2aa53e7fde2c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wiest';

-- Ohne Geld bis ans Ende der Welt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Wigge', last_updated_at = now()
  WHERE id = 'ec5a6f72-a9f9-4438-8c91-f473406ed633' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wigge';

-- Die kalte Haut der Stadt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Wildenhain', last_updated_at = now()
  WHERE id = '98d7d4bb-3233-4849-a001-174d94652428' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wildenhain';

-- Der Brandner- Kaspar. Roman  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Wilhelm', last_updated_at = now()
  WHERE id = 'b3ef5a87-6b1d-4d28-b429-eb557e7ee07e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wilhelm';

-- Bad banker  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Markus', name_display = 'Markus Will', last_updated_at = now()
  WHERE id = 'e2c6b032-49f0-4759-bbcb-0393e9c6f5c2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Will';

-- So rechnen Banken. Entscheidungshilfen für Geldanlage und Kreditaufnah  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Konrad', name_display = 'Konrad Wimmer', last_updated_at = now()
  WHERE id = 'e2a52d03-1be3-462a-b0d7-86fb73c0f415' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wimmer';

-- Das Kartell | pacific private  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Don', name_display = 'Don Winslow', last_updated_at = now()
  WHERE id = 'd26f9164-3f36-4072-85e5-059aa7d79334' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winslow';

-- Abenteuer aus dem alten Rom. Caius ist ein Dummkopf / Lukios, Neffe de  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Henry', name_display = 'Henry Winterfeld', last_updated_at = now()
  WHERE id = '7f577894-5aca-4b50-aacd-39e018d5d3f4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winterfeld';

-- Unternehmen Babylon  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Winterhoff-Spurk', last_updated_at = now()
  WHERE id = '4235e223-f686-499b-b341-d0ea8b907878' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winterhoff-Spurk';

-- Der Sommer meiner Mutter  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrich', name_display = 'Ulrich Woelk', last_updated_at = now()
  WHERE id = 'dc12e615-0626-4e79-aec2-6183856c280f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Woelk';

-- 6mal Kanada  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Woller', last_updated_at = now()
  WHERE id = 'd50249eb-743c-442b-a0d2-d80c67f58fb0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Woller';

-- Amerikas Naturwunder  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Gaylord Sky', name_display = 'Gaylord Sky Worell', last_updated_at = now()
  WHERE id = '7384faf7-4d29-4e36-80c6-dfed7b2ddfb9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Worell';

-- Feder im Sturm | feder sturm  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Emily', name_display = 'Emily Wu', last_updated_at = now()
  WHERE id = '28966b78-6756-47b3-8ef8-a50565f2747f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wu';

-- Mecklenburg-Vorpommern  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Bernd', name_display = 'Bernd Wurlitzer', last_updated_at = now()
  WHERE id = 'c01d9634-6edb-496a-a10f-95b29f885fa9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wurlitzer';

-- Candida  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Erich', name_display = 'Erich Wustmann', last_updated_at = now()
  WHERE id = 'f8d84132-9a49-40e2-97aa-bc54780822b2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wustmann';

-- MySQL and mSQL  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Randy Jay', name_display = 'Randy Jay Yarger', last_updated_at = now()
  WHERE id = 'dec1770c-77e9-45d0-98f4-0e29d767b55a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yarger';

-- The forests of British Columbia  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Cameron', name_display = 'Cameron Young', last_updated_at = now()
  WHERE id = '95b99b10-8c7a-4d6b-b6ab-ed191037302b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Young';

-- Der Ursprung der Welt  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrich', name_display = 'Ulrich Tukur', last_updated_at = now()
  WHERE id = '258def0d-d9d0-4f48-b9d2-ecb2941d680b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tukur';

-- Panama  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Eric', name_display = 'Eric Zencey', last_updated_at = now()
  WHERE id = '62348afc-d4a8-43e2-89ec-354ca1b72015' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zencey';

-- Uncool. Oder die Kunst erwachsen zu werden  [OpenLibrary-ISBN, 1 Treffer]
UPDATE public.authors SET first_name = 'Dan', name_display = 'Dan Zevin', last_updated_at = now()
  WHERE id = '2d3e348b-24fe-451b-97a6-3e7e188bb518' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zevin';

-- ===== Sicherheit: mittel (241) =====

-- frauen wissen schlagen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Doris', name_display = 'Doris Hartmann', last_updated_at = now()
  WHERE id = '9623798b-adf6-4a24-bde5-5e60e66000d5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hartmann';

-- kaizen  [OpenLibrary-Titel, 4 Treffer, Alt: MASAAKI Imai]
UPDATE public.authors SET first_name = 'Masaaki', name_display = 'Masaaki Imai', last_updated_at = now()
  WHERE id = 'ea79bad9-09d0-47e9-9b61-5fef581f06f2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Imai';

-- algier | ungeduldigen  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Assia', name_display = 'Assia Djebar', last_updated_at = now()
  WHERE id = '8a107f92-6823-49dd-ae06-6fc5a02f0dd3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Djebar';

-- risikomanagement  [OpenLibrary-Titel, 4 Treffer, Alt: Roland. Eller]
UPDATE public.authors SET first_name = 'Roland', name_display = 'Roland Eller', last_updated_at = now()
  WHERE id = '6e1d1ded-05ff-4e0d-b912-58266a28d819' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Eller';

-- rothschild  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Amos', name_display = 'Amos Elon', last_updated_at = now()
  WHERE id = '054201b8-78f2-4564-85b5-371c28a3c0b6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Elon';

-- untergang  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Edward', name_display = 'Edward Gibbon', last_updated_at = now()
  WHERE id = '663b46ae-888a-4435-b553-fc6b5e6c1ff0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gibbon';

-- diabolus | xanthippe  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Gordian', last_updated_at = now()
  WHERE id = '15d3a74a-b3ab-40b7-ba95-9f93348fc282' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gordian';

-- Beziehungsintelligenz. Talent und Brillanz im Umgang mit Menschen | Ta  [OpenLibrary-ISBN, 1 Treffer, Alt: Johannes Gross]
UPDATE public.authors SET first_name = 'Stefan F.', name_display = 'Stefan F. Gross', last_updated_at = now()
  WHERE id = '67eb6a58-0dc9-4da5-97e8-0b494db1bd91' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Gross';

-- vampire  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Haining', last_updated_at = now()
  WHERE id = 'ee4d923c-c835-4dab-ac8d-71482a72a7ee' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Haining';

-- atlantik  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Herlin', last_updated_at = now()
  WHERE id = 'de87ac36-a3dd-44bc-b760-4762c8f95c81' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Herlin';

-- dionysos | phoenizier  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Gerhard', name_display = 'Gerhard Herm', last_updated_at = now()
  WHERE id = '924515ff-bcf0-485a-bcc5-4b17fc304951' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Herm';

-- deutschland | guerillas  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Rolf', name_display = 'Rolf Hochhuth', last_updated_at = now()
  WHERE id = '36aa6788-45d0-4cee-84dd-822884606cc7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hochhuth';

-- hong kong | japan  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Hoefer', last_updated_at = now()
  WHERE id = '3c289233-8103-46a0-af35-c31a4baa7727' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hoefer';

-- notre  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Victor', name_display = 'Victor Hugo', last_updated_at = now()
  WHERE id = '2b57e34c-1b76-4143-950e-1a5aa062a577' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hugo';

-- zebra  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Alexandre', name_display = 'Alexandre Jardin', last_updated_at = now()
  WHERE id = 'ab5465ec-35f2-4743-a734-6fd0bd578401' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jardin';

-- italians  [OpenLibrary-Titel, 3 Treffer, Alt: Luigi Barzini]
UPDATE public.authors SET first_name = 'Luigi Giorgio', name_display = 'Luigi Giorgio Barzini', last_updated_at = now()
  WHERE id = '739948eb-467e-433c-9c4b-a11187d7f58d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barzini';

-- Essen und Trinken im alten Rom | Wilde Zärtlichkeit  [OpenLibrary-ISBN, 1 Treffer, Alt: Jacques Andre]
UPDATE public.authors SET first_name = 'Claudine', name_display = 'Claudine Andre', last_updated_at = now()
  WHERE id = '8a054409-7dd0-493d-9412-3334a745b395' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Andre';

-- ruf muschelhorns  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Zoë', name_display = 'Zoë Jenny', last_updated_at = now()
  WHERE id = '8654f938-d991-425d-b91f-15d10de76ffe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jenny';

-- buffalo  [OpenLibrary-Titel, 3 Treffer, Alt: James A.;Stayer Belasco]
UPDATE public.authors SET first_name = 'James A.', name_display = 'James A. Belasco', last_updated_at = now()
  WHERE id = 'ae61ebd1-69d9-40ad-b163-ef2f0cbcbbbe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Belasco';

-- Der Taubenturm  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Andres', last_updated_at = now()
  WHERE id = '74ea0e4b-fbd5-40ab-82ab-f8980051cc4c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Andres';

-- templer  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hanny', name_display = 'Hanny Alders', last_updated_at = now()
  WHERE id = '4a8aa57f-6de0-4256-b304-cf0c39df138a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alders';

-- aufenthalt  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Hermann', name_display = 'Hermann Kant', last_updated_at = now()
  WHERE id = 'e21b6dd3-e807-4574-8378-ee70427d6aff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kant';

-- namma  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Kate', name_display = 'Kate Karko', last_updated_at = now()
  WHERE id = 'd1b7236c-c12f-46db-adef-68a2b7aa062e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Karko';

-- gottesdiener liebhaber  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Walter', name_display = 'Walter Keady', last_updated_at = now()
  WHERE id = 'a46f5489-3b30-4099-999d-9466a559482a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Keady';

-- Der Himmel und die Hölle | Die Erben Kains | Liebe und Krieg  [OpenLibrary-Titel, 2 Treffer, Alt: John: Jakes]
UPDATE public.authors SET first_name = 'John', name_display = 'John Jakes', last_updated_at = now()
  WHERE id = 'a99e1e82-2311-472f-a75b-1f45f7d1ac47' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jakes';

-- Futter fürs Volk. Was die Lebensmittelindustrie uns auftischt.  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Volker', name_display = 'Volker Angres', last_updated_at = now()
  WHERE id = 'ef7a696f-6a83-4037-808c-afa0ddcd31b7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Angres';

-- pigeon  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Stephen', name_display = 'Stephen Kelman', last_updated_at = now()
  WHERE id = '391cc3dc-8d7c-44e7-bc2e-6f945d82a102' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kelman';

-- umsonst  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Walter', name_display = 'Walter Kempowski', last_updated_at = now()
  WHERE id = '0dede4a9-db87-4d97-bc4a-eb2ae02464b9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kempowski';

-- lazarus  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Lars', name_display = 'Lars Kepler', last_updated_at = now()
  WHERE id = '8ee0f85a-f3c1-4bf1-86db-ae2565253aaa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kepler';

-- blaupause  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Charlotte', name_display = 'Charlotte Kerner', last_updated_at = now()
  WHERE id = '9ad59210-43d4-4cd9-a3bc-3cfb1619827e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kerner';

-- jesus  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Holger', name_display = 'Holger Kersten', last_updated_at = now()
  WHERE id = '9a0cd822-4dc4-4486-86af-9db1d0c01a65' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kersten';

-- seele  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Olga', name_display = 'Olga Kharitidi', last_updated_at = now()
  WHERE id = '9c3dfb5c-14ef-4830-a73e-bfe89f297492' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kharitidi';

-- rashomon  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Ryūnosuke', name_display = 'Ryūnosuke Akutagawa', last_updated_at = now()
  WHERE id = 'd4e06cd1-72b5-44c0-abe5-0a42f60ff4fa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Akutagawa';

-- wasserkur  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Sebastian', name_display = 'Sebastian Kneipp', last_updated_at = now()
  WHERE id = '96b2eb00-3dbf-46aa-a6af-6b0ee639a07a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kneipp';

-- vietnam  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hella', name_display = 'Hella Kothmann', last_updated_at = now()
  WHERE id = '3c230d5c-c670-41bd-81fc-fc7b92cd71ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kothmann';

-- breslau  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Marek', name_display = 'Marek Krajewski', last_updated_at = now()
  WHERE id = '8ee9d189-9222-408f-8fa6-02d5d5484147' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Krajewski';

-- Richard Strauss  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Heinrich', name_display = 'Heinrich Kralik', last_updated_at = now()
  WHERE id = '312d3dbe-26f7-4c1e-814e-3042d3e274d9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kralik';

-- wickie  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Runer', name_display = 'Runer Jonsson', last_updated_at = now()
  WHERE id = 'b69e1613-7840-4b2e-82c7-6468865986d6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jonsson';

-- eishai | griechische philosophie  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Walther', name_display = 'Walther Kranz', last_updated_at = now()
  WHERE id = '3c8c0bb6-146b-401a-a556-a5444f315832' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kranz';

-- husky | traumzeit  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Dieter', name_display = 'Dieter Kreutzkamp', last_updated_at = now()
  WHERE id = 'ce6cc16e-9b40-4dde-b5fe-85f6aff25b68' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kreutzkamp';

-- statistische  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Erwin', name_display = 'Erwin Kreyszig', last_updated_at = now()
  WHERE id = 'f7414880-ced9-4f24-af17-5f34b3299773' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kreyszig';

-- Geliebt, Gejagt und Unvergessen  [OpenLibrary-Titel, 4 Treffer, Alt: ARNOLD Krieger]
UPDATE public.authors SET first_name = 'Arnold', name_display = 'Arnold Krieger', last_updated_at = now()
  WHERE id = 'ce4b8455-0da3-4e5c-a207-641626f18046' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Krieger';

-- amerika  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Dieter', name_display = 'Dieter Kronzucker', last_updated_at = now()
  WHERE id = '47a0c59f-65b2-4975-83ba-a80e0e9c9ccf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kronzucker';

-- betriebswirtschaftslehre | suse  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Jörg', name_display = 'Jörg Bartsch', last_updated_at = now()
  WHERE id = 'a3508251-58ab-46f9-91b8-83001e81a34b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bartsch';

-- ally  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Katja', name_display = 'Katja Kullmann', last_updated_at = now()
  WHERE id = '1b7785a8-706e-446c-a335-4286c1ffa597' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kullmann';

-- feuer  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Kunze', last_updated_at = now()
  WHERE id = '18679bb5-e4cf-4c37-8200-a0aaba67d4df' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kunze';

-- kriegsbraut  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Dirk', name_display = 'Dirk Kurbjuweit', last_updated_at = now()
  WHERE id = 'e9fa0edd-31e9-4337-a2dc-62b0124b85ae' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kurbjuweit';

-- web  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Stephen', name_display = 'Stephen Baxter', last_updated_at = now()
  WHERE id = '8a02eefb-e6b4-4695-9c53-bbbe7efc29df' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Baxter';

-- keaton  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Benayoun', last_updated_at = now()
  WHERE id = '516c724a-4d9f-4c72-8b64-46d0bcd90e25' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benayoun';

-- asians  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Kevin', name_display = 'Kevin Kwan', last_updated_at = now()
  WHERE id = '98b6c735-d7bf-4f54-a54c-24d669042d45' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kwan';

-- land | weites verbotenes land  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Christina', name_display = 'Christina Laffeaty', last_updated_at = now()
  WHERE id = '0fe656ed-0a44-4b03-9731-2f5fd839463d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Laffeaty';

-- feine  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Philipp', name_display = 'Philipp Lahm', last_updated_at = now()
  WHERE id = '2afee7da-778e-4d75-ae80-3f59dbd33855' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lahm';

-- wiedersehen  [OpenLibrary-Titel, 2 Treffer, Alt: Werner Lansburgh]
UPDATE public.authors SET first_name = 'Werner N.', name_display = 'Werner N. Lansburgh', last_updated_at = now()
  WHERE id = '246a2b79-36d5-40d1-a8cf-d821ab46b2cf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lansburgh';

-- mythologie  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Karl', name_display = 'Karl Kerenyi', last_updated_at = now()
  WHERE id = 'f88d5abf-eebd-46e3-9363-789925d34f0b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kerenyi';

-- koreanische  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'K. S.', name_display = 'K. S. Kuh', last_updated_at = now()
  WHERE id = '020eaece-cac9-42bd-a6c9-34dfd73cbb4f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kuh';

-- manipulation  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Rupert', name_display = 'Rupert Lay', last_updated_at = now()
  WHERE id = 'bbc69802-80cb-4124-8ca6-fffe777a2b24' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lay';

-- matterhorns  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Lauber', last_updated_at = now()
  WHERE id = '59df7806-e1e0-42db-98f1-301f86ac0739' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lauber';

-- odysseus  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Auguste', name_display = 'Auguste Lechner', last_updated_at = now()
  WHERE id = '216d621e-a78f-4df6-9d33-24a4ba0f72bb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lechner';

-- karibikfieber | quecksilber  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Joachim', name_display = 'Joachim Lehnhoff', last_updated_at = now()
  WHERE id = '41d2c28b-38c5-4dde-a6ab-cca502fd339a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lehnhoff';

-- soul survivor  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Bruce', name_display = 'Bruce Leininger', last_updated_at = now()
  WHERE id = '9fdd9d20-a6c0-42c6-a1e7-33222912dda1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Leininger';

-- bordbuch | große  [OpenLibrary-Titel, 8 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Leip', last_updated_at = now()
  WHERE id = '0ed4e0d8-99c6-49f2-9032-b37798546499' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Leip';

-- columbus  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Michel', name_display = 'Michel Lequenne', last_updated_at = now()
  WHERE id = '967afa7f-ea72-497b-b95d-05834f0343f9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lequenne';

-- phantom  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Gaston', name_display = 'Gaston Leroux', last_updated_at = now()
  WHERE id = 'ab35b9fe-72c4-41ae-bec1-8f9b0be81b8d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Leroux';

-- eboli  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Carlo', name_display = 'Carlo Levi', last_updated_at = now()
  WHERE id = '231205c6-5121-49a7-aa9a-925939c73dff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Levi';

-- azoren | madeira  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Susanne', name_display = 'Susanne Lipps', last_updated_at = now()
  WHERE id = 'f992a779-1ee8-4790-854f-279234180382' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lipps';

-- abendland  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Ivar', name_display = 'Ivar Lissner', last_updated_at = now()
  WHERE id = 'c23c1a96-23c1-4b97-9716-754296b26b48' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lissner';

-- stalin  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Littell', last_updated_at = now()
  WHERE id = '6e941d04-a441-494d-80b9-1bddf597ab50' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Littell';

-- spiderweb  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Penelope', name_display = 'Penelope Lively', last_updated_at = now()
  WHERE id = 'f90ebc51-3dd9-4931-b4ff-4747da1d461b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lively';

-- Come Again. | china erfahren  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Josie', name_display = 'Josie Lloyd', last_updated_at = now()
  WHERE id = '7d8c53c4-a78f-4621-89f4-5e1dbe870e89' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lloyd';

-- dolittle  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Hugh', name_display = 'Hugh Lofting', last_updated_at = now()
  WHERE id = '6875015e-492b-48e8-bee1-d4011f1a4c67' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lofting';

-- stillbuch  [OpenLibrary-Titel, 2 Treffer, Alt: Hanny Lothrop]
UPDATE public.authors SET first_name = 'Hannah', name_display = 'Hannah Lothrop', last_updated_at = now()
  WHERE id = 'aaee4d76-2fae-45cc-90a2-cf9d3c1c61e1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lothrop';

-- wohnsitz  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Franco', name_display = 'Franco Lucentini', last_updated_at = now()
  WHERE id = '46655d45-0f0c-41e5-8d2b-e727b30c3d41' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lucentini';

-- symbolik  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Manfred', name_display = 'Manfred Lurker', last_updated_at = now()
  WHERE id = '985a7e79-d074-4b98-af33-0e5c1c8bf310' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lurker';

-- federico | loewinnen | samoa  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Waldtraut', name_display = 'Waldtraut Lewin', last_updated_at = now()
  WHERE id = 'c179b37f-8eaf-4c8a-ad15-bcd933919a0c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lewin';

-- napoleone siegerin herzens  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Juliette', name_display = 'Juliette Benzoni', last_updated_at = now()
  WHERE id = 'b6bf01bf-1811-4d61-b829-c8016a35b42a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benzoni';

-- maggie lady  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Brenda', name_display = 'Brenda Maddox', last_updated_at = now()
  WHERE id = 'e1015f2d-4c23-44c9-bfbd-6e11d03c1ccc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Maddox';

-- morgens welt ordnung  [OpenLibrary-Titel, 4 Treffer, Alt: ERIC Malpass]
UPDATE public.authors SET first_name = 'Eric', name_display = 'Eric Malpass', last_updated_at = now()
  WHERE id = 'f66372d5-7a88-48b4-81fc-4bbb98fda9f8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Malpass';

-- verlobten  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Alessandro', name_display = 'Alessandro Manzoni', last_updated_at = now()
  WHERE id = 'c99163eb-d313-451b-930c-2f23549bd74b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Manzoni';

-- matildas  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Tamara', name_display = 'Tamara Mckinley', last_updated_at = now()
  WHERE id = '5039ef75-3e4b-4ef1-8623-8f41d64c34e8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mckinley';

-- freud  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Georg', name_display = 'Georg Markus', last_updated_at = now()
  WHERE id = 'cf4d10b5-b619-4233-a8c9-38ec59c7eb4e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Markus';

-- cholera | einsamkeit  [OpenLibrary-Titel, 6 Treffer]
UPDATE public.authors SET first_name = 'Gabriel García', name_display = 'Gabriel García Marquez', last_updated_at = now()
  WHERE id = 'dcd5f7d0-9dfb-41f5-9c5e-8754023e9c21' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Marquez';

-- plage | posaune  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'John S.', name_display = 'John S. Marr', last_updated_at = now()
  WHERE id = '07a6eb37-6f66-4efb-b25a-1196189e06fc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Marr';

-- titanic  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Ken', name_display = 'Ken Marschall', last_updated_at = now()
  WHERE id = 'c0329569-9408-4eef-967a-5e75dd974c95' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Marschall';

-- santa evita  [OpenLibrary-Titel, 4 Treffer, Alt: Tomas Eloy Martinez]
UPDATE public.authors SET first_name = 'Tomás Eloy', name_display = 'Tomás Eloy Martinez', last_updated_at = now()
  WHERE id = '68aa63fb-2cb6-4430-9084-5ef50ba40f97' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Martinez';

-- indianer  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'J. H.', name_display = 'J. H. Martins', last_updated_at = now()
  WHERE id = '8948f19b-5782-42c7-92d8-1d4a1aec879a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Martins';

-- christina  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Georgina', name_display = 'Georgina Masson', last_updated_at = now()
  WHERE id = '53d78319-2420-402c-8f9d-4c65a9d37d1d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Masson';

-- stadtgeschichten  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Armistead', name_display = 'Armistead Maupin', last_updated_at = now()
  WHERE id = '1ade001c-bfb7-4cdb-b40c-fe32676d2892' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Maupin';

-- lazarus-kind  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Mawson', last_updated_at = now()
  WHERE id = 'f0c78d8c-ce43-4641-840b-2d8c49af9902' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mawson';

-- alexandra  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Andrei', name_display = 'Andrei Maylunas', last_updated_at = now()
  WHERE id = '57872e20-dab7-4ebf-8507-507b7ca2c415' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Maylunas';

-- professional internet  [OpenLibrary-Titel, 2 Treffer, Alt: Jennifer Mcallister]
UPDATE public.authors SET first_name = 'Jenn', name_display = 'Jenn Mcallister', last_updated_at = now()
  WHERE id = '67565d75-c309-4221-9095-0940668b100a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcallister';

-- cuba  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Fiona', name_display = 'Fiona Mcauslan', last_updated_at = now()
  WHERE id = '0b11fe2a-c5c6-49f7-8a0c-bc85c7942db3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcauslan';

-- timbavati  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Chris', name_display = 'Chris Mcbride', last_updated_at = now()
  WHERE id = 'ec4ee2e8-ed2f-4015-bef5-3cddecf04037' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcbride';

-- born run  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Christopher', name_display = 'Christopher Mcdougall', last_updated_at = now()
  WHERE id = 'b4bc4a97-12be-484f-97c1-fe40fc7daed1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcdougall';

-- of lying  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Karen M.', name_display = 'Karen M. Mcmanus', last_updated_at = now()
  WHERE id = '530832ae-7c73-4d03-9282-4050e9e4808b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcmanus';

-- southwest  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Hugh', name_display = 'Hugh Mcnaughtan', last_updated_at = now()
  WHERE id = 'f4230019-38c7-4814-850b-4e3a295e856c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcnaughtan';

-- safari  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Karin', name_display = 'Karin Mcquillan', last_updated_at = now()
  WHERE id = '52dd7397-fb13-40c9-a76b-c12b809261bf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcquillan';

-- familie  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Jonas Lauritz Idemil', name_display = 'Jonas Lauritz Idemil Lie', last_updated_at = now()
  WHERE id = '5558a875-7970-49cc-8f43-0e6b90c2f49e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lie';

-- frankreich  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Günter', name_display = 'Günter Liehr', last_updated_at = now()
  WHERE id = 'dff35bfd-e796-4ac0-b303-b6d57fc3dd85' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Liehr';

-- habe dies leben  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Daniela', name_display = 'Daniela Michaelis', last_updated_at = now()
  WHERE id = '647b51cb-ecc0-4514-8008-4dde97ea46ea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Michaelis';

-- attila  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Thomas R. P.', name_display = 'Thomas R. P. Mielke', last_updated_at = now()
  WHERE id = 'b0c545b8-abb1-4c9f-952d-a783976ec95b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mielke';

-- inimitable  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'George', name_display = 'George Mikes', last_updated_at = now()
  WHERE id = 'f1cd3ed9-bbf6-45ab-90a3-2efc821ce81d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mikes';

-- zelda  [OpenLibrary-Titel, 4 Treffer, Alt: Nancy Winston Milford]
UPDATE public.authors SET first_name = 'Nancy', name_display = 'Nancy Milford', last_updated_at = now()
  WHERE id = 'e5ba5485-8cbf-45c0-b576-841257f730eb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Milford';

-- feng  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Jes T. Y.', name_display = 'Jes T. Y. Lim', last_updated_at = now()
  WHERE id = 'bb22a591-59b7-4fa9-a53a-e35c9e91d754' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lim';

-- gral | gral erben  [OpenLibrary-Titel, 7 Treffer]
UPDATE public.authors SET first_name = 'Henry', name_display = 'Henry Lincoln', last_updated_at = now()
  WHERE id = '089bbd03-74e2-4cbf-b611-b894789e6996' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lincoln';

-- kleopatra's  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Terenci', name_display = 'Terenci Moix', last_updated_at = now()
  WHERE id = '16bc264e-39e0-4390-97c6-f735e69978e4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Moix';

-- arm reich  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Angelika', name_display = 'Angelika Mechtel', last_updated_at = now()
  WHERE id = '0c004686-76b5-4fc6-930a-22af5518c72a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mechtel';

-- muslime jesus  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Carl', name_display = 'Carl Medearis', last_updated_at = now()
  WHERE id = '2459794d-0f58-443a-9c86-455aebc71861' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Medearis';

-- giulia  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Sveva Casati', name_display = 'Sveva Casati Modignani', last_updated_at = now()
  WHERE id = 'c808c00a-cb42-4a04-b3b3-37bcf37aad1f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Modignani';

-- anamur  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Rupert', name_display = 'Rupert Neudeck', last_updated_at = now()
  WHERE id = '4dcb3111-66cd-4490-8e7c-a23f1b8034be' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Neudeck';

-- shanghai  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Christopher', name_display = 'Christopher New', last_updated_at = now()
  WHERE id = '37856fef-fd11-473f-92fd-03b8de0db8dd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'New';

-- indians  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'William W.', name_display = 'William W. Newcomb', last_updated_at = now()
  WHERE id = 'dea19713-3af5-4e21-b54e-60982649a9af' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Newcomb';

-- bastard | lohengrins  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Edgar', name_display = 'Edgar Noske', last_updated_at = now()
  WHERE id = '9be10384-e43a-4b91-9654-7b835d5beaa1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Noske';

-- koenigliche | montglane  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Katherine', name_display = 'Katherine Neville', last_updated_at = now()
  WHERE id = '62ced5d4-c48a-4a63-8727-246686813b43' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Neville';

-- kaiser herr | torquemada  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Siegfried', name_display = 'Siegfried Obermeier', last_updated_at = now()
  WHERE id = 'cff1472e-92e8-4d13-a605-5f5fada69b7e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Obermeier';

-- affaere | paradeplatz  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Armin', name_display = 'Armin Och', last_updated_at = now()
  WHERE id = '2a93de2b-2cf8-47b4-b7e9-f0d660d22702' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Och';

-- erloesung | erwartung | schaendung  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Jussi', name_display = 'Jussi Olsen', last_updated_at = now()
  WHERE id = 'd44c2c9b-4325-4e35-b2a5-8fa58b82c03e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Olsen';

-- saladin  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Andrew', name_display = 'Andrew Osmond', last_updated_at = now()
  WHERE id = '24ccac98-56e1-4d0c-84f4-9501e77230f2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Osmond';

-- handbook artificial intelligence  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Avron', name_display = 'Avron Barr', last_updated_at = now()
  WHERE id = 'ed84e3f7-a285-4e81-b894-7ea0e91071ff' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barr';

-- haie  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Ott', last_updated_at = now()
  WHERE id = '8865733d-a2d2-45cd-9702-82aeeca53ba7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ott';

-- wunder  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'R. J.', name_display = 'R. J. Palacio', last_updated_at = now()
  WHERE id = 'db6373a0-5274-4dd4-be9c-6550a6876609' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Palacio';

-- landkarte  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Félix J.', name_display = 'Félix J. Palma', last_updated_at = now()
  WHERE id = '406e0bdc-1726-493b-89a8-3c4f906615d2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Palma';

-- kehrseite  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Leo', name_display = 'Leo Matthias', last_updated_at = now()
  WHERE id = 'fdf9a7f1-52e9-4617-9270-e2cde8ce84aa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Matthias';

-- hadrian | reisen paulus  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Stewart', name_display = 'Stewart Perowne', last_updated_at = now()
  WHERE id = 'bc491e01-9214-4422-9591-c9b92ebf1e6c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Perowne';

-- mexiko  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Peyer', last_updated_at = now()
  WHERE id = 'f068bb1e-5ca4-4080-a0d6-3992accbf060' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Peyer';

-- casino  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Nicholas', name_display = 'Nicholas Pileggi', last_updated_at = now()
  WHERE id = '1ef1a61d-4089-4756-acfa-c48611111cc1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pileggi';

-- tito  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Jože', name_display = 'Jože Pirjevec', last_updated_at = now()
  WHERE id = 'fa5ea134-8cd0-4c33-b6e3-97f2db942e6d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pirjevec';

-- jakobsweg | koenigin saba  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Carmen', name_display = 'Carmen Rohrbach', last_updated_at = now()
  WHERE id = 'dca3147d-a806-4a3e-9beb-12221bc0b244' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rohrbach';

-- tiroler skitouren  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Pokos', last_updated_at = now()
  WHERE id = '9ef88e25-40d7-447d-a45f-761e23568f05' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pokos';

-- nelsons  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Dudley', name_display = 'Dudley Pope', last_updated_at = now()
  WHERE id = '813b18fc-551b-4a38-b700-2806f434c3a5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pope';

-- ausgelacht  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Gerhard', name_display = 'Gerhard Prause', last_updated_at = now()
  WHERE id = 'a49f64d0-2ef4-4e73-a925-87f87dc274ce' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Prause';

-- ali nino  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Kurban', name_display = 'Kurban Said', last_updated_at = now()
  WHERE id = '2d9660f5-5bc3-42e7-9ab1-31e9a9431555' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Said';

-- usa  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Sherry', name_display = 'Sherry Quack', last_updated_at = now()
  WHERE id = 'b2bfe308-79da-4868-864a-d5a845e06b0c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Quack';

-- canal grande  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hannu', name_display = 'Hannu Raittila', last_updated_at = now()
  WHERE id = '19e09109-f0e9-4579-b478-62704dde19d3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Raittila';

-- abenteuer ehemaligen bankberaters | kaiser | kaiser china  [OpenLibrary-Titel, 6 Treffer, Alt: Tilman: Rammstedt]
UPDATE public.authors SET first_name = 'Tilman', name_display = 'Tilman Rammstedt', last_updated_at = now()
  WHERE id = '03b69dab-02ec-41b5-aadd-948d5a8a04d8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rammstedt';

-- donut  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Kate', name_display = 'Kate Raworth', last_updated_at = now()
  WHERE id = 'c06feb80-9df9-4bc2-9524-9915f5f9ba00' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Raworth';

-- tod beginenhaus  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Petra', name_display = 'Petra Schier', last_updated_at = now()
  WHERE id = '1effa5b1-55ad-42b6-a237-f250320d61e8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schier';

-- neropolis  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Hubert', name_display = 'Hubert Monteilhet', last_updated_at = now()
  WHERE id = 'b59e157c-f010-47ff-bb17-3b918fb56e31' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Monteilhet';

-- yachtbau  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Reinke', last_updated_at = now()
  WHERE id = '2ebbbd91-76e7-46d9-bd43-ff0ebce3d02b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reinke';

-- nachkrieg  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Ludwig', name_display = 'Ludwig Renn', last_updated_at = now()
  WHERE id = 'bacab4ac-93ea-442f-9e6b-82c129c730d9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Renn';

-- grieche | knaurs tundra  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Pierre', name_display = 'Pierre Rey', last_updated_at = now()
  WHERE id = 'd61f2b9a-6e3b-4103-bbcb-282019339184' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rey';

-- cape town  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Simon', name_display = 'Simon Richmond', last_updated_at = now()
  WHERE id = '884cf8a3-0a22-47c0-b9c9-a3a0a7e1c48c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Richmond';

-- Scarlett | charleston | charleston true  [OpenLibrary-Titel, 9 Treffer, Alt: Alexandria Ripley]
UPDATE public.authors SET first_name = 'Alexandra', name_display = 'Alexandra Ripley', last_updated_at = now()
  WHERE id = 'e84ea656-2c2a-4e53-89fc-255bd3752208' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ripley';

-- kaemmerer | lordkanzler  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Candace M.', name_display = 'Candace M. Robb', last_updated_at = now()
  WHERE id = '2b7b12dd-0fac-47c2-b5bd-e8d5a533b718' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Robb';

-- bewerbungsmuster  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Uta', name_display = 'Uta Rohrschneider', last_updated_at = now()
  WHERE id = '8b33fc0c-0ad9-4e4b-98fd-6d7dcbc44ebf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rohrschneider';

-- ice  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'James', name_display = 'James Rollins', last_updated_at = now()
  WHERE id = 'b8c4b108-e39d-4f3f-a61e-5bf2b6fe7fac' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rollins';

-- Factfulness  [OpenLibrary-ISBN, 1 Treffer, Alt: Ola Rosling]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Rosling', last_updated_at = now()
  WHERE id = '235cf556-d4b2-431e-980c-4d7163dc859a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rosling';

-- Feng Shui  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Sarah', name_display = 'Sarah Rossbach', last_updated_at = now()
  WHERE id = '70da0095-feac-4c4f-9b82-cfeea64af1dd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rossbach';

-- neunte | oktopus  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Dirk', name_display = 'Dirk Rossmann', last_updated_at = now()
  WHERE id = 'a3dd38af-2ef7-409c-8bd0-9b79c2c99721' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rossmann';

-- arbeitstechniken  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Friedrich', name_display = 'Friedrich Rost', last_updated_at = now()
  WHERE id = '6956759e-0a10-4959-b650-2d9bedbfae2f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rost';

-- satanische verhandlungskunst  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Wolf', name_display = 'Wolf Ruede-Wissmann', last_updated_at = now()
  WHERE id = '9b1c5405-e8fa-45e4-8e4a-d6c861f0f69b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ruede-Wissmann';

-- abessinier  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Jean-Christophe', name_display = 'Jean-Christophe Rufin', last_updated_at = now()
  WHERE id = 'd4a16410-4cbe-4de0-8322-4898bf0135b0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rufin';

-- vier versprechen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Don Miguel', name_display = 'Don Miguel Ruiz', last_updated_at = now()
  WHERE id = '44d257f9-b3de-4fbf-b1d9-0664cfbc6bd0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ruiz';

-- children | mauren  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Salman', name_display = 'Salman Rushdie', last_updated_at = now()
  WHERE id = 'a34570b5-fea9-422e-ba03-fdaa5353082e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rushdie';

-- cuba  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Brendan', name_display = 'Brendan Sainsbury', last_updated_at = now()
  WHERE id = '1fc8d817-0119-405d-95fa-c0f461db2065' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sainsbury';

-- rose  [OpenLibrary-Titel, 4 Treffer, Alt: Consuelo De Saint-Exupery]
UPDATE public.authors SET first_name = 'Consuelo', name_display = 'Consuelo de Saint-Exupery', namenszusatz = 'de', last_updated_at = now()
  WHERE id = 'fa2a8cc3-aac4-4f69-8596-6f90d73f2348' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Saint-Exupery';

-- korsar  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Emilio', name_display = 'Emilio Salgari', last_updated_at = now()
  WHERE id = '84a79fe4-4aca-47a0-94f5-7fb9292dde4a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Salgari';

-- majorca  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'George', name_display = 'George Sand', last_updated_at = now()
  WHERE id = '6f20f5fe-50f8-47c5-9632-7e1d6112da58' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sand';

-- erfolg  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Umberto', name_display = 'Umberto Saxer', last_updated_at = now()
  WHERE id = 'f5f6d356-fa76-4d44-bc26-1049d0078dfb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Saxer';

-- wirtschaft arm  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Horst', name_display = 'Horst Afheldt', last_updated_at = now()
  WHERE id = '9bdc907e-0165-4bdc-b2a5-b1843fdfcc5b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Afheldt';

-- kalteis  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Andrea Maria', name_display = 'Andrea Maria Schenkel', last_updated_at = now()
  WHERE id = '3aa6ca0f-1849-4b3b-8ee8-6680fecf10f2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schenkel';

-- namibia  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Daniela', name_display = 'Daniela Schetar', last_updated_at = now()
  WHERE id = 'a7923100-7c2b-41fc-8b94-e9ccc3ce3bfd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schetar';

-- katharina  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Heinz P.', name_display = 'Heinz P. Schmidt-Aleman', last_updated_at = now()
  WHERE id = '763ec672-c12f-41ce-aab9-aa0996d7acd5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmidt-Aleman';

-- schneller lesen verstehen  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Schmitz', last_updated_at = now()
  WHERE id = '2ec7c897-ad9b-445e-b351-778c1d77df6b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmitz';

-- hauptsache  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Dieter', name_display = 'Dieter Schnack', last_updated_at = now()
  WHERE id = 'aef49f99-4f52-4a9b-a749-2123e599e4ad' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schnack';

-- vaters  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Wolfdietrich', name_display = 'Wolfdietrich Schnurre', last_updated_at = now()
  WHERE id = '2e54ee14-4bdc-4b8c-b21a-3b0a4fc2fe30' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schnurre';

-- christus | zypern  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Kurt', name_display = 'Kurt Schubert', last_updated_at = now()
  WHERE id = 'a603bcff-788f-4025-b4b2-dd0aab3bd2a3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schubert';

-- story  [OpenLibrary-Titel, 3 Treffer, Alt: Jim Schultz]
UPDATE public.authors SET first_name = 'Jeanne', name_display = 'Jeanne Schultz', last_updated_at = now()
  WHERE id = '0f63a24d-9496-4719-af66-192184c633d4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schultz';

-- bayern  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Dietrich', name_display = 'Dietrich Schulze-Marmeling', last_updated_at = now()
  WHERE id = '68af3561-9a16-4c85-9997-f253b96f9b00' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schulze-Marmeling';

-- anpfiff | survive radfahrer  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Toni', name_display = 'Toni Schumacher', last_updated_at = now()
  WHERE id = '23988028-67eb-48e1-aa35-6988a5deebaa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schumacher';

-- wahnsinnskarriere  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang', name_display = 'Wolfgang Schur', last_updated_at = now()
  WHERE id = '4cc85b64-8b01-4ff1-bbd1-a301f17ff3a5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schur';

-- open book management  [OpenLibrary-Titel, 3 Treffer, Alt: John P Schuster]
UPDATE public.authors SET first_name = 'John P.', name_display = 'John P. Schuster', last_updated_at = now()
  WHERE id = 'ac45f421-04ba-46be-bc22-def58f4fe028' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schuster';

-- Die Tibet-Verschwörung | Gelber Kaiser  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Raymond A.', name_display = 'Raymond A. Scofield', last_updated_at = now()
  WHERE id = 'e6a2fb4f-5aba-4d24-8cc9-76d414762695' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scofield';

-- austerlitz | unbekanntes fuenfseenland  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'W. G.', name_display = 'W. G. Sebald', last_updated_at = now()
  WHERE id = 'f61274e6-355a-4157-bbc2-293d47139d16' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sebald';

-- paranoia  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Trevor', name_display = 'Trevor Shane', last_updated_at = now()
  WHERE id = 'ef542b73-eed4-4782-9880-b1c1acc69aaf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Shane';

-- quo  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Henryk', name_display = 'Henryk Sienkiewicz', last_updated_at = now()
  WHERE id = '99d767d8-8f1f-46c0-b3c9-c0988cd90717' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sienkiewicz';

-- majipoor | meer kleine fische  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Silverberg', last_updated_at = now()
  WHERE id = '69be758a-13a2-426e-a311-1823dcc9e94a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Silverberg';

-- diana  [OpenLibrary-Titel, 4 Treffer, Alt: SIMONE Simmons]
UPDATE public.authors SET first_name = 'Simone', name_display = 'Simone Simmons', last_updated_at = now()
  WHERE id = '48bceebd-5541-42f5-b041-3808e8b2a8a4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Simmons';

-- aegyptens | isfahan | oelzweig  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Gilbert', name_display = 'Gilbert Sinoue', last_updated_at = now()
  WHERE id = 'e41da0a2-e7f7-4340-af17-abd536f6df51' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sinoue';

-- allein  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Joshua', name_display = 'Joshua Slocum', last_updated_at = now()
  WHERE id = '71f2ce6f-e8ab-419f-89b2-bb0f465d6da7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Slocum';

-- kaelteste | winter  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Sister', name_display = 'Sister Souljah', last_updated_at = now()
  WHERE id = '765a0cce-8da0-41a2-bd28-3585582bb74d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Souljah';

-- meister siebten siegels | siegels  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Johannes K.', name_display = 'Johannes K. Soyener', last_updated_at = now()
  WHERE id = '680cbab2-c25d-4d84-8692-4ec5acf4f9d8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Soyener';

-- Das Leuchten der Stille | The mind of South Africa  [OpenLibrary-ISBN, 1 Treffer, Alt: Nicholas Sparks]
UPDATE public.authors SET first_name = 'Allister', name_display = 'Allister Sparks', last_updated_at = now()
  WHERE id = '3578d27b-117c-42aa-8481-ff6909156a62' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sparks';

-- titanic  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Stephen J.', name_display = 'Stephen J. Spignesi', last_updated_at = now()
  WHERE id = 'ce05980d-bf69-4b20-9b67-0572b81b052f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Spignesi';

-- einsamkeit  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Manfred', name_display = 'Manfred Spitzer', last_updated_at = now()
  WHERE id = 'daa8b710-990a-42e1-8e51-3272dda5e79f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Spitzer';

-- vertrauen  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Reinhard K.', name_display = 'Reinhard K. Sprenger', last_updated_at = now()
  WHERE id = '77f00b66-f74d-41a1-814d-905b555c68b9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sprenger';

-- livingstone  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Henry M.', name_display = 'Henry M. Stanley', last_updated_at = now()
  WHERE id = 'e6a0cb0f-d228-4fa8-a79d-77b15ca467c9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stanley';

-- messias  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Boris', name_display = 'Boris Starling', last_updated_at = now()
  WHERE id = 'e77bd6e4-283e-4c6c-a8bc-8add4af80636' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Starling';

-- stunde | weltkrieg  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Johannes', name_display = 'Johannes Steinhoff', last_updated_at = now()
  WHERE id = '93c5e624-8d9d-413a-8c5e-00ddfbcadee9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Steinhoff';

-- ikea  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Johan', name_display = 'Johan Stenebo', last_updated_at = now()
  WHERE id = '6b2c8b39-9948-448b-8cf9-ff6cbb12fc37' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stenebo';

-- myron  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Motram', last_updated_at = now()
  WHERE id = '2769ab43-17ea-4b4a-aa40-8c2f99fac813' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Motram';

-- einmal | puppen  [OpenLibrary-Titel, 3 Treffer, Alt: JACQUELINE Susann | Jaqueline Susann]
UPDATE public.authors SET first_name = 'Jacqueline', name_display = 'Jacqueline Susann', last_updated_at = now()
  WHERE id = '548ab931-db61-43d6-ac0b-33315a1bcb16' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Susann';

-- knaurs wald | voyeur  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Henry', name_display = 'Henry Sutton', last_updated_at = now()
  WHERE id = 'd09ec030-5cdf-4dd0-81ce-01f2eadb055f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sutton';

-- bless beasts children  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Glendon Fred', name_display = 'Glendon Fred Swarthout', last_updated_at = now()
  WHERE id = 'aa3a49c0-89d8-47b0-84bd-3d81411da089' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Swarthout';

-- Le Sahara | gullivers  [OpenLibrary-Titel, 5 Treffer, Alt: Jeremy Swift]
UPDATE public.authors SET first_name = 'Jonathan', name_display = 'Jonathan Swift', last_updated_at = now()
  WHERE id = 'e1e04b61-23f4-4583-9175-1258bd51a43d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Swift';

-- Die Blockchain-Revolution  [OpenLibrary-ISBN, 1 Treffer, Alt: Don Tapscott]
UPDATE public.authors SET first_name = 'Alex', name_display = 'Alex Tapscott', last_updated_at = now()
  WHERE id = '4af7ccd6-d06e-4525-832b-ef2800ae0ea9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tapscott';

-- kabul  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Anna', name_display = 'Anna Tell', last_updated_at = now()
  WHERE id = 'd752e3fc-a147-433a-bc0a-33470f37c873' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tell';

-- tibet  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Sabriye', name_display = 'Sabriye Tenberken', last_updated_at = now()
  WHERE id = 'b5eddc99-eafe-41db-bb3d-292c8f6db5f7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tenberken';

-- einstieg .  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Theis', last_updated_at = now()
  WHERE id = 'ba51b551-270e-4ae1-8e26-cdf87a65084a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Theis';

-- sandwolken  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Kathy', name_display = 'Kathy Thieck', last_updated_at = now()
  WHERE id = '863babf5-1ddd-4d6d-b2f9-f04fa96eaab9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thieck';

-- stell schergen gut  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Ellen', name_display = 'Ellen Thiemann', last_updated_at = now()
  WHERE id = '336fb517-9814-4b1a-89f8-d5f64704ae62' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thiemann';

-- zion  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Brock', name_display = 'Brock Thoene', last_updated_at = now()
  WHERE id = 'c9726759-e8e3-461e-84b6-849953dd7c4a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thoene';

-- Szenen aus dem Herzen  [OpenLibrary-ISBN, 1 Treffer, Alt: Greta Thunberg]
UPDATE public.authors SET first_name = 'Svante', name_display = 'Svante Thunberg', last_updated_at = now()
  WHERE id = 'be8199a9-f537-4bb3-8f20-cb121e4f1d10' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thunberg';

-- abschied dir lebenskrisen | essen | organsprache  [OpenLibrary-Titel, 2 Treffer, Alt: Henry G Tietze]
UPDATE public.authors SET first_name = 'Henry G.', name_display = 'Henry G. Tietze', last_updated_at = now()
  WHERE id = '7a13b6dc-21be-4a8e-85ab-b74fe42c522a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tietze';

-- juan  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Josef', name_display = 'Josef Toman', last_updated_at = now()
  WHERE id = '7e3f57e8-f78a-4aa7-9e8b-49d7b1e33790' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Toman';

-- mary poppins  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Pamela L.', name_display = 'Pamela L. Travers', last_updated_at = now()
  WHERE id = '851cb199-b7a4-4086-a1d6-fb8146563ef2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Travers';

-- ana  [OpenLibrary-Titel, 2 Treffer, Alt: Joao Silverio Trevisan]
UPDATE public.authors SET first_name = 'João Silvério', name_display = 'João Silvério Trevisan', last_updated_at = now()
  WHERE id = 'c1163bb2-8bfc-4707-bad0-19edcf264939' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Trevisan';

-- entfesselte | weltensammler  [OpenLibrary-Titel, 7 Treffer]
UPDATE public.authors SET first_name = 'Ilija', name_display = 'Ilija Trojanow', last_updated_at = now()
  WHERE id = 'f8e98b1e-ec22-40cc-8b9e-041a16d1d6d6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Trojanow';

-- rich  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Donald', name_display = 'Donald Trump', last_updated_at = now()
  WHERE id = 'ef521aa5-3956-46bc-8f79-2777fb45cca0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Trump';

-- altai  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Galsan', name_display = 'Galsan Tschinag', last_updated_at = now()
  WHERE id = '15474f4d-b2dc-4740-9d0e-4b54ac42584c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tschinag';

-- sumerer  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Helmut', name_display = 'Helmut Uhlig', last_updated_at = now()
  WHERE id = 'a7158660-167d-4282-a4a6-f1401d28b683' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Uhlig';

-- uno  [OpenLibrary-Titel, 2 Treffer, Alt: Günther Unser | Gunther Unser]
UPDATE public.authors SET first_name = 'Günther', name_display = 'Günther Unser', last_updated_at = now()
  WHERE id = '40365448-9273-4a7a-9eb4-6160852f8ea2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Unser';

-- sklavenschiff  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Barry', name_display = 'Barry Unsworth', last_updated_at = now()
  WHERE id = 'a7ddd7fd-b0aa-41ce-88fb-45d1a3120e4c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Unsworth';

-- vision  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Ronald', name_display = 'Ronald Munson', last_updated_at = now()
  WHERE id = 'fca350a6-b676-4048-88b3-c7b118934f8a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Munson';

-- san-michele  [OpenLibrary-Titel, 4 Treffer, Alt: AXEL Munthe]
UPDATE public.authors SET first_name = 'Axel', name_display = 'Axel Munthe', last_updated_at = now()
  WHERE id = 'ce8e9ca9-5cce-419c-97ab-c85c324a05e2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Munthe';

-- loewenkoenigs | macht unterbewusstseins | statthalter  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Joseph', name_display = 'Joseph Murphy', last_updated_at = now()
  WHERE id = '64b9fa2e-504c-4d1c-884b-2dca1e8cceb2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Murphy';

-- drei zuviel | handvoll  [OpenLibrary-Titel, 7 Treffer]
UPDATE public.authors SET first_name = 'Barbara', name_display = 'Barbara Noack', last_updated_at = now()
  WHERE id = 'b047f67e-36a9-47ad-9d9f-f439f48c0271' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Noack';

-- bodyguard | cop | heat  [OpenLibrary-Titel, 7 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Tine', last_updated_at = now()
  WHERE id = 'e147ef63-ff49-42f8-95b5-1095489386a3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tine';

-- new earth  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Eckhart', name_display = 'Eckhart Tolle', last_updated_at = now()
  WHERE id = '0106084c-77e1-42f1-b5a8-993f8e2e58ac' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tolle';

-- tropenparadies  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Wallert', last_updated_at = now()
  WHERE id = 'a86ede91-f721-4cf3-bf49-b43d354ed104' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wallert';

-- casablanca  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Walsh', last_updated_at = now()
  WHERE id = '6567483b-adb1-4627-b6bd-42955ce2815e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Walsh';

-- junge  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Alfred', name_display = 'Alfred Weidenmann', last_updated_at = now()
  WHERE id = 'cd1318c2-08dd-4bac-af59-d126eabbc864' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weidenmann';

-- spa | teufelin  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Fay', name_display = 'Fay Weldon', last_updated_at = now()
  WHERE id = '604164c0-ad93-4cba-9379-c15330390ee3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weldon';

-- ecstasy romanzen chemischen | trainspotting  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Irvine', name_display = 'Irvine Welsh', last_updated_at = now()
  WHERE id = '6a72001b-e4d8-4ee3-875b-3781babc0677' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Welsh';

-- laikan  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Josef', name_display = 'Josef Wenter', last_updated_at = now()
  WHERE id = '22988881-c169-4542-a3ab-c84ac68398a2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wenter';

-- 9 Monate voller Sicherheit und Genuss  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Rosemarie', name_display = 'Rosemarie Wetscher', last_updated_at = now()
  WHERE id = '217d4291-6440-41ba-8f2a-1da39c76f490' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wetscher';

-- waltons  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Weverka', last_updated_at = now()
  WHERE id = '5202017d-6558-4cba-9e3a-e5b9ac7b21c3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weverka';

-- jeromin  [OpenLibrary-Titel, 5 Treffer]
UPDATE public.authors SET first_name = 'Ernst', name_display = 'Ernst Wiechert', last_updated_at = now()
  WHERE id = 'e7a4e3ed-caee-4295-881a-f8ad552e2087' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wiechert';

-- new york  [OpenLibrary-Titel, 2 Treffer, Alt: Werner Wille]
UPDATE public.authors SET first_name = 'Werner W.', name_display = 'Werner W. Wille', last_updated_at = now()
  WHERE id = '4e091f10-7e99-4fec-af2f-652cfea7f1ce' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wille';

-- finstere tal  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Willmann', last_updated_at = now()
  WHERE id = '0a697807-a1c6-4255-b0a6-9a0570aef55b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Willmann';

-- herbstmilch  [OpenLibrary-Titel, 4 Treffer, Alt: A. Wimschneider]
UPDATE public.authors SET first_name = 'Anna', name_display = 'Anna Wimschneider', last_updated_at = now()
  WHERE id = 'cf607e90-2fff-4033-953f-83771a82d4d4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wimschneider';

-- uniform  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Christa', name_display = 'Christa Winsloe', last_updated_at = now()
  WHERE id = '6cd4db7e-afe0-4136-8711-059375a5d977' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winsloe';

-- amber  [OpenLibrary-Titel, 4 Treffer, Alt: Kahtleen Winsor]
UPDATE public.authors SET first_name = 'Kathleen', name_display = 'Kathleen Winsor', last_updated_at = now()
  WHERE id = '1d1e3012-43d4-4548-bb62-95508d7e7853' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winsor';

-- kinder tyrannen | tyrannen  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Winterhoff', last_updated_at = now()
  WHERE id = '92661672-2aa8-430e-9044-fe7380b756cb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winterhoff';

-- geh | richtigen mann finden | uebersieht  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Eva', name_display = 'Eva Wlodarek', last_updated_at = now()
  WHERE id = 'dff66e17-93e7-4fb3-946c-52f14fc5aed1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wlodarek';

-- eitelkeiten | fegefeuer  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Tom', name_display = 'Tom Wolfe', last_updated_at = now()
  WHERE id = 'b69d41a1-1133-4ed1-a24b-3c9bcf9a18ec' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wolfe';

-- Arm aber Bio! | Im Schatten des Pferdemondes | feuer  [OpenLibrary-ISBN, 1 Treffer, Alt: Rosa Wolff]
UPDATE public.authors SET first_name = 'Evita', name_display = 'Evita Wolff', last_updated_at = now()
  WHERE id = 'ba54f7ba-ca19-4f31-a670-b7dc9134157f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wolff';

-- henker  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Irvin D.', name_display = 'Irvin D. Yalom', last_updated_at = now()
  WHERE id = '7bd20002-a1e7-4312-a215-4fc52e33c3ea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yalom';

-- yogi  [OpenLibrary-Titel, 4 Treffer]
UPDATE public.authors SET first_name = 'Paramhansa', name_display = 'Paramhansa Yogananda', last_updated_at = now()
  WHERE id = '760414fe-1c01-40df-9175-83fbe4b6b538' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yogananda';

-- liebe  egal heiratest  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'Eva-Maria', name_display = 'Eva-Maria Zurhorst', last_updated_at = now()
  WHERE id = '8fc8b6ba-8fe1-4a54-9034-b0d651984eb4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zurhorst';

-- jesus  [OpenLibrary-Titel, 3 Treffer]
UPDATE public.authors SET first_name = 'Franco', name_display = 'Franco Zeffirelli', last_updated_at = now()
  WHERE id = '923129b9-059f-4f62-9be5-4184e0c67602' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zeffirelli';

-- pinocchio  [OpenLibrary-Titel, 2 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Zeman', last_updated_at = now()
  WHERE id = 'bf23ed55-1bd6-4a0d-bb2b-0970b0f74ed7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zeman';

COMMIT;

-- Kontrolle danach:
-- SELECT count(*) FROM public.authors WHERE NULLIF(btrim(first_name),'') IS NULL;
