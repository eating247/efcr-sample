const https = require("https");

/**
 * Fetch titles data from eCFR API
 */
const fetchTitlesData = async () => {
  return new Promise((resolve, reject) => {
    const url = "https://www.ecfr.gov/api/versioner/v1/titles.json";

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(
              new Error(`Failed to parse JSON response: ${error.message}`)
            );
          }
        });
      })
      .on("error", (error) => {
        reject(new Error(`HTTPS request failed: ${error.message}`));
      });
  });
};

class TitlesController {
  /**
   * Fetch all CFR titles from eCFR API and sort by up_to_date_as_of date
   */
  async getTitlesByDate(req, res) {
    try {
      console.log("📋 Fetching CFR titles from eCFR API...");

      const response = await fetchTitlesData();

      if (!response || !response.titles) {
        return res.status(500).json({
          success: false,
          error: "Invalid response structure from eCFR API",
          message: "Expected 'titles' array in response",
        });
      }

      const titles = response.titles;
      console.log(`📊 Retrieved ${titles.length} CFR titles`);

      // Sort titles by up_to_date_as_of date (most recent first)
      const sortedTitles = titles.sort((a, b) => {
        const dateA = new Date(a.up_to_date_as_of);
        const dateB = new Date(b.up_to_date_as_of);
        return dateB - dateA; // Descending order (newest first)
      });

      // Add some metadata for debugging and analytics
      const metadata = {
        totalTitles: sortedTitles.length,
        mostRecentUpdate: sortedTitles[0]?.up_to_date_as_of,
        oldestUpdate: sortedTitles[sortedTitles.length - 1]?.up_to_date_as_of,
        fetchedAt: new Date().toISOString(),
        source: "eCFR Versioner API v1",
      };

      console.log(
        `✅ Titles sorted by date. Most recent: ${metadata.mostRecentUpdate}`
      );

      res.json({
        success: true,
        data: {
          titles: sortedTitles,
          metadata,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching CFR titles:", error.message);

      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch CFR titles",
        details: error.message,
      });
    }
  }

  /**
   * Get titles filtered by a specific date range
   */
  async getTitlesByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Missing parameters",
          message: "Both startDate and endDate query parameters are required",
          example:
            "/api/titles/date-range?startDate=2024-01-01&endDate=2024-12-31",
        });
      }

      // First get all titles
      console.log("📋 Fetching CFR titles for date range filtering...");
      const response = await fetchTitlesData();

      if (!response || !response.titles) {
        return res.status(500).json({
          success: false,
          error: "Invalid response structure from eCFR API",
          message: "Expected 'titles' array in response",
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Filter titles by date range
      const filteredTitles = response.titles.filter((title) => {
        const titleDate = new Date(title.up_to_date_as_of);
        return titleDate >= start && titleDate <= end;
      });

      // Sort filtered titles by date (most recent first)
      const sortedFilteredTitles = filteredTitles.sort((a, b) => {
        const dateA = new Date(a.up_to_date_as_of);
        const dateB = new Date(b.up_to_date_as_of);
        return dateB - dateA; // Descending order (newest first)
      });

      res.json({
        success: true,
        data: {
          titles: sortedFilteredTitles,
          metadata: {
            totalTitles: sortedFilteredTitles.length,
            dateRange: { startDate, endDate },
            filteredFrom: response.titles.length,
            fetchedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error filtering titles by date range:", error.message);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to filter CFR titles by date range",
        details: error.message,
      });
    }
  }
}

const titlesController = new TitlesController();
module.exports = titlesController;
