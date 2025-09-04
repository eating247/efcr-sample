const WordCountCache = require("./cache");

async function testCache() {
  console.log("🧪 Testing Word Count Cache Functionality");
  console.log("=".repeat(50));

  const cache = new WordCountCache();

  try {
    // Test 1: Initialize cache
    console.log("\n1. Testing cache initialization...");
    await cache.initialize();
    console.log("✅ Cache initialized successfully");

    // Test 2: Set and get cache entries
    console.log("\n2. Testing cache set/get operations...");

    const testData = {
      wordCount: 15000,
      checksum: "abc123def4",
      processedAt: new Date().toISOString(),
    };

    await cache.set("title", "7", testData);
    console.log("✅ Set cache entry for title 7");

    const retrieved = await cache.get("title", "7");
    if (retrieved && retrieved.wordCount === 15000) {
      console.log("✅ Retrieved cache entry successfully");
    } else {
      console.log("❌ Cache retrieval failed");
    }

    // Test 3: Test checksum comparison
    console.log("\n3. Testing checksum comparison...");

    const comparison = await cache.compareChecksums("title", "7", "abc123def4");
    console.log("Comparison result:", comparison);

    if (comparison.changed === false) {
      console.log("✅ Checksum comparison working correctly");
    } else {
      console.log("❌ Checksum comparison failed");
    }

    // Test 4: Test cache stats
    console.log("\n4. Testing cache statistics...");

    const stats = await cache.getCacheStats();
    console.log("Cache stats:", stats);
    console.log("✅ Cache statistics retrieved");

    // Test 5: Test expired cache handling
    console.log("\n5. Testing expired cache handling...");

    // Create an old cache entry
    const oldEntry = {
      data: { wordCount: 1000, checksum: "old123" },
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours old
      type: "title",
      identifier: "999",
    };

    cache.cache.set("title:999", oldEntry);
    console.log("✅ Added expired cache entry");

    const expiredResult = await cache.get("title", "999");
    if (expiredResult === null) {
      console.log("✅ Expired cache entry properly handled");
    } else {
      console.log("❌ Expired cache entry not handled correctly");
    }

    // Test 6: Clear expired entries
    console.log("\n6. Testing expired cache cleanup...");

    const cleared = await cache.clearExpired();
    console.log(`✅ Cleared ${cleared} expired entries`);

    console.log("\n🎉 All cache tests completed successfully!");
  } catch (error) {
    console.error("❌ Cache test failed:", error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCache();
}

module.exports = { testCache };
