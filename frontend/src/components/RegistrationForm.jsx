import React, { useMemo, useState } from "react";
import BookForm from "./BookForm";

function isStandalonePwa() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

export default function RegistrationForm({ onRegistered }) {
  const [wishlist, setWishlist] = useState(false);
  const [newInStock, setNewInStock] = useState(false);

  const usePwaNoBarcodeDefault = useMemo(() => {
    const isStaging = import.meta.env.VITE_APP_ENV === "staging";
    return isStaging && isStandalonePwa();
  }, []);

  const assignBarcode = usePwaNoBarcodeDefault
    ? false
    : !(wishlist || newInStock);

  const createReadingStatus = usePwaNoBarcodeDefault
    ? "in_progress"
    : wishlist
    ? "wishlist"
    : newInStock
    ? "in_stock"
    : "in_progress";

  const submitLabel = usePwaNoBarcodeDefault
    ? "Speichern"
    : wishlist
    ? "Zur Wishlist"
    : newInStock
    ? "In Bestand"
    : "Speichern";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!usePwaNoBarcodeDefault ? (
        <>
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
        </>
      ) : null}

      <BookForm
        mode="create"
        assignBarcode={assignBarcode}
        createReadingStatus={createReadingStatus}
        submitLabel={submitLabel}
        onSuccess={({ saved }) => {
          onRegistered && onRegistered(saved);
        }}
      />
    </div>
  );
}
