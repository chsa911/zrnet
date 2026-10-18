import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BookForm from "../components/BookFormSwitcher";
import BookFormStagingPwa from "../components/BookFormStagingPwa";
import HomeLiveBlock from "../components/HomeLiveBlock";
import LastRegisteredPanel from "../components/LastRegisteredPanel";
import { notifyActivityChanged } from "../components/ActivitiesToday";

function isStandalonePwa() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

export default function RegisterPage(props) {
  const [lastRegisteredBook, setLastRegisteredBook] = useState(null);
  const [wishlist, setWishlist] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // coming from "Offene Vorgänge" -> pre-filled form; on success the Vorgang
  // is closed by the server (followup_attempt_ids)
  const followup = location.state?.followup || null;

  const isStaging = import.meta.env.VITE_APP_ENV === "staging";
  const usePwaForm = isStaging && isStandalonePwa();

  function handleSuccess(result) {
    if (followup) navigate(location.pathname, { replace: true, state: null });
    props.onSuccess?.(result);
    notifyActivityChanged();
    setLastRegisteredBook(result?.saved?.book || result?.saved || null);
    setWishlist(false);
  }

  // Wishlist entries have no barcode (you don't have the book yet) — override
  // both the reading status and barcode assignment for this submission only.
  const baseProps = followup
    ? {
        ...props,
        initialBook: followup.prefill,
        extraPayload: { followup_attempt_ids: followup.ids },
      }
    : props;
  const formProps = wishlist
    ? { ...baseProps, createReadingStatus: "wishlist", assignBarcode: false }
    : baseProps;

  return (
    <>
      {followup ? (
        <div
          style={{
            border: "3px solid #b91c1c",
            background: "#fef2f2",
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 17,
          }}
        >
          <strong>Offener Vorgang: {followup.title}</strong>
          <div>Damals abgelehnt: {followup.reason}</div>
          <div>
            Formular ist mit den damaligen Angaben vorausgefüllt. Bitte prüfen (v. a. den Grund oben) und speichern –
            danach ist der Vorgang automatisch erledigt.
          </div>
        </div>
      ) : null}
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