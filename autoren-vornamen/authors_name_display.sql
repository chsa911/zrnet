-- =====================================================================
-- authors: Vornamen in first_name und name_display konsistent halten
-- Reihenfolge: 1 prüfen -> 2 korrigieren -> 3 absichern
-- Zuerst in einem Neon-Branch ausführen!
-- =====================================================================

-- 1) PRÜFEN: Autoren, deren first_name nicht in name_display steht
--    oder bei denen name_display mehr enthält als die Namensteile
SELECT id, title, first_name, namenszusatz, name_particle, last_name, name_display,
       concat_ws(' ', NULLIF(btrim(title),''), NULLIF(btrim(first_name),''), NULLIF(btrim(namenszusatz),''),
                 NULLIF(btrim(name_particle),''), NULLIF(btrim(last_name),'')) AS erwartet
FROM public.authors
WHERE name_display IS DISTINCT FROM concat_ws(' ', NULLIF(btrim(title),''), NULLIF(btrim(first_name),''),
        NULLIF(btrim(namenszusatz),''), NULLIF(btrim(name_particle),''), NULLIF(btrim(last_name),''))
  AND NOT (NULLIF(btrim(first_name),'') IS NULL AND name_display = last_name)  -- Vorname fehlt ganz: separates Thema
ORDER BY last_name;

-- 2) KORRIGIEREN: 47 eindeutige Fälle (Liste: name_display_abweichungen.csv)
--    Die WHERE-Bedingung auf name_display verhindert, dass zwischenzeitlich geänderte Zeilen überschrieben werden.
--    Die 37 Fälle mit "MANUELL" sind hier NICHT enthalten.
BEGIN;
UPDATE public.authors SET first_name = 'Felix', last_name = 'Cube', name_display = 'Felix von Cube', last_updated_at = now()
  WHERE id = '8514e3bd-108c-4906-8a16-01f054e06bd9' AND name_display = 'von Cube';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Geza', last_name = 'Cziffra', name_display = 'Geza von Cziffra', last_updated_at = now()
  WHERE id = '0692974d-9300-4074-bf47-ab30803cec10' AND name_display = 'von Cziffra';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Erich', last_name = 'Daeniken', name_display = 'Erich von Daeniken', last_updated_at = now()
  WHERE id = '07442786-ea07-48ec-9610-0bc6e30539fd' AND name_display = 'von Daeniken';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Annette', last_name = 'Droste-Huelshoff', name_display = 'Annette von Droste-Huelshoff', last_updated_at = now()
  WHERE id = 'c7b2c63d-953b-4887-91a1-525f2176d77c' AND name_display = 'von Droste-Huelshoff';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Marie', last_name = 'Ebner Eschenbach', name_display = 'Marie von Ebner Eschenbach', last_updated_at = now()
  WHERE id = 'd02ca51c-33ab-49c6-9710-12d6dc464b43' AND name_display = 'von Ebner Eschenbach';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Joseph', last_name = 'Eichendorff', name_display = 'Joseph von Eichendorff', last_updated_at = now()
  WHERE id = 'e20e7923-0f01-4c58-83a1-a57c18024a14' AND name_display = 'von Eichendorff';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Joseph', last_name = 'Eichendorff', name_display = 'Joseph von Eichendorff', last_updated_at = now()
  WHERE id = '5c73a861-3047-423e-ac1c-895566b49140' AND name_display = 'von Eichendorff';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Evan', last_name = 'Green', name_display = 'Evan Green', last_updated_at = now()
  WHERE id = '6d8f51f7-3e15-45d0-a902-61912cbfa083' AND name_display = 'Green';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'David', last_name = 'Guterson', name_display = 'David Guterson', last_updated_at = now()
  WHERE id = 'e6de00b4-8519-4b80-bc55-d752fa962c7a' AND name_display = 'Guterson';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Eckart', last_name = 'Hirschhausen', name_display = 'Eckart von Hirschhausen', last_updated_at = now()
  WHERE id = '18bc351f-1e8d-4de3-a8e1-7a474552ca7d' AND name_display = 'von Hirschhausen';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Heinrich', last_name = 'Kleist', name_display = 'Heinrich von Kleist', last_updated_at = now()
  WHERE id = '155dfc38-db05-4fe3-a8d9-927dfa89a68d' AND name_display = 'von Kleist';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Ildikó', last_name = 'Kuerthy', name_display = 'Ildikó von Kuerthy', last_updated_at = now()
  WHERE id = 'df1d36e9-422b-4cb7-9b63-e43d93ab0c3d' AND name_display = 'von Kuerthy';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Nils', last_name = 'Minkmar', name_display = 'Nils Minkmar', last_updated_at = now()
  WHERE id = '6c287b62-9d43-4af6-9fb7-732cfdb29533' AND name_display = 'Minkmar';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Arturo', last_name = 'Perez-Reverte', name_display = 'Arturo Perez-Reverte', last_updated_at = now()
  WHERE id = '0a45b347-fd12-46de-881b-6692145ec4bb' AND name_display = 'Perez-Reverte';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Fritz-Dietlof', last_name = 'Schulenburg', name_display = 'Fritz-Dietlof von der Schulenburg', last_updated_at = now()
  WHERE id = 'fc986ae4-0063-42fe-a832-ad934277203b' AND name_display = 'von der Schulenburg';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Heinz', last_name = 'Sielmann', name_display = 'Heinz Sielmann', last_updated_at = now()
  WHERE id = 'c01641cf-1c9b-4a87-a135-204af9d24127' AND name_display = 'Sielmann';  -- Vorname fehlt in name_display
