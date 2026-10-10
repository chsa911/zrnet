-- Desktop-Buchformular setzt Genre/Subgenre beim Bearbeiten (PATCH /books/:id).
-- Die ursprünglichen Spalten-Grants (V20260220_10) enthalten genre_id/sub_genre_id nicht.
GRANT UPDATE (genre_id, sub_genre_id) ON public.books TO rxlog_app;
