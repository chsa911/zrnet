// /assets/javascript/autoren-meistgelesen.js
// Renders "Authors that I have read most" dynamically:
//  - fetches book counts per author from the backend
//  - shows the count next to each author
//  - sorts the list automatically by count (desc)

const BEST_TITLES = [
  { author: "Konsalik, H.", title: "the black mandarin", url: "https://amzn.to/3UWATQ1" },
  { author: "Grisham, J.", title: "the firm", url: "https://amzn.to/4bSpw2q" },
  { author: "King, S.", title: "the green mile", url: "https://amzn.to/3WUwn7n" },
  { author: "Link, Charlotte", title: "the decision", url: "https://amzn.to/4dMVwHf" },
  { author: "Follett, K.", title: "the needle", url: "https://amzn.to/4bz73se" },
  { author: "Hohlbein, Wolfgang.", title: "the inquisitor", url: "https://amzn.to/44UQvIp" },
  { author: "Archer, J.", title: "kain and abel", url: "https://amzn.to/3WPoJex" },
  { author: "Steel, D.", title: "the gift", url: "https://amzn.to/3VetUU0" },
  { author: "May, Karl", title: "winnetou 1", url: "https://amzn.to/3wQA6YZ" },
  { author: "Wood, Barbara", title: "the curse of the rolles", url: "https://amzn.to/3QXPLfY" },
  { author: "Vandenberg, Philipp", title: "the hetaere", url: "https://amzn.to/3UY3Xqm" },
  { author: "Crichton, M.", title: "timeline", url: "https://amzn.to/3QZYjTs" },
  { author: "Lorentz, Iny", title: "the tartarin", url: "https://amzn.to/3R0qX7b" },
  { author: "Murakami, Haruki", title: "dangerous lover", url: "https://amzn.to/3VbQdd8" },
  { author: "Kinkel, Tanja", title: "the dollplayers", url: "https://amzn.to/4bnOszc" },
  { author: "Serno, Wolf", title: "the dollking", url: "https://amzn.to/3VeaVsP" },
];

const listEl = document.querySelector("#authorsMostRead");
const errorEl = document.querySelector("#authorsMostReadError");

// best-effort normalization so small punctuation / casing differences
// between the DB and this page don't break lookups.
function normAuthorKey(v) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .toLowerCase();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBucketFromQuery() {
  const p = new URLSearchParams(window.location.search);
  const bucket = (p.get("bucket") || "finished").toLowerCase();
  // allow only known buckets
  if (["finished", "abandoned", "top", "registered"].includes(bucket)) return bucket;
  return "finished";
}

async function fetchAuthorCounts(bucket) {
  const r = await fetch(`/api/public/books/author-counts?bucket=${encodeURIComponent(bucket)}&limit=500`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const rows = await r.json();
  const m = new Map();
  for (const row of rows || []) {
    if (row && row.author) m.set(normAuthorKey(row.author), Number(row.count) || 0);
  }
  return m;
}

function render(entries) {
  if (!listEl) return;
  if (!entries.length) {
    listEl.innerHTML = `<li style="break-inside: avoid;">No authors configured.</li>`;
    return;
  }

  listEl.innerHTML = entries
    .map((e) => {
      const count = Number(e.count) || 0;
      const label = count === 1 ? "book" : "books";
      return `
        <li style="break-inside: avoid; padding: 4px 0;">
          <span style="font-weight: 600;">${escapeHtml(e.author)}</span>
          <span style="color: #555;"> (${count} ${label})</span>
          : <a href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer">"${escapeHtml(
            e.title
          )}"</a>
        </li>
      `;
    })
    .join("\n");
}

(async function main() {
  try {
    const bucket = getBucketFromQuery();
    const counts = await fetchAuthorCounts(bucket);

    const merged = BEST_TITLES.map((x) => ({
      ...x,
      count: counts.get(normAuthorKey(x.author)) ?? 0,
    }))
      .sort((a, b) => {
        const dc = (b.count || 0) - (a.count || 0);
        if (dc) return dc;
        return String(a.author).localeCompare(String(b.author));
      });

    render(merged);
  } catch (err) {
    // Fallback: render without counts so the page is still usable.
    render(BEST_TITLES.map((x) => ({ ...x, count: 0 })));
    if (errorEl) {
      errorEl.textContent = `Could not load author counts (${err?.message || err}). Showing 0 counts.`;
    }
  }
})();
