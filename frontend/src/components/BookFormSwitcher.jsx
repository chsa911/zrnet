import React from "react";
import BookForm from "./BookForm";
import BookFormDesktop from "./BookFormDesktop";

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
}

export default function BookFormSwitcher(props) {
  return isMobile() ? <BookForm {...props} /> : <BookFormDesktop {...props} />;
}