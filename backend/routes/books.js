const express = require("express");
const router = express.Router();

const {
  listBooks,
  getBook,
  autocomplete,
  registerBook,
  updateBook,
  dropBook,
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

// Delete
router.delete("/:id", dropBook);

module.exports = router;