UPDATE public.authors SET first_name = 'Institut Européen d''Archéologie Sous-Marine', last_name = '(Paris)', name_display = 'Institut Européen d''Archéologie Sous-Marine (Paris)', last_updated_at = now()
  WHERE id = 'bb126a22-24ca-48ef-8e94-c8b312b1ea2c' AND name_display = 'Institut Européen d''Archéologie Sous-Marine (Paris)';  -- gross/klein
UPDATE public.authors SET first_name = 'Philippe Pozzo die', last_name = 'Borgo', name_display = 'Philippe Pozzo die Borgo', last_updated_at = now()
  WHERE id = 'fe80439d-66e9-4de2-8d4f-b01f5e1d9041' AND name_display = 'Philippe Pozzo die Borgo';  -- gross/klein
UPDATE public.authors SET first_name = 'International Group of', last_name = 'Controlling', name_display = 'International Group of Controlling', last_updated_at = now()
  WHERE id = '244186f9-2cde-4fa0-b7ea-4a0352e95551' AND name_display = 'International Group of Controlling';  -- gross/klein
UPDATE public.authors SET first_name = 'Melissa De la', last_name = 'Cruz', name_display = 'Melissa De la Cruz', last_updated_at = now()
  WHERE id = '2768ec44-2b1f-4508-80ce-b7cc46e4106f' AND name_display = 'Melissa De la Cruz';  -- gross/klein
UPDATE public.authors SET first_name = 'Don', last_name = 'DeLillo', name_display = 'Don DeLillo', last_updated_at = now()
  WHERE id = '9537150b-0d3f-4f2d-b71f-7e44db5a9da7' AND name_display = 'Don DeLillo';  -- gross/klein
UPDATE public.authors SET first_name = 'Nelson', last_name = 'DeMille', name_display = 'Nelson DeMille', last_updated_at = now()
  WHERE id = 'cf27d6d2-31ab-4bbf-a5ef-10d5292ac720' AND name_display = 'Nelson DeMille';  -- gross/klein
UPDATE public.authors SET first_name = 'David MacNeil', last_name = 'Doren', name_display = 'David MacNeil Doren', last_updated_at = now()
  WHERE id = '7c41429a-dd59-4b91-aa7c-4a2f6a08a07c' AND name_display = 'David MacNeil Doren';  -- gross/klein
UPDATE public.authors SET first_name = 'Andrea-Uve di', last_name = 'Fabriciaco', name_display = 'Andrea-Uve di Fabriciaco', last_updated_at = now()
  WHERE id = 'da9f70c8-85bf-45fe-9522-8068966df9cb' AND name_display = 'Andrea-Uve di Fabriciaco';  -- gross/klein
UPDATE public.authors SET first_name = 'Dr. med Bob', last_name = 'Flaws', name_display = 'Dr. med Bob Flaws', last_updated_at = now()
  WHERE id = 'ac3372dd-2e55-4630-bad6-d65e638d6141' AND name_display = 'Dr. med Bob Flaws';  -- gross/klein
UPDATE public.authors SET first_name = 'Jane van Lawick', last_name = 'Goodall', name_display = 'Jane van Lawick Goodall', last_updated_at = now()
  WHERE id = '4065ef8a-16a8-4a00-9fac-22237506c95e' AND name_display = 'Jane van Lawick Goodall';  -- gross/klein
