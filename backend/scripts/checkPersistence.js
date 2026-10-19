// backend/scripts/checkPersistence.js
//
// "Persistenz-Wächter": NUR LESEND. Findet Bücher, die registriert werden
// sollten, aber nicht (vollständig) in der Datenbank angekommen sind, und
// neue Doppel-Barcodes.
//
//   node scripts/checkPersistence.js            # letzte 30 Tage
//   DAYS=7 node scripts/checkPersistence.js
//   DATABASE_URL=... node scripts/checkPersistence.js
//
// Exit-Code 0 = alles in Ordnung, 1 = Probleme gefunden, 2 = Skriptfehler.
// So kann es von CI, cron oder einer geplanten Aufgabe ausgewertet werden.
//
// Alarm-Modus (für den 15-Minuten-Wächter auf dem Mac):
//   ALERT_STATE=~/p_backup/waechter/state.json node scripts/checkPersistence.js
// Dann bedeutet Exit 1 nur noch "jetzt melden": es gibt NEUE Funde seit dem
// letzten Lauf, oder es ist der erste Lauf des Tages (ab REMIND_HOUR, Standard
// 8 Uhr) und es ist noch etwas offen (Morgen-Erinnerung). Die Zeile
// "ALERT: …" enthält den Text für die Meldung.

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const fs = require("fs");
const { Pool } = require("pg");
const { listOpenFailures, friendlyReason } = require("../utils/saveFailures");

const URL = process.env.DATABASE_URL;
const DAYS = Math.max(1, Number(process.env.DAYS) || 30);
// ab diesem Zeitpunkt darf es KEINE neuen Doppel-Barcodes mehr geben
const NO_NEW_DUPLICATES_SINCE = process.env.NO_NEW_DUPLICATES_SINCE || "2026-10-18";

const local = /localhost|127\.0\.0\.1|\/tmp/.test(URL || "");
// sslmode from the URL is dropped (SSL is configured below) – avoids pg's
// noisy "SSL modes ... treated as aliases" warning in the report
const connectionString = (URL || "").replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const pool = new Pool({ connectionString, ssl: local ? false : { rejectUnauthorized: false } });

