-- Run this in your Supabase SQL Editor to add the missing column and refresh the schema cache.

ALTER TABLE public.problem_statements 
ADD COLUMN IF NOT EXISTS serial_number INTEGER DEFAULT 0;

-- Optional: Initialize existing records with unique serial numbers if they are currently all 0
UPDATE public.problem_statements SET serial_number = sub.new_serial
FROM (SELECT id, row_number() OVER (ORDER BY created_at) as new_serial FROM public.problem_statements) sub
WHERE public.problem_statements.id = sub.id;

-- Force refresh the PostgREST schema cache (if needed, though usually automatic)
NOTIFY pgrst, 'reload schema';
