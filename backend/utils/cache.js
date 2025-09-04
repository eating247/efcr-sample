const fs = require("fs").promises;
const path = require("path");

class WordCountCache {
  constructor() {
    this.cacheDir = path.join(__dirname, "../cache");
    this.cacheFile = path.join(this.cacheDir, "word-counts.json");
    this.cache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Load existing cache from file
      try {
        const cacheData = await fs.readFile(this.cacheFile, "utf8");
        const parsedCache = JSON.parse(cacheData);

        // Convert back to Map for efficient lookups
        this.cache = new Map(Object.entries(parsedCache));
        console.log(`📦 Loaded ${this.cache.size} cached word count entries`);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.warn("⚠️ Error loading cache file:", error.message);
        }
        // Cache file doesn't exist yet, start with empty cache
        this.cache = new Map();
      }

      this.initialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize cache:", error);
      throw error;
    }
  }

  async saveCache() {
    try {
      // Convert Map to object for JSON serialization
      const cacheObject = Object.fromEntries(this.cache);
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2));
      console.log(`💾 Saved ${this.cache.size} cache entries to disk`);
    } catch (error) {
      console.error("❌ Failed to save cache:", error);
    }
  }

  getCacheKey(type, identifier) {
    return `${type}:${identifier}`;
  }

  async get(type, identifier) {
    await this.initialize();
    const key = this.getCacheKey(type, identifier);
    const cached = this.cache.get(key);

    if (cached) {
      // Check if cache is still valid (not expired)
      const now = Date.now();
      const cacheAge = now - cached.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < maxAge) {
        console.log(
          `📦 Cache hit for ${key} (age: ${Math.round(
            cacheAge / 1000 / 60
          )}min)`
        );
        return cached.data;
      } else {
        console.log(
          `⏰ Cache expired for ${key} (age: ${Math.round(
            cacheAge / 1000 / 60
          )}min)`
        );
        this.cache.delete(key);
      }
    }

    return null;
  }

  async set(type, identifier, data) {
    await this.initialize();
    const key = this.getCacheKey(type, identifier);

    const cacheEntry = {
      data,
      timestamp: Date.now(),
      type,
      identifier,
    };

    this.cache.set(key, cacheEntry);
    console.log(`💾 Cached ${key}`);

    // Save to disk periodically (every 10 cache operations)
    if (this.cache.size % 10 === 0) {
      await this.saveCache();
    }
  }

  async compareChecksums(type, identifier, newChecksum) {
    const cached = await this.get(type, identifier);
    if (!cached) {
      return { changed: true, reason: "No previous cache found" };
    }

    const oldChecksum = cached.checksum || cached.agencyChecksum;
    const changed = oldChecksum !== newChecksum;

    return {
      changed,
      oldChecksum,
      newChecksum,
      reason: changed ? "Checksum mismatch" : "No changes detected",
    };
  }

  async getCacheStats() {
    await this.initialize();
    const now = Date.now();
    const stats = {
      totalEntries: this.cache.size,
      validEntries: 0,
      expiredEntries: 0,
      types: new Map(),
    };

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age < maxAge) {
        stats.validEntries++;
      } else {
        stats.expiredEntries++;
      }

      // Count by type
      const type = entry.type;
      stats.types.set(type, (stats.types.get(type) || 0) + 1);
    }

    return stats;
  }

  async clearExpired() {
    await this.initialize();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age >= maxAge) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired cache entries`);
      await this.saveCache();
    }

    return cleared;
  }
}

module.exports = WordCountCache;
