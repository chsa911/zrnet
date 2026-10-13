// frontend/src/components/ActivitiesToday.jsx
// Dashboard "Activities today" – erscheint auf jeder Admin-Seite (über AdminOnly).
// Werte kommen live aus der Datenbank: GET /api/admin/activity/today
// Aktualisierung: alle 15 s, beim Zurückkehren in den Tab und sofort nach
// window.dispatchEvent(new Event(ACTIVITY_CHANGED_EVENT)) (z. B. nach dem Speichern).
import React, { useEffect, useState } from "react";
import { getApiRoot } from "../api/apiRoot";

export const ACTIVITY_CHANGED_EVENT = "zr:activity-changed";
export function notifyActivityChanged() {
  try {
    window.dispatchEvent(new Event(ACTIVITY_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

const POLL_MS = 15000;
const TILES = [
  ["uploaded", "Upload new books today"],
  ["enriched", "Data added today"],
  ["registered", "Registered today"],
  ["abandoned", "Abandoned today"],
];

export default function ActivitiesToday() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let inflight = false;
    const load = async () => {
      if (inflight) return;
      inflight = true;
      try {
        const r = await fetch(`${getApiRoot()}/admin/activity/today`, { credentials: "include", cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (alive) {
          setData(j);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      } finally {
        inflight = false;
      }
    };
    // kurz verzögert, damit der Server-Commit nach dem Speichern sicher durch ist
    const onChanged = () => setTimeout(load, 400);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    window.addEventListener(ACTIVITY_CHANGED_EVENT, onChanged);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, onChanged);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // null/fehlend = Wert konnte nicht ermittelt werden -> "–" (nicht 0)
  const v = (k) => {
    const x = data?.[k];
    return x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? "–" : Number(x);
  };

  return (
    <div className="zr-act">
      <style>{`
        .zr-act { text-align: center; margin: 4px auto 22px; padding: 0 12px; max-width: 1800px; box-sizing: border-box; font-weight: 900; }
        .zr-act-title { font-size: clamp(48px, 8vw, 110px); font-weight: 900; line-height: 1.05; margin: 0 0 16px; letter-spacing: -0.01em; }
        .zr-act-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .zr-act-tile { border: 5px solid rgba(0,0,0,.65); padding: 18px 12px; background: #fff; }
        .zr-act-num { font-size: clamp(80px, 12vw, 180px); font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
        .zr-act-label { font-size: clamp(22px, 2.6vw, 38px); font-weight: 900; margin-top: 8px; }
        @media (max-width: 900px) { .zr-act-grid { grid-template-columns: repeat(2, 1fr); } }
        .zr-act-err { color: #b91c1c; font-size: 18px; margin-top: 8px; }
      `}</style>
      <h1 className="zr-act-title">Activities today</h1>
      <div className="zr-act-grid">
        {TILES.map(([k, label]) => (
          <div key={k} className="zr-act-tile">
            <div className="zr-act-num">{v(k)}</div>
            <div className="zr-act-label">{label}</div>
          </div>
        ))}
      </div>
      {failed ? <div className="zr-act-err">Werte konnten nicht geladen werden</div> : null}
    </div>
  );
}
