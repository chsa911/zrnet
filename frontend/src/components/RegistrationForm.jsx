import React, { useState } from "react";
import BookForm from "./BookForm";

export default function RegistrationForm({ onRegistered }) {
  const [wishlist, setWishlist] = useState(false);
  const [newInStock, setNewInStock] = useState(false);

  const createReadingStatus = wishlist
    ? "wishlist"
    : newInStock
    ? "in_stock"
    : "in_progress";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="zr-card" style={{ display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 800 }}>Registrierung</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Der Workflow ist jetzt oben klar sortiert: Cover → ISBN → Pages → Barcode → Metadaten.
        </div>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={wishlist}
          onChange={(e) => {
            const next = e.target.checked;
            setWishlist(next);
            if (next) setNewInStock(false);
          }}
        />
        <span>Wishlist (kein Barcode – später registrieren)</span>
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={newInStock}
          onChange={(e) => {
            const next = e.target.checked;
            setNewInStock(next);
            if (next) setWishlist(false);
          }}
        />
        <span>Neu im Bestand (ohne Barcode – später zuweisen)</span>
      </label>

      <BookForm
        mode="create"
        assignBarcode={!(wishlist || newInStock)}
        createReadingStatus={createReadingStatus}
        submitLabel={wishlist ? "Zur Wishlist" : newInStock ? "In Bestand" : "Speichern"}
        onSuccess={({ saved }) => {
          onRegistered && onRegistered(saved);
        }}
      />
    </div>
  );
}
