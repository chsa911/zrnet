BEGIN;

-- Keep title_display spelled identically across all copies of the same title
-- (same author + same title, ignoring upper/lower case and surrounding spaces),
-- independent of which code path writes to public.books.
--
-- 1. One-time cleanup: every group of spellings that differ only in case /
--    spacing gets one canonical spelling — a version with capital letters wins
--    over an all-lowercase one, then the most common version.
-- 2. Trigger, from now on:
--    - title_display is always trimmed;
--    - a NEW book (or a book whose title changes to a different title) adopts
--      the spelling already used by the other copies;
--    - re-spelling an existing title (only case/spacing changes, e.g.
--      "krieg der engel" -> "Krieg der Engel") is applied to all its copies.
-- updated_at is deliberately left untouched, so "Letzte Aktion" is unaffected.

CREATE INDEX IF NOT EXISTS idx_books_author_title_key
  ON public.books (author_id, lower(btrim(title_display)));

-- 1. cleanup ----------------------------------------------------------------
WITH variants AS (
  SELECT author_id,
         lower(btrim(title_display)) AS k,
         btrim(title_display)        AS v,
         count(*)                    AS n
  FROM public.books
  WHERE btrim(coalesce(title_display, '')) <> ''
  GROUP BY 1, 2, 3
),
canon AS (
  SELECT DISTINCT ON (author_id, k) author_id, k, v AS canonical
  FROM variants
  ORDER BY author_id, k, (v <> lower(v)) DESC, n DESC, v
)
UPDATE public.books b
SET title_display = c.canonical
FROM canon c
WHERE c.author_id IS NOT DISTINCT FROM b.author_id
  AND c.k = lower(btrim(b.title_display))
  AND b.title_display IS DISTINCT FROM c.canonical;

-- 2. trigger ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.books_title_display_consistent()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing text;
BEGIN
  -- updates issued by this trigger itself (propagation below): pass through
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  NEW.title_display := NULLIF(btrim(NEW.title_display), '');
  IF NEW.title_display IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.author_id IS NOT DISTINCT FROM NEW.author_id
     AND lower(btrim(OLD.title_display)) = lower(NEW.title_display)
  THEN
    -- same title, new spelling: deliberate re-spelling -> apply to all copies
    IF NEW.title_display IS DISTINCT FROM OLD.title_display THEN
      UPDATE public.books
      SET title_display = NEW.title_display
      WHERE author_id IS NOT DISTINCT FROM NEW.author_id
        AND lower(btrim(title_display)) = lower(NEW.title_display)
        AND id <> NEW.id
        AND title_display IS DISTINCT FROM NEW.title_display;
    END IF;
    RETURN NEW;
  END IF;

  -- new book / different title: adopt the spelling the other copies already use
  SELECT b.title_display INTO v_existing
  FROM public.books b
  WHERE b.author_id IS NOT DISTINCT FROM NEW.author_id
    AND lower(btrim(b.title_display)) = lower(NEW.title_display)
    AND b.id IS DISTINCT FROM NEW.id
  ORDER BY (b.title_display <> lower(b.title_display)) DESC, b.registered_at NULLS LAST
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    NEW.title_display := v_existing;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_books_title_display_consistent ON public.books;

CREATE TRIGGER trg_books_title_display_consistent
BEFORE INSERT OR UPDATE OF title_display, author_id
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.books_title_display_consistent();

COMMIT;
