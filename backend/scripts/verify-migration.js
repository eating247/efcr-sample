const database = require("../utils/database");

async function verifyMigration() {
  try {
    await database.initialize();

    console.log("🔍 Verifying database migration...\n");

    // Get sample agencies with their stats
    const result = await database.query(`
      SELECT 
        a.name, 
        a.short_name, 
        COUNT(DISTINCT c.id) as cfr_count, 
        COUNT(DISTINCT children.id) as child_count
      FROM agencies a 
      LEFT JOIN cfr_references c ON a.id = c.agency_id 
      LEFT JOIN agencies children ON a.id = children.parent_id 
      WHERE a.parent_id IS NULL 
      GROUP BY a.id, a.name, a.short_name 
      ORDER BY a.name 
      LIMIT 10
    `);

    console.log("📊 Sample parent agencies:");
    result.rows.forEach((row) => {
      console.log(
        `  ${row.name} (${row.short_name || "N/A"}): ${
          row.cfr_count
        } CFR refs, ${row.child_count} children`
      );
    });

    // Check for a specific agency with children
    const deptAg = await database.query(`
      SELECT 
        a.name, 
        a.short_name,
        COUNT(DISTINCT c.id) as cfr_count,
        COUNT(DISTINCT children.id) as child_count
      FROM agencies a 
      LEFT JOIN cfr_references c ON a.id = c.agency_id 
      LEFT JOIN agencies children ON a.id = children.parent_id 
      WHERE a.name = 'Department of Agriculture'
      GROUP BY a.id, a.name, a.short_name
    `);

    if (deptAg.rows.length > 0) {
      const dept = deptAg.rows[0];
      console.log(
        `\n🌾 Department of Agriculture: ${dept.cfr_count} CFR refs, ${dept.child_count} children`
      );

      // Get some child agencies
      const children = await database.query(`
        SELECT name, short_name 
        FROM agencies 
        WHERE parent_id = (SELECT id FROM agencies WHERE name = 'Department of Agriculture')
        LIMIT 5
      `);

      console.log("  Child agencies:");
      children.rows.forEach((child) => {
        console.log(`    - ${child.name} (${child.short_name || "N/A"})`);
      });
    }

    // Get total counts
    const totals = await database.query(`
      SELECT 
        (SELECT COUNT(*) FROM agencies WHERE parent_id IS NULL) as parent_count,
        (SELECT COUNT(*) FROM agencies WHERE parent_id IS NOT NULL) as child_count,
        (SELECT COUNT(*) FROM cfr_references) as cfr_count
    `);

    const total = totals.rows[0];
    console.log(`\n📈 Database totals:`);
    console.log(`  Parent agencies: ${total.parent_count}`);
    console.log(`  Child agencies: ${total.child_count}`);
    console.log(`  CFR references: ${total.cfr_count}`);
    console.log(
      `  Total agencies: ${
        parseInt(total.parent_count) + parseInt(total.child_count)
      }`
    );

    console.log("\n✅ Database migration verification complete!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await database.close();
  }
}

verifyMigration();
