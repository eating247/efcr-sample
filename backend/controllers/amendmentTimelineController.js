const agencyRepository = require("../utils/agencyRepository");
const ecfrService = require("../services/ecfrService");

/**
 * Get recent amendments across all CFR titles
 */
const getRecentAmendments = async () => {
  console.log("🔍 Fetching recent amendments from eCFR API...");

  try {
    const titlesData = await ecfrService.fetchTitlesData();

    if (!titlesData.titles || !Array.isArray(titlesData.titles)) {
      throw new Error("Invalid response format from eCFR API");
    }

    // Filter out reserved titles and titles without amendment dates
    const validTitles = titlesData.titles.filter(
      (title) => !title.reserved && title.latest_amended_on
    );

    // Group titles by amendment date
    const amendmentsByDate = {};

    validTitles.forEach((title) => {
      const amendmentDate = title.latest_amended_on;
      const daysSinceAmendment = Math.floor(
        (new Date() - new Date(amendmentDate)) / (1000 * 60 * 60 * 24)
      );

      if (!amendmentsByDate[amendmentDate]) {
        amendmentsByDate[amendmentDate] = {
          amendmentCount: 0,
          titles: [],
        };
      }

      amendmentsByDate[amendmentDate].titles.push({
        number: title.number,
        name: title.name,
        latest_issue_date: title.latest_issue_date,
        daysSinceAmendment: daysSinceAmendment,
      });

      amendmentsByDate[amendmentDate].amendmentCount++;
    });

    // Sort dates (most recent first) and sort titles within each date
    const sortedDates = Object.keys(amendmentsByDate).sort((a, b) => {
      return new Date(b) - new Date(a);
    });

    const sortedAmendmentsByDate = {};
    sortedDates.forEach((date) => {
      // Sort titles within each date by title number
      amendmentsByDate[date].titles.sort((a, b) => a.number - b.number);
      sortedAmendmentsByDate[date] = amendmentsByDate[date];
    });

    const response = {
      success: true,
      totalTitles: validTitles.length,
      amendmentsByDate: sortedAmendmentsByDate,
      metadata: {
        processedAt: new Date().toISOString(),
        source: "eCFR API",
        endpoint: "https://www.ecfr.gov/api/versioner/v1/titles",
        note: "Grouped by amendment date, sorted by most recent first",
      },
    };

    console.log(
      `✅ Successfully fetched ${validTitles.length} titles with recent amendments`
    );

    return response;
  } catch (error) {
    console.error("❌ Error fetching recent amendments:", error);
    throw {
      status: 500,
      error: "Failed to fetch recent amendments",
      message: error.message,
    };
  }
};

/**
 * Get titles sorted by latest_issue_date
 */
const getUpToDateTitles = async () => {
  console.log("🔍 Fetching titles by latest issue date from eCFR API...");

  try {
    const titlesData = await ecfrService.fetchTitlesData();

    if (!titlesData.titles || !Array.isArray(titlesData.titles)) {
      throw new Error("Invalid response format from eCFR API");
    }

    // Filter out reserved titles and titles without latest_issue_date
    const validTitles = titlesData.titles.filter(
      (title) => !title.reserved && title.latest_issue_date
    );

    // Group titles by latest_issue_date
    const titlesByDate = {};

    validTitles.forEach((title) => {
      const issueDate = title.latest_issue_date;
      const daysSinceIssue = Math.floor(
        (new Date() - new Date(issueDate)) / (1000 * 60 * 60 * 24)
      );

      if (!titlesByDate[issueDate]) {
        titlesByDate[issueDate] = {
          titleCount: 0,
          titles: [],
        };
      }

      titlesByDate[issueDate].titles.push({
        number: title.number,
        name: title.name,
        latest_issue_date: title.latest_issue_date,
        latest_amended_on: title.latest_amended_on,
        up_to_date_as_of: title.up_to_date_as_of,
        daysSinceIssue: daysSinceIssue,
      });

      titlesByDate[issueDate].titleCount++;
    });

    // Sort dates (most recent first) and sort titles within each date
    const sortedDates = Object.keys(titlesByDate).sort((a, b) => {
      return new Date(b) - new Date(a);
    });

    const sortedTitlesByDate = {};
    sortedDates.forEach((date) => {
      // Sort titles within each date by title number
      titlesByDate[date].titles.sort((a, b) => a.number - b.number);
      sortedTitlesByDate[date] = titlesByDate[date];
    });

    const response = {
      success: true,
      totalTitles: validTitles.length,
      titlesByDate: sortedTitlesByDate,
      metadata: {
        processedAt: new Date().toISOString(),
        source: "eCFR API",
        endpoint: "https://www.ecfr.gov/api/versioner/v1/titles",
        note: "Grouped by latest_issue_date, sorted by most recent first",
      },
    };

    console.log(
      `✅ Successfully fetched ${validTitles.length} titles sorted by latest issue date`
    );

    return response;
  } catch (error) {
    console.error("❌ Error fetching titles by issue date:", error);
    throw {
      status: 500,
      error: "Failed to fetch titles by issue date",
      message: error.message,
    };
  }
};

module.exports = {
  getRecentAmendments,
  getUpToDateTitles,
};
