import React from "react";
import BookForm from "./BookForm";

export default function BookFormDesktop(props) {
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <style>{`
        .desktop-book-form {
          width: 100%;
          max-width: 1100px;
          padding: 0 20px;
        }

        @media (min-width: 900px) {
          .desktop-book-form form {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 20px 28px !important;
            align-items: start;
          }

          .desktop-book-form form > h2,
          .desktop-book-form form > .zr-toolbar,
          .desktop-book-form form > .zr-card:first-of-type,
          .desktop-book-form form > label {
            grid-column: 1 / -1;
          }
        }
      `}</style>

      <div className="desktop-book-form">
        <BookForm {...props} />
      </div>
    </div>
  );
}