-- ================================================================
-- New User Onboarding — Auto-provision public.users on signup
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Add missing columns to users table
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Trigger function: auto-create a public.users row when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role, settings_json, dashboard_config)
    VALUES (
        NEW.id,
        NEW.email,
        'district_viewer',   -- default role; admin can promote later
        '{}',
        '{}'
    )
    ON CONFLICT (id) DO NOTHING;  -- idempotent: skip if already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Back-fill any existing auth users that don't have a public.users row
INSERT INTO public.users (id, email, role, settings_json, dashboard_config)
SELECT
    au.id,
    au.email,
    'district_viewer',
    '{}',
    '{}'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
