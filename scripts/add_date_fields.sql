-- Enhanced Date Extraction Schema Updates (v2)
-- Run this in Supabase SQL Editor

-- Add fields for date tracking and review flags
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS term_years INTEGER;

-- New field for PO Issue Date
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS po_issue_date DATE;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name IN ('requires_review', 'review_notes', 'term_years', 'po_issue_date');
