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
} = require("../controllers/booksPgController");

// List + search
router.get("/", listBooks);
router.get("/list", listBooks);

// Autocomplete
router.get("/autocomplete", autocomplete);

// Barcode history
router.get("/barcodes/:barcode/history", getBarcodeHistory);

// Read one
router.get("/:id", getBook);

// Create
router.post("/", registerBook);

// Patch
router.patch("/:id", updateBook);

// Delete
router.delete("/:id", dropBook);

module.exports = router;