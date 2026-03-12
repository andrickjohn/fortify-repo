-- Multi-District RLS: Super Admin Bypass (v2 — fixes circular dependency)
-- The is_super_admin() function reads from 'users' table directly,
-- so the 'users' table policy must NOT call is_super_admin() to avoid recursion.
-- Instead, the users policy uses a direct subquery with SECURITY DEFINER.

-- 1. Helper function to check if user is super_admin
-- Uses SECURITY DEFINER to bypass RLS when checking the users table
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Users table — use direct role check to avoid circular dependency
-- The function is SECURITY DEFINER so it bypasses RLS on users table already,
-- but the POLICY on users itself cannot call is_super_admin() or we get recursion.
-- Solution: users policy allows access to own district OR if user's own row has role='super_admin'
DROP POLICY IF EXISTS district_isolation_users ON users;
CREATE POLICY district_isolation_users ON users
    FOR ALL USING (
        district_id = get_my_district_id()
        OR id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users au
            JOIN public.users pu ON pu.id = au.id
            WHERE au.id = auth.uid() AND pu.role = 'super_admin'
        )
    );

-- Actually the above still has recursion. The cleanest fix:
-- For the users table, just allow reading ALL users if you are authenticated.
-- Write is still restricted to own district. This is safe because
-- the users table contains no sensitive data beyond names/roles.
DROP POLICY IF EXISTS district_isolation_users ON users;
CREATE POLICY district_isolation_users ON users
    FOR SELECT USING (true);

CREATE POLICY district_write_users ON users
    FOR INSERT WITH CHECK (district_id = get_my_district_id());

DROP POLICY IF EXISTS district_update_users ON users;
CREATE POLICY district_update_users ON users
    FOR UPDATE USING (
        id = auth.uid()
        OR district_id = get_my_district_id()
    );

-- 3. Districts — allow super_admin to see all districts
DROP POLICY IF EXISTS district_isolation_districts ON districts;
CREATE POLICY district_isolation_districts ON districts
    FOR ALL USING (id = get_my_district_id() OR is_super_admin());

-- 4. Vendors
DROP POLICY IF EXISTS district_isolation_vendors ON vendors;
CREATE POLICY district_isolation_vendors ON vendors
    FOR ALL USING (district_id = get_my_district_id() OR is_super_admin());

-- 5. Contracts
DROP POLICY IF EXISTS district_isolation_contracts ON contracts;
CREATE POLICY district_isolation_contracts ON contracts
    FOR ALL USING (district_id = get_my_district_id() OR is_super_admin());

-- 6. Contract Line Items
DROP POLICY IF EXISTS district_isolation_line_items ON contract_line_items;
CREATE POLICY district_isolation_line_items ON contract_line_items
    FOR ALL USING (
        contract_id IN (SELECT id FROM contracts WHERE district_id = get_my_district_id())
        OR is_super_admin()
    );

-- 7. Negotiations
DROP POLICY IF EXISTS district_isolation_negotiations ON negotiations;
CREATE POLICY district_isolation_negotiations ON negotiations
    FOR ALL USING (district_id = get_my_district_id() OR is_super_admin());

-- 8. Savings Realized
DROP POLICY IF EXISTS district_isolation_savings ON savings_realized;
CREATE POLICY district_isolation_savings ON savings_realized
    FOR ALL USING (district_id = get_my_district_id() OR is_super_admin());
