# USDS Engineering Take-Home Assessment Documentation

## What I Built

I created an eCFR Analytics application that helps people make sense of federal regulations. The goal was to take the overwhelming mass of government regulatory data and turn it into something actually useful for understanding potential deregulation efforts.

(Here's a video where I walk through the application UI.)
[https://www.loom.com/share/72a3ea47ef5f46dbb054a08c005d2a87?sid=d66584bf-d56c-4133-8e27-58084b6938b3]

**Time spent:** 6 hours (ended up taking 2 hours longer than the estimated 4 hours)  
**Tech stack:** Node.js/Express backend, React frontend, PostgreSQL database  
**Running:** Locally for now

## Running the App Locally

### Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

### Setup Instructions

# Install backend dependencies

cd backend
npm install

# Install frontend dependencies

cd ../frontend
npm install

````

#### 2. Database Setup

```bash
# Create a PostgreSQL database
createdb usds_ecfr

# Set up environment variables (create backend/.env file)
cd ../backend
echo "DATABASE_URL=postgresql://username:password@localhost:5432/usds_ecfr" > .env
````

#### 3. Run Database Migrations

```bash
# From the backend directory
npm run migrate
```

This will create the necessary tables and populate them with agency data.

#### 4. Start the Applications

**Terminal 1 - Backend Server:**

```bash
cd backend
npm start
```

The backend will start on `http://localhost:3001`

**Terminal 2 - Frontend Development Server:**

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

#### 5. Verify Everything Works

- Visit `http://localhost:3000` to see the React frontend
- Visit `http://localhost:3001` to see the backend API dashboard

### Development Features

- **Hot reload** - Both frontend and backend support hot reloading during development
- **API Dashboard** - Visit `http://localhost:3001` to see all available endpoints with examples
- **Database Health** - Check `http://localhost:3001/api/health` to verify database connectivity
- **Cache Statistics** - Monitor cache performance at `http://localhost:3001/api/cache/stats`

### Troubleshooting

**Database connection issues:**

- Verify PostgreSQL is running: `pg_ctl status`
- Check your DATABASE_URL in `backend/.env`
- Ensure the database exists: `psql -l | grep usds_ecfr`

**Port conflicts:**

- Backend uses port 3001, frontend uses port 3000
- If ports are in use, you can modify them in the respective package.json files

**Slow initial word counts:**

- First-time word counting downloads large XML files from eCFR API
- Subsequent requests use cached data and are much faster
- Loading indicators show cache status

## The Original Assignment

The challenge was to build a website that analyzes Federal Regulations from the eCFR to provide digestible insights for potential deregulation efforts across government agencies.

- Download current eCFR data and store it server-side
- Create APIs to get that stored data back out
- Build a UI for analyzing things like word counts per agency and how regulations change over time
- Add some custom analysis that would actually help people make decisions
- Make sure users can easily review the results

## How I Approached It

### Backend Design

I went with Node.js and Express because I wanted something that could handle the XML parsing and API calls efficiently. The backend ended up being more complex than I initially expected, mainly because of the caching functionality that I wanted to implement.

#### Database Structure

The database has two main tables. The agencies table models the federal government hierarchy with a self-referencing parent relationship - so you can see how the Department of Transportation has child agencies like the FAA, FHWA, and others underneath it.

```sql
CREATE TABLE agencies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  short_name VARCHAR(255),
  display_name VARCHAR(255) NOT NULL NULL,
  sortable_name VARCHAR(255) NOT NULL NULL,
  slug VARCHAR(255) NOT NULL NULL UNIQUE,
  parent_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Then there's a cfr_references table that connects agencies to their specific CFR titles and chapters:

```sql
CREATE TABLE cfr_references (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title INTEGER NOT NULL NULL,
  chapter VARCHAR(20),
  subtitle VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### API Endpoints

I built out these endpoints to handle the different ways someone might want to explore the data:

- `GET /api/health` - Basic health check
- `GET /api/agencies` - Get all agencies with their CFR references
- `GET /api/word-count/:agencyName` - Word count for a specific agency's regulations (may not be super accurate)
- `GET /api/word-count/title/:titleNumber` - Word count for a specific CFR title
- `GET /api/amendment-timeline` - Recent amendments across all agencies
- `GET /api/amendment-timeline/:agencyName` - Amendment timeline for one agency
- `GET /api/cache/stats` - Cache health and statistics
- `GET /api/cache/changes/:agencyName` - Cache change detection
- `DELETE /api/cache/expired` - Clean up old cache entries

#### The Heavy Lifting: XML Processing

The most intensive part of the backend is the CFRXMLWordCounter class. This thing downloads regulatory text in XML format from the eCFR public API and parses it to count words. The XML structure is pretty complex, and I found myself learning more about how CFR data is organized as I went.

The class also handles checksum verification to make sure the data hasn't been corrupted and interfaces with the caching system since you definitely don't want to be re-downloading and parsing massive XML files every time someone wants to see word counts.

#### Caching Strategy

I realized pretty quickly that without caching, this app would be unusably slow. For a production app, I would rely on Redis or Memecached. The caching system I built handles a few different things:

- Shows real-time status so users know when data is cached vs being processed
- Uses checksums for data integrity (you can see these in the UI as things like "79fcc5")
- Automatically cleans up expired entries
- Tracks when regulatory text has actually changed
- Dramatically improves performance by avoiding redundant API calls

### Frontend Experience

I built the frontend in React with two main sections that felt like the most natural way to explore this kind of data.

#### Agency Explorer

This is where you can search and browse agencies. The search works across agency names, abbreviations, and even CFR titles, which turned out to be really useful since sometimes you know you're looking for something about "agriculture" but might not remember that's handled by the Department of Agriculture.

Each agency shows up as a card that you can expand to see:

- Which CFR titles and chapters they're responsible for
- Their child agencies (like how DOT has FAA, FHWA, etc.)
- Real-time word counts for their regulations
- Cache status so you know if the data is fresh

The word count feature shows you things like the Department of Transportation having over 3.6 million words of regulations, which gives you a sense of the regulatory scope different agencies have.

#### Amendment Timeline

This view shows recent changes to federal regulations, which I thought would be crucial for understanding regulatory activity patterns. You can sort by recent amendments or by latest issue dates, and everything is color-coded by how recent it is - green for the last 7 days, orange for 30 days, etc.

It's interesting to see that on any given day, there might be 10+ different CFR titles being amended across agencies ranging from Agriculture to Telecommunications to National Defense.

## Technical Decisions and Trade-offs

### Database Design Evolution

My database schema evolved as I worked on the project. I started with a simpler structure but kept learning more about how CFR data is actually organized. If I had more time, I'd definitely flesh out the database structure for titles, chapters, and subsections more completely.

The current structure prioritizes the agency relationships and basic CFR mapping, which works well for the core functionality but could be expanded to handle more granular regulatory text organization.

### Why I Built the Caching System

The caching became essential once I realized how intensive the XML parsing was. The eCFR API returns massive XML documents that can take several seconds to download and parse. Without caching, every word count request would involve:

1. API call to eCFR (slow)
2. Downloading large XML file (slow)
3. Parsing complex XML structure (slow)
4. Counting words across the parsed content (fast, finally)

With caching, most requests are nearly instantaneous, and users get visual feedback about cache status so they understand when data is being refreshed.

### Controller Tests and Service Layer

I wrote controller tests that focused on the API endpoints, but if I had more time, I'd definitely refactor to move more logic into dedicated service classes. Right now some of the business logic is mixed in with the controllers, which makes testing more complex than it needs to be.

## Custom Analysis Beyond Word Counting

The assignment asked for custom metrics that could inform decision-making, so I implemented several analytical features:

- **Checksum verification** for data integrity - you can see these in the UI and even copy them for verification
- **Temporal change tracking** to understand amendment patterns over time
- **Agency scope comparison** so you can see the relative regulatory footprint of different agencies
- **Hierarchical analysis** that shows how regulatory responsibility is distributed across parent agencies and their child organizations

## Performance Considerations

A few things I focused on to keep the app responsive:

- **Strategic database indexing** on the fields that get queried most often (agency names, slugs, CFR references)
- **Efficient XML parsing** algorithms in the CFRXMLWordCounter
- **Cache-first architecture** that tries to serve cached data before hitting external APIs
- **Progressive loading** in the UI so users see data as it becomes available rather than staring at loading screens

## What I'd Change With More Time

**Database schema improvements** - Now that I understand the CFR data structure better, I'd add more detailed modeling for the regulatory text hierarchy including parts, sections, and subsections.

**More comprehensive service layer** - I'd extract more business logic from the controllers and build out dedicated service classes with better separation of concerns.
