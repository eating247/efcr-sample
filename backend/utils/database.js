const { Pool } = require("pg");

class Database {
  constructor() {
    this.pool = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized && this.pool) return this.pool;

    try {
      this.pool = new Pool({
        user: process.env.DB_USER || "ting",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "ecfr_data",
        password: process.env.DB_PASSWORD || "",
        port: process.env.DB_PORT || 5432,
        // Connection pool settings
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error if connection takes longer than 2 seconds
      });

      // Test the connection
      const client = await this.pool.connect();
      console.log("✅ Database connection established");
      client.release();

      this.initialized = true;
      return this.pool;
    } catch (error) {
      console.error("❌ Database connection failed:", error.message);
      throw error;
    }
  }

  async query(text, params) {
    if (!this.pool) {
      await this.initialize();
    }

    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      console.log(
        `🔍 Query executed in ${duration}ms: ${text.substring(0, 50)}...`
      );
      return result;
    } catch (error) {
      console.error("❌ Query error:", error.message);
      console.error("Query:", text);
      console.error("Params:", params);
      throw error;
    }
  }

  async getClient() {
    if (!this.pool) {
      await this.initialize();
    }
    return this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log("🔒 Database connection pool closed");
      this.pool = null;
      this.initialized = false;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.query(
        "SELECT version(), now() as current_time"
      );
      return {
        status: "healthy",
        version: result.rows[0].version,
        currentTime: result.rows[0].current_time,
        connected: true,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        connected: false,
      };
    }
  }
}

// Create a singleton instance
const database = new Database();

module.exports = database;
