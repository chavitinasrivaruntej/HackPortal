-- Run this in your Supabase SQL Editor to create the Storage Buckets

-- Create Issue Attachments Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-attachments', 'issue-attachments', true) ON CONFLICT (id) DO NOTHING;

-- Create Announcement Attachments Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('announcement-attachments', 'announcement-attachments', true) ON CONFLICT (id) DO NOTHING;

-- Set up permissive policies for issue-attachments (Public read/write for hackathon context)
CREATE POLICY "Public Access Issue Attachments" ON storage.objects FOR SELECT USING (bucket_id = 'issue-attachments');
CREATE POLICY "Public Insert Issue Attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-attachments');

-- Set up permissive policies for announcement-attachments
CREATE POLICY "Public Access Announcement Attachments" ON storage.objects FOR SELECT USING (bucket_id = 'announcement-attachments');
CREATE POLICY "Public Insert Announcement Attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'announcement-attachments');

-- Alter the issues table to permanently accept attachment_url strings
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS attachment_url TEXT;
