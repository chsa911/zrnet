import React from "react";
import BookForm from "./BookFormSwitcher";

export default function RegistrationForm({ onRegistered }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <BookForm
        mode="create"

        // ❗ wichtig: KEIN Barcode-System mehr
        assignBarcode={false}

        // optional – kannst du auch weglassen
        createReadingStatus="in_progress"

        submitLabel="Speichern"

        onSuccess={({ saved }) => {
          onRegistered && onRegistered(saved);
        }}
      />
    </div>
  );
}