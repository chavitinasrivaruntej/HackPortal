-- ====================================================
-- HACKATHON MANAGEMENT PLATFORM SCHEMA
-- ====================================================

-- 1. admins table
CREATE TABLE public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.admins (admin_id, password) VALUES 
('varun@admin', 'varuntej27*'),
('sreeja@admin', 'Sree@2006'),
('hemanth@admin', 'phani2007'),
('srinivas@admin', 'srinivas12345'),
('4518', 'rohitsharma');

-- 2. problem_statements table
CREATE TABLE public.problem_statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    short_summary TEXT,
    full_description TEXT,
    constraints TEXT,
    expected_direction TEXT,
    notes TEXT,
    selection_limit INTEGER DEFAULT 4,
    selected_count INTEGER DEFAULT 0,
    serial_number INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Dummy Problem Statements
INSERT INTO public.problem_statements (title, domain, short_summary, full_description, constraints, expected_direction, notes, serial_number) VALUES 
('AI Patient Triage', 'Healthcare', 'Automate patient triage using AI.', 'Develop an AI model that predicts patient severity based on early symptoms and suggests triage priority.', 'Must run locally, under 1s response.', 'Use open source LLMs or classification models.', 'Focus on explainability.', 1),
('Fraud Detection Engine', 'FinTech', 'Realtime transaction monitoring.', 'Build a realtime scoring engine for credit card transactions to flag suspicious activity.', 'Must process 10k TPS.', 'Implement sliding window algorithms.', 'Latency is critical.', 2),
('Zero-Trust Network Analyzer', 'Cybersecurity', 'Analyze network traffic for anomalies.', 'Create a dashboard that ingests VPC flow logs and flags potential lateral movement.', 'Must support AWS flow logs.', 'Machine learning for anomaly detection.', 'Provide actionable remediation steps.', 3),
('Dynamic Traffic Routing', 'Smart Mobility', 'Optimize city traffic lights.', 'Design a system that uses mock live camera feeds to adjust traffic light timings.', 'Simulate API for camera feeds.', 'Reinforcement learning preferred.', 'Show visual dashboard of city map.', 4),
('Personalized Learning Path', 'Education Technology', 'Adaptive quiz platform.', 'Build a student portal that adjusts question difficulty based on previous answers.', 'Web application.', 'Item response theory.', 'Include teacher dashboard for analytics.', 5);


-- 3. teams table
CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    team_name TEXT NOT NULL,
    department TEXT,
    year TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Shortlisted', 'Eliminated', 'Frozen')),
    selected_problem_id UUID REFERENCES public.problem_statements(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Dummy Teams
INSERT INTO public.teams (team_id, password, team_name, department, year) VALUES 
('TEAM001', 'team001', 'Quantum Coders', 'Computer Science', '3rd Year'),
('TEAM002', 'team002', 'Byte Pandas', 'Information Tech', '2nd Year'),
('TEAM003', 'team003', 'Neural Knights', 'AI & Data Science', '4th Year'),
('TEAM004', 'team004', 'Cyber Hawks', 'Cybersecurity', '3rd Year');


-- 4. team_members table
CREATE TABLE public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_ref_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    member_role TEXT NOT NULL, -- Team Lead, Member 2, Member 3
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gender TEXT
);

-- Insert Dummy Team Members
DO $$
DECLARE
    team1_id UUID;
    team2_id UUID;
    team3_id UUID;
    team4_id UUID;
BEGIN
    SELECT id INTO team1_id FROM public.teams WHERE team_id = 'TEAM001';
    SELECT id INTO team2_id FROM public.teams WHERE team_id = 'TEAM002';
    SELECT id INTO team3_id FROM public.teams WHERE team_id = 'TEAM003';
    SELECT id INTO team4_id FROM public.teams WHERE team_id = 'TEAM004';

    INSERT INTO public.team_members (team_ref_id, member_role, name, phone, email, gender) VALUES
    (team1_id, 'Team Lead', 'Alice Smith', '555-0100', 'alice@example.com', 'Female'),
    (team1_id, 'Member 2', 'Bob Johnson', '555-0101', 'bob@example.com', 'Male'),
    (team1_id, 'Member 3', 'Charlie Brown', '555-0102', 'charlie@example.com', 'Male'),
    
    (team2_id, 'Team Lead', 'Diana Prince', '555-0200', 'diana@example.com', 'Female'),
    (team2_id, 'Member 2', 'Evan Davis', '555-0201', 'evan@example.com', 'Male'),
    (team2_id, 'Member 3', 'Fiona White', '555-0202', 'fiona@example.com', 'Female'),
    
    (team3_id, 'Team Lead', 'George King', '555-0300', 'george@example.com', 'Male'),
    (team3_id, 'Member 2', 'Hannah Lee', '555-0301', 'hannah@example.com', 'Female'),
    (team3_id, 'Member 3', 'Ian Wright', '555-0302', 'ian@example.com', 'Male'),
    
    (team4_id, 'Team Lead', 'Jack Black', '555-0400', 'jack@example.com', 'Male'),
    (team4_id, 'Member 2', 'Karen Green', '555-0401', 'karen@example.com', 'Female'),
    (team4_id, 'Member 3', 'Liam Scott', '555-0402', 'liam@example.com', 'Male');
END $$;


-- 5. team_selections table
CREATE TABLE public.team_selections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_ref_id UUID REFERENCES public.teams(id) UNIQUE NOT NULL,
    problem_ref_id UUID REFERENCES public.problem_statements(id) NOT NULL,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 6. announcements table
CREATE TABLE public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Dummy Announcement
INSERT INTO public.announcements (message) VALUES ('Welcome to the Hackathon! Please review the problem statements and make your selection before the deadline.');


