-- Run this in your Supabase SQL Editor

-- Create the global settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Disable RLS so all users can read settings
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Insert default round setting (change to 'Round 2', 'Round 3', etc. from Admin panel)
INSERT INTO public.settings (key, value) VALUES ('current_round', 'Round 1') ON CONFLICT (key) DO NOTHING;
