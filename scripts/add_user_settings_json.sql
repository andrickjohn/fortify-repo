-- Add settings_json column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'settings_json') THEN
        ALTER TABLE users ADD COLUMN settings_json JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Enable RLS for settings_json (optional, but good practice if not enabled)
-- Ensure users can update their own settings
CREATE POLICY "Users can update their own settings_json" ON users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Grant permissions if needed (usually authenticated role has access)
GRANT SELECT, UPDATE ON users TO authenticated;
