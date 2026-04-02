CREATE TABLE IF NOT EXISTS public.home_featured_periods (
  id bigserial PRIMARY KEY,
  slot text NOT NULL CHECK (slot IN ('topical', 'finished', 'received')),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  presented_from timestamptz NOT NULL DEFAULT now(),
  presented_to timestamptz NULL,
  source text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (presented_to IS NULL OR presented_to > presented_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_home_featured_periods_one_open_per_slot
ON public.home_featured_periods(slot)
WHERE presented_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_home_featured_periods_book_slot_time
ON public.home_featured_periods(book_id, slot, presented_from DESC);

CREATE OR REPLACE FUNCTION public.set_home_featured_slot(
  p_slot text,
  p_book_id uuid,
  p_source text DEFAULT 'auto'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_book_id uuid;
BEGIN
  IF p_slot NOT IN ('topical', 'finished', 'received') THEN
    RAISE EXCEPTION 'Unsupported home featured slot: %', p_slot;
  END IF;

  SELECT book_id
    INTO v_current_book_id
  FROM public.home_featured_periods
  WHERE slot = p_slot
    AND presented_to IS NULL
  FOR UPDATE;

  IF v_current_book_id IS NOT DISTINCT FROM p_book_id THEN
    RETURN;
  END IF;

  UPDATE public.home_featured_periods
  SET presented_to = now()
  WHERE slot = p_slot
    AND presented_to IS NULL;

  IF p_book_id IS NOT NULL THEN
    INSERT INTO public.home_featured_periods (
      slot,
      book_id,
      presented_from,
      source
    )
    VALUES (
      p_slot,
      p_book_id,
      now(),
      COALESCE(NULLIF(p_source, ''), 'auto')
    );
  END IF;
END;
$$;

CREATE OR REPLACE VIEW public.home_highlight_candidates AS
WITH topical_pick AS (
  SELECT
    'topical'::text AS slot,
    b.id AS book_id
  FROM public.books b
  WHERE b.home_featured_slot = 'topical'
  ORDER BY COALESCE(b.updated_at, b.added_at, b.registered_at, now()) DESC, b.id ASC
  LIMIT 1
),
finished_pick AS (
  SELECT
    'finished'::text AS slot,
    b.id AS book_id
  FROM public.books b
  LEFT JOIN public.cover_ok co ON co.id = b.id
  WHERE b.reading_status = 'finished'
    AND b.reading_status_updated_at IS NOT NULL
  ORDER BY
    CASE WHEN b.reading_status_updated_at >= now() - interval '30 days' THEN 0 ELSE 1 END,
    CASE WHEN co.id IS NOT NULL THEN 0 ELSE 1 END,
    CASE WHEN b.top_book THEN 0 ELSE 1 END,
    b.reading_status_updated_at DESC,
    COALESCE(b.top_book_set_at, b.added_at, b.registered_at) DESC,
    b.id ASC
  LIMIT 1
),
received_pick AS (
  SELECT
    'received'::text AS slot,
    b.id AS book_id
  FROM public.books b
  LEFT JOIN public.cover_ok co ON co.id = b.id
  WHERE COALESCE(b.received_at, b.added_at, b.registered_at) IS NOT NULL
  ORDER BY
    CASE WHEN COALESCE(b.received_at, b.added_at, b.registered_at) >= now() - interval '30 days' THEN 0 ELSE 1 END,
    CASE WHEN co.id IS NOT NULL THEN 0 ELSE 1 END,
    CASE WHEN COALESCE(b.has_spiegel_bestseller_badge, false) THEN 0 ELSE 1 END,
    COALESCE(b.received_at, b.added_at, b.registered_at) DESC,
    b.id ASC
  LIMIT 1
)
SELECT * FROM topical_pick
UNION ALL
SELECT * FROM finished_pick
UNION ALL
SELECT * FROM received_pick;

CREATE OR REPLACE FUNCTION public.refresh_home_featured_periods()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_topical_book_id uuid := NULL;
  v_finished_book_id uuid := NULL;
  v_received_book_id uuid := NULL;
BEGIN
  SELECT c.book_id INTO v_topical_book_id
  FROM public.home_highlight_candidates c
  WHERE c.slot = 'topical';

  SELECT c.book_id INTO v_finished_book_id
  FROM public.home_highlight_candidates c
  WHERE c.slot = 'finished';

  SELECT c.book_id INTO v_received_book_id
  FROM public.home_highlight_candidates c
  WHERE c.slot = 'received';

  PERFORM public.set_home_featured_slot('topical', v_topical_book_id, 'auto');
  PERFORM public.set_home_featured_slot('finished', v_finished_book_id, 'auto');
  PERFORM public.set_home_featured_slot('received', v_received_book_id, 'auto');
END;
$$;

CREATE OR REPLACE VIEW public.home_highlights_current AS
SELECT
  h.slot,
  b.id::text AS id,
  COALESCE(NULLIF(a.name_display, ''), NULLIF(b.author_display, ''), NULLIF(b.author, '')) AS author_name_display,
  COALESCE(NULLIF(b.main_title_display, ''), NULLIF(b.title_display, ''), NULLIF(b.title_keyword, '')) AS title_display,
  ('/media/covers/' || b.id::text || '.jpg') AS cover_home,
  ('/media/covers/' || b.id::text || '.jpg') AS cover_full,
  ('/media/covers/' || b.id::text || '.jpg') AS cover,
  b.purchase_url AS buy,
  h.presented_from AS featured_since,
  EXTRACT(EPOCH FROM (now() - h.presented_from))::bigint AS shown_for_seconds,
  FLOOR(EXTRACT(EPOCH FROM (now() - h.presented_from)) / 86400)::bigint AS shown_for_days
FROM public.home_featured_periods h
JOIN public.books b ON b.id = h.book_id
LEFT JOIN public.authors a ON a.id = b.author_id
WHERE h.presented_to IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.home_featured_periods TO rxlog_app;
GRANT USAGE, SELECT ON SEQUENCE public.home_featured_periods_id_seq TO rxlog_app;
GRANT SELECT ON public.home_highlight_candidates TO rxlog_app;
GRANT SELECT ON public.home_highlights_current TO rxlog_app;
GRANT EXECUTE ON FUNCTION public.set_home_featured_slot(text, uuid, text) TO rxlog_app;
GRANT EXECUTE ON FUNCTION public.refresh_home_featured_periods() TO rxlog_app;

SELECT public.refresh_home_featured_periods();
