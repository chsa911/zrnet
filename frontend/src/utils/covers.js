export const COVER_BASE = "/uploads/covers/normalized";

// Full display cover — prefers server-supplied URL (correct path for old + new covers)
export function coverUrl(book) {
  const id = book?.book_id || book?.id;
  const existing =
    book?.cover_url  ||
    book?.cover_full ||
    book?.cover_home ||
    book?.cover;
  if (existing) return String(existing);
  return id ? `${COVER_BASE}/${id}.jpg` : "";
}

// Home/thumbnail cover — smaller variant when available
export function coverHomeUrl(book) {
  const id = book?.book_id || book?.id;
  const existing = book?.cover_home || book?.cover_url || book?.cover_full || book?.cover;
  if (existing) return String(existing);
  return id ? `${COVER_BASE}/${id}-home.jpg` : "";
}