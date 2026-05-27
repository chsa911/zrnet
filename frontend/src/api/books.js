export async function uploadBookCover(bookId, file, { signal } = {}) {
  if (!bookId) throw new Error("Missing book id");
  if (!file) throw new Error("Missing cover file");

  const formData = new FormData();
  formData.append("cover", file);

  return http(`/books/${encodeURIComponent(bookId)}/cover`, {
    method: "POST",
    body: formData,
    signal,
  });
}