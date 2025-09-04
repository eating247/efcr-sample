const { Pool } = require("pg");

// Test connection to default postgres database
const pool = new Pool({
  user: process.env.DB_USER || "ting", // Use your system username
  host: process.env.DB_HOST || "localhost",
  database: "postgres", // Connect to default database first
  password: process.env.DB_PASSWORD || "", // Empty password for local setup
  port: process.env.DB_PORT || 5432,
});

async function testConnection() {
  try {
    console.log("🔍 Testing PostgreSQL connection...");

    // Test basic connection
    const result = await pool.query("SELECT version();");
    console.log("✅ Connection successful!");
    console.log("📊 PostgreSQL version:", result.rows[0].version);

    // Test if we can create a database
    console.log("🔍 Testing database creation capability...");
    const createDbResult = await pool.query(`
        SELECT 1 FROM pg_database WHERE datname = 'ecfr_data'
      `);

    if (createDbResult.rows.length === 0) {
      console.log('📝 Database "ecfr_data" does not exist yet');
      console.log("💡 Ready to create project database");
    } else {
      console.log('✅ Database "ecfr_data" already exists');
    }

    // Test current user and permissions
    const userResult = await pool.query(
      "SELECT current_user, current_database();"
    );
    console.log("👤 Current user:", userResult.rows[0].current_user);
    console.log("🗄️ Current database:", userResult.rows[0].current_database);
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    console.log(
      "💡 Make sure PostgreSQL is running: brew services start postgresql@15"
    );
  } finally {
    await pool.end();
  }
}

// Run the test
testConnection();
