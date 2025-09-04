const express = require("express");
const router = express.Router();
const { CFRXMLWordCounter } = require("../services/wordcounter");

// Create a single instance to avoid multiple cache instances
let wordCounter;
try {
  wordCounter = new CFRXMLWordCounter();
} catch (error) {
  console.error("Failed to initialize CFRXMLWordCounter:", error);
}

/**
 * Get cache statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await wordCounter.getCacheStats();
    res.json({
      success: true,
      stats,
      metadata: {
        timestamp: new Date().toISOString(),
        note: "Cache statistics for word count data",
      },
    });
  } catch (error) {
    console.error("❌ Error getting cache stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get cache statistics",
      message: error.message,
    });
  }
});

/**
 * Clear expired cache entries
 */
router.delete("/expired", async (req, res) => {
  try {
    const cleared = await wordCounter.clearExpiredCache();
    res.json({
      success: true,
      cleared,
      message: `Cleared ${cleared} expired cache entries`,
      metadata: {
        timestamp: new Date().toISOString(),
        note: "Expired cache entries have been removed",
      },
    });
  } catch (error) {
    console.error("❌ Error clearing expired cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear expired cache",
      message: error.message,
    });
  }
});

/**
 * Check for changes in a specific agency
 */
router.get("/changes/:agencyName", async (req, res) => {
  try {
    const { agencyName } = req.params;
    const changeInfo = await wordCounter.checkAgencyChanges(agencyName);

    res.json({
      success: true,
      agencyName,
      changeInfo,
      metadata: {
        timestamp: new Date().toISOString(),
        note: "Change detection for agency word count data",
      },
    });
  } catch (error) {
    console.error(
      `❌ Error checking changes for ${req.params.agencyName}:`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Failed to check for changes",
      message: error.message,
    });
  }
});

module.exports = router;
