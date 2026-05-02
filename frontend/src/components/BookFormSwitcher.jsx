import React from "react";
import BookFormDesktop from "./BookFormDesktop_old";

export default function BookFormSwitcher(props) {
  console.log("FORCED DESKTOP BookFormDesktop");
  return <BookFormDesktop {...props} />;
}