UPDATE public.authors SET first_name = 'Dr. med. Klaus', last_name = 'Grygat', name_display = 'Dr. med. Klaus Grygat', last_updated_at = now()
  WHERE id = 'ee62ff2c-be08-4109-8c54-8236c59856a2' AND name_display = 'Dr. med. Klaus Grygat';  -- gross/klein
UPDATE public.authors SET first_name = 'Magnus', last_name = 'MacFarlane-Barrow', name_display = 'Magnus MacFarlane-Barrow', last_updated_at = now()
  WHERE id = '71e6815f-6679-4465-9057-d3514ef6cc12' AND name_display = 'Magnus MacFarlane-Barrow';  -- gross/klein
UPDATE public.authors SET first_name = 'Molly', last_name = 'McAdams', name_display = 'Molly McAdams', last_updated_at = now()
  WHERE id = 'c352c3a6-3e29-4921-9b70-3f300229bfcd' AND name_display = 'Molly McAdams';  -- gross/klein
UPDATE public.authors SET first_name = 'Carolyn', last_name = 'McCarthy', name_display = 'Carolyn McCarthy', last_updated_at = now()
  WHERE id = '082bf81c-d2e3-4571-9358-2c686f5eaa40' AND name_display = 'Carolyn McCarthy';  -- gross/klein
UPDATE public.authors SET first_name = 'Evelyn B.', last_name = 'McCune', name_display = 'Evelyn B. McCune', last_updated_at = now()
  WHERE id = 'c47eb02b-5245-4d0e-876f-a5c2a2e93589' AND name_display = 'Evelyn B. McCune';  -- gross/klein
UPDATE public.authors SET first_name = 'Freida', last_name = 'McFadden', name_display = 'Freida McFadden', last_updated_at = now()
  WHERE id = 'cd0b6c66-ad5c-48c1-beab-b127a6b9264c' AND name_display = 'Freida McFadden';  -- gross/klein
UPDATE public.authors SET first_name = 'Alister', last_name = 'McGrath', name_display = 'Alister McGrath', last_updated_at = now()
  WHERE id = 'fef825a2-caff-4303-b8b9-81e7d2fa8284' AND name_display = 'Alister McGrath';  -- gross/klein
UPDATE public.authors SET first_name = 'Funny van', last_name = 'Money', name_display = 'Funny van Money', last_updated_at = now()
  WHERE id = 'ad3818db-89c9-41f5-9309-bf2f919836d7' AND name_display = 'Funny van Money';  -- gross/klein
UPDATE public.authors SET first_name = 'Margriet de', last_name = 'Moor', name_display = 'Margriet de Moor', last_updated_at = now()
  WHERE id = '9499c8ec-62b6-4f34-9df8-d29c8785a52d' AND name_display = 'Margriet de Moor';  -- gross/klein
UPDATE public.authors SET first_name = 'Pierre la', last_name = 'Mure', name_display = 'Pierre la Mure', last_updated_at = now()
  WHERE id = 'e9328ed7-7e32-4b13-a16d-ad0521a8ec39' AND name_display = 'Pierre la Mure';  -- gross/klein
UPDATE public.authors SET first_name = 'Mazo de la', last_name = 'Roche', name_display = 'Mazo de la Roche', last_updated_at = now()
  WHERE id = '2dda9871-db9b-4b6d-b808-ab8d168f0003' AND name_display = 'Mazo de la Roche';  -- gross/klein
UPDATE public.authors SET first_name = 'Antje', last_name = 'Schaeffer-Kühnemann', name_display = 'Antje Schaeffer-Kühnemann', last_updated_at = now()
  WHERE id = '50975c11-537f-417d-a3a9-5e9dabe4d497' AND name_display = 'Antje Schaeffer-Kühnemann';  -- gross/klein
UPDATE public.authors SET first_name = 'Thassilo von', last_name = 'Scheffer', name_display = 'Thassilo von Scheffer', last_updated_at = now()
  WHERE id = 'f82af5bc-429f-43ca-9124-91a98e87afe0' AND name_display = 'Thassilo von Scheffer';  -- gross/klein
UPDATE public.authors SET first_name = 'Ildefonso Falcones de', last_name = 'Sierra', name_display = 'Ildefonso Falcones de Sierra', last_updated_at = now()
  WHERE id = 'b32ec316-1774-4614-a399-bf24c0b5edc7' AND name_display = 'Ildefonso Falcones de Sierra';  -- gross/klein
