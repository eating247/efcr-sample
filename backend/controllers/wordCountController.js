const { CFRXMLWordCounter } = require("../services/wordcounter.js");
const agencyRepository = require("../utils/agencyRepository");

// Initialize word counter
const wordCounter = new CFRXMLWordCounter();

/**
 * Get word count for an agency's CFR references
 */
const getAgencyWordCount = async (agencyName) => {
  console.log(`🔍 Processing word count request for: ${agencyName}`);

  const agency = await agencyRepository.findAgencyByName(agencyName);

  if (!agency) {
    throw {
      status: 404,
      error: `Agency "${agencyName}" not found`,
      message: "Try searching for a partial name or short name",
      availableAgencies: agenciesData.agencies.slice(0, 10).map((a) => ({
        name: a.name,
        short_name: a.short_name,
        slug: a.slug,
      })),
    };
  }

  if (!agency.cfr_references || agency.cfr_references.length === 0) {
    throw {
      status: 404,
      error: `Agency "${agency.name}" has no CFR references`,
      agency: {
        name: agency.name,
        short_name: agency.short_name,
        slug: agency.slug,
      },
    };
  }

  console.log(`🎯 Found agency: ${agency.name}`);
  console.log(
    `📋 CFR References: ${agency.cfr_references
      .map((ref) => `Title ${ref.title}`)
      .join(", ")}`
  );

  // Process the agency to get real word counts
  const results = await wordCounter.processAgency(agency);

  // Check for changes
  const changeInfo = await wordCounter.checkAgencyChanges(agencyName);

  const response = {
    success: true,
    agency: {
      name: agency.name,
      short_name: agency.short_name,
      display_name: agency.display_name,
      slug: agency.slug,
      cfr_references: agency.cfr_references,
    },
    wordCountData: {
      totalWords: results.totalWords,
      totalTitles: results.totalTitles,
      processedTitles: results.titleResults.filter((r) => !r.error).length,
      agencyChecksum: results.agencyChecksum,
      processedAt: results.processedAt,
      titleBreakdown: results.titleResults.map((result) => ({
        title: result.title,
        wordCount: result.wordCount,
        textLength: result.textLength,
        checksum: result.checksum,
        issueDate: result.issueDate,
        error: result.error || null,
      })),
    },
    changeDetection: {
      hasChanged: changeInfo.changed,
      oldChecksum: changeInfo.oldChecksum,
      newChecksum: changeInfo.newChecksum,
      oldWordCount: changeInfo.oldWordCount,
      newWordCount: changeInfo.newWordCount,
      reason: changeInfo.reason,
    },
    metadata: {
      processingTime: new Date().toISOString(),
      source: "eCFR API",
      note: "Real-time word count from official CFR XML data",
      cached: !changeInfo.changed && changeInfo.oldChecksum,
    },
  };

  console.log(
    `✅ Successfully processed ${
      agency.name
    }: ${results.totalWords.toLocaleString()} total words`
  );

  return response;
};

/**
 * Get word count for a specific CFR title
 */
const getTitleWordCount = async (titleNumber) => {
  console.log(`🔍 Processing word count for CFR Title ${titleNumber}`);

  // Process the specific title
  const result = await wordCounter.processCFRTitle(titleNumber);

  if (result.error) {
    throw {
      status: 404,
      error: `Failed to process Title ${titleNumber}`,
      message: result.error,
      title: titleNumber,
    };
  }

  const response = {
    success: true,
    title: {
      number: titleNumber,
      wordCount: result.wordCount,
      textLength: result.textLength,
      checksum: result.checksum,
      issueDate: result.issueDate,
      processedAt: result.processedAt,
    },
    metadata: {
      processingTime: new Date().toISOString(),
      source: "eCFR API",
      note: "Real-time word count from official CFR XML data",
    },
  };

  console.log(
    `✅ Successfully processed Title ${titleNumber}: ${result.wordCount.toLocaleString()} words`
  );

  return response;
};

module.exports = {
  getAgencyWordCount,
  getTitleWordCount,
};
