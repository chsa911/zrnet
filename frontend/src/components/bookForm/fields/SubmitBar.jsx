import React from "react";

export default function SubmitBar({
  busy,
  coverPrepBusy,
  submitLabel,
  pendingUploads,
  onRetryUploads,
  onCancel,
}) {
  return (
    <div data-desk-order="60" className="zr-toolbar" style={{ marginTop: 4 }}>
      <button
        className="zr-btn2 zr-btn2--primary"
        disabled={busy || coverPrepBusy}
        type="submit"
      >
        {busy ? "…" : coverPrepBusy ? "Preparing…" : submitLabel}
      </button>

      {pendingUploads ? (
        <button
          type="button"
          className="zr-btn2 zr-btn2--ghost"
          disabled={busy || coverPrepBusy}
          onClick={onRetryUploads}
          title="Retry locally saved uploads"
        >
          Pending Uploads: {pendingUploads}
        </button>
      ) : null}

      {onCancel ? (
        <button
          className="zr-btn2 zr-btn2--ghost"
          type="button"
          onClick={onCancel}
          disabled={busy || coverPrepBusy}
        >
          Abbrechen
        </button>
      ) : null}
    </div>
  );
}