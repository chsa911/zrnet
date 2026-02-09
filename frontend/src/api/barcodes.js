// frontend/src/api/barcodes.js  (REPLACE FILE CONTENT)
import { getApiRoot } from "./apiRoot";

export async function previewBarcode(width, height) {
  const qs = new URLSearchParams({ width: String(width), height: String(height) }).toString();
  const res = await fetch(`${getApiRoot()}/barcodes/preview-barcode?${qs}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return { candidate: data?.candidate ?? null, series: data?.series ?? null };
}