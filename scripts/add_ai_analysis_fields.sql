-- Migration: Add AI Analysis columns to contracts table

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'not_started' CHECK (ai_status IN ('not_started', 'in_progress', 'completed', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS ai_recommendations jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_cost numeric(10, 4) DEFAULT 0.0000;

-- Comment on columns
COMMENT ON COLUMN contracts.ai_status IS 'Status of the AI review process: not_started, in_progress, completed, approved, rejected';
COMMENT ON COLUMN contracts.ai_recommendations IS 'JSONB object containing AI analysis results, savings opportunities, and negotiation points';
COMMENT ON COLUMN contracts.ai_cost IS 'Running total cost of AI usage for this contract analysis';
