-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    principal_name TEXT,
    principal_email TEXT,
    enrollment INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing helper function
CREATE POLICY district_isolation_schools_select ON schools
    FOR SELECT USING (district_id = get_my_district_id());

CREATE POLICY district_isolation_schools_insert ON schools
    FOR INSERT WITH CHECK (district_id = get_my_district_id());

CREATE POLICY district_isolation_schools_update ON schools
    FOR UPDATE USING (district_id = get_my_district_id());

CREATE POLICY district_isolation_schools_delete ON schools
    FOR DELETE USING (district_id = get_my_district_id());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO authenticated;
