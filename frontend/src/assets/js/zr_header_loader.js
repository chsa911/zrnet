(() => {
  // Inject header HTML into <div id="zr-header"></div>
  async function loadHeader() {
    const mount = document.getElementById('zr-header');
    if (!mount) return;
    const resp = await fetch('assets/partials/zr_header.html', { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`Header fetch failed: ${resp.status}`);
    mount.innerHTML = await resp.text();

    // Hook up language selector (i18n)
    const sel = document.getElementById('zr-lang-select');
    if (sel && window.ZR_I18N?.getLocale) {
      sel.value = window.ZR_I18N.getLocale();
      sel.addEventListener('change', (e) => window.ZR_I18N.setLocale(e.target.value));
    }

    // Run stats once header is mounted
    if (window.ZR_HeaderStats?.load) window.ZR_HeaderStats.load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadHeader().catch(console.error));
  } else {
    loadHeader().catch(console.error);
  }
})();
