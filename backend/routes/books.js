// backend/routes/books.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// 👉 hook into your controller
const { registerBook /*, headAvailable, getBook, updateBook, deleteBook */ } =
  require("../controllers/booksController");

/* ---------- Model (use your real model if present) ---------- */
let Book;
try {
  Book = require("../models/Book"); // your schema
} catch {
  // Loose fallback: any fields, collection: 'books'
  const Loose = new mongoose.Schema({}, { strict: false, timestamps: false });
  Book = mongoose.models.Book || mongoose.model("Book", Loose, "books");
}

/* ---------- helpers ---------- */
const toInt = (v, def) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};
const sortDir = (order) => (String(order).toLowerCase() === "asc" ? 1 : -1);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isObjectId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

/* =========================================================
   GET /api/books  (list + search)
========================================================= */
router.get("/", async (req, res, next) => {
  try {
    const page  = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 20);
    const sortBy = req.query.sortBy || req.query.sort || "BEind";
    const order  = req.query.order || req.query.direction || "desc";

    const termRaw = String(
      req.query.q ?? req.query.search ?? req.query.term ?? req.query.s ?? ""
    ).trim();

    const query = {};
    if (termRaw) {
      const rx = new RegExp(escapeRegex(termRaw), "i");
      query.$or = [
        { Titel: rx },
        { BAutor: rx },
        { BVerlag: rx },
        { BKw: rx },
        { barcode: rx },
        { BMark: rx },
        { BMarkb: rx },
      ];
    }

    const sort = { [sortBy]: sortDir(order) };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Book.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Book.countDocuments(query),
    ]);

    res.set("Cache-Control", "no-store");
    return res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   POST /api/books  (create/register)  ✅ this fixes the 404
   (alias /register kept for legacy callers)
========================================================= */
router.post("/", registerBook);
router.post("/register", registerBook);

/* =========================================================
   GET /api/books/autocomplete?field=BAutor&q=har
========================================================= */
router.get("/autocomplete", async (req, res, next) => {
  try {
    const field = String(req.query.field || "").trim();
    const q = String(req.query.q || "").trim();
    if (!field || !q) return res.json([]);

    const rx = new RegExp("^" + escapeRegex(q), "i");
    const pipeline = [
      { $match: { [field]: rx } },
      { $group: { _id: "$" + field } },
      { $project: { value: "$_id", _id: 0 } },
      { $limit: 20 },
    ];

    const rows = await Book.collection.aggregate(pipeline).toArray();
    res.set("Cache-Control", "no-store");
    return res.json(rows.map((r) => r.value).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   PATCH /api/books/:id
========================================================= */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "missing_id" });

    // Build a flexible filter
    let filter;
    if (isObjectId(id)) {
      filter = { _id: new mongoose.Types.ObjectId(id) };
    } else {
      filter = { $or: [{ barcode: id }, { BMark: id }, { BMarkb: id }] };
    }

    // Only allow setting simple fields (extend as you need)
    const patch = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (v === undefined) continue;
      if (["status", "BTop", "Titel", "BAutor", "BVerlag", "BKw", "BSeiten"].includes(k)) {
        patch[k] = v;
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "empty_patch" });
    }

    const updated = await Book.findOneAndUpdate(
      filter,
      { $set: patch },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "not_found" });

    return res.json({ ok: true, item: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
