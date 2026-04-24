import React from "react";
import BookForm from "./BookForm";
import BookFormDesktop from "./BookFormDesktop";

function isMobileSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";

  return (
    /iPhone|iPad|iPod/i.test(ua) &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/i.test(ua)
  );
}

export default function BookFormSwitcher(props) {
  if (isMobileSafari()) {
    return <BookForm {...props} />;
  }

  return <BookFormDesktop {...props} />;
}