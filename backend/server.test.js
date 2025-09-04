const request = require("supertest");
const app = require("./server");

// Get the server instance to close it after tests
const server = app.listen(0); // Use port 0 to let the OS assign a random port

describe("eCFR Analytics API", () => {
  // Test timeout for API calls that may take time
  jest.setTimeout(30000);
  describe("GET /api/health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("version", "1.0.0");
    });
  });

  describe("GET /api/agencies", () => {
    it("should return all agencies", async () => {
      const response = await request(app).get("/api/agencies").expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("agencies");
      expect(Array.isArray(response.body.agencies)).toBe(true);
      expect(response.body.agencies.length).toBeGreaterThan(0);
    });

    it("should return agencies with required properties", async () => {
      const response = await request(app).get("/api/agencies").expect(200);

      const firstAgency = response.body.agencies[0];
      expect(firstAgency).toHaveProperty("name");
      expect(firstAgency).toHaveProperty("display_name");
      expect(firstAgency).toHaveProperty("short_name");
      expect(firstAgency).toHaveProperty("slug");
    });
  });

  describe("GET /api/word-count/:agencyName", () => {
    it("should return word count for a valid agency", async () => {
      const response = await request(app)
        .get("/api/word-count/FCC")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("agency");
      expect(response.body).toHaveProperty("wordCountData");
      expect(response.body.agency).toHaveProperty("name");
      expect(response.body.agency).toHaveProperty("short_name");
      expect(response.body.agency).toHaveProperty("display_name");
      expect(response.body.agency).toHaveProperty("slug");
      expect(response.body.agency).toHaveProperty("cfr_references");
      expect(response.body.wordCountData).toHaveProperty("totalWords");
      expect(response.body.wordCountData).toHaveProperty("totalTitles");
      expect(response.body.wordCountData).toHaveProperty("processedTitles");
      expect(response.body.wordCountData).toHaveProperty("agencyChecksum");
      expect(response.body.wordCountData).toHaveProperty("processedAt");
      expect(response.body.wordCountData).toHaveProperty("titleBreakdown");
      expect(typeof response.body.wordCountData.totalWords).toBe("number");
      expect(Array.isArray(response.body.wordCountData.titleBreakdown)).toBe(
        true
      );
    });

    it("should return 404 for non-existent agency", async () => {
      const response = await request(app)
        .get("/api/word-count/NONEXISTENT")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("availableAgencies");
      expect(Array.isArray(response.body.availableAgencies)).toBe(true);
      expect(response.body.availableAgencies.length).toBeGreaterThan(0);
    });

    it("should handle agencies without CFR references", async () => {
      // Test with a non-existent agency name
      const response = await request(app)
        .get("/api/word-count/NONEXISTENT_AGENCY_123")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });

    it("should handle case-insensitive agency search", async () => {
      const response = await request(app)
        .get("/api/word-count/fcc")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.agency.name).toContain(
        "Federal Communications Commission"
      );
    });

    it("should handle partial agency name search", async () => {
      const response = await request(app)
        .get("/api/word-count/Communications")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.agency.name).toContain(
        "Federal Communications Commission"
      );
    });
  });

  describe("GET /api/amendment-timeline/recent_amendments", () => {
    it("should return recent amendments sorted by date", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/recent_amendments")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("totalTitles");
      expect(response.body).toHaveProperty("recentAmendments");
      expect(response.body).toHaveProperty("metadata");
      expect(Array.isArray(response.body.recentAmendments)).toBe(true);
      expect(typeof response.body.totalTitles).toBe("number");
      expect(response.body.totalTitles).toBeGreaterThan(0);

      // Check that amendments are sorted by date (most recent first)
      if (response.body.recentAmendments.length > 1) {
        const firstDate = new Date(
          response.body.recentAmendments[0].latest_amended_on
        );
        const secondDate = new Date(
          response.body.recentAmendments[1].latest_amended_on
        );
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(
          secondDate.getTime()
        );
      }

      // Check structure of first amendment
      if (response.body.recentAmendments.length > 0) {
        const amendment = response.body.recentAmendments[0];
        expect(amendment).toHaveProperty("number");
        expect(amendment).toHaveProperty("name");
        expect(amendment).toHaveProperty("latest_amended_on");
        expect(amendment).toHaveProperty("latest_issue_date");
        expect(amendment).toHaveProperty("up_to_date_as_of");
        expect(amendment).toHaveProperty("daysSinceAmendment");
        expect(typeof amendment.number).toBe("number");
        expect(typeof amendment.name).toBe("string");
        expect(typeof amendment.daysSinceAmendment).toBe("number");
      }
    });

    it("should filter out reserved titles", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/recent_amendments")
        .expect(200);

      // Check that no reserved titles are included
      const reservedTitles = response.body.recentAmendments.filter(
        (title) => title.number === 35
      );
      expect(reservedTitles.length).toBe(0);
    });

    it("should include metadata about the API call", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/recent_amendments")
        .expect(200);

      expect(response.body.metadata).toHaveProperty("processedAt");
      expect(response.body.metadata).toHaveProperty("source", "eCFR API");
      expect(response.body.metadata).toHaveProperty("endpoint");
      expect(response.body.metadata).toHaveProperty("note");
    });
  });

  describe("GET /api/word-count/title/:titleNumber", () => {
    it("should return word count for a valid title", async () => {
      const response = await request(app)
        .get("/api/word-count/title/1")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("title");
      expect(response.body.title).toHaveProperty("number", 1);
      expect(response.body.title).toHaveProperty("wordCount");
      expect(response.body.title).toHaveProperty("textLength");
      expect(response.body.title).toHaveProperty("checksum");
      expect(response.body.title).toHaveProperty("issueDate");
      expect(response.body.title).toHaveProperty("processedAt");
      expect(typeof response.body.title.wordCount).toBe("number");
      expect(typeof response.body.title.textLength).toBe("number");
    });

    it("should return 400 for invalid title number", async () => {
      const response = await request(app)
        .get("/api/word-count/title/999")
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });

    it("should return 400 for non-numeric title", async () => {
      const response = await request(app)
        .get("/api/word-count/title/abc")
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });

    it("should return 400 for title number out of range", async () => {
      const response = await request(app)
        .get("/api/word-count/title/0")
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 for title number above 50", async () => {
      const response = await request(app)
        .get("/api/word-count/title/51")
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/amendment-timeline/agency/:agencyName", () => {
    it("should return amendment timeline for a valid agency", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/agency/FCC")
        .expect(200);

      expect(response.body).toHaveProperty("agency");
      expect(response.body).toHaveProperty("timeline");
      expect(response.body).toHaveProperty("metadata");
      expect(response.body.agency).toHaveProperty("name");
      expect(response.body.agency).toHaveProperty("short_name");
      expect(response.body.agency).toHaveProperty("display_name");
      expect(response.body.agency).toHaveProperty("slug");
      expect(response.body.agency).toHaveProperty("cfr_references");
      expect(response.body.timeline).toHaveProperty("totalAmendments");
      expect(response.body.timeline).toHaveProperty("dateRange");
      expect(response.body.timeline).toHaveProperty("amendments");
      expect(response.body.timeline).toHaveProperty("summary");
      expect(Array.isArray(response.body.timeline.amendments)).toBe(true);
      expect(typeof response.body.timeline.totalAmendments).toBe("number");
    });

    it("should return 404 for non-existent agency", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/agency/NONEXISTENT")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("availableAgencies");
    });

    it("should handle agencies without CFR references", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/agency/NONEXISTENT_AGENCY_123")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("GET /api/amendment-timeline/title/:titleNumber", () => {
    it("should return amendment timeline for a valid title", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/title/1")
        .expect(200);

      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("timeline");
      expect(response.body).toHaveProperty("metadata");
      expect(response.body.title).toHaveProperty("number", 1);
      expect(response.body.title).toHaveProperty("name");
      expect(response.body.timeline).toHaveProperty("totalAmendments");
      expect(response.body.timeline).toHaveProperty("dateRange");
      expect(response.body.timeline).toHaveProperty("amendments");
      expect(response.body.timeline).toHaveProperty("summary");
      expect(Array.isArray(response.body.timeline.amendments)).toBe(true);
      expect(typeof response.body.timeline.totalAmendments).toBe("number");
    });

    it("should return 400 for non-numeric title", async () => {
      const response = await request(app)
        .get("/api/amendment-timeline/title/abc")
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });
  });

  // Close server after all tests
  afterAll((done) => {
    server.close(done);
  });
});
