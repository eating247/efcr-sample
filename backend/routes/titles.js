const express = require("express");
const titlesController = require("../controllers/titlesController");

const router = express.Router();

/**
 * GET /api/titles
 * Fetch all CFR titles sorted by up_to_date_as_of date (most recent first)
 */
router.get("/", titlesController.getTitlesByDate);

/**
 * GET /api/titles/date-range
 * Fetch CFR titles filtered by date range
 * Query params: startDate, endDate (YYYY-MM-DD format)
 */
router.get("/date-range", titlesController.getTitlesByDateRange);

module.exports = router;
