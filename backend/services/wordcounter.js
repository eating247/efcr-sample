// CFR XML Word Counter - Downloads XML via official eCFR API
const https = require("https");
const WordCountCache = require("../utils/cache");
const ecfrService = require("./ecfrService");
const agencyRepository = require("../utils/agencyRepository");

class CFRXMLWordCounter {
  constructor() {
    this.baseURL = "https://www.ecfr.gov";
    this.titleInfo = new Map(); // Cache title information
    this.cache = new WordCountCache();
  }

  // Fetch title metadata to get latest_issue_date
  async fetchTitleInfo(title) {
    // Check cache first
    if (this.titleInfo.has(title)) {
      return this.titleInfo.get(title);
    }

    console.log(`📋 Fetching metadata for Title ${title}...`);

    try {
      const titleData = await ecfrService.fetchTitleInfo(title);

      // Handle reserved titles
      if (titleData.reserved) {
        throw new Error(`Title ${title} is reserved and has no content`);
      }

      console.log(`📅 Title ${title} (${titleData.name})`);
      console.log(`   Latest issue date: ${titleData.latest_issue_date}`);
      console.log(`   Latest amended: ${titleData.latest_amended_on}`);

      // Cache the result
      this.titleInfo.set(title, titleData);

      return titleData;
    } catch (error) {
      throw new Error(`Failed to fetch title info: ${error.message}`);
    }
  }

