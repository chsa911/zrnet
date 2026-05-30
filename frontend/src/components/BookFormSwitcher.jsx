import React from "react";
import BookFormDesktop from "./BookFormDesktop";
import BookFormStagingPwa from "./BookFormStagingPwa";

const isMobileSafari = () => {
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
};

export default function BookFormSwitcher(props) {
  if (isMobileSafari()) {
    return <BookFormStagingPwa {...props} />;
  }
  return <BookFormDesktop {...props} />;
}