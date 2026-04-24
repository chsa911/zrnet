import React from "react";
import BookForm from "./BookForm";

export default function BookFormDesktop(props) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1180,
        margin: "0 auto",
        padding: "24px 24px 80px",
      }}
    >
      <style>{`
        .desktop-book-form form {
          max-width: none !important;
          width: 100%;
        }

        .desktop-book-form .zr-card {
          border-radius: 18px;
        }

        .desktop-book-form input,
        .desktop-book-form textarea,
        .desktop-book-form select {
          font-size: 16px;
        }

        .desktop-book-form .zr-toolbar {
          gap: 12px;
        }

        @media (min-width: 900px) {
          .desktop-book-form form {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 18px 24px !important;
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
