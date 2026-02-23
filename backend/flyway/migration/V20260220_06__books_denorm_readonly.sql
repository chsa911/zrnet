CREATE OR REPLACE FUNCTION public.block_manual_books_denorm_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Do not update public.books.% directly. Update the canonical table (authors/publishers) and/or set the *_id column instead.', TG_ARGV[0]
    USING ERRCODE = '22000';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='books' AND column_name='publisher'
  ) THEN
    DROP TRIGGER IF EXISTS trg_books_block_publisher_manual ON public.books;
    CREATE TRIGGER trg_books_block_publisher_manual
    BEFORE UPDATE OF publisher ON public.books
    FOR EACH ROW
    EXECUTE FUNCTION public.block_manual_books_denorm_update('publisher');
  END IF;

  -- Repeat this pattern for any other legacy/denorm columns you keep on books:
  -- author, author_display, author_firstname, male_female, author_nationality, place_of_birth, etc.
END $$;