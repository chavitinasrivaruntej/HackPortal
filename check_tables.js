const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const tables = ['admins', 'problem_statements', 'teams', 'team_members', 'team_selections', 'announcements', 'activity_logs'];
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('id').limit(1);
        console.log(`Table ${t}:`, error ? `ERROR: ${error.message || error.details}` : `EXISTS`);
    }
}
check();
