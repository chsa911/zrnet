import React, { useEffect, useRef, useState } from "react";
import "./MerchPage.css";
import { useI18n } from "../context/I18nContext";

const SHOPIFY_BUYBUTTON_SRC =
  "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";

function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();

    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    s.id = id;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

export default function MerchPage() {
  const { t } = useI18n();
  const mountRef = useRef(null);
  const [state, setState] = useState({ status: "idle", message: "" });

  const domain = import.meta.env.VITE_SHOPIFY_DOMAIN;
  const storefrontAccessToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
  const productId = import.meta.env.VITE_SHOPIFY_PRODUCT_ID;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // If you haven't configured Shopify yet, show the page but skip the embed.
      if (!domain || !storefrontAccessToken || !productId) {
        setState({ status: "missing", message: "" });
        return;
      }

      try {
        setState({ status: "loading", message: "" });
        await loadScriptOnce(SHOPIFY_BUYBUTTON_SRC, "zr-shopify-buybutton");

        if (cancelled) return;
        const ShopifyBuy = window.ShopifyBuy;
        if (!ShopifyBuy) throw new Error("ShopifyBuy not available after script load");

        // Clear any previous mount (e.g., if React remounts)
        if (mountRef.current) mountRef.current.innerHTML = "";

        const client = ShopifyBuy.buildClient({
          domain,
          storefrontAccessToken,
        });

        // UI layer comes from buy-button-storefront bundle
        await ShopifyBuy.UI.onReady(client).then((ui) => {
          if (!mountRef.current) return;

          ui.createComponent("product", {
            id: String(productId),
            node: mountRef.current,
            moneyFormat: "€{{amount_with_comma_separator}}",
            options: {
              product: {
                buttonDestination: "checkout",
                contents: {
                  img: false,
                  title: false,
                  price: true,
                },
                text: {
                  button: t("merch_buy_now"),
                },
              },
              cart: {
                startOpen: false,
                text: {
                  title: t("merch_cart"),
                  total: t("merch_total"),
                  button: t("merch_checkout"),
                },
              },
              toggle: {
                text: {
                  title: t("merch_cart"),
                },
              },
            },
          });
        });

        if (!cancelled) setState({ status: "ready", message: "" });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          message: e?.message || String(e),
        });
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [domain, storefrontAccessToken, productId, t]);

  return (
    <section className="zr-section merch">
      <h1>{t("merch_title")}</h1>
      <p className="zr-lede">{t("merch_lede")}</p>

      <div className="merch-grid">
        <div className="zr-card merch-card">
          <div className="merch-photos" aria-label={t("merch_photos_label")}>
            <img
              className="merch-photo"
              src="/assets/images/allgemein/grosse_tragetasche.jpeg"
              alt={t("merch_photo_alt_big")}
              loading="lazy"
              decoding="async"
            />
          </div>

          <h2 className="merch-h2">{t("merch_bag_name")}</h2>
          <p className="merch-meta">{t("merch_bag_meta")}</p>

          <div className="merch-buy" ref={mountRef} />

          {state.status === "missing" ? (
            <div className="merch-note">
              <p className="merch-note-title">{t("merch_setup_title")}</p>
              <p className="merch-note-text">{t("merch_setup_text")}</p>
              <pre className="merch-pre">
VITE_SHOPIFY_DOMAIN=your-store.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=shpat_...
VITE_SHOPIFY_PRODUCT_ID=1234567890
              </pre>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="merch-note merch-note--error">
              <p className="merch-note-title">{t("merch_load_error")}</p>
              <p className="merch-note-text">{state.message}</p>
            </div>
          ) : null}
        </div>

        <aside className="zr-card merch-card">
          <h2 className="merch-h2">{t("merch_fulfillment_title")}</h2>
          <p className="merch-meta">{t("merch_fulfillment_text")}</p>
          <ul className="merch-list">
            <li>{t("merch_fulfillment_bullet_1")}</li>
            <li>{t("merch_fulfillment_bullet_2")}</li>
            <li>{t("merch_fulfillment_bullet_3")}</li>
          </ul>

          <h2 className="merch-h2 merch-h2--spaced">{t("merch_policies_title")}</h2>
          <ul className="merch-list">
            <li>{t("merch_policies_bullet_1")}</li>
            <li>{t("merch_policies_bullet_2")}</li>
            <li>{t("merch_policies_bullet_3")}</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
