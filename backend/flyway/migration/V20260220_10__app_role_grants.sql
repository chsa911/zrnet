-- Allow app to connect + use schema
GRANT CONNECT ON DATABASE rxlog TO rxlog_app;
GRANT USAGE ON SCHEMA public TO rxlog_app;

-- Start from a clean slate
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM rxlog_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM rxlog_app;

-- READ access (adjust if you want tighter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rxlog_app;

-- WRITE access ONLY where canonical
GRANT INSERT, UPDATE ON public.authors TO rxlog_app;
GRANT INSERT, UPDATE ON public.publishers TO rxlog_app;
GRANT INSERT, UPDATE ON public.themes TO rxlog_app;

-- Books: allow INSERT; allow UPDATE only on book-owned columns + FK refs
GRANT INSERT ON public.books TO rxlog_app;

GRANT UPDATE (
  author_id, publisher_id,
  year_first_published, width, height, pages,
  reading_status, reading_status_updated_at,
  top_book, top_book_set_at,
  title_keyword, title_keyword_position,
  title_keyword2, title_keyword2_position,
  title_keyword3, title_keyword3_position,
  isbn13, isbn10, isbn13_raw,
  title_display, title_lang_hint, title_en,
  is_fiction, genre, sub_genre, themes, format, language,
  publish_date, publish_date_precision,
  first_publish_date, first_publish_date_precision,
  original_language,
  action_continent, action_country, action_state, action_city,
  action_place_fictional, action_time_period, action_time_year,
  action_time_period_display,
  home_featured_slot,
  comment,
  has_spiegel_bestseller_badge, spiegel_bestseller_badge_note, spiegel_bestseller_badge_set_at
) ON public.books TO rxlog_app;

-- Join tables that are "about the book"
GRANT INSERT, DELETE, UPDATE ON public.book_authors TO rxlog_app;
GRANT INSERT, DELETE, UPDATE ON public.book_barcodes TO rxlog_app;
GRANT INSERT, DELETE, UPDATE ON public.barcode_assignments TO rxlog_app;

-- If app inserts into tables with sequences, grant sequence usage as needed:
-- GRANT USAGE, SELECT ON SEQUENCE public.genres_id_seq TO rxlog_app;