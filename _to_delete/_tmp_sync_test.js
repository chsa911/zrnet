const express = require("express");
const http = require("http");
const books = {
  b1: { id: "b1", pages: 300, top_book: false, reading_status: "in_progress", title: "Der Prozess", author: "Kafka" },
  b2: { id: "b2", pages: 200, top_book: false, reading_status: "in_progress", title: "Stiller", author: "Frisch" },
  b3: { id: "b3", pages: null, top_book: false, reading_status: "in_progress", title: "Ohne Seiten", author: "X" },
  b4: { id: "b4", pages: 150, top_book: false, reading_status: "finished", title: "Schon fertig", author: "Y" },
};
const assignments = { d100: ["b1"], d200: ["b2"], d300: ["b3"], d400: ["b4"] };
const client = {
  async query(sql, p = []) {
    const s = String(sql);
    if (s.includes("FROM public.barcode_assignments") && s.includes("ORDER BY assigned_at")) {
      const ids = assignments[p[0].toLowerCase()] || [];
      return { rowCount: ids.length, rows: ids.map((book_id) => ({ book_id })) };
    }
    if (s.includes("SELECT id, pages, top_book FROM public.books")) {
      const b = books[p[0]]; return b ? { rowCount: 1, rows: [b] } : { rowCount: 0, rows: [] };
    }
    if (s.includes("FOR UPDATE")) return { rowCount: 1, rows: [{ reading_status: books[p[0]].reading_status }] };
    if (s.includes("UPDATE public.books")) {
      const b = books[p[0]]; b.reading_status = p[2]; if (p[1] != null) b.pages = p[1];
      return { rowCount: 1, rows: [{ reading_status: p[2], reading_status_updated_at: new Date(p[3]) }] };
    }
    if (s.includes("WITH freed AS")) return { rows: Object.entries(assignments).filter(([, v]) => v.includes(p[0])).map(([k]) => ({ barcode: k })) };
    if (s.includes("LEFT JOIN public.authors")) {
      const b = books[p[0]]; return { rowCount: b ? 1 : 0, rows: b ? [{ ...b }] : [] };
    }
    if (s.includes("INSERT INTO mobile_sync.issues")) return { rows: [{ id: "iss1" }] };
    if (s.includes("FROM mobile_sync.receipts") ) return { rowCount: 0, rows: [] };
    return { rowCount: 0, rows: [] };
  },
  release() {},
};
const app = express();
app.use(express.json());
app.set("pgPool", { connect: async () => client });
app.use("/api/mobile", require("./routes/mobileSync"));
const ts = (n) => new Date(Date.now() + n * 1000).toISOString();
const changes = [
  { clientChangeId: "c-ok", barcode: "d100", pages: 302, readingStatus: "finished", readingStatusChangedAt: ts(1) },
  { clientChangeId: "c-mismatch", barcode: "d200", pages: 260, readingStatus: "abandoned", readingStatusChangedAt: ts(2) },
  { clientChangeId: "c-nopages", barcode: "d300", readingStatus: "finished", readingStatusChangedAt: ts(3) },
  { clientChangeId: "c-already", barcode: "d400", pages: 150, readingStatus: "finished", readingStatusChangedAt: ts(4) },
  { clientChangeId: "c-unknown", barcode: "d999", pages: 100, readingStatus: "finished", readingStatusChangedAt: ts(5) },
  { clientChangeId: "c-nostatus", barcode: "d100", topBook: true, topBookSetAt: ts(6) },
];
const srv = app.listen(0, async () => {
  const port = srv.address().port;
  const body = JSON.stringify({ changes });
  const req = http.request({ port, path: "/api/mobile/sync", method: "POST", headers: { "content-type": "application/json" } }, (res) => {
    let d = ""; res.on("data", (x) => (d += x)); res.on("end", () => {
      const j = JSON.parse(d);
      console.log("status", res.statusCode, "applied", j.applied.length, "failed", j.failed.length);
      for (const r of j.results || [j]) console.log(r.clientChangeId, r.outcome, r.code, r.book && r.book.title, JSON.stringify(r.checks ? { diff: r.checks.pagesDiff, prev: r.checks.previousStatus, rel: r.checks.releasedBarcodes } : r.details));
      srv.close(); process.exit(0);
    });
  });
  req.end(body);
});
