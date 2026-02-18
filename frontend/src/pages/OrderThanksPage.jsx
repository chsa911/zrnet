import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./OrderThanksPage.css";
import { useI18n } from "../context/I18nContext";
import { fetchOrder } from "../api/merch";

function centsToMoney(cents, currency = "EUR") {
  const v = (Number(cents || 0) / 100).toFixed(2);
  return currency === "EUR" ? `${v.replace(".", ",")} €` : `${v} ${currency}`;
}

export default function OrderThanksPage() {
  const { t } = useI18n();
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const d = await fetchOrder(orderId);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const bank = useMemo(() => data?.payment?.bank || {}, [data]);

  return (
    <section className="zr-section orderthanks">
      <h1>{t("order_thanks_title")}</h1>
      <p className="zr-lede">{t("order_thanks_lede")}</p>

      {loading ? <p className="order-muted">{t("order_loading")}</p> : null}
      {error ? (
        <div className="zr-card order-card">
          <p className="order-error">{error}</p>
          <p>
            <Link to="/merch">{t("order_back_to_merch")}</Link>
          </p>
        </div>
      ) : null}

      {data ? (
        <div className="order-grid">
          <div className="zr-card order-card">
            <div className="order-kv">
              <div className="order-k">{t("order_id")}</div>
              <div className="order-v">{data.orderId}</div>
            </div>
            <div className="order-kv">
              <div className="order-k">{t("order_total")}</div>
              <div className="order-v order-v--big">
                {centsToMoney(data?.totals?.totalCents, data.currency)}
              </div>
            </div>

            <h2 className="order-h2">{t("order_items")}</h2>
            <ul className="order-list">
              {(data.items || []).map((it) => (
                <li key={it.sku}>
                  {it.qty}× {it.name} — {centsToMoney(it.lineTotalCents, data.currency)}
                </li>
              ))}
            </ul>

            <h2 className="order-h2">{t("order_next_steps")}</h2>
            <p className="order-text">{data?.payment?.instructions || t("order_instructions")}</p>
          </div>

          <aside className="zr-card order-card">
            <h2 className="order-h2">{t("order_bank_title")}</h2>

            <div className="order-bank">
              <div className="order-bank-row">
                <span>{t("order_bank_owner")}</span>
                <span>{bank.owner || "—"}</span>
              </div>
              <div className="order-bank-row">
                <span>IBAN</span>
                <span className="order-mono">{bank.iban || "—"}</span>
              </div>
              <div className="order-bank-row">
                <span>BIC</span>
                <span className="order-mono">{bank.bic || "—"}</span>
              </div>
              <div className="order-bank-row">
                <span>{t("order_bank_name")}</span>
                <span>{bank.bankName || "—"}</span>
              </div>
              <div className="order-bank-row order-bank-row--strong">
                <span>{t("order_reference")}</span>
                <span className="order-mono">{data?.payment?.reference || data.orderId}</span>
              </div>
            </div>

            <p className="order-muted">{t("order_bank_hint")}</p>

            <p>
              <Link to="/merch">{t("order_back_to_merch")}</Link>
            </p>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
