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

function adminLogin(req, res) {
  const expected = process.env.ADMIN_PASSWORD;
  const { password } = req.body || {};
  if (!expected) return res.status(500).send("ADMIN_PASSWORD not set");

  if (safeEqual(password, expected)) {
    // store password token as httpOnly cookie
    res.cookie("admin_auth", expected, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",         // keep true on https
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false });
}

function adminLogout(req, res) {
  res.clearCookie("admin_auth");
  res.json({ ok: true });
}

module.exports = { adminAuthRequired, adminLogin, adminLogout };