  // Download XML from eCFR versioner API using correct date
  async downloadTitleXML(title) {
    try {
      // First, get the title metadata to find the correct date
      const titleData = await this.fetchTitleInfo(title);
      const issueDate = titleData.latest_issue_date;

      console.log(`📡 Using issue date ${issueDate} for Title ${title}`);

      const url = `${this.baseURL}/api/versioner/v1/full/${issueDate}/title-${title}.xml`;
      console.log(`📡 Downloading XML: ${url}`);

      return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
          let data = "";

          console.log(`📊 Status: ${response.statusCode}`);
          console.log(`📏 Content-Type: ${response.headers["content-type"]}`);

          if (response.statusCode !== 200) {
            reject(
              new Error(
                `HTTP ${response.statusCode}: ${response.statusMessage}`
              )
            );
            return;
          }

          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            console.log(
              `✅ Downloaded ${(data.length / 1024 / 1024).toFixed(
                2
              )} MB of XML`
            );
            resolve(data);
          });
        });

        request.on("error", reject);

        // Set timeout for large files
        request.setTimeout(30000, () => {
          request.destroy();
          reject(new Error("Request timeout"));
        });
      });
    } catch (error) {
      throw new Error(`Failed to download Title ${title}: ${error.message}`);
    }
  }

  // Extract text content from CFR XML based on real structure
  extractTextFromXML(xmlContent) {
    console.log("🔍 Extracting text from CFR XML...");

    // Strategy: Extract text from <P> tags (main content) and <HEAD> tags (titles)
    // Skip metadata tags like <AUTH>, <SOURCE>, <CITA>, etc.

    let extractedParts = [];

    // Extract all <P> tag content (main regulation text)
    const pTagMatches = xmlContent.match(/<P[^>]*>(.*?)<\/P>/gs) || [];
    console.log(
      `📄 Found ${pTagMatches.length} <P> tags with regulation content`
    );

    pTagMatches.forEach((pTag) => {
      // Remove the <P> wrapper and extract inner content
      let content = pTag.replace(/<\/?P[^>]*>/g, "");

      // Handle nested tags within <P> (like <I>, <E> for formatting)
      content = content.replace(/<\/?[IE][^>]*>/g, ""); // Remove <I> and <E> tags
      content = content.replace(/<[^>]*>/g, " "); // Remove any other nested tags

      // Decode HTML entities
      content = content.replace(/&lt;/g, "<");
      content = content.replace(/&gt;/g, ">");
      content = content.replace(/&amp;/g, "&");
      content = content.replace(/&quot;/g, '"');
      content = content.replace(/&apos;/g, "'");

      // Clean up whitespace
      content = content.replace(/\s+/g, " ").trim();

      if (content.length > 5) {
        // Only include substantial content
        extractedParts.push(content);
      }
    });

    // Extract <HEAD> tag content (section titles and headings)
    const headTagMatches = xmlContent.match(/<HEAD[^>]*>(.*?)<\/HEAD>/gs) || [];
    console.log(`📋 Found ${headTagMatches.length} <HEAD> tags with titles`);

    headTagMatches.forEach((headTag) => {
      let content = headTag.replace(/<\/?HEAD[^>]*>/g, "");
      content = content.replace(/<[^>]*>/g, " "); // Remove any nested tags
      content = content.replace(/\s+/g, " ").trim();

      if (content.length > 3) {
        // Include titles
        extractedParts.push(content);
      }
    });

    // Combine all extracted text
    const fullText = extractedParts.join(" ").trim();

    console.log(`📊 Extraction Results:`);
    console.log(`  • Processed ${pTagMatches.length} regulation paragraphs`);
    console.log(`  • Processed ${headTagMatches.length} headings/titles`);
    console.log(`  • Total extracted text: ${fullText.length} characters`);

    // Show sample of extracted content
    if (fullText.length > 0) {
      console.log(`  • Sample: "${fullText.substring(0, 150)}..."`);
    }

    return fullText;
  }

  // Extract text content from a specific chapter in CFR XML
  extractChapterFromXML(xmlContent, targetChapter) {
    console.log(`🔍 Extracting Chapter ${targetChapter} from CFR XML...`);

    // CFR XML structure typically has chapters as major divisions
    // Look for chapter markers in various possible formats
    const chapterPatterns = [
      // Pattern 1: <CHAPTER> tag with number attribute or content
      new RegExp(
        `<CHAPTER[^>]*>${targetChapter}[^<]*</CHAPTER>([\\s\\S]*?)(?=<CHAPTER|$)`,
        "i"
      ),
      // Pattern 2: Chapter heading in <HEAD> tags
      new RegExp(
        `<HEAD[^>]*>\\s*CHAPTER\\s+${targetChapter}[^<]*</HEAD>([\\s\\S]*?)(?=<HEAD[^>]*>\\s*CHAPTER|$)`,
        "i"
      ),
      // Pattern 3: Chapter as part of structure with Roman numerals
      new RegExp(
        `<HEAD[^>]*>\\s*CHAPTER\\s+${this.toRoman(
          targetChapter
        )}[^<]*</HEAD>([\\s\\S]*?)(?=<HEAD[^>]*>\\s*CHAPTER|$)`,
        "i"
      ),
      // Pattern 4: Simple chapter division markers
      new RegExp(
        `Chapter\\s+${targetChapter}[^\\w]([\\s\\S]*?)(?=Chapter\\s+\\d+|$)`,
        "i"
      ),
    ];

    let chapterContent = null;
    let patternUsed = null;

    // Try each pattern until we find a match
    for (let i = 0; i < chapterPatterns.length; i++) {
      const match = xmlContent.match(chapterPatterns[i]);
      if (match && match[1]) {
        chapterContent = match[1];
        patternUsed = i + 1;
        console.log(
          `📋 Found Chapter ${targetChapter} using pattern ${patternUsed}`
        );
        break;
      }
    }

    // If no specific chapter pattern found, try a more general approach
    if (!chapterContent) {
      console.log(
        `⚠️  No specific chapter pattern found, trying general extraction...`
      );

      // Look for any content that mentions the chapter
      const generalPattern = new RegExp(
        `([\\s\\S]*?Chapter\\s+${targetChapter}[\\s\\S]*?)(?=Chapter\\s+(?:${
          parseInt(targetChapter) + 1
        }|\\d+)|$)`,
        "i"
      );
      const generalMatch = xmlContent.match(generalPattern);

      if (generalMatch && generalMatch[1]) {
        chapterContent = generalMatch[1];
        patternUsed = "general";
        console.log(`📋 Found Chapter ${targetChapter} using general pattern`);
      }
    }

    if (!chapterContent) {
      console.log(`❌ Chapter ${targetChapter} not found in XML`);
      return "";
    }

    // Now extract text from the chapter content using the same logic as extractTextFromXML
    let extractedParts = [];

    // Extract all <P> tag content within the chapter
    const pTagMatches = chapterContent.match(/<P[^>]*>(.*?)<\/P>/gs) || [];
    console.log(
      `📄 Found ${pTagMatches.length} <P> tags in Chapter ${targetChapter}`
    );

    pTagMatches.forEach((pTag) => {
      let content = pTag.replace(/<\/?P[^>]*>/g, "");
      content = content.replace(/<\/?[IE][^>]*>/g, "");
      content = content.replace(/<[^>]*>/g, " ");
      content = content.replace(/\s+/g, " ").trim();

      if (content.length > 3) {
        extractedParts.push(content);
      }
    });

    // Extract headings within the chapter
    const headTagMatches =
      chapterContent.match(/<HEAD[^>]*>(.*?)<\/HEAD>/gs) || [];
    console.log(
      `📄 Found ${headTagMatches.length} <HEAD> tags in Chapter ${targetChapter}`
    );

    headTagMatches.forEach((headTag) => {
      let content = headTag.replace(/<\/?HEAD[^>]*>/g, "");
      content = content.replace(/<[^>]*>/g, " ");
      content = content.replace(/\s+/g, " ").trim();

      if (content.length > 3) {
        extractedParts.push(content);
      }
    });

    const chapterText = extractedParts.join(" ").trim();

    console.log(`📊 Chapter ${targetChapter} Extraction Results:`);
    console.log(`  • Pattern used: ${patternUsed}`);
    console.log(`  • Processed ${pTagMatches.length} paragraphs`);
    console.log(`  • Processed ${headTagMatches.length} headings`);
    console.log(`  • Total extracted text: ${chapterText.length} characters`);

    if (chapterText.length > 0) {
      console.log(`  • Sample: "${chapterText.substring(0, 150)}..."`);
    }

    return chapterText;
  }

  // Helper function to convert numbers to Roman numerals (for chapter matching)
  toRoman(num) {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = [
      "M",
      "CM",
      "D",
      "CD",
      "C",
      "XC",
      "L",
      "XL",
      "X",
      "IX",
      "V",
      "IV",
      "I",
    ];
    let result = "";

    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += numerals[i];
        num -= values[i];
      }
    }

    return result;
  }

  // Count words in text
  countWords(text) {
    if (!text || text.trim().length === 0) return 0;

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter((word) => word.length > 2); // Remove very short words (likely artifacts)

    return words.length;
  }

  // Generate checksum from text
  generateChecksum(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 10);
  }

  // Process a single CFR title for an agency
  async processCFRTitle(title) {
    try {
      console.log(`\n🔍 Processing CFR Title ${title}...`);

      // Check cache first
      const cached = await this.cache.get("title", title);
      if (cached) {
        console.log(`📦 Using cached result for Title ${title}`);
        return {
          ...cached,
          cached: true,
          changeDetection: null,
        };
      }

      // Download XML (now automatically uses correct date)
      const xmlContent = await this.downloadTitleXML(title);

      // Extract text
      const regulationText = this.extractTextFromXML(xmlContent);

      // Count words
      const wordCount = this.countWords(regulationText);

      // Generate checksum
      const checksum = this.generateChecksum(regulationText);

      // Get the issue date for this title
      const titleData = this.titleInfo.get(title);
      const issueDate = titleData ? titleData.latest_issue_date : "unknown";

      const result = {
        title: title,
        wordCount: wordCount,
        textLength: regulationText.length,
        checksum: checksum,
        issueDate: issueDate,
        sampleText: regulationText.substring(0, 200) + "...",
        processedAt: new Date().toISOString(),
        cached: false,
        changeDetection: null,
      };

      // Cache the result
      await this.cache.set("title", title, result);

      console.log(`📊 Results for Title ${title}:`);
      console.log(`   Word Count: ${wordCount.toLocaleString()}`);
      console.log(
        `   Text Length: ${regulationText.length.toLocaleString()} chars`
      );
      console.log(`   Issue Date: ${issueDate}`);
      console.log(`   Checksum: ${checksum}`);

      return result;
    } catch (error) {
      console.error(`❌ Error processing Title ${title}:`, error.message);
      return {
        title: title,
        error: error.message,
        wordCount: 0,
        processedAt: new Date().toISOString(),
      };
    }
  }

  // Process a specific chapter within a CFR title
  async processCFRTitleChapter(title, chapter) {
    try {
      console.log(`\n🔍 Processing CFR Title ${title}, Chapter ${chapter}...`);

      // Check cache first (chapter-specific cache key)
      const cacheKey = `${title}-${chapter}`;
      const cached = await this.cache.get("chapter", cacheKey);
      if (cached) {
        console.log(
          `📦 Using cached result for Title ${title}, Chapter ${chapter}`
        );
        return {
          ...cached,
          cached: true,
          changeDetection: null,
        };
      }

      // Download XML for the entire title (same as before)
      const xmlContent = await this.downloadTitleXML(title);

      // Extract text for specific chapter
      const chapterText = this.extractChapterFromXML(xmlContent, chapter);

      if (!chapterText || chapterText.trim().length === 0) {
        throw new Error(`Chapter ${chapter} not found in Title ${title}`);
      }

      // Count words in chapter text
      const wordCount = this.countWords(chapterText);

      // Generate checksum for chapter
      const checksum = this.generateChecksum(chapterText);

      // Get the issue date for this title
      const titleData = this.titleInfo.get(title);
      const issueDate = titleData ? titleData.latest_issue_date : "unknown";

      const result = {
        title: title,
        chapter: chapter,
        wordCount: wordCount,
        textLength: chapterText.length,
        checksum: checksum,
        issueDate: issueDate,
        sampleText: chapterText.substring(0, 200) + "...",
        processedAt: new Date().toISOString(),
        cached: false,
        changeDetection: null,
      };

      // Cache the result with chapter-specific key
      await this.cache.set("chapter", cacheKey, result);

      console.log(`📊 Results for Title ${title}, Chapter ${chapter}:`);
      console.log(`   Word Count: ${wordCount.toLocaleString()}`);
      console.log(
        `   Text Length: ${chapterText.length.toLocaleString()} chars`
      );
      console.log(`   Issue Date: ${issueDate}`);
      console.log(`   Checksum: ${checksum}`);

      return result;
    } catch (error) {
      console.error(
        `❌ Error processing Title ${title}, Chapter ${chapter}:`,
        error.message
      );
      return {
        title: title,
        chapter: chapter,
        error: error.message,
        wordCount: 0,
        processedAt: new Date().toISOString(),
      };
    }
  }

  // Process all CFR references for an agency
  async processAgency(agencyData) {
    console.log(`\n🏛️  Processing Agency: ${agencyData.name}`);
    console.log(
      `📋 CFR References: ${agencyData.cfr_references
        .map((ref) => `Title ${ref.title}`)
        .join(", ")}`
    );

    // Check cache first
    const cached = await this.cache.get("agency", agencyData.name);
    if (cached) {
      console.log(`📦 Using cached result for Agency: ${agencyData.name}`);
      return cached;
    }

    const results = {
      agency: agencyData,
      titleResults: [],
      totalWords: 0,
      totalTitles: agencyData.cfr_references.length,
      processedAt: new Date().toISOString(),
    };

    // Process each CFR title
    for (const cfrRef of agencyData.cfr_references) {
      const titleResult = await this.processCFRTitle(cfrRef.title);
      results.titleResults.push(titleResult);

      if (!titleResult.error) {
        results.totalWords += titleResult.wordCount;
      }

      // Add small delay between requests to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Generate overall agency checksum
    const allText = results.titleResults
      .filter((result) => !result.error)
      .map((result) => result.checksum)
      .join("");
    results.agencyChecksum = this.generateChecksum(allText);

    // Cache the result
    await this.cache.set("agency", agencyData.name, results);

    console.log(`\n✅ Agency Processing Complete:`);
    console.log(`   Total Words: ${results.totalWords.toLocaleString()}`);
    console.log(
      `   Processed Titles: ${
        results.titleResults.filter((r) => !r.error).length
      }/${results.totalTitles}`
    );
    console.log(`   Agency Checksum: ${results.agencyChecksum}`);

    return results;
  }

  // Check if content has changed for an agency
  async checkAgencyChanges(agencyName) {
    const cached = await this.cache.get("agency", agencyName);
    if (!cached) {
      return { changed: true, reason: "No previous cache found" };
    }

    // Process agency again to get new checksum
    const agency = await agencyRepository.getAgencyByName(agencyName);
    if (!agency) {
      return { changed: true, reason: "Agency not found" };
    }

    const newResults = await this.processAgency(agency);
    const oldChecksum = cached.agencyChecksum;
    const newChecksum = newResults.agencyChecksum;
    const changed = oldChecksum !== newChecksum;

    return {
      changed,
      oldChecksum,
      newChecksum,
      oldWordCount: cached.totalWords,
      newWordCount: newResults.totalWords,
      reason: changed ? "Content has changed" : "No changes detected",
    };
  }

  // Get cache statistics
  async getCacheStats() {
    return await this.cache.getCacheStats();
  }

  // Clear expired cache entries
  async clearExpiredCache() {
    return await this.cache.clearExpired();
  }

  // Convert results to format compatible with your server
  formatForServer(results) {
    return {
      id: results.agency.slug,
      name: results.agency.name,
      displayName: results.agency.display_name,
      titles: results.agency.cfr_references.map((ref) => ref.title),
      totalWords: results.totalWords,
      checksum: results.agencyChecksum,
      lastProcessed: results.processedAt,
      titleBreakdown: results.titleResults.map((result) => ({
        title: result.title,
        wordCount: result.wordCount,
        checksum: result.checksum,
      })),
      realData: true,
    };
  }
}

