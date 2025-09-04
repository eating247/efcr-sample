const express = require("express");
const path = require("path");

// Import route modules
const healthRoutes = require("./routes/health");
const agenciesRoutes = require("./routes/agencies");
const wordCountRoutes = require("./routes/wordCount");
const amendmentTimelineRoutes = require("./routes/amendmentTimeline");
const cacheRoutes = require("./routes/cache");
const titlesRoutes = require("./routes/titles");

// Import utilities for dashboard
const agencyRepository = require("./utils/agencyRepository");

// Create Express app
const app = express();
const PORT = 3001;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Enable JSON parsing
app.use(express.json());

// Serve static files
app.use(express.static("public"));

// ============================================================================
// API ROUTES
// ============================================================================

// Mount route modules
app.use("/api/health", healthRoutes);
app.use("/api/agencies", agenciesRoutes);
app.use("/api/word-count", wordCountRoutes);
app.use("/api/amendment-timeline", amendmentTimelineRoutes);
app.use("/api/cache", cacheRoutes);
app.use("/api/titles", titlesRoutes);

// ============================================================================
// ROOT ROUTE - SIMPLE DASHBOARD
// ============================================================================

app.get("/", async (req, res) => {
  try {
    const agenciesData = await agencyRepository.getAllAgencies();
    const totalAgencies = agenciesData.count;

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>eCFR Analytics API</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 12px; 
            margin-bottom: 30px; 
            text-align: center;
        }
        .api-section { 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 12px; 
            margin-bottom: 25px; 
            border-left: 4px solid #667eea;
        }
        .api-section h3 { 
            margin-top: 0; 
            color: #2c3e50; 
            border-bottom: 2px solid #e9ecef; 
            padding-bottom: 10px;
        }
        .endpoint { 
            background: white; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border: 1px solid #e9ecef;
            transition: all 0.2s ease;
        }
        .endpoint:hover { 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
            transform: translateY(-2px);
        }
        .endpoint a { 
            color: #667eea; 
            text-decoration: none; 
            font-weight: 500;
        }
        .endpoint a:hover { 
            text-decoration: underline; 
        }
        .method { 
            background: #667eea; 
            color: white; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 0.8rem; 
            font-weight: 600;
            margin-right: 10px;
        }
        .description { 
            color: #6c757d; 
            font-size: 0.9rem; 
            margin-top: 5px;
        }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-top: 20px;
        }
        .stat-card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
            border: 1px solid #e9ecef;
        }
        .stat-number { 
            font-size: 2rem; 
            font-weight: 700; 
            color: #667eea; 
            margin-bottom: 5px;
        }
        .stat-label { 
            color: #6c757d; 
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 eCFR Analytics API</h1>
        <p>Federal Regulations Word Count Analysis</p>
        <p>Real-time word counts from official CFR XML data</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${totalAgencies}</div>
            <div class="stat-label">Federal Agencies</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">50</div>
            <div class="stat-label">CFR Titles</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">Real-time</div>
            <div class="stat-label">Word Counts</div>
        </div>
    </div>

    <div class="api-section">
        <h3>🔗 API Endpoints</h3>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/health" target="_blank">/api/health</a>
            <div class="description">Server health check and status</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/agencies" target="_blank">/api/agencies</a>
            <div class="description">Get all federal agencies with CFR references</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/word-count/FCC" target="_blank">/api/word-count/:agencyName</a>
            <div class="description">Get word count for an agency's CFR references (try: FCC, FDA, EPA)</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/word-count/title/1" target="_blank">/api/word-count/title/:titleNumber</a>
            <div class="description">Get word count for an entire CFR title (all chapters) - Example: Title 1 = 50,617 words</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/word-count/title/1/chapter/III" target="_blank">/api/word-count/title/:titleNumber/chapter/:chapter</a>
            <div class="description">Get word count for a specific chapter only - Example: Title 1, Ch. III = 9,335 words</div>
        </div>

        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/amendment-timeline" target="_blank">/api/amendment-timeline</a>
            <div class="description">Get recent CFR amendments timeline</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/amendment-timeline/issue-date" target="_blank">/api/amendment-timeline/issue-date</a>
            <div class="description">Get CFR titles sorted by latest_issue_date</div>
        </div>
        

        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/cache/stats" target="_blank">/api/cache/stats</a>
            <div class="description">Get cache statistics and health</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/cache/changes/EPA" target="_blank">/api/cache/changes/:agencyName</a>
            <div class="description">Get cache change detection for an agency</div>
        </div>
        
        <div class="endpoint">
            <span class="method">DELETE</span>
            <span>/api/cache/expired</span>
            <div class="description">Clear expired cache entries</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/titles" target="_blank">/api/titles</a>
            <div class="description">Get all CFR titles sorted by most recent update date</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span>
            <a href="/api/titles/date-range?startDate=2024-01-01&endDate=2024-12-31" target="_blank">/api/titles/date-range</a>
            <div class="description">Get CFR titles filtered by date range (requires startDate & endDate params)</div>
        </div>
    </div>

    <div class="api-section">
        <h3>🚀 Quick Examples</h3>
        <div class="endpoint">
            <a href="/api/word-count/FDA" target="_blank">FDA Word Count</a>
            <div class="description">Food and Drug Administration regulations</div>
        </div>
        <div class="endpoint">
            <a href="/api/word-count/EPA" target="_blank">EPA Word Count</a>
            <div class="description">Environmental Protection Agency regulations</div>
        </div>
        <div class="endpoint">
            <a href="/api/word-count/title/1" target="_blank">Title 1 (Complete)</a>
            <div class="description">All chapters: 50,617 words</div>
        </div>
        <div class="endpoint">
            <a href="/api/word-count/title/1/chapter/III" target="_blank">Title 1, Chapter III</a>
            <div class="description">ACUS regulations only: 9,335 words (81% reduction)</div>
        </div>
        <div class="endpoint">
            <a href="/api/word-count/title/21" target="_blank">Title 21 (Complete)</a>
            <div class="description">Food and Drugs - all chapters</div>
        </div>
        <div class="endpoint">
            <a href="/api/word-count/title/21/chapter/I" target="_blank">Title 21, Chapter I</a>
            <div class="description">FDA regulations - chapter-specific</div>
        </div>
        <div class="endpoint">
            <a href="/api/amendment-timeline" target="_blank">Recent Amendments</a>
            <div class="description">Latest CFR amendments across all titles</div>
        </div>
        <div class="endpoint">
            <a href="/api/amendment-timeline/issue-date" target="_blank">Latest Issue Dates</a>
            <div class="description">CFR titles sorted by most recent issue date</div>
        </div>
        <div class="endpoint">
            <a href="/api/cache/stats" target="_blank">Cache Statistics</a>
            <div class="description">Word count cache performance and status</div>
        </div>
        <div class="endpoint">
            <a href="/api/titles" target="_blank">All CFR Titles</a>
            <div class="description">All CFR titles ordered by most recent update</div>
        </div>
    </div>
</body>
</html>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>Failed to load dashboard: ${error.message}</p>
    `);
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Only start the server if this file is run directly (not required as a module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log("🚀 eCFR Analytics API Server Started!");
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log("");
    console.log("📊 Available endpoints:");
    console.log(`   Dashboard:        http://localhost:${PORT}/`);
    console.log(`   All agencies:     http://localhost:${PORT}/api/agencies`);
    console.log(
      `   FCC word count:   http://localhost:${PORT}/api/word-count/FCC`
    );
    console.log(
      `   Title 1 count:    http://localhost:${PORT}/api/word-count/title/1`
    );
    console.log(
      `   Amendment timeline: http://localhost:${PORT}/api/amendment-timeline`
    );
    console.log(
      `   Latest issue dates: http://localhost:${PORT}/api/amendment-timeline/issue-date`
    );
    console.log(
      `   Cache stats:      http://localhost:${PORT}/api/cache/stats`
    );
    console.log(`   All CFR titles:   http://localhost:${PORT}/api/titles`);
    console.log(
      `   Chapter-specific: http://localhost:${PORT}/api/word-count/title/1/chapter/III`
    );
  });
}

module.exports = app;
