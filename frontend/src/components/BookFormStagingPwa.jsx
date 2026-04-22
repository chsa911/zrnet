import React from "react";
import BookForm from "./BookForm";

export default function BookFormStagingPwa(props) {
  return (
    <div>
      {/* Minimal wrapper - reuse logic but different layout if needed */}
      <BookForm {...props} />
    </div>
  );
}
