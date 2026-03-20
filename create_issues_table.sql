-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Note: Ensure permissions / RLS are either disabled (testing) or configured correctly for anon connections
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Allow anon insert issues" ON public.issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update issues" ON public.issues FOR UPDATE USING (true);
