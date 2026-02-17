-- Add email_draft column to negotiations table
ALTER TABLE negotiations
ADD COLUMN email_draft JSONB DEFAULT '{}';
