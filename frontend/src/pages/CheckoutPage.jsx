import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css";
import { useI18n } from "../context/I18nContext";
import { readCart, updateQty, clearCart, cartCount } from "../store/cart";
import { createVorkasseOrder, fetchMerchCatalog } from "../api/merch";

function centsToMoney(cents, currency = "EUR") {
  const v = (Number(cents || 0) / 100).toFixed(2);
  return currency === "EUR" ? `${v.replace(".", ",")} €` : `${v} ${currency}`;
}

export default function CheckoutPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [cart, setCart] = useState(() => readCart());
  const [catalog, setCatalog] = useState({ items: [], currency: "EUR" });
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    region: "",
    country: "DE",
    note: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingCatalog(true);
        const data = await fetchMerchCatalog();
        if (!cancelled) {
          setCatalog({ items: data.items || [], currency: (data.items?.[0]?.currency || "EUR") });
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bySku = useMemo(() => {
    const m = new Map();
    for (const it of catalog.items || []) m.set(it.sku, it);
    return m;
  }, [catalog.items]);

  const cartLines = useMemo(() => {
    return (cart.items || []).map((it) => {
      const p = bySku.get(it.sku);
      const unit = p?.priceCents ?? 0;
      const line = unit * (it.qty || 0);
      return {
        sku: it.sku,
        qty: it.qty,
        name: p?.name || it.sku,
        unitPriceCents: unit,
        lineTotalCents: line,
      };
    });
  }, [cart.items, bySku]);

  const subtotalCents = useMemo(
    () => cartLines.reduce((s, l) => s + (l.lineTotalCents || 0), 0),
    [cartLines]
  );

  function onQtyChange(sku, qty) {
    const next = updateQty(sku, qty);
    setCart(next);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!cart.items?.length) {
      setError(t("checkout_empty"));
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        items: cart.items,
        customer: {
          name: form.name,
          email: form.email,
        },
        shipping: {
          name: form.name,
          address1: form.address1,
          address2: form.address2,
          postalCode: form.postalCode,
          city: form.city,
          region: form.region,
          country: form.country,
        },
        note: form.note,
      };
      const created = await createVorkasseOrder(payload);
      clearCart();
      nav(`/order/${created.orderId}`, { replace: true });
    } catch (e2) {
      setError(e2?.data?.error || e2?.message || String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="zr-section checkout">
      <h1>{t("checkout_title")}</h1>
      <p className="zr-lede">{t("checkout_lede")}</p>

      <div className="checkout-grid">
        <div className="zr-card">
          <h2 className="checkout-h2">{t("checkout_cart_title")}</h2>

          {loadingCatalog ? (
            <p className="checkout-muted">{t("checkout_loading")}</p>
          ) : null}

          {!cart.items?.length ? (
            <p className="checkout-muted">{t("checkout_empty")}</p>
          ) : (
            <div className="checkout-lines">
              {cartLines.map((l) => (
                <div key={l.sku} className="checkout-line">
                  <div className="checkout-line-main">
                    <div className="checkout-line-title">{l.name}</div>
                    <div className="checkout-line-meta">
                      {centsToMoney(l.unitPriceCents, catalog.currency)}
                    </div>
                  </div>
                  <div className="checkout-line-qty">
                    <label className="checkout-label" htmlFor={`qty-${l.sku}`}>
                      {t("checkout_qty")}
                    </label>
                    <input
                      id={`qty-${l.sku}`}
                      type="number"
                      min={0}
                      max={99}
                      value={l.qty}
                      onChange={(ev) => onQtyChange(l.sku, ev.target.value)}
                    />
                  </div>
                  <div className="checkout-line-total">
                    {centsToMoney(l.lineTotalCents, catalog.currency)}
                  </div>
                </div>
              ))}

              <div className="checkout-summary">
                <div className="checkout-summary-row">
                  <span>{t("checkout_subtotal")}</span>
                  <span>{centsToMoney(subtotalCents, catalog.currency)}</span>
                </div>
                <div className="checkout-summary-hint">{t("checkout_shipping_hint")}</div>
              </div>
            </div>
          )}
        </div>

        <div className="zr-card">
          <h2 className="checkout-h2">{t("checkout_details_title")}</h2>

          <form onSubmit={onSubmit} className="checkout-form">
            <div className="checkout-row">
              <label className="checkout-label">
                {t("checkout_name")}
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="checkout-label">
                {t("checkout_email")}
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>

            <label className="checkout-label">
              {t("checkout_address1")}
              <input
                required
                value={form.address1}
                onChange={(e) => setForm({ ...form, address1: e.target.value })}
              />
            </label>
            <label className="checkout-label">
              {t("checkout_address2")}
              <input
                value={form.address2}
                onChange={(e) => setForm({ ...form, address2: e.target.value })}
              />
            </label>

            <div className="checkout-row">
              <label className="checkout-label">
                {t("checkout_postal")}
                <input
                  required
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                />
              </label>
              <label className="checkout-label">
                {t("checkout_city")}
                <input
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </label>
            </div>

            <div className="checkout-row">
              <label className="checkout-label">
                {t("checkout_region")}
                <input
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder={t("checkout_region_placeholder")}
                />
              </label>
              <label className="checkout-label">
                {t("checkout_country")}
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                >
                  <option value="DE">Deutschland (DE)</option>
                  <option value="US">United States (US)</option>
                  <option value="AT">Österreich (AT)</option>
                  <option value="CH">Schweiz (CH)</option>
                  <option value="FR">France (FR)</option>
                  <option value="NL">Nederland (NL)</option>
                </select>
              </label>
            </div>

            <label className="checkout-label">
              {t("checkout_note")}
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>

            <div className="checkout-paybox">
              <div className="checkout-paybox-title">{t("checkout_payment_title")}</div>
              <div className="checkout-paybox-text">{t("checkout_payment_text")}</div>
            </div>

            {error ? <div className="checkout-error">{error}</div> : null}

            <button
              className="zr-button"
              type="submit"
              disabled={submitting || !cart.items?.length || cartCount(cart) === 0}
            >
              {submitting ? t("checkout_submitting") : t("checkout_place_order")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
