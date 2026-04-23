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

const toNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

function getDims(body) {
  const b = body || {};
  const dims = b.dimensions || b.size || {};
  const wRaw = b.width ?? dims.width ?? b.W ?? b.w ?? b.BBreite;
  const hRaw = b.height ?? dims.height ?? b.H ?? b.h ?? b.BHoehe;
  return {
    width: toNum(wRaw),
    height: toNum(hRaw),
  };
}

/* ------------------------------- MAIN FIX ---------------------------------- */

async function registerBook(req, res) {
  const { prefix, ...bookPayloadRaw } = req.body || {};

  stripInvalidId(bookPayloadRaw);

  const assignBarcode = req.body?.assign_barcode !== false; 
  // 🔥 DEFAULT = true (Desktop)
  // Safari sendet false

  const bookPayload = { ...bookPayloadRaw };

  delete bookPayload._id;
  delete bookPayload.barcode;
  delete bookPayload.code;
  delete bookPayload.BMarkb;

  /* ---------------- SAFARI MODE ---------------- */
  if (!assignBarcode) {
    // ✅ KEIN width/height notwendig
    // ✅ KEIN Barcode notwendig

    const created = await Book.create({
      ...bookPayload,
      barcode: null,
      BMarkb: null,
    });

    return res.status(201).json({
      book: created,
      barcode: null,
      rule: null,
    });
  }

  /* ---------------- DESKTOP MODE ---------------- */

  const { width, height } = getDims(req.body);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return res.status(400).json({
      error: "width and height are required",
    });
  }

  let series = null;
  try {
    series = await sizeToPrefixFromDb(width, height);
  } catch (_) {}

  if (!series) {
    const rule = await SizeRule.findOne({
      minW: { $lte: width },
      maxW: { $gte: width },
      minB: { $lte: height },
      maxB: { $gte: height },
    }).lean();

    if (rule) {
      series = rule.series || rule.prefix;
    }
  }

  if (!series) {
    return res.status(404).json({
      error: "No size rule matches",
    });
  }

  const picked = await Barcode.findOneAndUpdate(
    {
      isAvailable: true,
      $or: [
        { series },
        { code: new RegExp(`^${escapeRx(series)}`, "i") },
      ],
    },
    { $set: { isAvailable: false } },
    { new: true, sort: { rank: 1, code: 1 } }
  ).lean();

  if (!picked) {
    return res.status(409).json({
      error: "No barcodes available",
    });
  }

  const created = await Book.create({
    ...bookPayload,
    barcode: picked.code,
    BMarkb: picked.code,
  });

  return res.status(201).json({
    book: created,
    barcode: { code: picked.code },
    rule: { series },
  });
}

/* -------------------------------- exports -------------------------------- */

module.exports = {
  registerBook,
};