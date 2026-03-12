-- Update schools RLS to allow super_admin cross-district access
-- Also adds the schools table if it doesn't exist yet

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

-- Drop old policies and recreate with super_admin bypass
DROP POLICY IF EXISTS district_isolation_schools_select ON schools;
DROP POLICY IF EXISTS district_isolation_schools_insert ON schools;
DROP POLICY IF EXISTS district_isolation_schools_update ON schools;
DROP POLICY IF EXISTS district_isolation_schools_delete ON schools;

CREATE POLICY district_isolation_schools_select ON schools
    FOR SELECT USING (district_id = get_my_district_id() OR is_super_admin());

CREATE POLICY district_isolation_schools_insert ON schools
    FOR INSERT WITH CHECK (district_id = get_my_district_id() OR is_super_admin());

CREATE POLICY district_isolation_schools_update ON schools
    FOR UPDATE USING (district_id = get_my_district_id() OR is_super_admin());

CREATE POLICY district_isolation_schools_delete ON schools
    FOR DELETE USING (district_id = get_my_district_id() OR is_super_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO authenticated;
