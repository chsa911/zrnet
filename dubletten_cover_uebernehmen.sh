#!/usr/bin/env bash
# Cover der doppelten Lagereinträge auf das registrierte Buch übernehmen.
# Auf dem SERVER ausführen (kopiert nur, löscht nichts, überschreibt kein vorhandenes Cover):
#   ssh root@46.224.178.235 'bash -s' < dubletten_cover_uebernehmen.sh
# Danach erst buecher_lager_dubletten_entfernen.sql laufen lassen.
set -u
C="${COVERS_DIR:-/srv/zrnet/uploads/covers}"
[ -d "$C" ] || { echo "Cover-Ordner $C nicht gefunden"; exit 1; }
kopiert=0; vorhanden=0; ohne=0
has_cover(){ [ -f "$C/normalized/$1.jpg" ] || [ -f "$C/$1.jpg" ]; }
take(){ # $1=Lagereintrag $2=registriertes Buch $3=Titel
  if has_cover "$2"; then vorhanden=$((vorhanden+1)); return; fi
  for d in normalized .; do
    if [ -f "$C/$d/$1.jpg" ]; then
      [ -e "$C/$d/$2.jpg" ] || cp "$C/$d/$1.jpg" "$C/$d/$2.jpg"
      [ -f "$C/$d/$1-home.jpg" ] && [ ! -e "$C/$d/$2-home.jpg" ] && cp "$C/$d/$1-home.jpg" "$C/$d/$2-home.jpg"
      echo "Cover übernommen: $3"; kopiert=$((kopiert+1)); return
    fi
  done
  ohne=$((ohne+1))
}
take 054687b8-60b1-4a68-bfc0-0ffb51825447 8d081450-df04-4a38-bda5-364de25d34a8 "Emmas Weg in die Freiheit"
take 848feb15-4757-40c1-9184-44cc4ae4afcd 9db942df-6d37-4113-ac60-9a4d59f97894 "Die Früchte der Erde"
take 88d39603-2e7f-48ba-bde6-43a02c50675a a26de963-a9de-4bf5-a382-3208eeb63ad1 "Die Löwin Elsa und ihre Jungen"
take 9dad54e9-c9ec-4c89-be4a-b34617287c6c 2e30bd46-356a-4add-b6c7-21d571881c5c "Generation Allah"
take bc625c11-fc11-4d52-bb2a-c4cf1a0ee6c7 d11698e7-af9e-457e-b6f5-1e404d2012c4 "Freiheit"
take 4b1db0f6-67fd-487a-9399-2b017b4360b9 2b97d192-9a36-4295-9ab4-1e5c0640e2fc "Wann darf ich klatschen?"
take 58dd3e52-dab1-49b9-a16e-0ffa21daeadf 23366b0d-5ae4-4aa1-b518-525926b8b7eb "Die Kultur der Unhöflichkeit"
take 67a221c4-b6be-418d-a918-90df00c09c4f 0deaf85f-15fe-4822-8d86-188a8a5a1436 "Raubritter"
take f02a15e3-daf6-441d-9749-bd81d52ab920 440109bb-ef1c-4d47-9dc3-95716290f812 "Und brennend stürzen Vögel vom Himmel"
take 480fcea1-75e5-479b-b360-7b6d9a77357c b8da22d8-5cb1-4801-b06b-7a635cff2617 "Die Rose von Asturien"
take e9df1e3a-9428-48fa-9c11-c74f9bea509e 28acd268-fc18-4d7a-a35f-a2415ec95757 "Das Geheimnis der weißen Mönche."
take bb340759-83f4-4a60-ab72-46cf1ad681a5 9b631f8b-29f9-4bec-a269-0da3ac436d4b "Kinder heilen - ohne Chemie"
take 11a3b14d-00e7-4e56-8987-51c686f0feca 0fb7daa7-c83a-4111-bdb2-c88dcc3a9c81 "Die Siedler - Australien Saga 2"
take 5c695a29-3811-48b4-a66e-d01757025b06 ef8ea512-a8d0-4898-a944-e80479f8bffd "Schossgebete"
take 061e9589-4415-422a-8161-a88ee2f1e48c 4cf73e3b-56a8-4a30-b4e3-824dd7c83324 "Ich will doch leben!"
take cf3204e6-e25c-4aa0-9497-2bab8a117f2f 957fa08f-1a4d-43cc-b345-dd2478a4f12b "Segeln in der Arktis"
take 2c6054c0-2fee-4245-bccb-b224ee7dee0d d6284278-a64a-4a2a-9dd0-a9e035f67ebf "Kenia"
take c98cea92-8d5d-4678-a214-d5c14165f9e6 6ab1f0ef-7caa-4f83-a26a-b560759363b8 "Volksaufstand"
take a32a6e9d-8d8d-4e88-8d39-35a557e4723c 71b3c8b4-35f9-41cb-b237-44574c487cc0 "Sharpes Waterloo"
take 4a0df06e-9f64-47e4-bff8-3ad6c51e1819 b8020d40-7ade-418e-9520-01971d5848fb "Tango"
take a398be0a-71c8-495e-a0b2-bc6b9b3ed884 1a18cc02-163c-4023-8e82-05a3b58910cc "Ein Gebet für die Verdammten"
take b2682403-3095-46f5-a2f2-a31c522a40c0 a5d60917-a20e-443d-af4a-0d281a85d972 "Homöopathische Eselsbrücken"
take 1bddfdea-9590-4147-9c88-d52becd4be58 2f96e3b7-619b-4ddb-95d7-5047a0404311 "Flucht in die Sucht"
take 5eb99249-cf6a-4c9d-b8e6-5b3763fd74f5 b68f7ba8-93a5-4195-bcb9-32f9ddfc23ba ".. und baute ihr einen Tempel"
take a1cd673c-ac19-4ab1-876d-5d33170041b5 3a308088-5a35-4c21-a79a-21c42d6e1f91 "Der Sturm"
take 727ed247-3d3a-4b7e-be93-262cec9aa3d0 a8bc477a-59a8-4376-a300-95f47404ca05 "Christus kam nur bis Eboli"
take 50bf498b-b8a4-45a8-a049-944a7f773c0d 97f9ea05-61ed-4d7f-95f2-0c8a1f04e933 "Ein allzu braves Mädchen"
take 7ad093b9-890b-4329-bcba-d4faeb24b1de e10e4308-87d7-4c37-ade9-f4929c46176c "Coaching für die Seele"
take 438bb47e-7085-4ac8-a516-e383dd7d3da3 52de2bf2-00ad-479f-8cc8-2f097e1d71df "Endlich glücklich"
take d42d1450-779d-4934-a3c1-d0928bdafd42 e70ee058-2858-4b3a-bc2e-fdeed4edd0ff "The witch of Portobello"
take f514d43f-53bf-411b-a0aa-8200dbb1ba54 8c7c8ccd-f1a4-46f0-ae7d-65712aa04401 "Reise durch einen einsamen Kontinent"
take b975361e-6cf7-4875-94e3-c9a0351aaffa 1cade828-4dc8-4c13-891a-4f0137e18c57 "Ich hatte Angst"
take a69ece9c-dbf2-4648-ae6a-fe0c9454b51d 26dc4bb9-f051-4a24-8a54-937220bf7dde "Brigade der Verdammten"
take a7c3ec0a-5c74-49c7-9fcc-45e3af0a55e6 065d2990-60e1-4d4f-846e-25f7e5c82086 "Die Hexengabe"
take 1be21e11-05bc-49ed-a30d-15096145b639 b464af07-5f85-4ba1-a3f1-53d0e8098e54 "Die Au-pairs"
take a6fbfb04-6c7d-4a8f-bfd3-6a27b36039b4 97f7c8bc-df67-4e9b-8c65-833ac8906b35 "Bali fürs Handgepäck"
take a2c672e6-6879-4f85-bee7-f9f49c60e980 caf94715-77db-4e77-b379-44fd3fad7f78 "Palomino."
take 0fcb4fb7-f761-475b-9f70-818bb9e44d70 b9785f4f-3e96-4f5d-a953-471325f76aab "Der Preis des Glücks"
take 8985b757-7ecf-4c47-80d9-b2a404022b9e 19846cdb-d4b5-4036-bab5-79168476a474 "Ein Mann und sein Boot."
take 9904130e-2dcc-4f9a-8c3b-7cf165108a81 f775b950-dbfc-492f-ae75-42a9b8cce039 "Die Kathedrale des Meeres"
take 1b677a81-b087-4b12-b7f6-8ee86bb43283 3ec89112-14af-462e-83ab-d21cc7c37cfd "Verliebt, verlobt – verrückt?"
echo "Übernommen: $kopiert | registriertes Buch hatte schon ein Cover: $vorhanden | kein Cover beim Lagereintrag: $ohne"
