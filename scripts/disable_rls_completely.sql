-- NUCLEAR OPTION: Completely disable RLS for pilot demo
-- Copy everything from this file and paste into Supabase SQL Editor

-- 1. Drop ALL existing policies
DROP POLICY IF EXISTS district_isolation_districts ON districts;
DROP POLICY IF EXISTS district_isolation_users ON users;  
DROP POLICY IF EXISTS district_isolation_vendors ON vendors;
DROP POLICY IF EXISTS district_isolation_contracts ON contracts;
DROP POLICY IF EXISTS district_isolation_line_items ON contract_line_items;
DROP POLICY IF EXISTS district_isolation_negotiations ON negotiations;
DROP POLICY IF EXISTS district_isolation_savings ON savings_realized;

-- 2. Completely DISABLE RLS on all tables  
ALTER TABLE districts DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE contract_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations DISABLE ROW LEVEL SECURITY;
ALTER TABLE savings_realized DISABLE ROW LEVEL SECURITY;

-- 3. Grant full SELECT access to public role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
