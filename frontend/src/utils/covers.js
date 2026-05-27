// frontend/src/utils/covers.js

export const COVER_BASE = "/media/covers";
export const FALLBACK_COVER = "/assets/fallback-cover.jpg";

export function coverUrl(book) {
  if (!book) return FALLBACK_COVER;

  // Keep existing API-provided cover if present
  if (book.cover_home) return book.cover_home;
  if (book.cover_full) return book.cover_full;
  if (book.cover) return book.cover;

  // New unified default
  if (book.id) return `${COVER_BASE}/${book.id}.jpg`;

  return FALLBACK_COVER;
}