-- 7. activity_logs table
CREATE TABLE public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    team_ref_id UUID REFERENCES public.teams(id),
    admin_ref_id UUID REFERENCES public.admins(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 8. issues table
CREATE SEQUENCE IF NOT EXISTS issues_seq;

CREATE TABLE public.issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_id TEXT UNIQUE DEFAULT 'ISSUE-' || lpad(nextval('issues_seq')::text, 3, '0'),
    team_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    attachment_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 9. settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO public.settings (key, value) VALUES ('current_round', 'Round 1') ON CONFLICT (key) DO NOTHING;


-- ====================================================
-- TRIGGERS & FUNCTIONS
-- ====================================================

-- Function to handle team selection insertions and update problem counter/team status
CREATE OR REPLACE FUNCTION handle_team_selection()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
BEGIN
    -- ATOMIC CHECK: Ensure we haven't reached the limit yet
    -- Using SELECT FOR UPDATE to lock the row and prevent race conditions
    SELECT selected_count, selection_limit INTO current_count, max_limit
    FROM public.problem_statements
    WHERE id = NEW.problem_ref_id
    FOR UPDATE;

    IF current_count >= max_limit THEN
        RAISE EXCEPTION 'This problem statement is already full (Limit: %)', max_limit;
    END IF;

    -- Update teams table with selected problem
    UPDATE public.teams
    SET selected_problem_id = NEW.problem_ref_id
    WHERE id = NEW.team_ref_id;

    -- Increment selected_count in problem_statements
    UPDATE public.problem_statements
    SET selected_count = selected_count + 1
    WHERE id = NEW.problem_ref_id;

    -- Log activity
    INSERT INTO public.activity_logs (action, team_ref_id)
    VALUES ('Selected Problem Statement: ' || NEW.problem_ref_id, NEW.team_ref_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_selection
AFTER INSERT ON public.team_selections
FOR EACH ROW
EXECUTE FUNCTION handle_team_selection();

-- Function to handle selection deletion/reset
CREATE OR REPLACE FUNCTION handle_team_selection_reset()
RETURNS TRIGGER AS $$
BEGIN
    -- Clear team selection
    UPDATE public.teams
    SET selected_problem_id = NULL
    WHERE id = OLD.team_ref_id;

    -- Decrement selected_count in problem_statements
    UPDATE public.problem_statements
    SET selected_count = selected_count - 1
    WHERE id = OLD.problem_ref_id;

    -- Log activity
    INSERT INTO public.activity_logs (action, team_ref_id)
    VALUES ('Reset Problem Statement Selection', OLD.team_ref_id);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_selection_reset
AFTER DELETE ON public.team_selections
FOR EACH ROW
EXECUTE FUNCTION handle_team_selection_reset();


-- Function to enforce team member limit (Max 3)
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.team_members WHERE team_ref_id = NEW.team_ref_id) >= 3 THEN
        RAISE EXCEPTION 'This team already has the maximum of 3 members';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_team_member_limit
BEFORE INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION check_team_member_limit();


-- ====================================================
-- SEED INITIAL STATE
-- ====================================================
-- Team 1 selects PS 1, Team 2 selects PS 1, Team 3 selects PS 2

DO $$
DECLARE
    team1_id UUID;
    team2_id UUID;
    team3_id UUID;
    ps1_id UUID;
    ps2_id UUID;
BEGIN
    SELECT id INTO team1_id FROM public.teams WHERE team_id = 'TEAM001';
    SELECT id INTO team2_id FROM public.teams WHERE team_id = 'TEAM002';
    SELECT id INTO team3_id FROM public.teams WHERE team_id = 'TEAM003';
    
    SELECT id INTO ps1_id FROM public.problem_statements WHERE title = 'AI Patient Triage';
    SELECT id INTO ps2_id FROM public.problem_statements WHERE title = 'Fraud Detection Engine';

    INSERT INTO public.team_selections (team_ref_id, problem_ref_id) VALUES 
    (team1_id, ps1_id),
    (team2_id, ps1_id),
    (team3_id, ps2_id);
END $$;

-- ====================================================
-- REALTIME SETUP
-- ====================================================
-- Enable realtime for announcements and problem statements and activity logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.problem_statements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;

-- ====================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================
-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies
CREATE POLICY "Public Read Announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public Read Problem Statements" ON public.problem_statements FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.settings FOR SELECT USING (true);

-- 2. Team Policies (Accessing their own data)
-- Since we use custom login, these policies are simplified to allow anon access for now 
-- BUT we restrict sensitive operations.
CREATE POLICY "Public Select Teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public Update Teams Status" ON public.teams FOR UPDATE USING (true);

CREATE POLICY "Public Select Members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Public Manage Members" ON public.team_members FOR INSERT WITH CHECK (true);

-- 3. Selection & Issues Policies
CREATE POLICY "Public Manage Selections" ON public.team_selections FOR ALL USING (true);
CREATE POLICY "Public Read Issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Public Insert Issues" ON public.issues FOR INSERT WITH CHECK (true);

-- 4. Admin Policies
CREATE POLICY "Public Read Admins" ON public.admins FOR SELECT USING (true);
CREATE POLICY "Public Read Logs" ON public.activity_logs FOR SELECT USING (true);

-- Performance Indexes for high concurrency (80 users)
CREATE INDEX IF NOT EXISTS idx_team_id ON public.teams(team_id);
CREATE INDEX IF NOT EXISTS idx_admin_id ON public.admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_team_selections_team ON public.team_selections(team_ref_id);
CREATE INDEX IF NOT EXISTS idx_team_selections_problem ON public.team_selections(problem_ref_id);
CREATE INDEX IF NOT EXISTS idx_issues_team_id ON public.issues(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_teams_selected_problem ON public.teams(selected_problem_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

