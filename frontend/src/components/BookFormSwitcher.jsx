import React, { useEffect, useState } from "react";
import BookForm from "./BookForm";
import BookFormDesktop from "./BookFormDesktop";

function detectMobile() {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || "";

  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari =
    /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);

  const isSmallScreen = window.innerWidth <= 768;

  return isIOS || isSafari || isSmallScreen;
}

export default function BookFormSwitcher(props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  if (isMobile) {
    return <BookForm {...props} />;
  }

  return <BookFormDesktop {...props} />;
}