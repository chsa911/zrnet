const crypto = require("crypto");

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function adminAuthRequired(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).send("ADMIN_PASSWORD not set");

  const token = req.cookies?.admin_auth;
  if (token && safeEqual(token, expected)) return next();

  return res.status(401).send("Unauthorized");
}

/**
 * The phone app (ZrNetMobile) has no admin cookie. It may only push changes
 * to the sync endpoint, authenticated with `Authorization: Bearer <token>`
 * where the token equals MOBILE_SYNC_TOKEN. Unset/empty token = disabled.
 */
function mobileSyncTokenOk(req) {
  const expected = String(process.env.MOBILE_SYNC_TOKEN || "").trim();
  if (!expected) return false;
  const header = String(req.headers?.authorization || "");
  const m = header.match(/^Bearer\s+(.+)$/i);
  return !!m && safeEqual(m[1].trim(), expected);
}

function adminLogin(req, res) {
  const expected = process.env.ADMIN_PASSWORD;
  const { password } = req.body || {};
  if (!expected) return res.status(500).send("ADMIN_PASSWORD not set");

  if (safeEqual(password, expected)) {
    // store password token as httpOnly cookie
    res.cookie("admin_auth", expected, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false });
}

function adminLogout(req, res) {
  res.clearCookie("admin_auth", { path: "/" });
  res.json({ ok: true });
}

module.exports = { adminAuthRequired, adminLogin, adminLogout, mobileSyncTokenOk };
