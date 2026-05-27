export const COVER_BASE = "/uploads/covers";

function normalize(url) {
  if (!url) return "";

  return String(url)
    .replace("/uploads/covers", "/uploads/covers/")
    .replace("/uploads/covers//", "/uploads/covers/");
}

export function coverUrl(book) {
  const id = book?.book_id || book?.id;

  const existing =
    book?.cover_home ||
    book?.cover_full ||
    book?.cover_url ||
    book?.cover;

  if (existing) return normalize(existing);

  return id ? `${COVER_BASE}/${id}.jpg` : "";
}