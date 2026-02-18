import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./MerchPage.css";
import { useI18n } from "../context/I18nContext";
import { addToCart, cartCount, readCart } from "../store/cart";

export default function MerchPage() {
  const { t } = useI18n();
  const [cart, setCart] = useState(() => readCart());
  const count = useMemo(() => cartCount(cart), [cart]);

  const products = useMemo(
    () => [
      {
        sku: "bag_large",
        name: t("merch_bag_name"),
        meta: t("merch_bag_meta_vorkasse"),
        img: "/assets/images/allgemein/grosse_tragetasche.jpeg",
      },
      {
        sku: "mug",
        name: t("merch_mug_name"),
        meta: t("merch_mug_meta"),
        img: "",
      },
    ],
    [t]
  );

  function onAdd(sku) {
    const next = addToCart(sku, 1);
    setCart(next);
  }

  return (
    <section className="zr-section merch">
      <h1>{t("merch_title")}</h1>
      <p className="zr-lede">{t("merch_lede")}</p>

      <div className="merch-grid">
        <div className="zr-card merch-card">
          <div className="merch-topbar">
            <div className="merch-topbar-title">{t("merch_products_title")}</div>
            <Link className="merch-cartlink" to="/checkout">
              {t("merch_cart_link")} {count ? `(${count})` : ""}
            </Link>
          </div>

          <div className="merch-products">
            {products.map((p) => (
              <div key={p.sku} className="merch-product">
                {p.img ? (
                  <img
                    className="merch-photo"
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="merch-photo merch-photo--placeholder" aria-hidden="true" />
                )}

                <div className="merch-product-body">
                  <h2 className="merch-h2">{p.name}</h2>
                  <p className="merch-meta">{p.meta}</p>
                  <button className="zr-button" type="button" onClick={() => onAdd(p.sku)}>
                    {t("merch_add_to_cart")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="zr-card merch-card">
          <h2 className="merch-h2">{t("merch_fulfillment_title")}</h2>
          <p className="merch-meta">{t("merch_fulfillment_text")}</p>
          <ul className="merch-list">
            <li>{t("merch_fulfillment_bullet_1")}</li>
            <li>{t("merch_fulfillment_bullet_2")}</li>
            <li>{t("merch_fulfillment_bullet_3")}</li>
          </ul>

          <div className="merch-cta">
            <Link className="zr-button" to="/checkout">
              {t("merch_go_to_checkout")}
            </Link>
          </div>

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
