import React, { useState } from "react";
import BookForm from "./BookForm";

export default function RegistrationForm({ onRegistered }) {
  const [wishlist, setWishlist] = useState(false);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={wishlist}
          onChange={(e) => setWishlist(e.target.checked)}
        />
        <span>Wishlist (kein Barcode – später registrieren)</span>
      </label>

      <BookForm
        mode="create"
        assignBarcode={!wishlist}
        createReadingStatus={wishlist ? "wishlist" : "in_progress"}
        submitLabel={wishlist ? "Zur Wishlist" : "Speichern"}
        onSuccess={({ saved }) => {
          onRegistered && onRegistered(saved);
        }}
      />
    </div>
  );
}