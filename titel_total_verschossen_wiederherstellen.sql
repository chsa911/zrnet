-- =====================================================================
-- Titel von 92073fb2… wiederherstellen: "lkn004 verschlossen" -> wie das
-- zweite Exemplar "Total verschossen" (gleicher Autor, 319 Seiten)
--
-- DBeaver:
--   * oben von "Auto" auf "Manual Commit" umstellen
--   * ganzes Skript: Alt+X
--   * Probelauf (ROLLBACK am Ende). Letzter Tab zeigt vorher/nachher.
--   * Echt: ROLLBACK; -> COMMIT;
--
-- Übernommen werden nur die Titel-Felder des zweiten Exemplars.
-- Sicherung vorher in books_titel_backup_20261112.
-- Bricht ab, wenn das zweite Exemplar nicht eindeutig gefunden wird.
-- =====================================================================

BEGIN;

DO $$
DECLARE n int;
BEGIN
  IF now() = statement_timestamp() THEN
    RAISE EXCEPTION 'Abbruch: DBeaver steht auf Auto-Commit. Bitte auf "Manual Commit" umstellen.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.books
                 WHERE id = '92073fb2-2520-4de8-8390-67af1b6f140a'
                   AND title_display = 'lkn004 verschlossen') THEN
    RAISE EXCEPTION 'Abbruch: Titel ist nicht (mehr) "lkn004 verschlossen".';
  END IF;

  SELECT count(*) INTO n
  FROM public.books s, public.books x
  WHERE x.id = '92073fb2-2520-4de8-8390-67af1b6f140a'
    AND s.id <> x.id
    AND s.title_display = 'Total verschossen'
    AND s.author_id IS NOT DISTINCT FROM x.author_id
    AND s.pages = x.pages;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Abbruch: % passende Exemplare "Total verschossen" gefunden (erwartet 1).', n;
  END IF;
END $$;

CREATE TEMP TABLE quelle ON COMMIT DROP AS
SELECT s.*
FROM public.books s, public.books x
WHERE x.id = '92073fb2-2520-4de8-8390-67af1b6f140a'
  AND s.id <> x.id
  AND s.title_display = 'Total verschossen'
  AND s.author_id IS NOT DISTINCT FROM x.author_id
  AND s.pages = x.pages;

-- Sicherung
CREATE TABLE IF NOT EXISTS public.books_titel_backup_20261112 AS
  SELECT * FROM public.books WITH NO DATA;
INSERT INTO public.books_titel_backup_20261112
  SELECT * FROM public.books WHERE id = '92073fb2-2520-4de8-8390-67af1b6f140a';

-- Titel-Felder übernehmen
UPDATE public.books b SET
  title_display      = q.title_display,
  main_title_display = q.main_title_display,
  subtitle_display   = q.subtitle_display,
  title_keyword      = q.title_keyword,
  title_keyword2     = q.title_keyword2,
  title_keyword3     = q.title_keyword3
FROM quelle q
WHERE b.id = '92073fb2-2520-4de8-8390-67af1b6f140a';

-- vorher / nachher
SELECT 'vorher' AS stand, title_display, main_title_display, title_keyword
FROM public.books_titel_backup_20261112 WHERE id = '92073fb2-2520-4de8-8390-67af1b6f140a'
UNION ALL
SELECT 'nachher', title_display, main_title_display, title_keyword
FROM public.books WHERE id = '92073fb2-2520-4de8-8390-67af1b6f140a'
UNION ALL
SELECT 'zweites Exemplar', title_display, main_title_display, title_keyword
FROM quelle;

ROLLBACK;
