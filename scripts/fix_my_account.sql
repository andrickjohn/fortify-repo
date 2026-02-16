-- Run this in the Supabase SQL Editor to fix your current account
-- This finds any user in auth.users who is NOT in public.users and creates a district for them.

DO $$
DECLARE
    r RECORD;
    new_district_id uuid;
BEGIN
    -- Loop through all auth users who are missing from public.users OR have a NULL district_id
    FOR r IN 
        SELECT au.id, au.email 
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL OR pu.district_id IS NULL
    LOOP
        -- 1. Create District (if not exists, maybe check by name? For now, simplify to just create one)
        -- To avoid duplicates, we can check if a district with this name exists, but for "fixing" assume we need a new one.
        INSERT INTO public.districts (name, subscription_tier, onboarded_date)
        VALUES (
            split_part(r.email, '@', 1) || '''s District', 
            'pilot',
            CURRENT_DATE
        )
        RETURNING id INTO new_district_id;

        -- 2. Upsert User Profile
        INSERT INTO public.users (id, email, district_id, role)
        VALUES (
            r.id, 
            r.email, 
            new_district_id, 
            'super_admin'
        )
        ON CONFLICT (id) DO UPDATE SET
            district_id = EXCLUDED.district_id,
            role = 'super_admin'; -- Force elevate to super_admin to fix permissions
        
        RAISE NOTICE 'Fixed account for %', r.email;
    END LOOP;
END $$;
