-- Vornamen ergänzen – Teil 2: Sicherheit NIEDRIG – bitte vorher durchsehen, falsche Zeilen löschen
-- 271 Autoren. Nur Einträge, die (noch) keinen Vornamen haben, werden geändert.
-- In DBeaver: Datei öffnen, Verbindung wählen (zuerst Test-Branch!), Alt+X / ⌥X.
-- Erwartet: 271x "Updated rows: 1" (0 = Autor wurde inzwischen schon geändert, das ist ok).

BEGIN;

-- ===== Sicherheit: niedrig (272) =====

-- schneeflockenbaum | yoga  [OpenLibrary-Titel, 2 Treffer, Alt: Bobby Hart | Hella Hart]
UPDATE public.authors SET first_name = 'Sam', name_display = 'Sam Hart', last_updated_at = now()
  WHERE id = '0e35be9f-f0f1-4a5a-91a1-badf4201140e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hart';

-- attila  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Gerhart', name_display = 'Gerhart Ellert', last_updated_at = now()
  WHERE id = '71cf8aaa-37ee-4f22-bb36-1d1ef9c13cc4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ellert';

-- frei | sex  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Liz', name_display = 'Liz Hodgkinson', last_updated_at = now()
  WHERE id = '12a86b62-bedf-4199-9e04-755b09a7d9a7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Hodgkinson';

-- 1661  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Yves', name_display = 'Yves Jego', last_updated_at = now()
  WHERE id = '69ce6bdc-8746-4a87-ad4e-8e86ef004136' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jego';

-- southwest  [OpenLibrary-Titel, 1 Treffer, Alt: Becca Blond]
UPDATE public.authors SET first_name = 'Rebecca', name_display = 'Rebecca Blond', last_updated_at = now()
  WHERE id = 'af08768d-26f5-4cb8-a2f9-8e44a3a9f220' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Blond';

-- bolivia  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Greg', name_display = 'Greg Benchwick', last_updated_at = now()
  WHERE id = 'f1e9f4fe-8bde-45ff-bc16-fec5788d752b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Benchwick';

-- alaska | gardasee  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Udo', name_display = 'Udo Bernhart', last_updated_at = now()
  WHERE id = '861f704b-88af-48c4-a3bc-bbc71113c433' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bernhart';

-- epochen musikgeschichte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Friedrich', name_display = 'Friedrich Blume', last_updated_at = now()
  WHERE id = '1d646b7f-7d13-47e7-a67a-2109547f9595' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Blume';

-- demenz | kueng  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Tilman', name_display = 'Tilman Jens', last_updated_at = now()
  WHERE id = '9558a542-381a-4761-9b13-1686cfd528b2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jens';

-- hummerschwestern  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Beverly', name_display = 'Beverly Jensen', last_updated_at = now()
  WHERE id = '0e9992b5-0c16-4d7e-b83c-be1fd784f53e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jensen';

-- venus  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Emmanuelle', name_display = 'Emmanuelle Arsan', last_updated_at = now()
  WHERE id = 'a1df1b6d-40b3-4d0c-bdab-4095b37772b5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Arsan';

-- Physik selbst erlebt | arzt vorbei weg  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Backe', last_updated_at = now()
  WHERE id = 'b5a13e00-d740-4ad2-b88a-b5eef66293a7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Backe';

-- frauen lateinamerika  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Marco', name_display = 'Marco Alcantara', last_updated_at = now()
  WHERE id = 'b57dddd3-b7c0-4081-b7d7-44286dd3c393' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alcantara';

-- wandern  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Manuel', name_display = 'Manuel Andrack', last_updated_at = now()
  WHERE id = '9c9c9a02-e952-4db7-bbc3-0c4d07f4a8b7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Andrack';

-- merlin feuerproben  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Thomas A.', name_display = 'Thomas A. Barron', last_updated_at = now()
  WHERE id = 'f21c16f9-ebca-4585-a1c5-368ce6b6cf0c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barron';

-- gardasee  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Anita M.', name_display = 'Anita M. Back', last_updated_at = now()
  WHERE id = '3b95524e-2402-45ef-b7c1-ba7c891c6bcf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Back';

-- Die bayerischen Seen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Josef H.', name_display = 'Josef H. Biller', last_updated_at = now()
  WHERE id = 'cbf4d7e0-13d6-4659-8e9a-aa287a6e635b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Biller';

-- danke  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Christopher', name_display = 'Christopher Buckley', last_updated_at = now()
  WHERE id = 'd612c4ea-96a4-441f-b153-7287f66b98f1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Buckley';

-- athena  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Banville', last_updated_at = now()
  WHERE id = 'cd4dad8e-d839-4363-8d13-36bbeb98a5ae' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Banville';

-- ketzer  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Anselm', name_display = 'Anselm Audley', last_updated_at = now()
  WHERE id = '440c6449-0f90-4af3-919d-9922d45dd856' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Audley';

-- chile handbuch  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'René', name_display = 'René Junghans', last_updated_at = now()
  WHERE id = '53922c40-f266-415d-b6ae-f727c887d34f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Junghans';

-- himmelstochter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hülya', name_display = 'Hülya Kandemir', last_updated_at = now()
  WHERE id = 'd15ed0c5-b7b1-4c82-a7af-369cfe5adb06' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kandemir';

-- jude  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Yoram', name_display = 'Yoram Kaniuk', last_updated_at = now()
  WHERE id = '2301d7eb-ac2b-4678-be60-0ec7e12782b2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kaniuk';

-- teamwechsel  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Anna', name_display = 'Anna Katmore', last_updated_at = now()
  WHERE id = 'b8928084-276a-437f-aa2e-560aca79df48' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Katmore';

-- schlau dumm  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Daniela', name_display = 'Daniela Katzenberger', last_updated_at = now()
  WHERE id = 'b18e346f-92cd-42d9-9518-0ec93edcbd98' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Katzenberger';

-- narbonne  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Catherine', name_display = 'Catherine Jinks', last_updated_at = now()
  WHERE id = '9ab361e6-4096-42df-9145-595906ff4284' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Jinks';

-- pampers  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Iris', name_display = 'Iris Alanyali', last_updated_at = now()
  WHERE id = '6e01656c-e0b6-42bf-9634-1293200f87b6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Alanyali';

-- beckenbauer  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Christian', name_display = 'Christian Ankowitsch', last_updated_at = now()
  WHERE id = '318442b8-154e-4f8c-8064-8c84b4622c5c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ankowitsch';

-- Jorga der Tapfere. Rumänische Volksmärchen.  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Anna', name_display = 'Anna Kelterborn-Haemmerli', last_updated_at = now()
  WHERE id = '818e1b22-3fe4-4b8a-a7dd-9b45849ce431' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kelterborn-Haemmerli';

-- wurzeln  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Kempe', last_updated_at = now()
  WHERE id = '1cb70be6-4da5-48c6-9917-6ed46c0baf0c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kempe';

-- Globalisierung im Alltag.  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Kemper', last_updated_at = now()
  WHERE id = '6ca504ce-3f6e-4ea8-8850-72f741470d82' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kemper';

