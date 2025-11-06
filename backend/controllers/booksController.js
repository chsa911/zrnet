// backend/controllers/booksController.js

const mongoose = require("mongoose");
const { Types } = mongoose;
const Book = require("../models/Book");
const Barcode = require("../models/Barcode");
const SizeRule = require("../models/SizeRule");
const { sizeToPrefixFromDb } = require("../utils/sizeToPrefixFromDb");

/* --------------------------------- helpers -------------------------------- */

const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function stripInvalidId(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if ("_id" in obj) {
    const s = String(obj._id || "");
    if (!Types.ObjectId.isValid(s)) delete obj._id;
  }
  return obj;
}

const toInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const normalizeOrder = (o) => (String(o).toLowerCase() === "asc" ? 1 : -1);

// Whitelist Book fields that are safe to sort by (aligns with your schema)
const SORT_WHITELIST = new Set([
  "BEind",
  "BAutor",
  "BVerlag",
  "BSeiten",
  "BTopAt",
  "BHVorVAt",
  "_id",
]);

function resolveSort(sortByRaw, orderRaw) {
  const sortBy = String(sortByRaw || "").trim();
  const order = normalizeOrder(orderRaw);
  const key = SORT_WHITELIST.has(sortBy) ? sortBy : "BEind";
  return { [key]: order };
}

// tolerant number parsing ("12,4" → 12.4)
const toNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

// get width/height from many shapes (German + aliases)
function getDims(body) {
  const b = body || {};
  const dims = b.dimensions || b.size || {};
  const wRaw = b.width ?? dims.width ?? b.W ?? b.w ?? b.BBreite;
  const hRaw = b.height ?? dims.height ?? b.H ?? b.h ?? b.BHoehe;
  const width = toNum(wRaw);
  const height = toNum(hRaw);
  return { width, height };
}

// derive barcode series from SizeRules (util first, DB fallback)
async function deriveSeries(width, height) {
  let series = null;
  try {
    series = await sizeToPrefixFromDb(width, height); // e.g., "ei" / "eki"
  } catch (_) {
    series = null;
  }
  if (!series) {
    const rule = await SizeRule.findOne({
      $or: [
        {
          "scope.W.min": { $lte: width }, "scope.W.max": { $gte: width },
          "scope.B.min": { $lte: height }, "scope.B.max": { $gte: height },
        },
        {
          minW: { $lte: width }, maxW: { $gte: width },
          minB: { $lte: height }, maxB: { $gte: height },
        },
      ],
    }).lean();

    if (rule) {
      series =
        rule.series ||
        rule.prefix ||
        (Array.isArray(rule.bands) && rule.bands[0] && rule.bands[0].prefix) ||
        null;
    }
  }
  return series ? String(series).toLowerCase() : null;
}

// Choose a FREE barcode (isAvailable: true).
// Prefers an exact requested code if provided, otherwise picks lowest rank (ties by code/_id)
// that matches series or code prefix (and optional stricter prefix).
async function pickFreeBarcode({ series, prefix, requested }) {
  // 1) exact first (if UI sent a suggested code)
  if (requested) {
    const byExact = await Barcode.findOneAndUpdate(
      { isAvailable: true, code: new RegExp(`^${escapeRx(requested)}$`, "i") },
      { $set: { isAvailable: false } },
      { new: true }
    ).lean();
    if (byExact) return byExact;
  }

  // 2) else by series (either explicit series field OR code prefix)
  const seriesOrPrefix = { $or: [{ series }, { code: new RegExp(`^${escapeRx(series)}`, "i") }] };
  const andFilter = [{ isAvailable: true }, seriesOrPrefix];
  if (prefix) andFilter.push({ code: new RegExp(`^${escapeRx(prefix)}`, "i") });

  return await Barcode.findOneAndUpdate(
    { $and: andFilter },
    { $set: { isAvailable: false } },           // flip to used immediately
    { new: true, sort: { rank: 1, code: 1, _id: 1 } }
  ).lean();
}

/* -------------------------------- controllers ----------------------------- */

/**
 * GET /api/books
 * Query: { page=1, limit=20, sortBy, order, q? }
 */
async function listBooks(req, res) {
  try {
    const page = toInt(req.query.page, 1);
    const limit = Math.min(toInt(req.query.limit, 20), 100);
    const sort = resolveSort(req.query.sortBy, req.query.order);

    // Optional text filter
    const q = String(req.query.q || "").trim();
    const filter = {};
    if (q) {
      const rx = new RegExp(escapeRx(q), "i");
      filter.$or = [
        { BAutor: rx },
        { BVerlag: rx },
        { BKw: rx },
        { BKw1: rx },
        { BKw2: rx },
        { BMarkb: rx },
        { barcode: rx },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Book.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Book.countDocuments(filter),
    ]);

    res.json({
      items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
        sort,
      },
    });
  } catch (err) {
    console.error("[listBooks] error:", err);
    res.status(500).json({ error: "Failed to list books" });
  }
}

