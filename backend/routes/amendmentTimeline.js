const express = require("express");
const router = express.Router();
const {
  getRecentAmendments,
  getUpToDateTitles,
} = require("../controllers/amendmentTimelineController");

/**
 * Get recent amendments across all CFR titles
 */
router.get("/", async (req, res) => {
  try {
    const response = await getRecentAmendments();
    res.json(response);
  } catch (error) {
    console.error("❌ Error processing recent amendments request:", error);

    if (error.status) {
      res.status(error.status).json({
        success: false,
        error: error.error,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to process recent amendments request",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
});

/**
 * Get titles sorted by latest_issue_date
 */
router.get("/issue-date", async (req, res) => {
  try {
    const response = await getUpToDateTitles();
    res.json(response);
  } catch (error) {
    console.error("❌ Error processing up-to-date titles request:", error);

    if (error.status) {
      res.status(error.status).json({
        success: false,
        error: error.error,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to process up-to-date titles request",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
});

module.exports = router;
