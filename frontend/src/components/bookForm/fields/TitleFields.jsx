import React from "react";

export default function TitleFields({
  v,
  setField,
  runAutocomplete,
  setAc,
}) {
  return (
    <>
      <div data-desk-order="40" className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Title</span>
          <input
            className="zr-input"
            value={v.title_display}
            onChange={(e) => setField("title_display", e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Subtitle</span>
          <input
            className="zr-input"
            value={v.subtitle_display}
            onChange={(e) => setField("subtitle_display", e.target.value)}
          />
        </label>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Keyword</span>
          <input
            className="zr-input"
            value={v.title_keyword}
            onChange={(e) => {
              setField("title_keyword", e.target.value);
              runAutocomplete("title_keyword", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Position</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.title_keyword_position}
            onChange={(e) => setField("title_keyword_position", e.target.value)}
            style={{ width: "7ch" }}
          />
        </label>
      </div>

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>More Keywords</div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Keyword 2</span>
            <input
              className="zr-input"
              value={v.title_keyword2}
              onChange={(e) => setField("title_keyword2", e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Position 2</span>
            <input
              className="zr-input"
              type="text"
              inputMode="numeric"
              value={v.title_keyword2_position}
              onChange={(e) => setField("title_keyword2_position", e.target.value)}
              style={{ width: "7ch" }}
            />
          </label>
        </div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Keyword 3</span>
            <input
              className="zr-input"
              value={v.title_keyword3}
              onChange={(e) => setField("title_keyword3", e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Position 3</span>
            <input
              className="zr-input"
              type="text"
              inputMode="numeric"
              value={v.title_keyword3_position}
              onChange={(e) => setField("title_keyword3_position", e.target.value)}
              style={{ width: "7ch" }}
            />
          </label>
        </div>
      </div>
    </>
  );
}