const request = require("supertest");
const app = require("../server");

describe("Titles Controller", () => {
  describe("GET /api/titles", () => {
    it("should fetch and return CFR titles sorted by date", async () => {
      const response = await request(app).get("/api/titles").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("titles");
      expect(response.body.data).toHaveProperty("metadata");
      expect(Array.isArray(response.body.data.titles)).toBe(true);

      // Check that titles are sorted by date (most recent first)
      const titles = response.body.data.titles;
      if (titles.length > 1) {
        const firstDate = new Date(titles[0].up_to_date_as_of);
        const secondDate = new Date(titles[1].up_to_date_as_of);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(
          secondDate.getTime()
        );
      }

      // Check metadata
      expect(response.body.data.metadata).toHaveProperty("totalTitles");
      expect(response.body.data.metadata).toHaveProperty("mostRecentUpdate");
      expect(response.body.data.metadata).toHaveProperty("fetchedAt");
      expect(response.body.data.metadata).toHaveProperty("source");
    }, 30000); // 30 second timeout for API call
  });

  describe("GET /api/titles/date-range", () => {
    it("should return error when date parameters are missing", async () => {
      const response = await request(app)
        .get("/api/titles/date-range")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Missing parameters");
    });

    it("should filter titles by date range when valid dates provided", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const response = await request(app)
        .get(`/api/titles/date-range?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("titles");
      expect(response.body.data).toHaveProperty("metadata");
      expect(response.body.data.metadata).toHaveProperty("dateRange");
      expect(response.body.data.metadata.dateRange.startDate).toBe(startDate);
      expect(response.body.data.metadata.dateRange.endDate).toBe(endDate);
    }, 30000); // 30 second timeout for API call
  });
});