const CHECKS = [
  {
    key: "offene_vorgaenge",
    title: "Offene Vorgänge – Registrierung abgelehnt, Buch fehlt in der DB",
    hint: "Im Admin-Bereich unter „Offene Vorgänge“ erneut registrieren oder mit Notiz verwerfen.",
    // same definition as the red bar in the app (utils/saveFailures.js)
    // falls back to the pre-migration query like the app does
    run: (db) => listOpenFailures(db),
    fingerprint: (r) => r.key,
    label: (r) => `${r.title}${r.author ? ` (${r.author})` : ""}`,
    display: (r) => ({
      titel: r.title,
      autor: r.author,
      seiten: r.pages,
      versuche: r.attempts,
      grund: friendlyReason(r.error),
      zuletzt: new Date(r.last_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
    }),
  },
  {
    key: "erfolg_ohne_buch",
    title: "Als erfolgreich gemeldet, aber Buch oder Barcode fehlt",
    hint: "Darf nie vorkommen – bitte sofort melden.",
    sql: `
      SELECT a.title_display AS titel, a.requested_barcode AS barcode, a.book_id,
             CASE WHEN b.id IS NULL THEN 'Buch fehlt' ELSE 'Barcode nicht verknüpft' END AS problem,
             to_char(a.created_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS zeit
      FROM public.book_save_attempts a
      LEFT JOIN public.books b ON b.id = a.book_id
      WHERE a.status = 'success'
        AND a.created_at >= now() - make_interval(days => $1)
        AND (
          b.id IS NULL
          OR (b.registered_at IS NOT NULL AND b.reading_status = 'in_progress'
              AND NOT EXISTS (SELECT 1 FROM public.book_barcodes bb WHERE bb.book_id = b.id))
        )
      ORDER BY a.created_at DESC`,
    params: () => [DAYS],
  },
  {
    key: "neue_doppel_barcodes",
    title: `Neue Doppel-Barcodes (seit ${NO_NEW_DUPLICATES_SINCE})`,
    hint: "Ein Barcode wird von mehreren Büchern 'in_progress' gehalten, mindestens eine Zuweisung ist neu.",
    sql: `
      SELECT lower(ba.barcode) AS barcode,
             count(DISTINCT ba.book_id) AS buecher,
             string_agg(DISTINCT b.title_display, ' | ') AS titel,
             to_char(max(ba.assigned_at) AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS letzte_zuweisung
      FROM public.barcode_assignments ba
      JOIN public.books b ON b.id = ba.book_id AND b.reading_status = 'in_progress'
      WHERE ba.freed_at IS NULL
      GROUP BY lower(ba.barcode)
      HAVING count(DISTINCT ba.book_id) > 1
         AND max(ba.assigned_at) >= $1::date
      ORDER BY 1`,
    params: () => [NO_NEW_DUPLICATES_SINCE],
  },
  {
    key: "handy_barcode_unbekannt",
    title: "Handy-App meldet Barcode, den es in der DB nicht gibt",
    hint: "Typisches Zeichen für ein registriertes, aber nicht gespeichertes Buch.",
    sql: `
      SELECT i.barcode, i.pages AS seiten, i.reading_status,
             to_char(i.created_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS zeit
      FROM public.mobile_sync_issues i
      WHERE i.status = 'open' AND i.error_code = 'BARCODE_NOT_FOUND'
        AND i.created_at >= now() - make_interval(days => $1)
      ORDER BY i.created_at DESC`,
    params: () => [DAYS],
  },
  {
    key: "registriert_ohne_barcode",
    title: "Registriert und 'in_progress', aber ohne Barcode",
    hint: "Buch ist da, aber nicht über den Barcode auffindbar.",
    sql: `
      SELECT b.title_display AS titel, b.id,
             to_char(b.registered_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS registriert
      FROM public.books b
      WHERE b.reading_status = 'in_progress'
        AND b.registered_at >= now() - make_interval(days => $1)
        AND NOT EXISTS (SELECT 1 FROM public.book_barcodes bb WHERE bb.book_id = b.id)
        AND NOT EXISTS (SELECT 1 FROM public.barcode_assignments ba
                        WHERE ba.book_id = b.id AND ba.freed_at IS NULL)
      ORDER BY b.registered_at DESC`,
    params: () => [DAYS],
  },
];

// nur zur Information: ältere offene Handy-Meldungen (kein Alarm)
const OLD_MOBILE_INFO_SQL = `
  SELECT count(*)::int AS n FROM public.mobile_sync_issues
  WHERE status = 'open' AND error_code = 'BARCODE_NOT_FOUND'
    AND created_at < now() - make_interval(days => $1)`;

// nur zur Information: Altlasten-Mehrfachbarcodes (lösen keinen Alarm aus)
const LEGACY_INFO_SQL = `
  SELECT count(*)::int AS n FROM (
    SELECT lower(ba.barcode)
    FROM public.barcode_assignments ba
    JOIN public.books b ON b.id = ba.book_id AND b.reading_status = 'in_progress'
    WHERE ba.freed_at IS NULL
    GROUP BY 1 HAVING count(DISTINCT ba.book_id) > 1
  ) t`;

async function run() {
  if (!URL) throw new Error("DATABASE_URL fehlt");
  const results = [];
  for (const c of CHECKS) {
    try {
      const rows = c.run ? await c.run(pool) : (await pool.query(c.sql, c.params())).rows;
      results.push({ ...c, rows });
    } catch (e) {
      results.push({ ...c, rows: [], error: e.message });
    }
  }
  const legacy = (await pool.query(LEGACY_INFO_SQL)).rows[0].n;
  const oldMobile = (await pool.query(OLD_MOBILE_INFO_SQL, [DAYS])).rows[0].n;
  return { results, legacy, oldMobile };
}

function print({ results, legacy, oldMobile }) {
  console.log(`Persistenz-Wächter – Zeitraum: letzte ${DAYS} Tage\n`);
  let problems = 0;
  for (const r of results) {
    if (r.error) {
      problems++;
      console.log(`⚠️  ${r.title}: Abfrage fehlgeschlagen (${r.error})\n`);
      continue;
    }
    if (!r.rows.length) {
      console.log(`✅ ${r.title}: keine`);
      continue;
    }
    problems += r.rows.length;
    console.log(`\n❌ ${r.title}: ${r.rows.length}\n   ${r.hint}`);
    console.table(r.rows.slice(0, 50).map((x) => (r.display ? r.display(x) : x)));
    if (r.rows.length > 50) console.log(`   … und ${r.rows.length - 50} weitere`);
  }
  if (oldMobile) {
    console.log(`\nℹ️  ${oldMobile} ältere offene Handy-Meldung(en) "Barcode unbekannt" (älter als ${DAYS} Tage, kein Alarm) – im Admin-Bereich prüfen und schließen.`);
  }
  console.log(`\nℹ️  Altlasten: ${legacy} Barcode(s) kleben noch auf mehreren Büchern 'in_progress' (bekannt, kein Alarm).`);
  console.log(problems ? `\n❌ ${problems} Problem(e) gefunden.` : "\n✅ Alles in Ordnung.");
  return problems;
}

/* ------------------------------ alert mode ------------------------------ */

function fingerprintsOf(results) {
  const out = [];
  for (const r of results) {
    for (const row of r.rows) {
      const fp = r.fingerprint ? r.fingerprint(row) : JSON.stringify(row);
      const label = r.label ? r.label(row) : r.title;
      out.push({ id: `${r.key}:${fp}`, label });
    }
  }
  return out;
}

function berlinNow() {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

// Decides whether to bother the user now. Returns { alert, text }.
function decideAlert(results, statePath) {
  let state = { seen: [], lastReminder: "" };
  try {
    state = { ...state, ...JSON.parse(fs.readFileSync(statePath, "utf8")) };
  } catch {
    /* first run */
  }
  const current = fingerprintsOf(results);
  const seen = new Set(state.seen || []);
  const fresh = current.filter((c) => !seen.has(c.id));
  const { day, hour } = berlinNow();
  const remindHour = Number(process.env.REMIND_HOUR ?? 8);
  const reminderDue = current.length > 0 && state.lastReminder !== day && hour >= remindHour;

  let text = "";
  if (fresh.length) {
    const names = [...new Set(fresh.map((f) => f.label))].slice(0, 3).join(", ");
    text = `NEU: ${names}${fresh.length > 3 ? ` und ${fresh.length - 3} weitere` : ""}`;
  } else if (reminderDue) {
    const names = [...new Set(current.map((c) => c.label))].slice(0, 3).join(", ");
    text = `Noch offen: ${names}${current.length > 3 ? ` und ${current.length - 3} weitere` : ""}`;
  }
  const alert = Boolean(text);

  const next = {
    seen: current.map((c) => c.id),
    lastReminder: alert ? day : state.lastReminder,
    lastRun: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2));
  } catch (e) {
    console.error("Zustand konnte nicht gespeichert werden:", e.message);
  }
  return { alert, text };
}

if (require.main === module) {
  run()
    .then((r) => {
      const n = print(r);
      let code = n ? 1 : 0;
      if (process.env.ALERT_STATE) {
        const failed = r.results.filter((x) => x.error);
        if (failed.length) {
          // a check that cannot run must never look like "all good"
          console.log(`\nPrüfung fehlgeschlagen: ${failed.map((x) => x.title).join(", ")}`);
          code = 2;
        } else {
          const { alert, text } = decideAlert(r.results, process.env.ALERT_STATE);
          if (alert) console.log(`\nALERT: ${text}`);
          code = alert ? 1 : 0;
        }
      }
      return pool.end().then(() => process.exit(code));
    })
    .catch((e) => {
      console.error("Persistenz-Wächter fehlgeschlagen:", e.message);
      pool.end().finally(() => process.exit(2));
    });
}

module.exports = { run, CHECKS, decideAlert };