-- Suche Nach Einer Neuen Welt {Originally Published in English as to See  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert F.', name_display = 'Robert F. Kennedy', last_updated_at = now()
  WHERE id = '1c567934-9a70-4d85-8944-472e61a62d20' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kennedy';

-- luft  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Keppler', last_updated_at = now()
  WHERE id = 'bc662724-9cd8-4f46-9735-bef35a949115' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Keppler';

-- Wild Thing. Sex- Tips for Boys and Girls  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Joannides', last_updated_at = now()
  WHERE id = '0207a297-55d3-451f-98f2-39ffb892dac4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Joannides';

-- liebe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rainer', name_display = 'Rainer Kiefer', last_updated_at = now()
  WHERE id = '4b7d5471-c6ae-4475-9e2b-e2c102612698' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kiefer';

-- modemacher  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rudolf', name_display = 'Rudolf Kinzel', last_updated_at = now()
  WHERE id = '1dc15bb0-2dae-440a-beb4-285b69beb16f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kinzel';

-- ultimative new body  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Kirsch', last_updated_at = now()
  WHERE id = 'ab2fbd34-31c3-427f-b0ee-e2c4e1ee2f79' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kirsch';

-- schwangerschaft geburt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sheila', name_display = 'Sheila Kitzinger', last_updated_at = now()
  WHERE id = 'fb07079d-616e-4a10-82c1-bca9d4953d61' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kitzinger';

-- weissen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sabine', name_display = 'Sabine Klewe', last_updated_at = now()
  WHERE id = '443a864e-caa5-45a9-bf4f-0c2b73404dcc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Klewe';

-- kamele  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Otto Heinrich', name_display = 'Otto Heinrich Klingele', last_updated_at = now()
  WHERE id = 'dbded998-476b-4ab2-b99d-9cd85e8e9b38' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Klingele';

-- weg t'ai chi  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Petra', name_display = 'Petra Kobayashi', last_updated_at = now()
  WHERE id = '183a0aad-363b-48c0-9bd8-e5516eb78c53' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kobayashi';

-- arbeit | marokko | wueste bluehen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Koehler', last_updated_at = now()
  WHERE id = '97200c0c-41cc-489c-9772-b9e160fa8fdf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Koehler';

-- george  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Carolyn', name_display = 'Carolyn Koerner', last_updated_at = now()
  WHERE id = 'be0109b3-c62b-40c1-ad40-a4626251124d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Koerner';

-- begraben  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Pavel', name_display = 'Pavel Kohout', last_updated_at = now()
  WHERE id = 'e2acf6d0-6fec-4aad-9a4e-77915fc95b63' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kohout';

-- brahms  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Malte', name_display = 'Malte Korff', last_updated_at = now()
  WHERE id = 'ad40293f-80ae-4850-912a-b98c0384aeb3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Korff';

-- toechter | zeiten aufbruchs  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Carmen', name_display = 'Carmen Korn', last_updated_at = now()
  WHERE id = 'ac78865f-82a3-4991-9374-fda8cb6bfbdc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Korn';

-- brennende  [OpenLibrary-Titel, 1 Treffer, Alt: Jelena Koschina]
UPDATE public.authors SET first_name = 'Jelena', name_display = 'Jelena Koschina', last_updated_at = now()
  WHERE id = '059ae4a7-8ad9-4864-9fdb-c0d41a072888' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Koschina';

-- historiker  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Elizabeth', name_display = 'Elizabeth Kostova', last_updated_at = now()
  WHERE id = '9bf94170-a557-4c7b-ac4e-ad7716c590d2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kostova';

-- angstgetrieben | islam | koennen sogar besser  [OpenLibrary-Titel, 2 Treffer, Alt: H. Kraemer]
UPDATE public.authors SET first_name = 'Joel L.', name_display = 'Joel L. Kraemer', last_updated_at = now()
  WHERE id = '591c4849-1cf9-4954-8601-49a57b02a68e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kraemer';

-- welch kompakt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jeffrey A.', name_display = 'Jeffrey A. Krames', last_updated_at = now()
  WHERE id = '0c32d587-aa60-4d4b-aa48-1fe489e37807' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Krames';

-- geierkrieger  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Arthur', name_display = 'Arthur Krasilnikoff', last_updated_at = now()
  WHERE id = 'e7d86c1c-ec6b-4019-82b7-eae992e098ef' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Krasilnikoff';

-- flammensiegel | zitrone  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sonya', name_display = 'Sonya Kraus', last_updated_at = now()
  WHERE id = '426e38b5-c5a2-4028-87af-3ecc341faa13' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kraus';

-- geschichte liebe | geschichten segler gustaf  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Wolfgang J.', name_display = 'Wolfgang J. Krauss', last_updated_at = now()
  WHERE id = '07a22966-29d1-4969-ae76-c73bb7f6a1ac' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Krauss';

-- stark  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Ursula', name_display = 'Ursula Krechel', last_updated_at = now()
  WHERE id = '0c76a98b-f399-4c35-bae6-23b1c0bd82ec' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Krechel';

-- ostfriesland  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Wolfram', name_display = 'Wolfram Kroker', last_updated_at = now()
  WHERE id = '9c8aff1e-ac3d-4e63-9d1f-1980c8e226b0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kroker';

-- nacht kalifen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter Gustav', name_display = 'Peter Gustav Bartschat', last_updated_at = now()
  WHERE id = 'bd04682f-3a51-4146-b9de-ff12c384bd0a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Bartschat';

-- liebe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Ruth Maria', name_display = 'Ruth Maria Kubitschek', last_updated_at = now()
  WHERE id = 'c5e133b9-f5f9-44b6-a5b4-62b06c2d8967' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kubitschek';

-- paulas new-york-buch  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Ulrike', name_display = 'Ulrike Kuckero', last_updated_at = now()
  WHERE id = 'c8a8e836-a6f3-40f9-8632-fba156f41f54' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kuckero';

-- spuren  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Lahnstein', last_updated_at = now()
  WHERE id = '0f37aef6-4f99-4200-9dad-a49e415ec45d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lahnstein';

-- frueh | musik  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Wally', name_display = 'Wally Lamb', last_updated_at = now()
  WHERE id = '9afc73d0-fe1b-42d2-ac30-cb8ac7323df7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lamb';

-- dunkle  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'David', name_display = 'David Lambkin', last_updated_at = now()
  WHERE id = 'ff1e3216-1f18-41ee-be9f-982e2be64b3f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lambkin';

-- aquarellsommer | intelligenzquotient | wilden wassern mooren  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Albert', name_display = 'Albert Lang', last_updated_at = now()
  WHERE id = '46f128a2-094c-4b09-ad51-729cb42708f6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lang';

-- tenderness  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Mandla', name_display = 'Mandla Langa', last_updated_at = now()
  WHERE id = '02b0152b-7861-4a1b-9392-d5131b76be19' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Langa';

-- erotic food | halbe helden | piaf  [OpenLibrary-Titel, 4 Treffer, Alt: Katja Lange]
UPDATE public.authors SET first_name = 'Monique', name_display = 'Monique Lange', last_updated_at = now()
  WHERE id = '2a509823-c625-41a5-8532-bc76f3add732' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lange';

-- westen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Walter', name_display = 'Walter Laqueur', last_updated_at = now()
  WHERE id = '69a45071-dcf0-4e28-9eb6-37930c53c981' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Laqueur';

-- now  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Janina', name_display = 'Janina Kugel', last_updated_at = now()
  WHERE id = 'f9440543-70de-4252-8e7b-1a6d653f1aaa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kugel';

-- untergang  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Larsen', last_updated_at = now()
  WHERE id = 'b28bb07a-5ba1-44f2-b96d-ea5207e89c69' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Larsen';

-- tropen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Bernhard', name_display = 'Bernhard Lassahn', last_updated_at = now()
  WHERE id = '2c51129f-9f71-4a2b-849d-1ee9d7cf6d3e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lassahn';

-- haie begleiter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans Jürgen', name_display = 'Hans Jürgen Laturner', last_updated_at = now()
  WHERE id = '4ce93161-f0f2-4cd3-accb-e8af74fcecf6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Laturner';

-- schwarzen see  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Leena', name_display = 'Leena Lehtolainen', last_updated_at = now()
  WHERE id = 'b7afe799-f9ed-4428-8aef-be3bd3a2dd89' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lehtolainen';

-- unter dach  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Amir', name_display = 'Amir Baitar', last_updated_at = now()
  WHERE id = '37fd9535-0dc4-4f8d-b9d6-0eaa13c55f66' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Baitar';

-- menschheit  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Harald', name_display = 'Harald Lesch', last_updated_at = now()
  WHERE id = '009fc668-f60a-4d5f-94c9-f6ddb55a8843' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lesch';

-- boys | sliver  [OpenLibrary-Titel, 4 Treffer, Alt: Lon Levin | Lawrence Meyer Levin]
UPDATE public.authors SET first_name = 'Ira', name_display = 'Ira Levin', last_updated_at = now()
  WHERE id = '05962d2e-f7b5-484a-b9d8-cbd07534e0f9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Levin';

-- noni  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Claus-Peter', name_display = 'Claus-Peter Leonhardt', last_updated_at = now()
  WHERE id = 'b4b26f1a-d573-4081-a422-e1d1cda3d498' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Leonhardt';

-- silvia  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Norbert', name_display = 'Norbert Loh', last_updated_at = now()
  WHERE id = 'bcfffdd3-7ce2-477e-bdfa-c6cb8596acba' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Loh';

-- wissarionowitsch  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard Lourie', last_updated_at = now()
  WHERE id = '6b77b93c-2979-44ba-b1e7-7f9add7f474a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lourie';

-- venedig  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Michelle', name_display = 'Michelle Lovric', last_updated_at = now()
  WHERE id = 'ddb519f7-56cf-4a25-9258-86895582663f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lovric';

-- malaysia  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Lutterjohann', last_updated_at = now()
  WHERE id = '5f77e0c3-1a47-490d-8b0b-dbe6d317fe3a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lutterjohann';

-- omega  [OpenLibrary-Titel, 3 Treffer, Alt: Reegan Lynch]
UPDATE public.authors SET first_name = 'Patrick', name_display = 'Patrick Lynch', last_updated_at = now()
  WHERE id = 'e527bf24-11b6-41b1-b70e-ee414eee4b4c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lynch';

-- taiwan  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Maurice', name_display = 'Maurice Macdonald', last_updated_at = now()
  WHERE id = 'c2f2e8f6-fd15-4e05-a636-111fbcd4e6ef' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Macdonald';

-- knochenraub san marco | knochenraub true | spion  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Maiwald', last_updated_at = now()
  WHERE id = 'f409e316-4ee0-4e8c-ad60-aa826a4d95f2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Maiwald';

-- gerron  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Charles', name_display = 'Charles Lewinsky', last_updated_at = now()
  WHERE id = 'd5ff4c0c-067f-4e3d-a3a3-00baff29f47d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Lewinsky';

-- kalten | waeldern | waeldern kalten fluss  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'William', name_display = 'William Judson', last_updated_at = now()
  WHERE id = 'ee3fd2fd-6582-4c03-93e2-a86c16ece3ee' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Judson';

-- fluss  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Esther', name_display = 'Esther Kinsky', last_updated_at = now()
  WHERE id = 'e284e006-cc3d-46ab-852c-1123cb50f568' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Kinsky';

-- scheisskerle  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Roman M.', name_display = 'Roman M. Koidl', last_updated_at = now()
  WHERE id = '1c20e8bf-357d-4b3d-abf3-5a99eda93d49' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Koidl';

-- gun  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Mike', name_display = 'Mike Cogan', last_updated_at = now()
  WHERE id = 'aabc2942-c272-44b6-ad07-4f38729b83ec' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Cogan';

-- zone grauens  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jeff', name_display = 'Jeff Long', last_updated_at = now()
  WHERE id = '6f80b812-a40f-4196-8418-d39bc7815ebf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Long';

-- Bali | Malaysia | Malaysia, Brunei, Singapore  [OpenLibrary-Titel, 7 Treffer, Alt: Renate Loose]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Loose', last_updated_at = now()
  WHERE id = '97c3190e-776b-4a24-8056-0cce811ed548' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Loose';

-- ringeltaube  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hannah', name_display = 'Hannah March', last_updated_at = now()
  WHERE id = 'a119a18a-740a-405f-a00c-bf0aa9082a3a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'March';

-- schlacht  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Javier', name_display = 'Javier Marias', last_updated_at = now()
  WHERE id = '011a0627-72a2-4517-aaf3-7f785a835659' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Marias';

-- darjeeling  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Dominique', name_display = 'Dominique Marny', last_updated_at = now()
  WHERE id = 'd165d065-433f-4205-a5d9-05aa186245cc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Marny';

-- outback  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Manuela', name_display = 'Manuela Martini', last_updated_at = now()
  WHERE id = 'dfcdc30b-a8e9-407c-998e-60494ea7cabe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Martini';

-- letzte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sayo', name_display = 'Sayo Masuda', last_updated_at = now()
  WHERE id = '58965e20-46fd-4ba9-9bb9-af35375d4c1d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Masuda';

-- amerikaner | liebesbriefe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Mayer', last_updated_at = now()
  WHERE id = 'e478c580-dd5e-4715-88ad-f718a535236e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mayer';

-- bibel test  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Josh', name_display = 'Josh Mcdowell', last_updated_at = now()
  WHERE id = '5ed0e181-1e15-40ff-8de5-0e34d96fdd94' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcdowell';

-- resistent  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Mcneive', last_updated_at = now()
  WHERE id = 'd7b6c279-1561-4717-907b-7e35826fce93' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mcneive';

-- mexiko  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sara', name_display = 'Sara Mehlmer', last_updated_at = now()
  WHERE id = '37dc8939-fc5b-41c1-adb7-9818e9baa1ce' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mehlmer';

-- persische  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Marsha', name_display = 'Marsha Mehran', last_updated_at = now()
  WHERE id = '083cc4ab-4246-4711-8375-e48806417279' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mehran';

-- now  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Gary', name_display = 'Gary Meier', last_updated_at = now()
  WHERE id = '421f02c5-6f90-42cc-b8bd-e3aaa98068f1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Meier';

-- seltsamen reisen marco  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Willi', name_display = 'Willi Meinck', last_updated_at = now()
  WHERE id = '3dae9d7f-9010-486b-94ce-20dd4b033468' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Meinck';

-- geheimnisse natur  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Helga', name_display = 'Helga Menzel-Tettenborn', last_updated_at = now()
  WHERE id = '04b3b2bb-41ce-4e75-aad9-ae083291b269' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Menzel-Tettenborn';

-- nachtzug  [OpenLibrary-Titel, 1 Treffer, Alt: Pascal Mercier]
UPDATE public.authors SET first_name = 'Pascal', name_display = 'Pascal Mercier', last_updated_at = now()
  WHERE id = 'f9099c74-6bcd-46da-8d2d-8fe25be0a47d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mercier';

-- milgram  [OpenLibrary-Titel, 1 Treffer, Alt: Stanley Milgram]
UPDATE public.authors SET first_name = 'James W.', name_display = 'James W. Milgram', last_updated_at = now()
  WHERE id = '2511731a-0be3-435a-afee-fb33f2a2f646' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Milgram';

-- pathless  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Paul', name_display = 'Paul Millerd', last_updated_at = now()
  WHERE id = 'ea36da85-9303-4404-9248-d040cedd3932' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Millerd';

-- bagdad | zwillingsschwestern  [OpenLibrary-Titel, 3 Treffer, Alt: Judith Michael]
UPDATE public.authors SET first_name = 'Sami', name_display = 'Sami Michael', last_updated_at = now()
  WHERE id = 'cf2eb210-9ef0-4f1a-8742-69ae21969cf8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Michael';

-- schwestern halbmond  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Naila', name_display = 'Naila Minai', last_updated_at = now()
  WHERE id = 'c508341b-8ae2-4152-b27d-eebccc973ffc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Minai';

-- fatima  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Fatima', name_display = 'Fatima Mirembe', last_updated_at = now()
  WHERE id = '3cfbe5fa-8ea5-448a-b49a-c9a3a69840e2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mirembe';

-- langobarden  [OpenLibrary-Titel, 1 Treffer, Alt: Jürgen Misch]
UPDATE public.authors SET first_name = 'Jürgen', name_display = 'Jürgen Misch', last_updated_at = now()
  WHERE id = '7bab38ae-17ab-4515-808c-366b1531db44' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Misch';

-- ozean  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jacquelyn', name_display = 'Jacquelyn Mitchard', last_updated_at = now()
  WHERE id = '21c5d3cf-a33c-4002-83ab-560f144c7260' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mitchard';

-- sand  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Stefan', name_display = 'Stefan Murr', last_updated_at = now()
  WHERE id = '9ba382d5-53c4-4f59-956d-c56f213d68c4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Murr';

-- verschenkte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Bernard', name_display = 'Bernard Moitessier', last_updated_at = now()
  WHERE id = '3a090a89-5d14-4cc3-a0ac-0e52e7f5a115' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Moitessier';

-- al-qaida  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Omar', name_display = 'Omar Nasiri', last_updated_at = now()
  WHERE id = '19dfb4bd-967c-4d0d-8e00-2d127ed1bec6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nasiri';

-- denkst  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kati', name_display = 'Kati Naumann', last_updated_at = now()
  WHERE id = '9ee65290-9e34-4c33-a244-e0b64ea03921' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Naumann';

-- unternehmer  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Matthias', name_display = 'Matthias Nawrat', last_updated_at = now()
  WHERE id = '35eef877-5387-4616-9275-11391123e2b3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nawrat';

-- armen mittelalter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Michel', name_display = 'Michel Mollat', last_updated_at = now()
  WHERE id = '0b746087-93a4-4f28-b69d-82ec7809eacc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mollat';

-- kallmann  [OpenLibrary-Titel, 1 Treffer, Alt: Håkan Nesser]
UPDATE public.authors SET first_name = 'Hakan', name_display = 'Hakan Nesser', last_updated_at = now()
  WHERE id = '6e003b5a-54c5-4f5b-93bb-af320365de51' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nesser';

-- quorum  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kim', name_display = 'Kim Newman', last_updated_at = now()
  WHERE id = '3f95c116-45f6-4bf5-b68e-787d240b1aad' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Newman';

-- ausgesetzt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'James W.', name_display = 'James W. Nichol', last_updated_at = now()
  WHERE id = '082b14d9-6a88-4566-9d8a-fb61307dfdb0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nichol';

-- indien  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Louise', name_display = 'Louise Nicholson', last_updated_at = now()
  WHERE id = '8e2a1afc-2fd2-49d2-a109-fac05d4b83da' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nicholson';

-- Das grosse Bilderlexikon der Pflanzen  [OpenLibrary-Titel, 1 Treffer, Alt: František A Novak]
UPDATE public.authors SET first_name = 'Frantisěk A.', name_display = 'Frantisěk A. Novak', last_updated_at = now()
  WHERE id = 'bf664d0f-0d9f-4ea0-9cfe-f8a3639b6ffb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Novak';

-- intelligentes | nuhr sendung  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Dieter', name_display = 'Dieter Nuhr', last_updated_at = now()
  WHERE id = 'd24b4dd1-9383-4059-b657-7b67a17ce580' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nuhr';

-- vinland saga  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Josef', name_display = 'Josef Nyary', last_updated_at = now()
  WHERE id = '3df2248f-005e-4781-a21c-a1018b46d3c0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Nyary';

-- Florida  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Manfred', name_display = 'Manfred Obst', last_updated_at = now()
  WHERE id = '082e209b-3562-43e5-85bd-e9a30b5bb030' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Obst';

-- enkop  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Catherine', name_display = 'Catherine Oddie', last_updated_at = now()
  WHERE id = '902c43b8-8902-4f9b-ab5b-2149d1b435d1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Oddie';

-- sibirische  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Siegfried', name_display = 'Siegfried Oelsner', last_updated_at = now()
  WHERE id = '2e9cdb35-4fbf-49ef-8a9d-f85e914834a0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Oelsner';

-- island  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Auður Ava', name_display = 'Auður Ava Olafsdottir', last_updated_at = now()
  WHERE id = '81995390-33c1-4ce1-aaf5-3d4880912246' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Olafsdottir';

-- tarnkappe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Markus', name_display = 'Markus Orths', last_updated_at = now()
  WHERE id = '3d16c42c-96b0-4cec-a99e-4b94bbefa597' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Orths';

-- roemische  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Theodor', name_display = 'Theodor Mommsen', last_updated_at = now()
  WHERE id = '84386c74-d1ec-40a4-9bb7-fa5466e20140' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mommsen';

-- 40 kriminalfaelle | zweite chance  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Nicola', name_display = 'Nicola Owen', last_updated_at = now()
  WHERE id = 'b07966a7-3c48-44bc-9277-36bd6b8b1ae8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Owen';

-- abwicklung | leopardin  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Joy', name_display = 'Joy Packer', last_updated_at = now()
  WHERE id = '95d04f7a-bf75-4c9c-8ea6-5f61df5439c0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Packer';

-- gelben krokodile | mann vater  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Katherine', name_display = 'Katherine Pancol', last_updated_at = now()
  WHERE id = '54b17f86-5d8b-4c71-872f-1449c32a9bd9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pancol';

-- majestic  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sam', name_display = 'Sam Parangi', last_updated_at = now()
  WHERE id = 'c408427f-e98a-4622-a0ec-7e8fa5a15a4b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Parangi';

-- stilettoholic  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Karolin', name_display = 'Karolin Park', last_updated_at = now()
  WHERE id = 'db9850e6-de2f-4278-a92f-b9696d02fdca' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Park';

-- gefangene  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Fatéma', name_display = 'Fatéma Oufkir', last_updated_at = now()
  WHERE id = '120b0361-ea9b-465b-8824-eba8490b85b5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Oufkir';

-- aufstand  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Volker', name_display = 'Volker Perthes', last_updated_at = now()
  WHERE id = '83d9f4b9-c950-4da8-942e-c36091979d4a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Perthes';

-- Der Everest. Zum Greifen nah. ( Ab 12 J.).  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Mark', name_display = 'Mark Pfetzer', last_updated_at = now()
  WHERE id = 'e4cb4a9c-7c37-4a3a-8ec0-2f0489031fe9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pfetzer';

-- hindukusch  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Pfrommer', last_updated_at = now()
  WHERE id = '5f4b4bc8-77da-41a5-97f8-260c435746f2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pfrommer';

-- Mond über den Reisfeldern. Auf den Spuren meiner Familie durch Vietnam  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Andrew X.', name_display = 'Andrew X. Pham', last_updated_at = now()
  WHERE id = '28bfe94d-b8e9-4a6e-9613-46a8de84ab98' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pham';

-- segelns  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Yves-Louis', name_display = 'Yves-Louis Pinaud', last_updated_at = now()
  WHERE id = '2589a3af-e7d2-42ad-809a-e25ca97cc7e7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pinaud';

-- finanzgeschichte geschrieben | suedengland  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Reinfried', name_display = 'Reinfried Pohl', last_updated_at = now()
  WHERE id = '2a909342-45e2-4eee-95fa-44ce11070aa1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pohl';

-- birne  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Edo', name_display = 'Edo Popovic', last_updated_at = now()
  WHERE id = 'aa2a146e-0125-4afa-b7dd-d1e14ee7110b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Popovic';

-- klang zeit | zeit  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rhea', name_display = 'Rhea Powers', last_updated_at = now()
  WHERE id = '255f7524-cf2a-4010-a7fc-765c2ca0732c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Powers';

-- titanic  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Prechtl', last_updated_at = now()
  WHERE id = 'a4aae285-1974-4125-8016-afe41e9f7f30' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Prechtl';

-- bitterschokolade  [OpenLibrary-Titel, 1 Treffer, Alt: Miriam Pressler]
UPDATE public.authors SET first_name = 'Mirjam', name_display = 'Mirjam Pressler', last_updated_at = now()
  WHERE id = '89e6ac1d-7d03-48d5-bf24-6f973ac1580c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pressler';

-- cash | feind  [OpenLibrary-Titel, 2 Treffer, Alt: Daniel N. Price]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard Price', last_updated_at = now()
  WHERE id = 'd255fb05-09a4-4e95-8e71-0bd15211b8e7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Price';

-- mars venus  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Alexander', name_display = 'Alexander Pronay', last_updated_at = now()
  WHERE id = '14238aa1-50ab-48e8-b743-5ef2135de6be' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pronay';

-- pharao  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Bolesław', name_display = 'Bolesław Prus', last_updated_at = now()
  WHERE id = '21639104-3009-4bcb-ad72-f387e4eb436b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Prus';

-- europ | inka | u.  [OpenLibrary-Titel, 4 Treffer, Alt: Birgit Peters | Daniel Peters | Ulrike Peters]
UPDATE public.authors SET first_name = 'Edward', name_display = 'Edward Peters', last_updated_at = now()
  WHERE id = 'a5f3c5d8-f4ad-49ad-93fb-e0f33136ca22' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Peters';

-- nachhilfestunde  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Andrew', name_display = 'Andrew Pyper', last_updated_at = now()
  WHERE id = '477da230-a77d-4943-905a-0fd27afe390c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pyper';

-- kelten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Steve', name_display = 'Steve Rabey', last_updated_at = now()
  WHERE id = 'ba5ee71f-75b7-483f-bc73-7e5261bf69da' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rabey';

-- studenten tscheka tod  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Alja', name_display = 'Alja Rachmanowa', last_updated_at = now()
  WHERE id = '844f3430-1079-47ec-b16f-01765fb5cc20' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rachmanowa';

-- geheimakte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Edward', name_display = 'Edward Radsinski', last_updated_at = now()
  WHERE id = '287ec84a-33aa-4106-8825-379fc6ee3eaa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Radsinski';

-- rom  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Matthias', name_display = 'Matthias Raidt', last_updated_at = now()
  WHERE id = '67501a52-5b61-4cd9-a273-7698abeabb2b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Raidt';

-- flicks  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Ramge', last_updated_at = now()
  WHERE id = 'a7986744-b594-41ec-b60b-3cc71d374c63' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ramge';

-- matjora  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Valentin Grigorʹevich', name_display = 'Valentin Grigorʹevich Rasputin', last_updated_at = now()
  WHERE id = '22a4d87e-6633-49a1-a03f-4fcc4b3e29f7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rasputin';

-- down under  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Micha', name_display = 'Micha Rau', last_updated_at = now()
  WHERE id = 'e07da04a-5c26-4f3c-8637-a0174cda9bee' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rau';

-- usa  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Gerhard', name_display = 'Gerhard Rauchwetter', last_updated_at = now()
  WHERE id = '7c49fb7a-71e8-45cc-a437-cdad63ebf6ea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rauchwetter';

-- seidenbaronin  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Martina', name_display = 'Martina Rauen', last_updated_at = now()
  WHERE id = '679b6e6e-a92c-4d25-b73b-ecc1f8ede9bd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rauen';

-- vietnam  [OpenLibrary-Titel, 1 Treffer, Alt: Hemen Ray | Nick Ray]
UPDATE public.authors SET first_name = 'Sibnarayan', name_display = 'Sibnarayan Ray', last_updated_at = now()
  WHERE id = '83ced91c-c644-4e0b-b3d5-6d26dde32314' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ray';

-- roissy  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Pauline', name_display = 'Pauline Reage', last_updated_at = now()
  WHERE id = '74e3ce66-0c11-41d2-adc9-b54b73f1cd3c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reage';

-- kennedy  [OpenLibrary-Titel, 3 Treffer, Alt: Thomas C. Reeves | Thomas Reeves]
UPDATE public.authors SET first_name = 'Richard', name_display = 'Richard Reeves', last_updated_at = now()
  WHERE id = 'b8357a16-9cc7-43f2-a8c2-8fe8b6716923' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reeves';

-- asphaltspringer  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rusalka', name_display = 'Rusalka Reh', last_updated_at = now()
  WHERE id = 'c1c7c2d4-3edd-4d0c-a3a2-fd9b7c103f17' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reh';

-- glanz jahrhunderts  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'William S.', name_display = 'William S. Schlamm', last_updated_at = now()
  WHERE id = '101828cd-d9c4-41b1-bc0e-67bfb46f6880' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schlamm';

-- leben pharaonen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Pierre', name_display = 'Pierre Montet', last_updated_at = now()
  WHERE id = '7151570c-77ed-4095-834a-607e37a4a534' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Montet';

-- wir brauchen nicht  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Dieter', name_display = 'Dieter Moor', last_updated_at = now()
  WHERE id = 'c436eb2a-12ac-4243-bc6c-68af925bedd8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Moor';

-- hitchhikers  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kenneth', name_display = 'Kenneth Reitz', last_updated_at = now()
  WHERE id = 'ea0c991b-d94e-432f-aaa1-1489297d6565' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Reitz';

-- orchideenhaus  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Lucinda', name_display = 'Lucinda Riley', last_updated_at = now()
  WHERE id = 'b89be062-dc68-4609-8f67-94375b9c1df3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Riley';

-- musst leben verstehen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rainer Maria', name_display = 'Rainer Maria Rilke', last_updated_at = now()
  WHERE id = '62d0ea31-1b3c-4bc4-a98e-d5cfb2bf2a03' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rilke';

-- oeffne lausche | tibetische  [OpenLibrary-Titel, 3 Treffer, Alt: Drukpa Rinpoche]
UPDATE public.authors SET first_name = 'Sogyal', name_display = 'Sogyal Rinpoche', last_updated_at = now()
  WHERE id = '8bb28197-3c3a-4c7a-a03a-3267fa238ab2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rinpoche';

-- bibliothekarin  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Pamela', name_display = 'Pamela Rochford', last_updated_at = now()
  WHERE id = 'a51c45ce-4797-4975-a498-5fc7b7cc5220' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rochford';

-- streiche  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Alexander Roda', name_display = 'Alexander Roda Roda', last_updated_at = now()
  WHERE id = 'b4a95ce1-0f22-4235-8a2a-3c9e21c9d27f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Roda';

-- aysche  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kathe', name_display = 'Kathe Von Roeder-Gnadeberg', namenszusatz = 'Von', last_updated_at = now()
  WHERE id = '3257cb88-5571-4b81-9151-f6136fe5771d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Roeder-Gnadeberg';

-- beste  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Roesler', last_updated_at = now()
  WHERE id = 'b7f67918-cddb-4d73-9536-9dad17011d85' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Roesler';

-- hoax  [OpenLibrary-Titel, 2 Treffer, Alt: Jami Rogers]
UPDATE public.authors SET first_name = 'Sherry A.', name_display = 'Sherry A. Rogers', last_updated_at = now()
  WHERE id = 'b299c352-c952-4a23-9ff7-e083c12cac0d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rogers';

-- strauss  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Godel', name_display = 'Godel Rosenberg', last_updated_at = now()
  WHERE id = '05c2ae4c-fab7-4aa3-9b2e-50f2bbbfacd8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rosenberg';

-- tochter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Roskelley', last_updated_at = now()
  WHERE id = '7be7408c-fd06-46a7-853e-4081d27606fe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Roskelley';

-- companion | venus  [OpenLibrary-Titel, 3 Treffer, Alt: Ekkehart Rotter]
UPDATE public.authors SET first_name = 'Wilfred', name_display = 'Wilfred Rotter', last_updated_at = now()
  WHERE id = '60d98161-41e1-4983-a829-58f74df24c1d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rotter';

-- arm  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert Chester', name_display = 'Robert Chester Ruark', last_updated_at = now()
  WHERE id = '39002f60-0d4c-42c1-8649-570d61268b21' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ruark';

-- familie  [OpenLibrary-Titel, 3 Treffer, Alt: Steffi K. Rubin | Isadore Rubin | Barry Rubin]
UPDATE public.authors SET first_name = 'Roger Harvey', name_display = 'Roger Harvey Rubin', last_updated_at = now()
  WHERE id = 'a59971a6-5b82-4276-8a65-137defb7cef5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Rubin';

-- tal dorf  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kathrin', name_display = 'Kathrin Ruegg', last_updated_at = now()
  WHERE id = '08d134a6-d145-4b90-919d-778f9c1dd0ec' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ruegg';

-- bitterer | go-spielerin  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Lee Yuk', name_display = 'Lee Yuk Sa', last_updated_at = now()
  WHERE id = '0b024108-e83e-4660-af36-f10ad10acdba' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sa';

-- pandablues  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Britta', name_display = 'Britta Sabbag', last_updated_at = now()
  WHERE id = 'b241e1f1-40c8-4a01-80e5-d3f2db8811fa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sabbag';

-- beauty america | flamme | traumfaenger  [OpenLibrary-Titel, 1 Treffer, Alt: Marlo Morgan]
UPDATE public.authors SET first_name = 'James', name_display = 'James Morgan', last_updated_at = now()
  WHERE id = '884730b9-bc9e-4273-b1b0-9f9d0fe0fd7a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Morgan';

-- sinnenfreude  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Gerti', name_display = 'Gerti Senger', last_updated_at = now()
  WHERE id = 'b5663632-6c9c-4b5d-97f4-433c8e392c89' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Senger';

-- tricky  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Dave', name_display = 'Dave Barry', last_updated_at = now()
  WHERE id = '0c907a55-31c1-42c1-85ba-097f66625b68' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Barry';

-- drachen mekong  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Winfried', name_display = 'Winfried Scharlau', last_updated_at = now()
  WHERE id = '8887b475-be43-4257-98e4-d73bcd93ce4d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scharlau';

-- verliebte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Tobias', name_display = 'Tobias Scheidacker', last_updated_at = now()
  WHERE id = '6bd578d8-a234-4453-b57a-ee54e9f1e21d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Scheidacker';

-- 80000  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Bobby', name_display = 'Bobby Schenk', last_updated_at = now()
  WHERE id = '7e145f5b-9c6a-48f4-9eb8-0f5b5d48f648' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schenk';

-- afrikanische  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Werner', name_display = 'Werner Schmalenbach', last_updated_at = now()
  WHERE id = '99372288-14db-4e2d-9229-0a9a58352d37' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmalenbach';

-- aus  [OpenLibrary-Titel, 1 Treffer, Alt: Hans-Georg Schmeling]
UPDATE public.authors SET first_name = 'Claus Wedig', name_display = 'Claus Wedig von Schmeling', namenszusatz = 'von', last_updated_at = now()
  WHERE id = '034c502f-1b41-40a9-a650-172a3da29f9f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schmeling';

-- afrika first  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Martin', name_display = 'Martin Schoeller', last_updated_at = now()
  WHERE id = '21a9e069-5dd4-4bed-ace5-9ab636ab9459' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schoeller';

-- letzte tochter versailles  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Eva', name_display = 'Eva Stachniak', last_updated_at = now()
  WHERE id = 'bab7b2af-00ae-4930-be8c-467b6af20fa7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stachniak';

-- fehler | grenzbereich  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Matthias', name_display = 'Matthias Schranner', last_updated_at = now()
  WHERE id = 'aff4eaee-2a2c-43ab-8931-05de9705964a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schranner';

-- geräderte  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Schuh-Tschan', last_updated_at = now()
  WHERE id = '6658dbe5-1ab8-4336-80d5-c24ce49db7ed' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schuh-Tschan';

-- recht  [OpenLibrary-Titel, 2 Treffer, Alt: Arnold C. Schuler | Heinrich Schuler | Berit Schul]
UPDATE public.authors SET first_name = 'Thomas', name_display = 'Thomas Schuler', last_updated_at = now()
  WHERE id = '12ab2a78-850f-4277-946f-650550d16b88' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schuler';

-- california  [OpenLibrary-Titel, 5 Treffer, Alt: David Schulte-Peevers]
UPDATE public.authors SET first_name = 'Andrea', name_display = 'Andrea Schulte-Peevers', last_updated_at = now()
  WHERE id = '26fb74a5-fa90-4e12-bd25-bdd31ccdd6dc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schulte-Peevers';

-- python | schreibkunst  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Otto', name_display = 'Otto Schumann', last_updated_at = now()
  WHERE id = '655241af-5e7a-4646-95d3-038501860dfc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Schumann';

-- day | war  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Whitley', name_display = 'Whitley Strieber', last_updated_at = now()
  WHERE id = 'c22b8309-82f0-4673-b986-aeee4bc4f43c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Strieber';

-- aufgehenden  [OpenLibrary-Titel, 2 Treffer, Alt: Peggy Seagrave]
UPDATE public.authors SET first_name = 'Sterling', name_display = 'Sterling Seagrave', last_updated_at = now()
  WHERE id = '525868a8-7c39-467b-8703-6780993de8e2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Seagrave';

-- weiteren aussichten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Seethaler', last_updated_at = now()
  WHERE id = 'c64c9c3a-b3c3-42d8-aff2-452d42aa34df' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Seethaler';

-- verbrannte | verse  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kamila', name_display = 'Kamila Shamsie', last_updated_at = now()
  WHERE id = '22a8e491-7f09-4507-8883-4afb215e1c9e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Shamsie';

-- psychologe  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Noam', name_display = 'Noam Shpancer', last_updated_at = now()
  WHERE id = 'b8581f8d-110c-4042-9e81-62871c936198' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Shpancer';

-- nachbar china  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Frank', name_display = 'Frank Sieren', last_updated_at = now()
  WHERE id = 'dfbc3a44-0e91-42ce-a7f3-5c1fb5e11fcc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sieren';

-- abgrund  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Yrsa', name_display = 'Yrsa Sigurdardottir', last_updated_at = now()
  WHERE id = 'ac6cb68a-ccd3-4185-b8c8-b19b1a816ecd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sigurdardottir';

-- chikara  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Skimin', last_updated_at = now()
  WHERE id = 'cbe89e92-2c7a-4a54-a114-b31004b63839' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Skimin';

-- roter staub  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Gillian', name_display = 'Gillian Slovo', last_updated_at = now()
  WHERE id = '05b1d64d-da42-4d05-8dac-2f1d07f149b0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Slovo';

-- prospect  [OpenLibrary-Titel, 2 Treffer, Alt: Louis B. Sohn]
UPDATE public.authors SET first_name = 'Amy', name_display = 'Amy Sohn', last_updated_at = now()
  WHERE id = '8069ebaa-62c0-46f5-8b9e-bd2cf7db077d' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sohn';

-- Die besten elf reiter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Helmut', name_display = 'Helmut Sohre', last_updated_at = now()
  WHERE id = '5077426b-44a7-413e-9652-7f4e8ecdc92b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Sohre';

-- stress  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Barbara', name_display = 'Barbara Spachtholz', last_updated_at = now()
  WHERE id = 'c0ce1938-7b35-42f8-be3c-bd2a8892c6a0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Spachtholz';

-- heimweh  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Tim', name_display = 'Tim Staffel', last_updated_at = now()
  WHERE id = 'f30d7c5d-068d-47d9-9c1d-a55379d42176' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Staffel';

-- callas  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Nadia', name_display = 'Nadia Stancioff', last_updated_at = now()
  WHERE id = '987eb801-6d0a-48cc-a74e-48326d8cefa0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stancioff';

-- mama ich  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rudolph', name_display = 'Rudolph Moshammer', last_updated_at = now()
  WHERE id = '84a8f8dd-cdd0-456a-8a04-1c9e04803a8e' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Moshammer';

-- erkauftes  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Otto', name_display = 'Otto Steiger', last_updated_at = now()
  WHERE id = '0c36055f-cbfa-4166-aca9-9bf84486fdfc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Steiger';

-- schaf  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Christiane', name_display = 'Christiane Stenger', last_updated_at = now()
  WHERE id = '850066ed-310b-4343-9766-a4b93460ada4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stenger';

-- rush  [OpenLibrary-Titel, 1 Treffer, Alt: S. C. Stephens | S.C. Stephens]
UPDATE public.authors SET first_name = 'Cortez DeLeon', name_display = 'Cortez DeLeon Stephens', last_updated_at = now()
  WHERE id = '58c8b6e0-d626-426f-b2f5-2e775c6a92b4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stephens';

-- schatten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jessica', name_display = 'Jessica Stirling', last_updated_at = now()
  WHERE id = '954aa545-0289-47cb-b7d6-f112a9734cc5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stirling';

-- dracula  [OpenLibrary-Titel, 12 Treffer, Alt: Bram Bram Stoker | BRAM Stoker | Paper Mill Press ]
UPDATE public.authors SET first_name = 'Bram', name_display = 'Bram Stoker', last_updated_at = now()
  WHERE id = 'a38f660c-72c1-47b6-929d-2841108025ea' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stoker';

-- untenrum  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Margarete', name_display = 'Margarete Stokowski', last_updated_at = now()
  WHERE id = 'c1bd26e8-2640-422f-950b-087d5cc28cde' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Stokowski';

-- schmetterlingskaestchen | stalin hof zaren | zauberlied  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Santa', name_display = 'Santa Montefiore', last_updated_at = now()
  WHERE id = 'ef87fb96-5c75-4a17-be12-924a0da23b55' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Montefiore';

-- feuer  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'William', name_display = 'William Styron', last_updated_at = now()
  WHERE id = '0d333142-b453-4a06-820c-a5f6cdf3d40c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Styron';

-- kultur  [OpenLibrary-Titel, 2 Treffer, Alt: Daisetsu Teitaro Suzuki]
UPDATE public.authors SET first_name = 'Kazuyo', name_display = 'Kazuyo Suzuki', last_updated_at = now()
  WHERE id = '8bdea772-682a-4aa0-9f1f-a38dbe14d2d1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Suzuki';

-- river  [OpenLibrary-Titel, 1 Treffer, Alt: John Swain | Jon Swain]
UPDATE public.authors SET first_name = 'Caroline P.', name_display = 'Caroline P. Swain', last_updated_at = now()
  WHERE id = '4c5e8dac-3558-4838-8113-6185c2c3bdd2' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Swain';

-- pferd chile  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rosie', name_display = 'Rosie Swale', last_updated_at = now()
  WHERE id = '854bfae9-1271-4d4f-ba42-7c2939066acf' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Swale';

-- antoinette  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Antal', name_display = 'Antal Szerb', last_updated_at = now()
  WHERE id = '0106758c-7224-42d5-abe3-a70e5fdc9826' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Szerb';

-- hanis | sonnenjungfrau  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Bruno', name_display = 'Bruno Tacconi', last_updated_at = now()
  WHERE id = 'f28042a1-ae84-4229-98d4-d2eb578c3826' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tacconi';

-- erotic drinks  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Marcus', name_display = 'Marcus Taeschner', last_updated_at = now()
  WHERE id = '0b3fc5d0-b5b1-4f94-8b65-117bf3314bb4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Taeschner';

-- schwan  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Nassim Nicholas', name_display = 'Nassim Nicholas Taleb', last_updated_at = now()
  WHERE id = 'e1a2f218-3fe9-40ab-80c2-8dcadd77b890' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Taleb';

-- umgang tieren  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Linda', name_display = 'Linda Tellington-Jones', last_updated_at = now()
  WHERE id = '6376f31d-dd60-46ab-94a9-a7a3b0f975cd' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tellington-Jones';

-- zwillingsbruder  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hans', name_display = 'Hans Tesch', last_updated_at = now()
  WHERE id = '9405e27a-d3b6-4de5-9f91-a07fd70f3171' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tesch';

-- jahrhundertmann | woelfen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'James', name_display = 'James Thayer', last_updated_at = now()
  WHERE id = '11a68d40-3704-480a-9066-5147af8747c1' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thayer';

-- Die Opiumfamilie.  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Su', name_display = 'Su Tong', last_updated_at = now()
  WHERE id = '71afc24d-ec93-49d9-98da-a0f8a2eecdaa' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tong';

-- traumstrassen abendlandes  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Günter', name_display = 'Günter Treffer', last_updated_at = now()
  WHERE id = 'a95a87d5-ec40-4104-a4b9-49f2d5785e1f' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Treffer';

-- kriemhild  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Sabina', name_display = 'Sabina Trooger', last_updated_at = now()
  WHERE id = 'b8d95c66-24d7-4e25-9d31-b11a27aef7c7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Trooger';

-- fast perfektes leben  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Jonathan', name_display = 'Jonathan Tropper', last_updated_at = now()
  WHERE id = '8009673a-1fdd-45ae-85df-335149201ed4' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tropper';

-- pforte himmelreich  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Una', name_display = 'Una Troy', last_updated_at = now()
  WHERE id = '539c63d1-a200-43b9-8e9f-0a154cb5a1ce' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Troy';

-- katharina  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Henri', name_display = 'Henri Troyat', last_updated_at = now()
  WHERE id = '17562e36-d8cc-416d-a5bb-0b94742fa9c9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Troyat';

-- krieg | reisen leary  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Joe', name_display = 'Joe Tyler', last_updated_at = now()
  WHERE id = '1664207a-699a-4e03-a719-5e4268478735' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tyler';

-- kardinal  [OpenLibrary-Titel, 1 Treffer, Alt: Henry Morton Robinson]
UPDATE public.authors SET first_name = 'Henry', name_display = 'Henry Morton Robinson', last_updated_at = now()
  WHERE id = '7445f2f7-8e00-4b6e-a181-b47bc63926a3' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Morton Robinson';

-- kippa  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Levi Israel', name_display = 'Levi Israel Ufferfilge', last_updated_at = now()
  WHERE id = '3806311a-6c26-48cb-9730-5e1e10e3653c' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ufferfilge';

-- landarzt  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Rolf', name_display = 'Rolf Ulrici', last_updated_at = now()
  WHERE id = '0e5882da-2b43-418d-b2b9-badb5e6d14ed' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Ulrici';

-- museen  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'John', name_display = 'John Updike', last_updated_at = now()
  WHERE id = '02e4100d-0c92-4f4f-ad89-53dc424e6cd5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Updike';

-- Wie alles begann und wer dabei umkam  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Simon', name_display = 'Simon Urban', last_updated_at = now()
  WHERE id = 'f09659f4-cd0c-4a8c-b9f5-8acc720a77e6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Urban';

-- indian  [OpenLibrary-Titel, 2 Treffer, Alt: Vishwanath Prasad Varma | Lal Bahadur Varma | V. P]
UPDATE public.authors SET first_name = 'Pavan K.', name_display = 'Pavan K. Varma', last_updated_at = now()
  WHERE id = '05573b9c-f4c1-4f1e-9385-60f43c817266' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Varma';

-- happiness  [OpenLibrary-Titel, 3 Treffer, Alt: James Munro]
UPDATE public.authors SET first_name = 'Alice', name_display = 'Alice Munro', last_updated_at = now()
  WHERE id = '1e6f2c73-5c33-4bf3-8562-0d7ed3e1c0cc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Munro';

-- Einführung  [OpenLibrary-Titel, 1 Treffer, Alt: Ernst F. Mueller]
UPDATE public.authors SET first_name = 'Alexander', name_display = 'Alexander Mueller', last_updated_at = now()
  WHERE id = '2c37576c-2660-404e-a98e-53f26e7513eb' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Mueller';

-- eroberung | himmels  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hugh', name_display = 'Hugh Thomas', last_updated_at = now()
  WHERE id = 'a68b7776-9794-4c59-9496-8a0d2c53bd63' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Thomas';

-- perestroika  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hjalte', name_display = 'Hjalte Tin', last_updated_at = now()
  WHERE id = '29a117fd-9253-47ba-ba5e-966eaf625545' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Tin';

-- aischa | schwerter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Kamran', name_display = 'Kamran Pasha', last_updated_at = now()
  WHERE id = '89b1da94-22a8-4c3e-a80b-0cb79e005f38' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Pasha';

-- Das Leben Andreas Hofers und der Tiroler Freiheitskanpf 1809  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Karl', name_display = 'Karl Paulin', last_updated_at = now()
  WHERE id = 'ad1d25ba-dcdc-4791-8401-c5c52026870b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Paulin';

-- meine marke  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Hermann H.', name_display = 'Hermann H. Wala', last_updated_at = now()
  WHERE id = 'd04a9553-ed40-4fb0-a7c1-d4d1ce81a2e9' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wala';

-- tal geysire | traumdeutung  [OpenLibrary-Titel, 1 Treffer, Alt: Peter Walden]
UPDATE public.authors SET first_name = 'Laura', name_display = 'Laura Walden', last_updated_at = now()
  WHERE id = '72975893-fbc4-4eb6-8935-f4cffc35867b' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Walden';

-- gezeiten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Michael', name_display = 'Michael Wallner', last_updated_at = now()
  WHERE id = '7cc7013e-3a16-4b87-875d-612909f1d7d0' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wallner';

-- erfolgreich  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Richard A.', name_display = 'Richard A. Wandl', last_updated_at = now()
  WHERE id = 'f0532e9e-4f5d-4ea9-8637-cf2b321750fe' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wandl';

-- kochtopf  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Helmut', name_display = 'Helmut Wandmaker', last_updated_at = now()
  WHERE id = 'a5a06335-2f8f-435e-8f01-f90dca527d17' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wandmaker';

-- grossartig  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Wallace D.', name_display = 'Wallace D. Wattles', last_updated_at = now()
  WHERE id = 'e340033f-47f5-4164-aef2-f7df1852a6bc' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wattles';

-- venedig lagune  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Birgit', name_display = 'Birgit Weichmann', last_updated_at = now()
  WHERE id = '624bf971-eb61-4c6b-85f1-a6fdcd4c5052' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Weichmann';

-- hebamme  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Tanja', name_display = 'Tanja Wekwerth', last_updated_at = now()
  WHERE id = '838fd6ab-1432-4515-932f-8a619ca62be8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wekwerth';

-- yoga  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Ian', name_display = 'Ian Whitelaw', last_updated_at = now()
  WHERE id = '4f48abdc-24cf-4dcc-83e3-8aa012bae881' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Whitelaw';

-- bagdad  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Robert', name_display = 'Robert Wiener', last_updated_at = now()
  WHERE id = '7b882e40-e09a-4af3-851b-80e47f62b089' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wiener';

-- dunkle  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Carlos', name_display = 'Carlos Wiggen', last_updated_at = now()
  WHERE id = 'fd9b729e-5034-4fc5-baff-0d1ce99852c8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wiggen';

-- Die Gestrandeten  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Calder', name_display = 'Calder Willingham', last_updated_at = now()
  WHERE id = '51f0bab6-2b53-4d44-9f89-eeeb9b1ae826' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Willingham';

-- grosse los  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Meike', name_display = 'Meike Winnemuth', last_updated_at = now()
  WHERE id = 'eca2e8df-6296-4841-8973-dfb09792d7e7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winnemuth';

-- kulturgeschichte europas  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Fritz', name_display = 'Fritz Winzer', last_updated_at = now()
  WHERE id = 'a1f54ff4-4a05-45dc-952c-faa1d04ffc07' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Winzer';

-- revolution autoindustrie  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'James P.', name_display = 'James P. Womack', last_updated_at = now()
  WHERE id = 'c5a32df8-2c75-4297-bba1-1254e1f9f798' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Womack';

-- australien  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Ernst', name_display = 'Ernst Wrba', last_updated_at = now()
  WHERE id = '85fd5163-3ff1-45d6-8912-250a44b982c6' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wrba';

-- auge fatima  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Franziska', name_display = 'Franziska Wulf', last_updated_at = now()
  WHERE id = 'fed03b19-f738-4111-a821-d64eacdc3d04' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wulf';

-- iacocca  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Peter', name_display = 'Peter Wyden', last_updated_at = now()
  WHERE id = '8e552279-be6a-4d99-a207-9a5dbe022ea7' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Wyden';

-- tochter  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Meihong', name_display = 'Meihong Xu', last_updated_at = now()
  WHERE id = '92d78714-ab40-46d0-be89-8a5e67cd4bc5' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Xu';

-- kauai  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Luci', name_display = 'Luci Yamamoto', last_updated_at = now()
  WHERE id = '1dceb62b-089e-4ea1-944a-df8b76d8f915' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yamamoto';

-- kaiser china  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Pu', name_display = 'Pu Yi', last_updated_at = now()
  WHERE id = '87e167d9-bb0f-4126-8dda-af9dd756f65a' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Yi';

-- tanz  [OpenLibrary-Titel, 1 Treffer]
UPDATE public.authors SET first_name = 'Nancy', name_display = 'Nancy Zaroulis', last_updated_at = now()
  WHERE id = 'e166bb1b-5ac9-4ac2-ad17-41823d9d8ba8' AND NULLIF(btrim(first_name), '') IS NULL AND last_name = 'Zaroulis';

COMMIT;

-- Kontrolle danach:
-- SELECT count(*) FROM public.authors WHERE NULLIF(btrim(first_name),'') IS NULL;
