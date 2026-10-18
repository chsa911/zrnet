// backend/tests/helpers/txHarness.js
//
// Lets tests run the REAL Express handlers against Postgres inside ONE
// transaction that the test rolls back at the end – nothing is persisted.

require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const { Client } = require("pg");

// A pg-Pool look-alike that keeps everything on ONE client / ONE outer
// transaction. pool.connect() hands out a wrapper whose BEGIN/COMMIT/ROLLBACK
// become SAVEPOINT operations, so a failed save really rolls back its part.
function txPool(client) {
  return {
    query: (sql, params) => client.query(sql, params),
    connect: async () => ({
      query: async (sql, params) => {
        const t = typeof sql === "string" ? sql.trim().toUpperCase() : "";
        if (t === "BEGIN") return client.query("SAVEPOINT ctrl_tx");
        if (t === "COMMIT") return client.query("RELEASE SAVEPOINT ctrl_tx");
        if (t === "ROLLBACK") return client.query("ROLLBACK TO SAVEPOINT ctrl_tx").catch(() => {});
        return client.query(sql, params);
      },
      release: () => {},
    }),
  };
}

// Calls an Express handler (req, res) and returns { status, body }.
async function call(handler, pool, { body = {}, params = {}, query = {} } = {}) {
  const out = { status: 200, body: undefined };
  const req = { body, params, query, app: { get: (k) => (k === "pgPool" ? pool : undefined) } };
  const res = {
    status(code) {
      out.status = code;
      return this;
    },
    json(payload) {
      out.body = payload;
      return this;
    },
    set(name, value) {
      out.headers = { ...(out.headers || {}), [String(name).toLowerCase()]: value };
      return this;
    },
    setHeader(name, value) {
      return this.set(name, value);
    },
  };
  await handler(req, res);
  return out;
}

// Handler of an express.Router route, e.g. routeHandler(router, "get", "/preview-barcode").
function routeHandler(router, method, path) {
  const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`route ${method.toUpperCase()} ${path} not found`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle;
}

// Opens a client with an open outer transaction (always ROLLBACK in afterAll).
async function openTx(url) {
  const ssl = /localhost|127\.0\.0\.1|\/tmp/.test(url) ? false : { rejectUnauthorized: false };
  const db = new Client({ connectionString: url, ssl });
  await db.connect();
  await db.query("BEGIN");
  return db;
}

async function closeTx(db) {
  if (!db) return;
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}

module.exports = { txPool, call, routeHandler, openTx, closeTx };
