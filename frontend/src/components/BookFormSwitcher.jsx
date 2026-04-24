import React from "react";
import BookForm from "./BookForm";
import BookFormDesktop from "./BookFormDesktop";

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
}

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
  // Mobile oder iOS Safari → neue einfache Logik
  if (isMobile() || isMobileSafari()) {
    return <BookForm {...props} />;
  }

  // Desktop → alte Draft-Logik
  return <BookFormDesktop {...props} />;
}