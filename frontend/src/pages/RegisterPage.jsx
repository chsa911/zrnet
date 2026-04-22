import React from "react";
import BookForm from "../components/BookForm";
import BookFormStagingPwa from "../components/BookFormStagingPwa";

function isStandalonePwa() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

export default function RegisterPage() {
  const isStaging = import.meta.env.VITE_APP_ENV === "staging";
  const useStagingPwaForm = isStaging && isStandalonePwa();

  return useStagingPwaForm ? <BookFormStagingPwa /> : <BookForm />;
}
