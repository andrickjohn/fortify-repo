-- Fix Script: Restore Users deleted by Cascade
-- This script finds any user in auth.users who is missing from public.users
-- and re-creates their profile, linking them to Orange Unified School District.

INSERT INTO public.users (id, email, district_id, role)
SELECT 
    au.id, 
    au.email, 
    'ea9fd3ca-a56e-4959-bb79-201cc8d70450', -- Orange Unified School District ID
    'district_admin' -- Restoring as District Admin
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users);

-- Verification
SELECT * FROM public.users;
