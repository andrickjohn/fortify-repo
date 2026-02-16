-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS organization TEXT;

-- Update role check constraint if it exists, or just document the new roles
-- We will rely on application logic for roles for now to avoid breaking existing constraints if they exist
-- Intended roles: 'super_admin', 'district_admin', 'district_viewer', 'fortify_admin', 'district_manager', 'negotiator'
