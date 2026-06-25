const express = require("express");
const router = express.Router();

const {
  listBooks,
  getBook,
  autocomplete,
  registerBook,
  updateBook,
  dropBook,
  getBarcodeHistory,
  setHighlight,
  recordBarcodeConflict,
  resolveBarcodeConflict,
} = require("../controllers/booksPgController");

// List + search
router.get("/", listBooks);
router.get("/list", listBooks);

// Autocomplete
router.get("/autocomplete", autocomplete);

// Barcode history
router.get("/barcodes/:barcode/history", getBarcodeHistory);

// Admin: record/resolve a barcode-conflict observation (does not touch
// book_barcodes/barcode_assignments -- see sql/20260625_barcode_conflict_observations.sql)
router.post("/:bookId/barcode-conflict", recordBarcodeConflict);
router.patch("/barcode-conflict/:id/resolve", resolveBarcodeConflict);
//Highlight
router.post("/highlights", setHighlight);
// Read one
router.get("/:id", getBook);

// Create
router.post("/", registerBook);

// Patch
router.patch("/:id", updateBook);

// Delete
router.delete("/:id", dropBook);

module.exports = router;