UPDATE public.authors SET first_name = 'Kurt de', last_name = 'Swaaf', name_display = 'Kurt de Swaaf', last_updated_at = now()
  WHERE id = 'ce5f6b7b-dc2c-4d5b-8b2b-4a8ea56fa025' AND name_display = 'Kurt de Swaaf';  -- gross/klein
UPDATE public.authors SET first_name = 'Josef Schmitz van', last_name = 'Vorst', name_display = 'Josef Schmitz van Vorst', last_updated_at = now()
  WHERE id = 'e3497546-adee-4750-8163-d49580c52305' AND name_display = 'Josef Schmitz van Vorst';  -- gross/klein
UPDATE public.authors SET first_name = 'Janwillem Van de', last_name = 'Wetering', name_display = 'Janwillem Van de Wetering', last_updated_at = now()
  WHERE id = '7b634765-c2d2-4203-80f8-91509daa3615' AND name_display = 'Janwillem Van de Wetering';  -- gross/klein
UPDATE public.authors SET first_name = 'Raǧāʾ ʿAbdallāh aṣ-', last_name = 'Ṣāniʿ', name_display = 'Raǧāʾ ʿAbdallāh aṣ- Ṣāniʿ', last_updated_at = now()
  WHERE id = '8f98b8ef-f1ab-4c45-9201-73dc2aa877b5' AND name_display = 'Raǧāʾ ʿAbdallāh aṣ- Ṣāniʿ';  -- gross/klein
UPDATE public.authors SET first_name = 'Gabriele', last_name = 'Beyerlein', name_display = 'Gabriele Beyerlein', last_updated_at = now()
  WHERE id = '0a0310d6-7774-4d83-83ab-fccd845d702b' AND name_display = 'Gabriele Beyerlein.';  -- leerzeichen/punkt
UPDATE public.authors SET first_name = 'Bomann', last_name = 'Corina', name_display = 'Bomann Corina', last_updated_at = now()
  WHERE id = 'f849e8a7-edcb-4f82-b961-dbf7e28d5d6c' AND name_display = 'Bomann  Corina';  -- leerzeichen/punkt
UPDATE public.authors SET first_name = 'Thorsten', last_name = 'Wiese', name_display = 'Thorsten Wiese', last_updated_at = now()
  WHERE id = 'cbe794d6-f596-4ab2-ac7a-b758c5de3bfa' AND name_display = 'Thorsten  Wiese';  -- leerzeichen/punkt
-- Erwartet: 47 Zeilen geändert. Prüfen, dann COMMIT (oder ROLLBACK).
COMMIT;

-- 3) ABSICHERN
-- 3a) Leeres name_display automatisch aus den Namensteilen füllen
CREATE OR REPLACE FUNCTION public.authors_fill_name_display() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name_display IS NULL OR btrim(NEW.name_display) = '' THEN
    NEW.name_display := NULLIF(concat_ws(' ', NULLIF(btrim(NEW.title),''), NULLIF(btrim(NEW.first_name),''),
        NULLIF(btrim(NEW.namenszusatz),''), NULLIF(btrim(NEW.name_particle),''), NULLIF(btrim(NEW.last_name),'')), '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_authors_fill_name_display ON public.authors;
CREATE TRIGGER trg_authors_fill_name_display
  BEFORE INSERT OR UPDATE OF first_name, last_name, title, namenszusatz, name_particle, name_display
  ON public.authors FOR EACH ROW EXECUTE FUNCTION public.authors_fill_name_display();

-- 3b) Regel: ein vorhandener Vorname muss in name_display vorkommen (Groß/Klein egal)
--     NOT VALID = gilt sofort für neue/geänderte Zeilen, alte Zeilen werden noch nicht geprüft.
ALTER TABLE public.authors
  ADD CONSTRAINT authors_first_name_in_display_chk CHECK (
    first_name IS NULL OR btrim(first_name) = ''
    OR strpos(lower(coalesce(name_display,'')), lower(btrim(first_name))) > 0
  ) NOT VALID;

-- Wenn auch die manuellen Fälle erledigt sind (Abfrage 1 liefert nichts Relevantes mehr):
-- ALTER TABLE public.authors VALIDATE CONSTRAINT authors_first_name_in_display_chk;