// Test with agencies from database
async function testWithAgenciesFile() {
  console.log("🚀 CFR XML Word Counter Test with Agencies from Database");
  console.log("=".repeat(60));

  try {
    // Load agencies from the database
    const agenciesData = await agencyRepository.getAllAgencies();

    console.log(`📋 Loaded ${agenciesData.count} agencies from database`);

    // Find agencies with CFR references (filter out those without any)
    const agenciesWithCFR = agenciesData.agencies.filter(
      (agency) => agency.cfr_references && agency.cfr_references.length > 0
    );

    console.log(
      `📊 Found ${agenciesWithCFR.length} agencies with CFR references`
    );

    // Show some sample agencies for selection
    console.log("\n📋 Sample agencies available for testing:");
    agenciesWithCFR.slice(0, 10).forEach((agency, index) => {
      const titles = agency.cfr_references.map((ref) => ref.title).join(", ");
      console.log(`${index + 1}. ${agency.name} (Titles: ${titles})`);
    });

    // For this test, let's use a simple agency with a single title
    // Let's pick the first agency with a single title for faster testing
    const testAgency =
      agenciesWithCFR.find(
        (agency) =>
          agency.cfr_references.length === 1 &&
          agency.cfr_references[0].title <= 10 // Pick a smaller title for faster download
      ) || agenciesWithCFR[0];

    console.log(`\n🎯 Testing with agency: ${testAgency.name}`);
    console.log(
      `📋 CFR References: ${testAgency.cfr_references
        .map((ref) => `Title ${ref.title}`)
        .join(", ")}`
    );

    const counter = new CFRXMLWordCounter();

    // Process the agency
    const results = await counter.processAgency(testAgency);

    // Format for server
    const serverData = counter.formatForServer(results);

    console.log("\n📝 Server-Ready Data:");
    console.log(JSON.stringify(serverData, null, 2));

    console.log("\n🎯 Next Steps:");
    console.log("1. Copy the JSON above");
    console.log("2. Add it to your server.js agencies array");
    console.log("3. Restart your server to see real word counts!");
    console.log(
      "\n💡 To test a different agency, modify the testWithAgenciesFile function"
    );

    return serverData;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return null;
  }
}

