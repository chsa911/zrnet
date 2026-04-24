import React from "react";
import BookForm from "./BookForm";
import BookFormDesktop from "./BookFormDesktop";

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
}

export default function BookFormSwitcher(props) {
  return isMobileDevice() ? <BookForm {...props} /> : <BookFormDesktop {...props} />;
}
