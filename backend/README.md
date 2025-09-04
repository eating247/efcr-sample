# eCFR Analytics Backend

A Node.js/Express API server that provides real-time word count analysis of federal regulations from the official Code of Federal Regulations (CFR).

## Features

- **Real-time word counting** from official eCFR XML data
- **Agency-specific analysis** with support for 153+ federal agencies
- **CFR Title analysis** for individual regulation titles
- **Comprehensive metadata** including checksums, issue dates, and text length
- **Nested agency support** (child agencies under parent departments)

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode with auto-restart
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check

```
GET /api/health
```

Returns server status and version information.

### Agency Word Count

```
GET /api/word-count/:agencyName
```

Get real-time word count for a specific agency's CFR references.

**Examples:**

- `/api/word-count/FCC` - Federal Communications Commission
- `/api/word-count/FDA` - Food and Drug Administration
- `/api/word-count/EPA` - Environmental Protection Agency

**Response:**

```json
{
  "success": true,
  "agency": {
    "name": "Food and Drug Administration",
    "short_name": "FDA",
    "display_name": "Food and Drug Administration, Department of Health and Human Services",
    "slug": "food-and-drug-administration",
    "cfr_references": [{ "title": 21, "chapter": "I" }]
  },
  "wordCountData": {
    "totalWords": 1902374,
    "totalTitles": 1,
    "processedTitles": 1,
    "agencyChecksum": "7822cedf",
    "processedAt": "2025-08-28T20:31:11.562Z",
    "titleBreakdown": [
      {
        "title": 21,
        "wordCount": 1902374,
        "textLength": 16019364,
        "checksum": "2e633d33",
        "issueDate": "2025-08-22",
        "error": null
      }
    ]
  },
  "metadata": {
    "processingTime": "2025-08-28T20:31:14.270Z",
    "source": "eCFR API",
    "note": "Real-time word count from official CFR XML data"
  }
}
```

### CFR Title Word Count

```
GET /api/word-count/title/:titleNumber
```

Get word count for a specific CFR title (1-50).

**Examples:**

- `/api/word-count/title/1` - General Provisions
- `/api/word-count/title/21` - Food and Drugs
- `/api/word-count/title/40` - Environmental Protection

### Legacy Endpoints

- `GET /api/agencies` - List all agencies (static data)
- `GET /api/agencies/:id` - Get specific agency details
- `GET /api/overview` - System overview and metrics
- `GET /api/search?q=query` - Search agencies by name
- `GET /api/historical-analysis` - Historical analysis data

## Data Sources

- **Agencies**: `agencies.json` - Complete list of federal agencies with CFR references
- **Regulations**: Official eCFR API - Real-time XML data from https://www.ecfr.gov
- **Word Counting**: Custom extraction and analysis of regulation text

## Architecture

### Core Components

1. **CFRXMLWordCounter** (`wordcounter.js`)

   - Downloads XML from eCFR API
   - Extracts text from regulation content
   - Performs word counting and analysis
   - Generates checksums for data integrity

2. **Express Server** (`server.js`)

   - RESTful API endpoints
   - Agency search and matching
   - Response formatting and error handling

3. **Agency Data** (`agencies.json`)
   - 153 federal agencies
   - CFR title references
   - Hierarchical structure (parent/child agencies)

### Processing Flow

1. **Request** → Agency name lookup in `agencies.json`
2. **Validation** → Check for CFR references
3. **Download** → Fetch latest XML from eCFR API
4. **Extract** → Parse regulation text from XML
5. **Analyze** → Count words, generate checksums
6. **Response** → Return structured JSON with results

## Development

### Testing

```bash
# Test word counter with sample agency
npm test

# Test specific agencies
npm run test-fcc
npm run test-fda
```

### Adding New Agencies

Agencies are defined in `agencies.json`. Each agency should have:

- `name`: Full agency name
- `short_name`: Abbreviation (optional)
- `cfr_references`: Array of CFR titles the agency regulates
- `slug`: URL-friendly identifier

### Performance Notes

- Large CFR titles (like Title 7 - Agriculture) can be 40+ MB
- Processing time scales with regulation size
- Consider caching for frequently accessed agencies
- API includes 1-second delays between requests to be respectful

## Error Handling

The API provides comprehensive error responses:

- **404**: Agency not found
- **400**: Invalid parameters
- **500**: Processing errors

All errors include helpful messages and available alternatives.

## License

MIT License - see LICENSE file for details.
