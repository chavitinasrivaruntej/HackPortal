-- 1. Create the `issues` table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);

-- Ensure the attachment_url column exists in case the table was created earlier without it
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 2. Create Issue Attachments Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('issue-attachments', 'issue-attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Create Announcement Attachments Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcement-attachments', 'announcement-attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- 3. Set up permissive policies for issue-attachments (Public read/write for hackathon context)
DROP POLICY IF EXISTS "Public Access Issue Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Issue Attachments" ON storage.objects;

CREATE POLICY "Public Access Issue Attachments" ON storage.objects 
  FOR SELECT USING (bucket_id = 'issue-attachments');
CREATE POLICY "Public Insert Issue Attachments" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'issue-attachments');

-- 4. Set up permissive policies for announcement-attachments
DROP POLICY IF EXISTS "Public Access Announcement Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Announcement Attachments" ON storage.objects;

CREATE POLICY "Public Access Announcement Attachments" ON storage.objects 
  FOR SELECT USING (bucket_id = 'announcement-attachments');
CREATE POLICY "Public Insert Announcement Attachments" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'announcement-attachments');
