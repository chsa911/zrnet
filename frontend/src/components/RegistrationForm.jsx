// frontend/src/components/RegistrationForm.jsx
import BookForm from "./BookForm";

export default function RegistrationForm({ onRegistered }) {
  return (
    <BookForm
      mode="create"
      submitLabel="Speichern"
      onSuccess={({ saved }) => {
        onRegistered && onRegistered(saved);
      }}
    />
  );
}