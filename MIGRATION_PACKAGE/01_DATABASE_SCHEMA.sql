-- ============================================================================
-- ACCESSIBILITY ISSUES TABLE - SQL SCHEMA
-- ============================================================================
-- This schema should be added to your existing organization database
-- It creates a new table for storing accessibility test results
-- ============================================================================

-- Create the accessibility_issues table
CREATE TABLE IF NOT EXISTS accessibility_issues (
    id TEXT PRIMARY KEY,                    -- UUID for each issue
    urlid TEXT NOT NULL,                    -- Test session ID (grouping identifier, NOT a foreign key)
    url TEXT NOT NULL,                      -- URL that was tested
    issue TEXT NOT NULL,                    -- Issue description
    fix TEXT NOT NULL,                      -- Recommended fix
    is_applied BOOLEAN DEFAULT 0,           -- Whether fix has been applied (0 = pending, 1 = fixed)
    kind_of_change TEXT CHECK(kind_of_change IN ('add', 'update', 'review')),  -- Priority level
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When recorded
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- Last update time
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_urlid ON accessibility_issues(urlid);
CREATE INDEX IF NOT EXISTS idx_url ON accessibility_issues(url);
CREATE INDEX IF NOT EXISTS idx_is_applied ON accessibility_issues(is_applied);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The 'urlid' field is NOT a foreign key - it's just a grouping identifier
--    This means each issue is independent and can be deleted without cascading
--
-- 2. kind_of_change values:
--    - 'add': Critical/serious issues requiring immediate action
--    - 'update': Moderate issues needing changes
--    - 'review': Minor issues to review
--
-- 3. Indexes are created on urlid, url, and is_applied for fast queries
--
-- 4. If your database is PostgreSQL, MySQL, or other (not SQLite):
--    - Change TEXT to VARCHAR(255) or appropriate type
--    - Change BOOLEAN to TINYINT(1) for MySQL if needed
--    - Adjust TIMESTAMP syntax as needed for your database
-- ============================================================================

-- For PostgreSQL, use this version instead:
/*
CREATE TABLE IF NOT EXISTS accessibility_issues (
    id VARCHAR(255) PRIMARY KEY,
    urlid VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    issue TEXT NOT NULL,
    fix TEXT NOT NULL,
    is_applied BOOLEAN DEFAULT FALSE,
    kind_of_change VARCHAR(10) CHECK(kind_of_change IN ('add', 'update', 'review')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_urlid ON accessibility_issues(urlid);
CREATE INDEX IF NOT EXISTS idx_url ON accessibility_issues(url);
CREATE INDEX IF NOT EXISTS idx_is_applied ON accessibility_issues(is_applied);
*/

-- For MySQL, use this version instead:
/*
CREATE TABLE IF NOT EXISTS accessibility_issues (
    id VARCHAR(255) PRIMARY KEY,
    urlid VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    issue TEXT NOT NULL,
    fix TEXT NOT NULL,
    is_applied TINYINT(1) DEFAULT 0,
    kind_of_change VARCHAR(10) CHECK(kind_of_change IN ('add', 'update', 'review')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_urlid (urlid),
    INDEX idx_url (url(255)),
    INDEX idx_is_applied (is_applied)
);
*/

