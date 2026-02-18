import { API_BASE } from "./config";

async function apiFetch(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function fetchMerchCatalog() {
  return apiFetch("/api/merch/catalog");
}

export function createVorkasseOrder(payload) {
  return apiFetch("/api/merch/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchOrder(orderId) {
  return apiFetch(`/api/merch/orders/${encodeURIComponent(orderId)}`);
}
