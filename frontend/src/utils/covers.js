    export const COVER_BASE = "/uploads/covers";

export function coverUrl(book) {
  const id = book?.book_id || book?.id;

  if (book?.cover_home) return book.cover_home;
  if (book?.cover_full) return book.cover_full;
  if (book?.cover_url) return book.cover_url;
  if (book?.cover) return book.cover;

  return id ? `${COVER_BASE}/${id}.jpg` : "";
}