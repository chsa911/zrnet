const express = require("express");
const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

router.post("/subscribe", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool_missing" });

  const email = String(req.body?.email || "").trim();
  const emailNorm = email.toLowerCase();
  const consent = Boolean(req.body?.consent);

  if (!isValidEmail(email)) return res.status(400).json({ error: "invalid_email" });
  if (!consent) return res.status(400).json({ error: "consent_required" });

  await pool.query(
    `INSERT INTO public.newsletter_subscriptions (email, email_norm, created_at)
     VALUES ($1, $2, now())
     ON CONFLICT (email_norm) DO NOTHING`,
    [email, emailNorm]
  );

  return res.json({ ok: true });
});

module.exports = router;