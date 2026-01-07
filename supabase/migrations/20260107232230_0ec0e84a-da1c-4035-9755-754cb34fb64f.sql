-- Create storage bucket for headshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('headshots', 'headshots', true);

-- Allow authenticated users to upload their own headshots
CREATE POLICY "Users can upload their own headshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own headshots
CREATE POLICY "Users can update their own headshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to headshots
CREATE POLICY "Headshots are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'headshots');