-- Add dashboard_config column to users table for persisting user-specific dashboard settings
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{}';

-- Comment on column
COMMENT ON COLUMN users.dashboard_config IS 'Stores user-specific dashboard widget configuration (order, visibility, size)';