// Alternative function to test a specific agency by name
async function testSpecificAgency(agencyName) {
  console.log(`🚀 CFR XML Word Counter Test for: ${agencyName}`);
  console.log("=".repeat(60));

  try {
    // Find the specific agency using database search
    const agency = await agencyRepository.findAgencyByName(agencyName);

    if (!agency) {
      console.error(`❌ Agency "${agencyName}" not found`);
      console.log("💡 Try searching for a partial name or short name");
      return null;
    }

    if (!agency.cfr_references || agency.cfr_references.length === 0) {
      console.error(`❌ Agency "${agency.name}" has no CFR references`);
      return null;
    }

    console.log(`🎯 Found agency: ${agency.name}`);
    console.log(
      `📋 CFR References: ${agency.cfr_references
        .map((ref) => `Title ${ref.title}`)
        .join(", ")}`
    );

    const counter = new CFRXMLWordCounter();

    // Process the agency
    const results = await counter.processAgency(agency);

    // Format for server
    const serverData = counter.formatForServer(results);

    console.log("\n📝 Server-Ready Data:");
    console.log(JSON.stringify(serverData, null, 2));

    return serverData;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return null;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  // You can test a specific agency by uncommenting and modifying this line:
  testSpecificAgency("FCC"); // Example: test Federal Communications Commission

  // Or run the default test with a simple agency:
  // testWithAgenciesFile();
}

module.exports = {
  CFRXMLWordCounter,
  testSpecificAgency,
  testWithAgenciesFile,
};
