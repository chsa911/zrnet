import React from "react";
import { formatBookCode, parseBookCodeInput } from "../utils/bookCodeDisplay";

export default function BookCodeField({
  value,
  onChange,
  disabled = false,
  locked = false,
}) {
  return (
    <label style={{ display: "grid", gap: 6, flex: "0 0 auto" }}>
      <span>Book Code{locked ? " (locked)" : ""}</span>
      <input
        className="zr-input"
        value={formatBookCode(value)}
        disabled={disabled}
        onChange={(e) => onChange(parseBookCodeInput(e.target.value))}
        placeholder="Bookcode"
        style={{
          width: "36ch",
          maxWidth: "36ch",
          minWidth: 0,
        }}
      />
    </label>
  );
}