-- Run this in your Supabase SQL Editor to fix the issues table permissions

-- Disable RLS on issues table (easiest fix for hackathon context)
ALTER TABLE public.issues DISABLE ROW LEVEL SECURITY;

-- OR if you prefer to keep RLS on, run these instead:
-- ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all reads on issues" ON public.issues FOR SELECT USING (true);
-- CREATE POLICY "Allow all inserts on issues" ON public.issues FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow all updates on issues" ON public.issues FOR UPDATE USING (true);
