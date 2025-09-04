const {
  getAgencyWordCount,
  getTitleWordCount,
} = require("./wordCountController");

describe("Word Count Controller", () => {
  describe("getAgencyWordCount", () => {
    it("should return word count for a valid agency", async () => {
      const response = await getAgencyWordCount("FCC");

      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("agency");
      expect(response).toHaveProperty("wordCountData");
      expect(response.agency).toHaveProperty("name");
      expect(response.wordCountData).toHaveProperty("totalWords");
      expect(typeof response.wordCountData.totalWords).toBe("number");
    });

    it("should throw error for non-existent agency", async () => {
      await expect(
        getAgencyWordCount("NONEXISTENT_AGENCY")
      ).rejects.toMatchObject({
        status: 404,
        error: 'Agency "NONEXISTENT_AGENCY" not found',
      });
    });

    it("should throw error for agency without CFR references", async () => {
      // This test assumes there's an agency without CFR references
      // You might need to adjust based on your actual data
      await expect(getAgencyWordCount("INVALID")).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("getTitleWordCount", () => {
    it("should return word count for a valid title", async () => {
      const response = await getTitleWordCount(1);

      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("title");
      expect(response.title).toHaveProperty("number", 1);
      expect(response.title).toHaveProperty("wordCount");
      expect(typeof response.title.wordCount).toBe("number");
    });

    it("should throw error for invalid title number", async () => {
      await expect(getTitleWordCount(999)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
