// backend/routes/books.js
const express = require("express");
const router = express.Router();

const {
  listBooks,
  getBook,
  autocomplete,
  registerBook,
  updateBook,
  dropBook, // ✅ add this
} = require("../controllers/booksPgController");

// List + search
router.get("/", listBooks);
router.get("/list", listBooks);

// Autocomplete
router.get("/autocomplete", autocomplete);

// Read one
router.get("/:id", getBook);

// Create
router.post("/", registerBook);

// Patch
router.patch("/:id", updateBook);

// ✅ Drop / delete
router.delete("/:id", dropBook);

module.exports = router;