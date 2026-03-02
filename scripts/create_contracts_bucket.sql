-- Create the 'contracts' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) policies for the bucket
-- Allow public access to view/download contracts
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'contracts');

-- Allow authenticated users to upload new contracts
CREATE POLICY "Authenticated Users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update existing uploads (for the replace flow)
CREATE POLICY "Authenticated Users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contracts' 
  AND auth.role() = 'authenticated'
);
