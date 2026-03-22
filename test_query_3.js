require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data: admins } = await supabase.from('admins').select('*');
  console.log('--- ADMINS ---');
  console.dir(admins, { depth: null });
  const { data: teams } = await supabase.from('teams').select('team_id, password');
  console.log('--- TEAMS ---');
  console.dir(teams, { depth: null });
}
test();
