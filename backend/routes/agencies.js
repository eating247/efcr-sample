const express = require("express");
const router = express.Router();
const agencyRepository = require("../utils/agencyRepository");

/**
 * Get all agencies
 */
router.get("/", async (req, res) => {
  try {
    const agenciesData = await agencyRepository.getAllAgencies();

    res.json({
      success: true,
      count: agenciesData.count,
      agencies: agenciesData.agencies,
    });
  } catch (error) {
    console.error("Error loading agencies:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load agencies data",
    });
  }
});

module.exports = router;
