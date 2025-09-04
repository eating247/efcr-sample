const express = require("express");
const router = express.Router();
const {
  getAgencyWordCount,
  getTitleWordCount,
} = require("../controllers/wordCountController");
const { CFRXMLWordCounter } = require("../services/wordcounter");

/**
 * Get word count for an agency's CFR references
 */
router.get("/:agencyName", async (req, res) => {
  try {
    const agencyName = req.params.agencyName;
    const response = await getAgencyWordCount(agencyName);
    res.json(response);
  } catch (error) {
    console.error("❌ Error processing word count request:", error);

    if (error.status) {
      res.status(error.status).json({
        success: false,
        error: error.error,
        message: error.message,
        ...(error.availableAgencies && {
          availableAgencies: error.availableAgencies,
        }),
        ...(error.agency && { agency: error.agency }),
        ...(error.title && { title: error.title }),
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to process word count request",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
});

/**
 * GET /api/word-count/title/:titleNumber
 * Get word count for a specific CFR title (entire title)
 */
router.get("/title/:titleNumber", async (req, res) => {
  try {
    const { titleNumber } = req.params;

    console.log(`📊 Processing word count for Title ${titleNumber}`);

    const wordCounter = new CFRXMLWordCounter();
    const result = await wordCounter.processCFRTitle(parseInt(titleNumber));

    if (result && !result.error) {
      res.json({
        success: true,
        data: {
          title: titleNumber,
          wordCount: result.wordCount,
          checksum: result.checksum,
          textLength: result.textLength,
          issueDate: result.issueDate,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          cached: result.cached || false,
          changeDetection: result.changeDetection || null,
          note: `Word count for CFR Title ${titleNumber}`,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Title ${titleNumber} not found or could not be processed`,
      });
    }
  } catch (error) {
    console.error(
      `❌ Error processing title ${req.params.titleNumber}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: "Failed to process title word count",
    });
  }
});

/**
 * GET /api/word-count/title/:titleNumber/chapter/:chapter
 * Get word count for a specific chapter within a CFR title
 */
router.get("/title/:titleNumber/chapter/:chapter", async (req, res) => {
  try {
    const { titleNumber, chapter } = req.params;

    console.log(
      `📊 Processing word count for Title ${titleNumber}, Chapter ${chapter}`
    );

    const wordCounter = new CFRXMLWordCounter();
    const result = await wordCounter.processCFRTitleChapter(
      parseInt(titleNumber),
      chapter
    );

    if (result && !result.error) {
      res.json({
        success: true,
        data: {
          title: titleNumber,
          chapter: chapter,
          wordCount: result.wordCount,
          checksum: result.checksum,
          textLength: result.textLength,
          issueDate: result.issueDate,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          cached: result.cached || false,
          changeDetection: result.changeDetection || null,
          note: `Word count for CFR Title ${titleNumber}, Chapter ${chapter}`,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Title ${titleNumber}, Chapter ${chapter} not found or could not be processed`,
      });
    }
  } catch (error) {
    console.error(
      `❌ Error processing title ${req.params.titleNumber}, chapter ${req.params.chapter}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: "Failed to process chapter word count",
    });
  }
});

module.exports = router;
