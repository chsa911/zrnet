// src/store/cart.js
// Tiny cart helper for the merch MVP.

const KEY = "zr_merch_cart_v1";

export function readCart() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { items: [] };
    if (!Array.isArray(parsed.items)) return { items: [] };
    return { items: parsed.items.filter(Boolean) };
  } catch {
    return { items: [] };
  }
}

export function writeCart(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem(KEY);
}

export function addToCart(sku, qty = 1) {
  const q = Math.max(1, Math.min(99, Number(qty || 1)));
  const cart = readCart();
  const items = [...cart.items];
  const idx = items.findIndex((it) => it.sku === sku);
  if (idx >= 0) items[idx] = { ...items[idx], qty: Math.min(99, (items[idx].qty || 0) + q) };
  else items.push({ sku, qty: q });
  const next = { items };
  writeCart(next);
  return next;
}

export function updateQty(sku, qty) {
  const q = Math.max(0, Math.min(99, Number(qty || 0)));
  const cart = readCart();
  const items = cart.items
    .map((it) => (it.sku === sku ? { ...it, qty: q } : it))
    .filter((it) => (it.qty || 0) > 0);
  const next = { items };
  writeCart(next);
  return next;
}

export function cartCount(cart = readCart()) {
  return (cart.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
}
