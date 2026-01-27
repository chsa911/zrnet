// backend/routes/books.js
const express = require("express");
const router = express.Router();

const {
  listBooks,
  autocomplete,
  registerBook,
  updateBook,
} = require("../controllers/booksPgController");

// List + search
router.get("/", listBooks);
router.get("/list", listBooks);

// Autocomplete
router.get("/autocomplete", autocomplete);

// Create
router.post("/", registerBook);

// Patch
router.patch("/:id", updateBook);

module.exports = router;