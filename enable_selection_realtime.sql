-- Enable Realtime for the core problem selection tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_selections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.problem_statements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;

-- Note: problem_statements and teams might already be in the publication, 
-- but running this ensures they are correctly added if they were missing or recreated.
-- If they are already present, Supabase will simply skip or return a notice.
