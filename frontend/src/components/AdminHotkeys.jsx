// frontend/src/components/AdminHotkeys.jsx
// Funktionstasten für die Admin-Seiten. Aktiv, sobald man als Admin eingeloggt ist
// (eingebunden in TopBar.jsx). Die Tasten stehen auch im Menü "More".
// Ausgelassen: F5 (Neu laden), F11 (Vollbild), F12 (Entwicklertools).
// Mac: ggf. fn + F-Taste drücken (außer in den Systemeinstellungen ist
// "F1, F2 usw. als Standard-Funktionstasten verwenden" aktiviert).
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const ADMIN_HOTKEYS = {
  "/admin/register": "F1",
  "/admin/search-update": "F2",
  "/admin/check-book": "F3",
  "/admin/barcode-check": "F4",
  "/admin/authors": "F6",
  "/admin/barcodes": "F7",
  "/admin/covers": "F8",
  "/admin/sync-issues": "F9",
  "/admin/abbreviations": "F10",
};

export function useAdminHotkeys(enabled) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) return undefined;
    const byKey = Object.fromEntries(Object.entries(ADMIN_HOTKEYS).map(([to, k]) => [k, to]));
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const to = byKey[e.key];
      if (!to) return;
      e.preventDefault();
      if (to !== window.location.pathname) navigate(to);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled, navigate]);
}
