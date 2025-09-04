-- Create agencies table with self-referencing parent relationship
CREATE TABLE IF NOT EXISTS agencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    sortable_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CFR references table
CREATE TABLE IF NOT EXISTS cfr_references (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    title INTEGER NOT NULL,
    chapter VARCHAR(20),
    subtitle VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alter existing table if needed
ALTER TABLE agencies ALTER COLUMN short_name TYPE VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agencies_parent_id ON agencies(parent_id);
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);
CREATE INDEX IF NOT EXISTS idx_cfr_references_agency_id ON cfr_references(agency_id);
CREATE INDEX IF NOT EXISTS idx_cfr_references_title ON cfr_references(title);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for agencies table
DROP TRIGGER IF EXISTS update_agencies_updated_at ON agencies;
CREATE TRIGGER update_agencies_updated_at 
    BEFORE UPDATE ON agencies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE agencies IS 'Federal agencies with hierarchical parent-child relationships';
COMMENT ON COLUMN agencies.parent_id IS 'References parent agency for child agencies, NULL for top-level agencies';
COMMENT ON TABLE cfr_references IS 'CFR (Code of Federal Regulations) references for each agency';
COMMENT ON COLUMN cfr_references.title IS 'CFR Title number (e.g., 40 for EPA regulations)';
COMMENT ON COLUMN cfr_references.chapter IS 'CFR Chapter identifier (e.g., "I", "III", "XV")';
COMMENT ON COLUMN cfr_references.subtitle IS 'CFR Subtitle identifier when applicable';
