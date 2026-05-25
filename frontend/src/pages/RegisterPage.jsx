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

  const isStaging = import.meta.env.VITE_APP_ENV === "staging";
  const usePwaForm = isStaging && isStandalonePwa();

  function handleSuccess(result) {
    props.onSuccess?.(result);
    setLastRegisteredBook(result?.saved?.book || result?.saved || null);
  }

  return (
    <>
      {usePwaForm ? (
        <BookFormStagingPwa {...props} onSuccess={handleSuccess} />
      ) : (
        <BookForm {...props} onSuccess={handleSuccess} />
      )}

      <LastRegisteredPanel
        book={lastRegisteredBook}
        onUpdated={setLastRegisteredBook}
      />

      <HomeLiveBlock />
    </>
  );
}