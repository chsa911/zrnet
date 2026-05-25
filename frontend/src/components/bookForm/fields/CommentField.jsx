import React from "react";

export default function CommentField({ value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span>Comment</span>
      <textarea
        className="zr-input"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}