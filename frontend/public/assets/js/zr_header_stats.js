(() => {
  const DEFAULT_YEAR = 2026;

  // You can override these if needed (temporary):
  // window.ZR_STATS_OVERRIDES = { instock: 2933, finished: 27, abandoned: 8, top: 11 };
  const overrides = (window.ZR_STATS_OVERRIDES || {});

  const candidates = (() => {
    const host = window.location?.host || '';
    const proto = window.location?.protocol || '';
    const origin = proto && host ? `${proto}//${host}` : '';
    return origin ? [origin, ''] : [''];
  })();

  const pick = (obj, keys) => {
    if (!obj) return null;
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null) return v;
    }
    return null;
  };

  const parseTotalFromHeaders = (resp) => {
    const headerTotal =
      resp?.headers?.get?.('x-total-count') ||
      resp?.headers?.get?.('X-Total-Count') ||
      resp?.headers?.get?.('content-range') ||
      resp?.headers?.get?.('Content-Range');
    if (!headerTotal) return null;
    const s = String(headerTotal);
    const m = s.match(/\/(\d+)\s*$/) || s.match(/^(\d+)$/);
    return m ? Number(m[1]) : null;
  };

  const extractCount = async (resp) => {
    const h = parseTotalFromHeaders(resp);
    if (Number.isFinite(h)) return h;
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await resp.json();
      if (typeof data === 'number') return data;
      if (Array.isArray(data)) return data.length;
      if (data && typeof data === 'object') {
        const v = pick(data, ['count','total','total_count','totalCount','value','result']);
        if (v !== null && v !== undefined && Number.isFinite(Number(v))) return Number(v);
      }
    } else {
      // sometimes count endpoints return plain text
      const txt = await resp.text();
      const n = Number(String(txt).trim());
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  async function fetchJsonTry(urlPaths) {
    let lastErr = null;
    for (const base of candidates) {
      for (const urlPath of urlPaths) {
        try {
          const resp = await fetch(`${base}${urlPath}`, { headers: { Accept: 'application/json' } });
          if (!resp.ok) throw new Error(`HTTP ${resp.status} @ ${urlPath}`);
          const data = await resp.json();
          return { data, base, resp, urlPath };
        } catch (e) {
          lastErr = e;
        }
      }
    }
    throw lastErr || new Error('Unknown error');
  }

  async function fetchCountTry(urlPaths) {
    let lastErr = null;
    for (const base of candidates) {
      for (const urlPath of urlPaths) {
        try {
          const resp = await fetch(`${base}${urlPath}`, { headers: { Accept: 'application/json' } });
          if (!resp.ok) throw new Error(`HTTP ${resp.status} @ ${urlPath}`);
          const count = await extractCount(resp);
          if (Number.isFinite(count)) return { count, base, urlPath };
          throw new Error(`No count found @ ${urlPath}`);
        } catch (e) {
          lastErr = e;
        }
      }
    }
    throw lastErr || new Error('Unknown error');
  }

  async function fetchYearStats(year) {
    return fetchJsonTry([`/api/public/books/stats?year=${encodeURIComponent(year)}`]);
  }

  // Best-effort count endpoints. Adjust/add once you know your real API.
  function urlsForFinishedBooks(year) {
    const y = encodeURIComponent(year);
    return [
      `/api/public/books/count?year=${y}&reading_status=finished`,
      `/api/public/books/count?year=${y}&readingStatus=finished`,
      `/api/public/books/count?year=${y}&status=finished`,
      `/api/public/books?year=${y}&reading_status=finished&limit=1`,
      `/api/public/books?year=${y}&reading_status=finished&page=0&size=1`,
      `/api/public/books?year=${y}&status=finished&limit=1`,
    ];
  }

  function urlsForBarcodeBooks() {
    return [
      `/api/public/books/count?with_barcode=1`,
      `/api/public/books/count?with_barcode=true`,
      `/api/public/books/count?has_barcode=1`,
      `/api/public/books/count?has_barcode=true`,
      `/api/public/books/count?barcode=1`,
      `/api/public/books?with_barcode=1&limit=1`,
      `/api/public/books?has_barcode=1&limit=1`,
      `/api/public/books?barcode=1&limit=1`,
    ];
  }

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  function t(key, vars) {
    return window.ZR_I18N?.t ? window.ZR_I18N.t(key, vars) : key;
  }

  let lastState = 'idle';
  let lastBase = '';
  let lastErrMsg = '';

  const renderNote = () => {
    const noteEl = document.getElementById('home-year-stats-note');
    const errEl = document.getElementById('home-year-stats-error');
    if (lastState === 'loading') {
      if (errEl) errEl.style.display = 'none';
      if (noteEl) noteEl.textContent = t('stats_loading');
      return;
    }
    if (lastState === 'loaded') {
      if (errEl) errEl.style.display = 'none';
      const basePart = lastBase ? ` (${lastBase})` : '';
      if (noteEl) noteEl.textContent = t('stats_live_db', { base: basePart });
      return;
    }
    if (lastState === 'error') {
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent = t('stats_error', { error: lastErrMsg });
      }
      if (noteEl) noteEl.textContent = '';
    }
  };

  async function load() {
    const year = DEFAULT_YEAR;
    setText('home-year-stats-year', String(year));
    lastState = 'loading';
    renderNote();

    try {
      const { data, base } = await fetchYearStats(year);
      lastBase = base || '';

      // Your stats API currently returns:
      // { finished: 5503, abandoned: 8, top: 11 }
      // Where "finished" appears to be pages read, not finished books.
      const abandoned = (overrides.abandoned ?? pick(data, ['abandoned','abandoned_count','abandonedCount']) ?? 0);
      const top = (overrides.top ?? pick(data, ['top','top_count','topCount']) ?? 0);

      // Try to get barcode books count ("In stock") from API; fallback to override if provided.
      let instock = overrides.instock ?? pick(data, ['books_with_barcode','booksWithBarcode','barcodeCount','barcode_count','in_stock','inStock']);
      if (instock == null) {
        try {
          const r = await fetchCountTry(urlsForBarcodeBooks());
          instock = r.count;
        } catch (e) {
          instock = null;
          console.warn('Could not resolve "In stock" count. Consider adding it to /api/public/books/stats as books_with_barcode.', e);
        }
      }

      // Finished books count: prefer explicit key if backend adds it, else try count endpoint, else override.
      let finishedBooks = overrides.finished ?? pick(data, ['finished_books','finishedBooks','finishedBookCount','finished_book_count']);
      if (finishedBooks == null) {
        try {
          const r = await fetchCountTry(urlsForFinishedBooks(year));
          finishedBooks = r.count;
        } catch (e) {
          finishedBooks = null;
          console.warn('Could not resolve finished BOOK count. Your stats API "finished" looks like pages read. Add finished_books to /api/public/books/stats or create a /api/public/books/count?... endpoint.', e);
        }
      }

      // Display with sane fallbacks
      setText('home-year-stats-instock', instock == null ? '—' : String(instock));
      setText('home-year-stats-finished', finishedBooks == null ? '—' : String(finishedBooks));
      setText('home-year-stats-abandoned', String(abandoned ?? 0));
      setText('home-year-stats-top', String(top ?? 0));

      console.log('Year stats API response:', data);

      lastState = 'loaded';
      renderNote();
    } catch (e) {
      setText('home-year-stats-instock', '—');
      setText('home-year-stats-finished', '—');
      setText('home-year-stats-abandoned', '—');
      setText('home-year-stats-top', '—');
      lastState = 'error';
      lastErrMsg = e?.message || String(e);
      renderNote();
    }
  }

  // re-render note on language change
  document.addEventListener('zr:langchange', renderNote);

  window.ZR_HeaderStats = { load };
})();
