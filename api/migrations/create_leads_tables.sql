-- Create leads table for storing discovered businesses
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Google Places data
  google_place_id VARCHAR(255) UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  category VARCHAR(255),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- Email data from ZeroBounce
  emails JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'google_places',
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create search history table
CREATE TABLE IF NOT EXISTS lead_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Search parameters
  search_category VARCHAR(255),
  search_location VARCHAR(255),
  search_radius INTEGER DEFAULT 5000, -- meters
  search_query TEXT,
  
  -- Results
  results_count INTEGER DEFAULT 0,
  results_data JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_google_place_id ON leads(google_place_id);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_lead_searches_user_id ON lead_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_searches_created_at ON lead_searches(created_at);

-- Create updated_at trigger for leads table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();