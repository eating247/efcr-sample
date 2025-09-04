const fs = require("fs").promises;
const path = require("path");
const database = require("../utils/database");

class AgencyMigration {
  constructor() {
    this.agenciesData = null;
    this.agencyIdMap = new Map(); // Maps agency name to database ID
  }

  async loadAgenciesData() {
    console.log("📖 Loading agencies data from JSON file...");
    const filePath = path.join(__dirname, "../agencies.json");
    const fileContent = await fs.readFile(filePath, "utf8");
    this.agenciesData = JSON.parse(fileContent);
    console.log(`✅ Loaded ${this.agenciesData.agencies.length} agencies`);
  }

  async runSchema() {
    console.log("🏗️  Creating database schema...");
    const schemaPath = path.join(
      __dirname,
      "../migrations/001_create_agencies_schema.sql"
    );
    const schemaSql = await fs.readFile(schemaPath, "utf8");

    await database.query(schemaSql);
    console.log("✅ Database schema created successfully");
  }

  async clearExistingData() {
    console.log("🧹 Clearing existing data...");
    await database.query("DELETE FROM cfr_references");
    await database.query("DELETE FROM agencies");
    await database.query("ALTER SEQUENCE agencies_id_seq RESTART WITH 1");
    await database.query("ALTER SEQUENCE cfr_references_id_seq RESTART WITH 1");
    console.log("✅ Existing data cleared");
  }

  async insertParentAgencies() {
    console.log("👥 Inserting parent agencies...");
    let insertedCount = 0;

    for (const agency of this.agenciesData.agencies) {
      // Insert parent agency
      const result = await database.query(
        `INSERT INTO agencies (name, short_name, display_name, sortable_name, slug, parent_id)
         VALUES ($1, $2, $3, $4, $5, NULL)
         RETURNING id`,
        [
          agency.name,
          agency.short_name || null,
          agency.display_name,
          agency.sortable_name,
          agency.slug,
        ]
      );

      const parentId = result.rows[0].id;
      this.agencyIdMap.set(agency.name, parentId);
      insertedCount++;

      // Insert parent agency CFR references
      if (agency.cfr_references && agency.cfr_references.length > 0) {
        await this.insertCfrReferences(parentId, agency.cfr_references);
      }
    }

    console.log(`✅ Inserted ${insertedCount} parent agencies`);
  }

  async insertChildAgencies() {
    console.log("👶 Inserting child agencies...");
    let insertedCount = 0;

    for (const agency of this.agenciesData.agencies) {
      if (agency.children && agency.children.length > 0) {
        const parentId = this.agencyIdMap.get(agency.name);

        for (const child of agency.children) {
          const result = await database.query(
            `INSERT INTO agencies (name, short_name, display_name, sortable_name, slug, parent_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              child.name,
              child.short_name || null,
              child.display_name,
              child.sortable_name,
              child.slug,
              parentId,
            ]
          );

          const childId = result.rows[0].id;
          this.agencyIdMap.set(child.name, childId);
          insertedCount++;

          // Insert child agency CFR references
          if (child.cfr_references && child.cfr_references.length > 0) {
            await this.insertCfrReferences(childId, child.cfr_references);
          }
        }
      }
    }

    console.log(`✅ Inserted ${insertedCount} child agencies`);
  }

  async insertCfrReferences(agencyId, cfrReferences) {
    for (const ref of cfrReferences) {
      await database.query(
        `INSERT INTO cfr_references (agency_id, title, chapter, subtitle)
         VALUES ($1, $2, $3, $4)`,
        [agencyId, ref.title, ref.chapter || null, ref.subtitle || null]
      );
    }
  }

  async validateMigration() {
    console.log("🔍 Validating migration...");

    const agencyCount = await database.query("SELECT COUNT(*) FROM agencies");
    const parentCount = await database.query(
      "SELECT COUNT(*) FROM agencies WHERE parent_id IS NULL"
    );
    const childCount = await database.query(
      "SELECT COUNT(*) FROM agencies WHERE parent_id IS NOT NULL"
    );
    const cfrCount = await database.query(
      "SELECT COUNT(*) FROM cfr_references"
    );

    console.log(`📊 Migration Summary:`);
    console.log(`   Total agencies: ${agencyCount.rows[0].count}`);
    console.log(`   Parent agencies: ${parentCount.rows[0].count}`);
    console.log(`   Child agencies: ${childCount.rows[0].count}`);
    console.log(`   CFR references: ${cfrCount.rows[0].count}`);

    // Validate against original data
    const originalParentCount = this.agenciesData.agencies.length;
    const originalChildCount = this.agenciesData.agencies.reduce(
      (sum, agency) => sum + (agency.children ? agency.children.length : 0),
      0
    );
    const originalCfrCount = this.agenciesData.agencies.reduce(
      (sum, agency) => {
        const parentRefs = agency.cfr_references
          ? agency.cfr_references.length
          : 0;
        const childRefs = agency.children
          ? agency.children.reduce(
              (childSum, child) =>
                childSum +
                (child.cfr_references ? child.cfr_references.length : 0),
              0
            )
          : 0;
        return sum + parentRefs + childRefs;
      },
      0
    );

    console.log(`🔍 Validation:`);
    console.log(
      `   Parent agencies: ${
        parentCount.rows[0].count
      }/${originalParentCount} ${
        parentCount.rows[0].count == originalParentCount ? "✅" : "❌"
      }`
    );
    console.log(
      `   Child agencies: ${childCount.rows[0].count}/${originalChildCount} ${
        childCount.rows[0].count == originalChildCount ? "✅" : "❌"
      }`
    );
    console.log(
      `   CFR references: ${cfrCount.rows[0].count}/${originalCfrCount} ${
        cfrCount.rows[0].count == originalCfrCount ? "✅" : "❌"
      }`
    );
  }

  async run() {
    try {
      console.log("🚀 Starting agency migration...");

      await database.initialize();
      await this.loadAgenciesData();
      await this.runSchema();
      await this.clearExistingData();
      await this.insertParentAgencies();
      await this.insertChildAgencies();
      await this.validateMigration();

      console.log("🎉 Migration completed successfully!");
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    } finally {
      await database.close();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new AgencyMigration();
  migration.run().catch(console.error);
}

module.exports = AgencyMigration;
