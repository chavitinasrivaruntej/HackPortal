-- Add tables individually to avoid "already member" errors
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_selections;

-- If these throw an error, they are already part of the publication (safe to skip)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.problem_statements;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
