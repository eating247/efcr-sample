const fs = require("fs");
const path = require("path");

/**
 * Load agencies data from JSON file
 */
const loadAgenciesData = () => {
  try {
    const agenciesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "agencies.json"), "utf8")
    );
    return agenciesData;
  } catch (error) {
    console.error("Error loading agencies data:", error);
    throw new Error("Failed to load agencies data");
  }
};

/**
 * Find agency by name (including child agencies)
 */
const findAgencyByName = (agencyName, agenciesData) => {
  // First, search in top-level agencies
  let agency = agenciesData.agencies.find(
    (a) =>
      a.name.toLowerCase().includes(agencyName.toLowerCase()) ||
      a.short_name?.toLowerCase().includes(agencyName.toLowerCase())
  );

  // If not found, search in child agencies
  if (!agency) {
    for (const parentAgency of agenciesData.agencies) {
      if (parentAgency.children && parentAgency.children.length > 0) {
        const childAgency = parentAgency.children.find(
          (child) =>
            child.name.toLowerCase().includes(agencyName.toLowerCase()) ||
            child.short_name?.toLowerCase().includes(agencyName.toLowerCase())
        );
        if (childAgency) {
          agency = childAgency;
          break;
        }
      }
    }
  }

  return agency;
};

module.exports = {
  loadAgenciesData,
  findAgencyByName,
};
