// frontend/src/pages/OpenIssuesPage.jsx
// Liste der offenen Vorgänge: abgelehnte Registrierungen mit Grund und den
// damals eingegebenen Daten. Pro Vorgang: erneut registrieren (Formular
// vorausgefüllt) oder mit Notiz als erledigt verwerfen.
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dismissSaveFailures, getOpenSaveFailures, prefillFromFailure } from "../api/saveFailures";
import { notifyOpenIssuesChanged } from "../utils/saveFeedback";

function fmt(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function cm(x) {
  return x === null || x === undefined || x === "" ? "?" : String(x).replace(".", ",");
}

function IssueCard({ item, onDone }) {
  const navigate = useNavigate();
  const [dismissOpen, setDismissOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reRegister = () => {
    navigate("/admin/register", {
      state: { followup: { ids: item.ids, title: item.title, reason: item.reason, prefill: prefillFromFailure(item) } },
    });
  };

  const dismiss = async () => {
    setErr("");
    if (!note.trim()) {
      setErr("Bitte kurz notieren, warum der Vorgang erledigt ist.");
      return;
    }
    setBusy(true);
    try {
      await dismissSaveFailures(item.ids, note.trim());
      notifyOpenIssuesChanged();
      onDone();
    } catch (e) {
      setErr(e?.message || "Verwerfen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="zr-oi-card">
      <div className="zr-oi-head">
        <div>
          <div className="zr-oi-title">{item.title}</div>
          <div className="zr-oi-meta">
            {item.author || "Autor unbekannt"} · {item.pages ?? "?"} Seiten · {cm(item.width_cm)} × {cm(item.height_cm)} cm
            {item.barcode ? ` · Barcode ${item.barcode}` : " · kein Barcode eingegeben (automatische Vergabe)"}
          </div>
        </div>
        <div className="zr-oi-when">
          {item.attempts > 1 ? `${item.attempts} Versuche · ` : ""}
          {fmt(item.first_at)}
          {item.attempts > 1 ? ` – ${fmt(item.last_at)}` : ""}
        </div>
      </div>

      <div className="zr-oi-reason">❌ {item.reason}</div>
      <div className="zr-oi-tip">
        Steht auf dem Buch schon ein Barcode? Beim erneuten Registrieren schlägt das Formular meist denselben
        wieder vor (er blieb ja frei). Weicht der Vorschlag ab, den alten Barcode übermalen. Erst aufmalen, wenn
        „Gespeichert ✔ · Zugewiesener Barcode …“ erscheint.
      </div>
      {!item.payload ? (
        <div className="zr-oi-tip">
          Aus der Zeit vor dem Vorgangs-Protokoll: nur Titel, Autor, Seiten und Maße sind bekannt – den Rest bitte am Buch ergänzen.
        </div>
      ) : null}

      <div className="zr-oi-actions">
        <button type="button" className="zr-oi-primary" onClick={reRegister} disabled={busy}>
          Erneut registrieren
        </button>
        {!dismissOpen ? (
          <button type="button" onClick={() => setDismissOpen(true)} disabled={busy}>
            Erledigt / verwerfen …
          </button>
        ) : (
          <div className="zr-oi-dismiss">
            <input
              type="text"
              value={note}
              placeholder="Warum erledigt? z. B. „Duplikat, war schon da“"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && dismiss()}
              autoFocus
            />
            <button type="button" onClick={dismiss} disabled={busy}>
              Verwerfen
            </button>
            <button type="button" onClick={() => setDismissOpen(false)} disabled={busy}>
              Abbrechen
            </button>
          </div>
        )}
      </div>
      {err ? <div className="zr-oi-err">{err}</div> : null}
    </div>
  );
}

export default function OpenIssuesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await getOpenSaveFailures());
    } catch (e) {
      setError(e?.message || "Konnte die offenen Vorgänge nicht laden.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items || [];

  return (
    <div className="zr-oi">
      <style>{`
        .zr-oi { max-width: 1100px; margin: 0 auto; padding: 0 16px 40px; }
        .zr-oi h1 { font-size: 34px; margin: 8px 0 6px; }
        .zr-oi-intro { font-size: 16px; margin: 0 0 20px; opacity: .85; }
        .zr-oi-card { border: 3px solid #b91c1c; padding: 14px 16px; margin: 0 0 16px; background: #fff; }
        .zr-oi-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; }
        .zr-oi-title { font-size: 24px; font-weight: 900; }
        .zr-oi-meta, .zr-oi-when { font-size: 15px; opacity: .85; }
        .zr-oi-reason { margin: 10px 0 6px; font-size: 17px; font-weight: 700; color: #b91c1c; }
        .zr-oi-tip { font-size: 15px; margin: 4px 0; background: #fef3c7; padding: 6px 10px; }
        .zr-oi-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; align-items: center; }
        .zr-oi-actions button { font-size: 16px; padding: 8px 14px; cursor: pointer; }
        .zr-oi-primary { background: #111; color: #fff; border: 0; font-weight: 800; }
        .zr-oi-dismiss { display: flex; flex-wrap: wrap; gap: 8px; flex: 1 1 420px; }
        .zr-oi-dismiss input { flex: 1 1 260px; font-size: 16px; padding: 8px; }
        .zr-oi-err { color: #b91c1c; margin-top: 8px; font-weight: 700; }
        .zr-oi-empty { font-size: 22px; font-weight: 800; padding: 24px 0; }
      `}</style>
      <h1>Offene Vorgänge</h1>
      <p className="zr-oi-intro">
        Registrierungen, die der Server abgelehnt hat. Ein Vorgang verschwindet erst, wenn das Buch erfolgreich
        registriert oder der Vorgang mit Notiz verworfen wurde.
      </p>
      {error ? <div className="zr-oi-err">{error}</div> : null}
      {!data && !error ? <p>Lade …</p> : null}
      {data && !items.length ? <div className="zr-oi-empty">✅ Keine offenen Vorgänge.</div> : null}
      {items.map((it) => (
        <IssueCard key={it.key} item={it} onDone={load} />
      ))}
    </div>
  );
}
