import React from "react";
import BookForm from "./BookForm";
import BookFormDesktop from "./BookFormDesktop";

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
}

export default function BookFormSwitcher(props) {
  if (isMobile()) {
    return <BookForm {...props} />;
  }
  return <BookFormDesktop {...props} />;
}
export default function BookFormSwitcher(props) {
  // Mobile Safari: clean create only, no draft matching.
  if (isMobileSafari()) {
    return <BookForm {...props} />;
  }

  // Desktop / other browsers: old draft-aware logic.
  return <BookFormDesktop {...props} />;
}
