export const COVER_BASE = "/uploads/covers/normalized";

export function coverUrl(book) {
  const id = book?.book_id || book?.id;

  const existing =
    book?.cover_home ||
    book?.cover_full ||
    book?.cover_url ||
    book?.cover;

  if (existing) return String(existing);

  return id ? `${COVER_BASE}/${id}.jpg` : "";
}