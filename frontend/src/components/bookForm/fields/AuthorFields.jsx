import React from "react";

export default function AuthorFields({
  v,
  ac,
  setAc,
  setAuthorIdentityField,
  runAutocomplete,
  applyAuthorMatch,
  authorSuggestionLabel,
  suggestionKey,
  isEdit,
}) {
  return (
    <>
      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1, position: "relative" }}>
          <span>Author Last Name</span>
          <input
            className="zr-input"
            value={v.author_lastname}
            onChange={(e) => {
              setAuthorIdentityField("author_lastname", e.target.value);
              runAutocomplete("author_lastname", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
          />

          {ac.field === "author_lastname" && ac.items.length ? (
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
                      applyAuthorMatch(it, { overwriteIdentity: true, fillOnly: false });
                    } else {
                      const picked = String(it || "").trim();
                      const parts = picked.split(/\s+/).filter(Boolean);
                      const maybeLast = parts.length > 1 ? parts[parts.length - 1] : picked;
                      const maybeFirst = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";

                      setAuthorIdentityField("author_lastname", maybeLast);
                      if (maybeFirst && !v.author_firstname) {
                        setAuthorIdentityField("author_firstname", maybeFirst);
                      }
                    }

                    setAc({ field: "", items: [] });
                  }}
                >
                  <span>{authorSuggestionLabel(it)}</span>
                  {it && typeof it === "object" ? (
                    <span style={{ fontSize: 12, opacity: 0.72 }}>
                      {[it.author_nationality, it.male_female].filter(Boolean).join(" · ") ||
                        "Author from DB"}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>First Name</span>
          <input
            className="zr-input"
            value={v.author_firstname}
            onChange={(e) => setAuthorIdentityField("author_firstname", e.target.value)}
          />
        </label>
      </div>

      <label data-desk-order="30" style={{ display: "grid", gap: 6 }}>
        <span>Author Display Name</span>
        <input
          className="zr-input"
          value={v.name_display}
          onChange={(e) => setAuthorIdentityField("name_display", e.target.value)}
        />
      </label>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Nationality</span>
          <input
            className="zr-input"
            value={v.author_nationality}
            onChange={(e) => setAuthorIdentityField("author_nationality", e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Place of Birth</span>
          <input
            className="zr-input"
            value={v.place_of_birth}
            onChange={(e) => setAuthorIdentityField("place_of_birth", e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Gender</span>
          <input
            className="zr-input"
            value={v.male_female}
            onChange={(e) => setAuthorIdentityField("male_female", e.target.value)}
          />
        </label>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Published Titles</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.published_titles}
            onChange={(e) => setAuthorIdentityField("published_titles", e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Million Sellers</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.number_of_millionsellers}
            onChange={(e) => setAuthorIdentityField("number_of_millionsellers", e.target.value)}
          />
        </label>
      </div>
    </>
  );
}