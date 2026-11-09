// frontend/src/utils/politePoll.js
// "Höfliches" Polling: lädt nur nach, wenn es wirklich jemand sieht.
//
// Neon legt die Datenbank nach 5 Minuten ohne Anfrage schlafen (Scale to zero)
// und rechnet nur die Wachzeit ab. Jede Abfrage setzt diese 5 Minuten zurück.
// Deshalb wird hier nur geladen,
//   - wenn der Tab sichtbar ist,
//   - wenn der Nutzer in den letzten `idleMs` aktiv war (Maus, Tastatur, Touch, Scrollen),
//   - und die Daten älter als `intervalMs` sind.
// Beim Zurückkehren in den Tab oder bei neuer Aktivität nach einer Pause wird
// sofort nachgeladen, falls die Daten veraltet sind.
//
// Rückgabe: Funktion zum Beenden (für den useEffect-Cleanup).

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"];

export function startPolitePoll(load, intervalMs, { idleMs = 10 * 60_000, immediate = true } = {}) {
  let lastLoad = 0;
  let lastActivity = Date.now();
  let stopped = false;

  const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
  const active = () => Date.now() - lastActivity < idleMs;
  const stale = () => Date.now() - lastLoad >= intervalMs;

  const run = () => {
    lastLoad = Date.now();
    Promise.resolve()
      .then(load)
      .catch(() => {});
  };

  const tick = () => {
    if (!stopped && visible() && active() && stale()) run();
  };

  const onActivity = () => {
    const wasIdle = !active();
    lastActivity = Date.now();
    if (wasIdle) tick();
  };

  const onVis = () => {
    if (visible()) {
      lastActivity = Date.now();
      tick();
    }
  };

  if (immediate) run();
  const timer = setInterval(tick, Math.min(intervalMs, 60_000));
  document.addEventListener("visibilitychange", onVis);
  for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, { passive: true });

  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVis);
    for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
  };
}
