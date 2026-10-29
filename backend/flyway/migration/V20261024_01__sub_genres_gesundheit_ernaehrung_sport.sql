BEGIN;

-- Neue Non-Fiction-Subgenres: Gesundheit, Ernährung, Sport.
-- Genre wird vom bestehenden Subgenre "Sachbuch" (abbr S) übernommen,
-- damit keine feste genre_id im Skript steht.
-- Mehrfach ausführbar (legt nur an, was noch fehlt).

INSERT INTO public.sub_genres (name, abbr, genre_id)
SELECT v.name, v.abbr, s.genre_id
FROM (VALUES
  ('Gesundheit', 'G'),
  ('Ernährung',  'ER'),
  ('Sport',      'SP')
) AS v(name, abbr)
CROSS JOIN (SELECT genre_id FROM public.sub_genres WHERE abbr = 'S' LIMIT 1) s
WHERE NOT EXISTS (
  SELECT 1 FROM public.sub_genres x WHERE lower(x.abbr) = lower(v.abbr)
);

COMMIT;
