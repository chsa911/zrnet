const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function render(items) {
  const el = $("results");
  if (!items?.length) {
    el.innerHTML = `<div class="card"><h3>No results</h3><div class="muted">Try a different query or filter.</div></div>`;
    return;
  }

  el.innerHTML = items.map(x => `
    <div class="card">
      <h3>${esc(x.title || "(no title)")}</h3>
      <div class="badges">
        ${x.author ? `<span class="badge">${esc(x.author)}</span>` : ""}
        ${x.category ? `<span class="badge">${esc(x.category)}</span>` : ""}
        ${(x.tags || []).map(t => `<span class="badge">${esc(t)}</span>`).join("")}
      </div>
      ${x.description ? `<div class="muted" style="margin-top:8px">${esc(x.description)}</div>` : ""}
    </div>
  `).join("");
}

async function load() {
  const q = $("q").value.trim();
  const category = $("category").value;
  const sort = $("sort").value;

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);

  $("status").textContent = "Searching…";

  // Backend endpoint (adjust if your API path is different)
  const res = await fetch(`/api/public/search?${params.toString()}`);
  const data = await res.json();

  // fill category list once
  if ($("category").options.length <= 1 && Array.isArray(data.facets?.categories)) {
    for (const c of data.facets.categories) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      $("category").appendChild(opt);
    }
  }

  render(data.items || []);
  $("status").textContent = `Found ${data.items?.length || 0} items.`;
}

$("btn").addEventListener("click", load);
$("q").addEventListener("input", debounce(load, 250));
$("category").addEventListener("change", load);
$("sort").addEventListener("change", load);

load().catch((e) => {
  console.error(e);
  $("status").textContent = "Error: API not reachable. Check /api/public/search.";
});