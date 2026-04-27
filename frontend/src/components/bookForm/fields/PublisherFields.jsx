import React from "react";

export default function PublisherFields({
  v,
  ac,
  setAc,
  setPublisherIdentityField,
  runAutocomplete,
  applyPublisherMatch,
  publisherSuggestionLabel,
  suggestionKey,
}) {
  return (
    <div data-desk-order="50" className="zr-toolbar">
      <label style={{ display: "grid", gap: 6, flex: 1, position: "relative" }}>
        <span>Publisher</span>
        <input
          className="zr-input"
          value={v.publisher_name_display}
          onChange={(e) => {
            setPublisherIdentityField("publisher_name_display", e.target.value);
            runAutocomplete("publisher_name_display", e.target.value);
          }}
          onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
        />

        {ac.field === "publisher_name_display" && ac.items.length ? (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 5,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 12,
              padding: 6,
              marginTop: 4,
            }}
          >
            {ac.items.map((it, index) => (
              <button
                key={suggestionKey(it, index)}
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  marginBottom: 4,
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (it && typeof it === "object") {
                    applyPublisherMatch(it, { overwriteIdentity: true, fillOnly: false });
                  } else {
                    setPublisherIdentityField("publisher_name_display", String(it || "").trim());
                  }

                  setAc({ field: "", items: [] });
                }}
              >
                <span>{publisherSuggestionLabel(it)}</span>
                {it && typeof it === "object" && String(it.abbr || "").trim() ? (
                  <span style={{ fontSize: 12, opacity: 0.72 }}>Publisher from DB</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </label>
    </div>
  );
}