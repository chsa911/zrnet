#!/usr/bin/env node
// scripts/neonComputeActive.js — Ist die Neon-Datenbank gerade wach?
//
// Fragt die Neon-Verwaltungs-API (NICHT die Datenbank) nach dem Zustand des
// Compute-Endpoints. Das weckt die Datenbank nicht auf und verbraucht keine
// Compute-Stunden.
//
// Exit-Codes:
//   0 = wach (active/init)  → Wächter darf prüfen
//   3 = schläft (idle)      → Wächter überspringt diesen Lauf
//   2 = unbekannt (kein NEON_API_KEY, API nicht erreichbar, …)
//
// Benötigt in .env (Projekt-Wurzel):
//   NEON_API_KEY=...          (Neon Console → Account settings → API keys)
//   NEON_PROJECT_ID=...       (optional; Neon Console → Project settings.
//                              Fehlt er, wird das Projekt automatisch gesucht.)
// Endpoint-ID wird aus dem Host in DATABASE_URL gelesen (ep-…).

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env"), quiet: true });

const API = "https://console.neon.tech/api/v2";
const KEY = process.env.NEON_API_KEY;

function endpointIdFromUrl(url) {
  try {
    const host = new URL(url).hostname; // ep-xxx-yyy(-pooler).region.aws.neon.tech
    const first = host.split(".")[0];
    return first.replace(/-pooler$/, "");
  } catch {
    return null;
  }
}

async function api(path) {
  const r = await fetch(API + path, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(`Neon API ${r.status}: ${body.message || r.statusText}`);
    err.status = r.status;
    throw err;
  }
  return body;
}

async function listProjects() {
  try {
    return (await api("/projects?limit=400")).projects || [];
  } catch (e) {
    // Org-Konten verlangen org_id
    const orgs = (await api("/users/me/organizations")).organizations || [];
    const out = [];
    for (const o of orgs) {
      out.push(...((await api(`/projects?limit=400&org_id=${encodeURIComponent(o.id)}`)).projects || []));
    }
    if (!out.length) throw e;
    return out;
  }
}

async function findEndpoint(epId) {
  if (process.env.NEON_PROJECT_ID) {
    return (await api(`/projects/${process.env.NEON_PROJECT_ID}/endpoints/${epId}`)).endpoint;
  }
  for (const p of await listProjects()) {
    const eps = (await api(`/projects/${p.id}/endpoints`)).endpoints || [];
    const hit = eps.find((e) => e.id === epId);
    if (hit) {
      console.error(`Hinweis: NEON_PROJECT_ID=${p.id} in .env eintragen spart API-Aufrufe.`);
      return hit;
    }
  }
  throw new Error(`Endpoint ${epId} in keinem Neon-Projekt gefunden`);
}

(async () => {
  if (!KEY) {
    console.log("neon: unbekannt (NEON_API_KEY fehlt in .env)");
    process.exit(2);
  }
  const epId = endpointIdFromUrl(process.env.DATABASE_URL || "");
  if (!epId || !epId.startsWith("ep-")) {
    console.log("neon: unbekannt (keine Neon-Endpoint-ID in DATABASE_URL)");
    process.exit(2);
  }
  const ep = await findEndpoint(epId);
  const state = ep.current_state;
  console.log(`neon: ${epId} ist ${state}`);
  process.exit(state === "idle" ? 3 : 0);
})().catch((e) => {
  console.log(`neon: unbekannt (${e.message})`);
  process.exit(2);
});
