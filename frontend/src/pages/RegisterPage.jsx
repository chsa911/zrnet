import React, { useState } from "react";
import BookForm from "../components/BookFormSwitcher";
import BookFormStagingPwa from "../components/BookFormStagingPwa";
import HomeLiveBlock from "../components/HomeLiveBlock";
import LastRegisteredPanel from "../components/LastRegisteredPanel";

function isStandalonePwa() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

export default function RegisterPage(props) {
  const [lastRegisteredBook, setLastRegisteredBook] = useState(null);
  const [wishlist, setWishlist] = useState(false);

  const isStaging = import.meta.env.VITE_APP_ENV === "staging";
  const usePwaForm = isStaging && isStandalonePwa();

  function handleSuccess(result) {
    props.onSuccess?.(result);
    setLastRegisteredBook(result?.saved?.book || result?.saved || null);
    setWishlist(false);
  }

  // Wishlist entries have no barcode (you don't have the book yet) — override
  // both the reading status and barcode assignment for this submission only.
  const formProps = wishlist
    ? { ...props, createReadingStatus: "wishlist", assignBarcode: false }
    : props;

  return (
    <>
      <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={wishlist}
          onChange={(e) => setWishlist(e.target.checked)}
        />
        <span>Wishlist (kein Barcode – Buch noch nicht im Bestand)</span>
      </label>

      {usePwaForm ? (
        <BookFormStagingPwa {...formProps} onSuccess={handleSuccess} />
      ) : (
        <BookForm {...formProps} onSuccess={handleSuccess} />
      )}

      <LastRegisteredPanel
        book={lastRegisteredBook}
        onUpdated={setLastRegisteredBook}
      />

      <HomeLiveBlock />
    </>
  );
}