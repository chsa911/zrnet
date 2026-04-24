import React from "react";
import BookForm from "./BookForm";

export default function BookFormDesktop(props) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`
        .desktop-book-form form {
          display: grid !important;
          gap: 14px !important;
        }

        .desktop-book-form .zr-card,
        .desktop-book-form label,
        .desktop-book-form .zr-toolbar {
          width: 100%;
        }
      `}</style>

      <div className="desktop-book-form">
        <BookForm {...props} />
      </div>
    </div>
  );
}