SELECT
  count(*) FILTER (WHERE page_num_pos IS NOT NULL)                         AS mit_position,
  count(*) FILTER (WHERE last_word IS NOT NULL)                            AS mit_wort,
  count(*) FILTER (WHERE last_word IS NOT NULL AND length(last_word) > 2)  AS ganzes_wort,
  count(*) FILTER (WHERE last_word IS NOT NULL AND length(last_word) <= 2) AS nur_2_buchstaben,
  count(*) FILTER (WHERE page_num_pos IS NOT NULL AND last_word IS NULL)   AS wort_fehlt,
  count(*) FILTER (WHERE phys_code IS NOT NULL)                            AS mit_nummer
FROM public.books;