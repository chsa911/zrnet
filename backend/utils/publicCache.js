// backend/utils/publicCache.js
//
// In-memory cache for the public, read-only book endpoints
// (GET /api/public/books/:id and /:id/comments).
//
// Why: the database runs on Neon (free plan, paid per compute hour) and
// sleeps after 5 minutes without a query. Search-engine crawlers fetch a
// book page every few minutes around the clock, so without this cache the
// database never sleeps. With it, crawlers and visitors are served from
// memory; the database is only queried
//   - once a day by jobs/warmPublicCache.js (refreshes every book page),
//   - for a page nobody has asked for since the last refresh,
//   - when an admin change touches a book (that book is dropped from the
//     cache, see invalidateBook / the middleware in app.js).
//
// Entries never expire by age on their own: an expiry would mean the next
// crawler hit wakes the database. Freshness comes from the daily refresh and
// the invalidation on writes instead.

const MAX_ENTRIES = Number(process.env.PUBLIC_CACHE_MAX || 50000);

const store = new Map(); // key -> { at, status, body }

function get(key) {
  return store.get(key) || null;
}

function set(key, status, body) {
  if (store.has(key)) store.delete(key);
  else if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
  store.set(key, { at: Date.now(), status, body });
}

/** Drop every entry that belongs to this book (all languages, comments). */
function invalidateBook(bookId) {
  const id = String(bookId || "").toLowerCase();
  if (!id) return 0;
  let n = 0;
  for (const key of store.keys()) {
    if (key.toLowerCase().includes(`:${id}|`)) {
      store.delete(key);
      n++;
    }
  }
  return n;
}

function invalidatePrefix(prefix) {
  let n = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      n++;
    }
  }
  return n;
}

function dropOlderThan(ms) {
  const limit = Date.now() - ms;
  let n = 0;
  for (const [key, v] of store) {
    if (v.at < limit) {
      store.delete(key);
      n++;
    }
  }
  return n;
}

/**
 * Express middleware: serve the JSON response from the cache, or let the
 * handler run and remember its answer (200 and 404 only).
 * keyFn(req) returns the cache key, or null to skip caching for this request.
 */
function cacheJson(keyFn) {
  return (req, res, next) => {
    const key = keyFn(req);
    if (!key) return next();

    const hit = get(key);
    if (hit) {
      res.set("X-Cache", "HIT");
      return res.status(hit.status).json(hit.body);
    }

    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 || res.statusCode === 404) set(key, res.statusCode, body);
      res.set("X-Cache", "MISS");
      return json(body);
    };
    return next();
  };
}

function stats() {
  return { entries: store.size, max: MAX_ENTRIES };
}

module.exports = {
  get,
  set,
  invalidateBook,
  invalidatePrefix,
  dropOlderThan,
  cacheJson,
  stats,
  _store: store,
};
