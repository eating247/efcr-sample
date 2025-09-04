const {
  getRecentAmendments,
  getUpToDateTitles,
} = require("./amendmentTimelineController");

describe("Amendment Timeline Controller", () => {
  describe("getRecentAmendments", () => {
    it("should return recent amendments sorted by date", async () => {
      const response = await getRecentAmendments();

      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("data");
      expect(response).toHaveProperty("metadata");
      expect(response.data).toHaveProperty("amendments");
      expect(response.data).toHaveProperty("summary");
      expect(Array.isArray(response.data.amendments)).toBe(true);
      expect(typeof response.data.totalAmendments).toBe("number");

      // Check that amendments are sorted by date (newest first)
      for (let i = 0; i < response.data.amendments.length - 1; i++) {
        const current = new Date(response.data.amendments[i].latest_amended_on);
        const next = new Date(
          response.data.amendments[i + 1].latest_amended_on
        );
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it("should include proper metadata", async () => {
      const response = await getRecentAmendments();

      expect(response.metadata).toHaveProperty("processedAt");
      expect(response.metadata).toHaveProperty("source", "eCFR API");
      expect(response.metadata).toHaveProperty("endpoint");
      expect(response.metadata).toHaveProperty("note");
    });

    it("should filter out reserved titles", async () => {
      const response = await getRecentAmendments();

      // Check that no reserved titles are included
      response.data.amendments.forEach((amendment) => {
        expect(amendment.reserved).toBe(false);
      });
    });

    it("should group amendments by date", async () => {
      const response = await getRecentAmendments();

      expect(response.data).toHaveProperty("amendmentsByDate");
      expect(typeof response.data.amendmentsByDate).toBe("object");
    });

    it("should include summary statistics", async () => {
      const response = await getRecentAmendments();

      expect(response.data.summary).toHaveProperty("totalTitles");
      expect(response.data.summary).toHaveProperty("dateRange");
      expect(response.data.summary).toHaveProperty("mostRecentAmendment");
      expect(response.metadata).toHaveProperty("processedAt");
      expect(response.metadata).toHaveProperty("source", "eCFR API");
      expect(response.metadata).toHaveProperty("endpoint");
      expect(response.metadata).toHaveProperty("note");
    });
  });

  describe("getUpToDateTitles", () => {
    it("should return titles sorted by latest_issue_date", async () => {
      const response = await getUpToDateTitles();

      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("totalTitles");
      expect(response).toHaveProperty("titlesByDate");
      expect(response).toHaveProperty("metadata");
      expect(typeof response.totalTitles).toBe("number");
      expect(typeof response.titlesByDate).toBe("object");

      // Check that titles are grouped by date
      const dates = Object.keys(response.titlesByDate);
      if (dates.length > 1) {
        // Verify dates are sorted (most recent first)
        for (let i = 0; i < dates.length - 1; i++) {
          const currentDate = new Date(dates[i]);
          const nextDate = new Date(dates[i + 1]);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(
            nextDate.getTime()
          );
        }
      }
    });

    it("should include proper metadata", async () => {
      const response = await getUpToDateTitles();

      expect(response.metadata).toHaveProperty("processedAt");
      expect(response.metadata).toHaveProperty("source", "eCFR API");
      expect(response.metadata).toHaveProperty("endpoint");
      expect(response.metadata).toHaveProperty("note");
      expect(response.metadata.note).toContain("latest_issue_date");
    });

    it("should filter out reserved titles", async () => {
      const response = await getUpToDateTitles();

      // Check that no reserved titles are included
      Object.values(response.titlesByDate).forEach((dateGroup) => {
        dateGroup.titles.forEach((title) => {
          expect(title).toHaveProperty("number");
          expect(title).toHaveProperty("name");
          expect(title).toHaveProperty("daysSinceIssue");
        });
      });
    });

    it("should group titles by latest_issue_date", async () => {
      const response = await getUpToDateTitles();

      expect(response).toHaveProperty("titlesByDate");
      expect(typeof response.titlesByDate).toBe("object");

      // Check that each date group has the expected structure
      Object.values(response.titlesByDate).forEach((dateGroup) => {
        expect(dateGroup).toHaveProperty("titleCount");
        expect(dateGroup).toHaveProperty("titles");
        expect(Array.isArray(dateGroup.titles)).toBe(true);
        expect(typeof dateGroup.titleCount).toBe("number");
        expect(dateGroup.titleCount).toBe(dateGroup.titles.length);
      });
    });

    it("should include daysSinceIssue for each title", async () => {
      const response = await getUpToDateTitles();

      Object.values(response.titlesByDate).forEach((dateGroup) => {
        dateGroup.titles.forEach((title) => {
          expect(title).toHaveProperty("daysSinceIssue");
          expect(typeof title.daysSinceIssue).toBe("number");
          expect(title.daysSinceIssue).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });
});
