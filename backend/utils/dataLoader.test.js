const { loadAgenciesData, findAgencyByName } = require("./dataLoader");

describe("Data Loader Utils", () => {
  describe("loadAgenciesData", () => {
    it("should load agencies data successfully", () => {
      const data = loadAgenciesData();

      expect(data).toHaveProperty("agencies");
      expect(Array.isArray(data.agencies)).toBe(true);
      expect(data.agencies.length).toBeGreaterThan(0);
    });

    it("should return agencies with required properties", () => {
      const data = loadAgenciesData();
      const firstAgency = data.agencies[0];

      expect(firstAgency).toHaveProperty("name");
      expect(firstAgency).toHaveProperty("display_name");
      expect(firstAgency).toHaveProperty("short_name");
      expect(firstAgency).toHaveProperty("slug");
    });
  });

  describe("findAgencyByName", () => {
    let agenciesData;

    beforeEach(() => {
      agenciesData = loadAgenciesData();
    });

    it("should find agency by exact name", () => {
      const agency = findAgencyByName(
        "Federal Communications Commission",
        agenciesData
      );

      expect(agency).toBeDefined();
      expect(agency.name).toBe("Federal Communications Commission");
      expect(agency.short_name).toBe("FCC");
    });

    it("should find agency by short name", () => {
      const agency = findAgencyByName("FCC", agenciesData);

      expect(agency).toBeDefined();
      expect(agency.short_name).toBe("FCC");
    });

    it("should find agency by partial name", () => {
      const agency = findAgencyByName("Communications", agenciesData);

      expect(agency).toBeDefined();
      expect(agency.name).toContain("Communications");
    });

    it("should return undefined for non-existent agency", () => {
      const agency = findAgencyByName("NONEXISTENT_AGENCY", agenciesData);

      expect(agency).toBeUndefined();
    });

    it("should be case insensitive", () => {
      const agency1 = findAgencyByName(
        "federal communications commission",
        agenciesData
      );
      const agency2 = findAgencyByName(
        "FEDERAL COMMUNICATIONS COMMISSION",
        agenciesData
      );

      expect(agency1).toBeDefined();
      expect(agency2).toBeDefined();
      expect(agency1.name).toBe(agency2.name);
    });
  });
});
