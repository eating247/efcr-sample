-- ============================================================================
-- WORD COUNT DATABASE SCHEMA
-- ============================================================================
-- This schema supports:
-- 1. Individual CFR title word counts with versioning
-- 2. Agency-level aggregated word counts
-- 3. Change detection and history tracking
-- 4. Performance optimization with proper indexing
-- ============================================================================

-- CFR Title Word Counts (individual title data)
CREATE TABLE IF NOT EXISTS cfr_title_word_counts (
    id SERIAL PRIMARY KEY,
    title_number INTEGER NOT NULL,
    word_count INTEGER NOT NULL,
    text_length INTEGER NOT NULL,
    checksum VARCHAR(32) NOT NULL,
    issue_date DATE,
    sample_text TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_title_number CHECK (title_number >= 1 AND title_number <= 50),
    CONSTRAINT chk_word_count CHECK (word_count >= 0),
    CONSTRAINT chk_text_length CHECK (text_length >= 0),
    CONSTRAINT chk_checksum_format CHECK (LENGTH(checksum) = 8)
);

-- Agency Word Count Summaries (aggregated data)
CREATE TABLE IF NOT EXISTS agency_word_counts (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    total_words INTEGER NOT NULL,
    total_titles INTEGER NOT NULL,
    processed_titles INTEGER NOT NULL,
    agency_checksum VARCHAR(32) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_total_words CHECK (total_words >= 0),
    CONSTRAINT chk_total_titles CHECK (total_titles >= 0),
    CONSTRAINT chk_processed_titles CHECK (processed_titles >= 0 AND processed_titles <= total_titles),
    CONSTRAINT chk_agency_checksum_format CHECK (LENGTH(agency_checksum) = 8),
    
    -- Unique constraint: one current record per agency
    CONSTRAINT uq_agency_current UNIQUE (agency_id)
);

-- Agency Title Breakdown (junction table linking agencies to their CFR titles)
CREATE TABLE IF NOT EXISTS agency_title_word_counts (
    id SERIAL PRIMARY KEY,
    agency_word_count_id INTEGER NOT NULL REFERENCES agency_word_counts(id) ON DELETE CASCADE,
    cfr_title_word_count_id INTEGER NOT NULL REFERENCES cfr_title_word_counts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: each title can only appear once per agency summary
    CONSTRAINT uq_agency_title UNIQUE (agency_word_count_id, cfr_title_word_count_id)
);

-- Word Count History (for change detection and analytics)
CREATE TABLE IF NOT EXISTS word_count_history (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL, -- 'title' or 'agency'
    entity_id INTEGER NOT NULL, -- title_number or agency_id
    old_word_count INTEGER,
    new_word_count INTEGER NOT NULL,
    old_checksum VARCHAR(32),
    new_checksum VARCHAR(32) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'created', 'updated', 'unchanged'
    change_reason TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('title', 'agency')),
    CONSTRAINT chk_change_type CHECK (change_type IN ('created', 'updated', 'unchanged')),
    CONSTRAINT chk_word_counts CHECK (old_word_count IS NULL OR old_word_count >= 0),
    CONSTRAINT chk_new_word_count CHECK (new_word_count >= 0)
);

-- Word Count Processing Jobs (for tracking long-running operations)
CREATE TABLE IF NOT EXISTS word_count_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(20) NOT NULL, -- 'title', 'agency', 'bulk'
    entity_id INTEGER, -- title_number, agency_id, or NULL for bulk
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    result_data JSONB, -- Store processing results
    
    -- Constraints
    CONSTRAINT chk_job_type CHECK (job_type IN ('title', 'agency', 'bulk')),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- CFR Title Word Counts indexes
