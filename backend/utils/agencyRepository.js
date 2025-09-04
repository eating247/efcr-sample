const database = require("./database");

class AgencyRepository {
  /**
   * Get all agencies with their CFR references and children
   */
  async getAllAgencies() {
    try {
      await database.initialize();

      // Get all parent agencies with their CFR references
      const parentAgenciesQuery = `
        SELECT 
          a.id,
          a.name,
          a.short_name,
          a.display_name,
          a.sortable_name,
          a.slug,
          json_agg(
            CASE WHEN c.id IS NOT NULL 
            THEN json_build_object(
              'title', c.title,
              'chapter', c.chapter,
              'subtitle', c.subtitle
            )
            ELSE NULL END
          ) FILTER (WHERE c.id IS NOT NULL) as cfr_references
        FROM agencies a
        LEFT JOIN cfr_references c ON a.id = c.agency_id
        WHERE a.parent_id IS NULL
        GROUP BY a.id, a.name, a.short_name, a.display_name, a.sortable_name, a.slug
        ORDER BY a.sortable_name
      `;

      const parentResult = await database.query(parentAgenciesQuery);
      const agencies = parentResult.rows.map((agency) => ({
        ...agency,
        cfr_references: agency.cfr_references || [],
        children: [], // Will be populated below
      }));

      // Get all child agencies with their CFR references
      const childAgenciesQuery = `
        SELECT 
          a.id,
          a.name,
          a.short_name,
          a.display_name,
          a.sortable_name,
          a.slug,
          a.parent_id,
          json_agg(
            CASE WHEN c.id IS NOT NULL 
            THEN json_build_object(
              'title', c.title,
              'chapter', c.chapter,
              'subtitle', c.subtitle
            )
            ELSE NULL END
          ) FILTER (WHERE c.id IS NOT NULL) as cfr_references
        FROM agencies a
        LEFT JOIN cfr_references c ON a.id = c.agency_id
        WHERE a.parent_id IS NOT NULL
        GROUP BY a.id, a.name, a.short_name, a.display_name, a.sortable_name, a.slug, a.parent_id
        ORDER BY a.sortable_name
      `;

      const childResult = await database.query(childAgenciesQuery);

      // Group children by parent_id
      const childrenByParent = {};
      childResult.rows.forEach((child) => {
        if (!childrenByParent[child.parent_id]) {
          childrenByParent[child.parent_id] = [];
        }
        childrenByParent[child.parent_id].push({
          name: child.name,
          short_name: child.short_name,
          display_name: child.display_name,
          sortable_name: child.sortable_name,
          slug: child.slug,
          cfr_references: child.cfr_references || [],
        });
      });

      // Attach children to their parents
      agencies.forEach((agency) => {
        if (childrenByParent[agency.id]) {
          agency.children = childrenByParent[agency.id];
        }
      });

      return {
        agencies: agencies,
        count: agencies.length,
      };
    } catch (error) {
      console.error("Error loading agencies from database:", error);
      throw new Error("Failed to load agencies data from database");
    }
  }

  /**
   * Find agency by name (searches both parent and child agencies)
   */
  async findAgencyByName(agencyName) {
    try {
      await database.initialize();

      const searchQuery = `
        SELECT 
          a.id,
          a.name,
          a.short_name,
          a.display_name,
          a.sortable_name,
          a.slug,
          a.parent_id,
          json_agg(
            CASE WHEN c.id IS NOT NULL 
            THEN json_build_object(
              'title', c.title,
              'chapter', c.chapter,
              'subtitle', c.subtitle
            )
            ELSE NULL END
          ) FILTER (WHERE c.id IS NOT NULL) as cfr_references
        FROM agencies a
        LEFT JOIN cfr_references c ON a.id = c.agency_id
        WHERE 
          LOWER(a.name) LIKE LOWER($1) OR 
          LOWER(a.short_name) LIKE LOWER($1) OR
          LOWER(a.display_name) LIKE LOWER($1)
        GROUP BY a.id, a.name, a.short_name, a.display_name, a.sortable_name, a.slug, a.parent_id
        ORDER BY 
          CASE 
            WHEN LOWER(a.name) = LOWER($2) THEN 1
            WHEN LOWER(a.short_name) = LOWER($2) THEN 2
            WHEN LOWER(a.display_name) = LOWER($2) THEN 3
            ELSE 4
          END,
          LENGTH(a.name)
        LIMIT 1
      `;

      const searchTerm = `%${agencyName}%`;
      const exactTerm = agencyName;
      const result = await database.query(searchQuery, [searchTerm, exactTerm]);

      if (result.rows.length === 0) {
        return null;
      }

      const agency = result.rows[0];
      return {
        name: agency.name,
        short_name: agency.short_name,
        display_name: agency.display_name,
        sortable_name: agency.sortable_name,
        slug: agency.slug,
        cfr_references: agency.cfr_references || [],
      };
    } catch (error) {
      console.error("Error finding agency by name:", error);
      throw new Error("Failed to find agency in database");
    }
  }

  /**
   * Get agency by exact name match (for word count processing)
   */
  async getAgencyByName(agencyName) {
    try {
      await database.initialize();

      const query = `
        SELECT 
          a.id,
          a.name,
          a.short_name,
          a.display_name,
          a.sortable_name,
          a.slug,
          a.parent_id,
          json_agg(
            CASE WHEN c.id IS NOT NULL 
            THEN json_build_object(
              'title', c.title,
              'chapter', c.chapter,
              'subtitle', c.subtitle
            )
            ELSE NULL END
          ) FILTER (WHERE c.id IS NOT NULL) as cfr_references
        FROM agencies a
        LEFT JOIN cfr_references c ON a.id = c.agency_id
        WHERE a.name = $1
        GROUP BY a.id, a.name, a.short_name, a.display_name, a.sortable_name, a.slug, a.parent_id
      `;

      const result = await database.query(query, [agencyName]);

      if (result.rows.length === 0) {
        return null;
      }

      const agency = result.rows[0];
      return {
        name: agency.name,
        short_name: agency.short_name,
        display_name: agency.display_name,
        sortable_name: agency.sortable_name,
        slug: agency.slug,
        cfr_references: agency.cfr_references || [],
      };
    } catch (error) {
      console.error("Error getting agency by name:", error);
      throw new Error("Failed to get agency from database");
    }
  }

  /**
   * Health check - verify database connectivity
   */
  async healthCheck() {
    try {
      const health = await database.healthCheck();
      return health;
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        connected: false,
      };
    }
  }
}

// Create singleton instance
const agencyRepository = new AgencyRepository();

module.exports = agencyRepository;
