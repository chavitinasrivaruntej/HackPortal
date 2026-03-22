-- CLEAR EXISTING DATA JUST IN CASE
TRUNCATE TABLE public.admins, public.problem_statements, public.teams, public.team_members, public.team_selections, public.announcements, public.activity_logs CASCADE;

-- Insert Default Admin
INSERT INTO public.admins (admin_id, password) VALUES 
('varun@admin', 'varuntej27*'),
('sreeja@admin', 'Sree@2006'),
('hemanth@admin', 'phani2007');

-- Insert Dummy Problem Statements
INSERT INTO public.problem_statements (title, domain, short_summary, full_description, constraints, expected_direction, notes) VALUES 
('AI Patient Triage', 'Healthcare', 'Automate patient triage using AI.', 'Develop an AI model that predicts patient severity based on early symptoms and suggests triage priority.', 'Must run locally, under 1s response.', 'Use open source LLMs or classification models.', 'Focus on explainability.'),
('Fraud Detection Engine', 'FinTech', 'Realtime transaction monitoring.', 'Build a realtime scoring engine for credit card transactions to flag suspicious activity.', 'Must process 10k TPS.', 'Implement sliding window algorithms.', 'Latency is critical.'),
('Zero-Trust Network Analyzer', 'Cybersecurity', 'Analyze network traffic for anomalies.', 'Create a dashboard that ingests VPC flow logs and flags potential lateral movement.', 'Must support AWS flow logs.', 'Machine learning for anomaly detection.', 'Provide actionable remediation steps.'),
('Dynamic Traffic Routing', 'Smart Mobility', 'Optimize city traffic lights.', 'Design a system that uses mock live camera feeds to adjust traffic light timings.', 'Simulate API for camera feeds.', 'Reinforcement learning preferred.', 'Show visual dashboard of city map.'),
('Personalized Learning Path', 'Education Technology', 'Adaptive quiz platform.', 'Build a student portal that adjusts question difficulty based on previous answers.', 'Web application.', 'Item response theory.', 'Include teacher dashboard for analytics.');

-- Insert Dummy Teams
INSERT INTO public.teams (team_id, password, team_name, department, year) VALUES 
('TEAM001', 'team001', 'Quantum Coders', 'Computer Science', '3rd Year'),
('TEAM002', 'team002', 'Byte Pandas', 'Information Tech', '2nd Year'),
('TEAM003', 'team003', 'Neural Knights', 'AI & Data Science', '4th Year'),
('TEAM004', 'team004', 'Cyber Hawks', 'Cybersecurity', '3rd Year');

-- Insert Dummy Team Members
DO $$
DECLARE
    team1_id UUID; team2_id UUID; team3_id UUID; team4_id UUID;
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

-- Insert Dummy Announcement
INSERT INTO public.announcements (message) VALUES ('Welcome to the Hackathon! Please review the problem statements and make your selection before the deadline.');