CREATE INDEX IF NOT EXISTS idx_cfr_title_word_counts_title ON cfr_title_word_counts(title_number);
CREATE INDEX IF NOT EXISTS idx_cfr_title_word_counts_checksum ON cfr_title_word_counts(checksum);
CREATE INDEX IF NOT EXISTS idx_cfr_title_word_counts_processed_at ON cfr_title_word_counts(processed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cfr_title_word_counts_latest 
    ON cfr_title_word_counts(title_number, processed_at DESC);

-- Agency Word Counts indexes
CREATE INDEX IF NOT EXISTS idx_agency_word_counts_agency_id ON agency_word_counts(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_word_counts_checksum ON agency_word_counts(agency_checksum);
CREATE INDEX IF NOT EXISTS idx_agency_word_counts_processed_at ON agency_word_counts(processed_at DESC);

-- Word Count History indexes
CREATE INDEX IF NOT EXISTS idx_word_count_history_entity ON word_count_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_word_count_history_detected_at ON word_count_history(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_word_count_history_change_type ON word_count_history(change_type);

-- Word Count Jobs indexes
CREATE INDEX IF NOT EXISTS idx_word_count_jobs_status ON word_count_jobs(status);
CREATE INDEX IF NOT EXISTS idx_word_count_jobs_type_entity ON word_count_jobs(job_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_word_count_jobs_started_at ON word_count_jobs(started_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp on agency_word_counts
CREATE OR REPLACE FUNCTION update_agency_word_counts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agency_word_counts_updated_at ON agency_word_counts;
CREATE TRIGGER update_agency_word_counts_updated_at 
    BEFORE UPDATE ON agency_word_counts 
    FOR EACH ROW EXECUTE FUNCTION update_agency_word_counts_updated_at();

-- Automatically create history entries when word counts change
CREATE OR REPLACE FUNCTION track_word_count_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT operations
    IF TG_OP = 'INSERT' THEN
        INSERT INTO word_count_history (
            entity_type, entity_id, old_word_count, new_word_count,
            old_checksum, new_checksum, change_type, change_reason
        ) VALUES (
            'agency', NEW.agency_id, NULL, NEW.total_words,
            NULL, NEW.agency_checksum, 'created', 'Initial word count calculation'
        );
        RETURN NEW;
    END IF;
    
    -- For UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        -- Only log if there's an actual change
        IF OLD.total_words != NEW.total_words OR OLD.agency_checksum != NEW.agency_checksum THEN
            INSERT INTO word_count_history (
                entity_type, entity_id, old_word_count, new_word_count,
                old_checksum, new_checksum, change_type, change_reason
            ) VALUES (
                'agency', NEW.agency_id, OLD.total_words, NEW.total_words,
                OLD.agency_checksum, NEW.agency_checksum, 'updated', 
                CASE 
                    WHEN OLD.agency_checksum != NEW.agency_checksum THEN 'Content changed'
                    ELSE 'Word count updated'
                END
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS track_agency_word_count_changes ON agency_word_counts;
CREATE TRIGGER track_agency_word_count_changes
    AFTER INSERT OR UPDATE ON agency_word_counts
    FOR EACH ROW EXECUTE FUNCTION track_word_count_changes();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Current word counts with agency information
CREATE OR REPLACE VIEW v_current_agency_word_counts AS
SELECT 
    a.id as agency_id,
    a.name as agency_name,
    a.short_name,
    a.display_name,
    awc.total_words,
    awc.total_titles,
    awc.processed_titles,
    awc.agency_checksum,
    awc.processed_at,
    awc.updated_at
FROM agencies a
LEFT JOIN agency_word_counts awc ON a.id = awc.agency_id
ORDER BY awc.total_words DESC NULLS LAST;

-- Latest word counts by CFR title
CREATE OR REPLACE VIEW v_latest_title_word_counts AS
SELECT DISTINCT ON (title_number)
    title_number,
    word_count,
    text_length,
    checksum,
    issue_date,
    processed_at
FROM cfr_title_word_counts
ORDER BY title_number, processed_at DESC;

-- Recent word count changes
CREATE OR REPLACE VIEW v_recent_word_count_changes AS
SELECT 
    wch.*,
    CASE 
        WHEN wch.entity_type = 'agency' THEN a.name
        WHEN wch.entity_type = 'title' THEN 'CFR Title ' || wch.entity_id::text
    END as entity_name,
    wch.new_word_count - COALESCE(wch.old_word_count, 0) as word_count_delta
FROM word_count_history wch
LEFT JOIN agencies a ON wch.entity_type = 'agency' AND wch.entity_id = a.id
ORDER BY wch.detected_at DESC
LIMIT 100;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE cfr_title_word_counts IS 'Individual CFR title word count data with versioning';
COMMENT ON TABLE agency_word_counts IS 'Aggregated word count summaries for agencies';
COMMENT ON TABLE agency_title_word_counts IS 'Junction table linking agencies to their CFR title word counts';
COMMENT ON TABLE word_count_history IS 'Historical record of word count changes for analytics';
COMMENT ON TABLE word_count_jobs IS 'Tracking table for long-running word count processing jobs';

COMMENT ON COLUMN cfr_title_word_counts.checksum IS 'MD5-like hash for change detection';
COMMENT ON COLUMN agency_word_counts.agency_checksum IS 'Aggregate checksum across all agency CFR titles';
COMMENT ON COLUMN word_count_history.change_type IS 'Type of change: created, updated, unchanged';
COMMENT ON COLUMN word_count_jobs.result_data IS 'JSON data containing processing results and metadata';