/**
 * GET /api/books/:id
 */
async function getBook(req, res) {
  try {
    const id = String(req.params.id || "");
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid book id" });
    }
    const doc = await Book.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Book not found" });
    res.json(doc);
  } catch (err) {
    console.error("[getBook] error:", err);
    res.status(500).json({ error: "Failed to get book" });
  }
}

/**
 * POST /api/books
 *
 * Flow:
 *  - derive series from SizeRules (BBreite/BHoehe or width/height)
 *  - pick FREE barcode with lowest rank (ties: code/_id)
 *  - set isAvailable=false on the picked barcode
 *  - create the book with that barcode
 *  - no reservations/assignment/status fields
 */
async function registerBook(req, res) {
  const { prefix, ...bookPayloadRaw } = req.body || {};

  // clean incoming payload (server decides barcode)
  stripInvalidId(bookPayloadRaw);
  const bookPayload = { ...bookPayloadRaw };
  delete bookPayload._id;
  delete bookPayload.barcode;
  delete bookPayload.code;
  delete bookPayload.BMarkb;
  delete bookPayload.barcodeId;
  delete bookPayload.sizeRange; // legacy

  // parse dims
  const { width, height } = getDims(req.body);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return res.status(400).json({ error: "width and height are required (numbers)" });
  }

  // series by rules
  const series = await deriveSeries(width, height);
  if (!series) {
    return res.status(404).json({ error: "No size rule matches the given inputs" });
  }

  // optional: prefer an exact code the UI suggested (from preview)
  const requested = String(
    (req.body && (req.body.barcode || req.body.BMarkb || req.body.code)) || ""
  )
    .trim()
    .toLowerCase();

  // pick FREE barcode
  const picked = await pickFreeBarcode({ series, prefix, requested });
  if (!picked) {
    return res
      .status(409)
      .json({ error: "No barcodes available for the selected size rule/series" });
  }

  // create book with the chosen barcode
  const created = await Book.create({
    ...bookPayload,
    barcode: picked.code,
    BMarkb: bookPayload.BMarkb || picked.code,
  });

  return res.status(201).json({
    book: created,
    barcode: { code: picked.code },
    rule: { series },
  });
}

/**
 * PUT/PATCH /api/books/:id
 */
async function updateBook(req, res) {
  try {
    const id = String(req.params.id || "");
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid book id" });
    }

    stripInvalidId(req.body);

    const update = { ...req.body };
    // Never allow client to change these directly
    delete update._id;
    delete update.barcodeId;
    delete update.barcodeSeries;

    const result = await Book.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();

    if (!result) return res.status(404).json({ error: "Book not found" });

    res.json(result);
  } catch (err) {
    console.error("[updateBook] error:", err);
    res.status(500).json({ error: "Failed to update book" });
  }
}

/**
 * DELETE /api/books/:id
 * (Simple: free any barcodes on this book by making them available again)
 */
async function deleteBook(req, res) {
  try {
    const id = String(req.params.id || "");
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid book id" });
    }

    const book = await Book.findById(id).lean();
    if (!book) return res.status(404).json({ error: "Book not found" });

    const codes = [book.BMarkb, book.barcode].filter(Boolean);
    if (codes.length) {
      try {
        await Barcode.updateMany(
          { code: { $in: codes } },
          { $set: { isAvailable: true } }
        );
      } catch (e) {
        console.error("[deleteBook] freeing barcodes error:", e);
      }
    }

    await Book.deleteOne({ _id: id });

    res.status(204).end();
  } catch (err) {
    console.error("[deleteBook] error:", err);
    res.status(500).json({ error: "Failed to delete book" });
  }
}

/**
 * Optional: HEAD /api/books/available?BBreite=..&BHoehe=..&prefix=ep
 * quick availability check (FREE only)
 */
async function headAvailable(req, res) {
  try {
    const width = toNum(req.query.width ?? req.query.W ?? req.query.BBreite);
    const height = toNum(req.query.height ?? req.query.H ?? req.query.BHoehe);
    const prefix = req.query.prefix;

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return res.sendStatus(400);
    }

    const series = await deriveSeries(width, height);
    if (!series) return res.sendStatus(404);

    const filters = [{ isAvailable: true }, { $or: [{ series }, { code: new RegExp(`^${escapeRx(series)}`, "i") }] }];
    if (prefix) filters.push({ code: new RegExp(`^${escapeRx(prefix)}`, "i") });

    const exists = await Barcode.findOne({ $and: filters }).select({ _id: 1 }).lean();
    return res.sendStatus(exists ? 200 : 404);
  } catch (err) {
    console.error("[headAvailable] error:", err);
    return res.sendStatus(500);
  }
}

module.exports = {
  listBooks,
  getBook,
  registerBook,
  updateBook,
  deleteBook,
  headAvailable,
};
