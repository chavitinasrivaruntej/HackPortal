require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data: admins, error: e1 } = await supabase.from('admins').select('*');
  console.log('Admins:', admins, e1);
  const { data: teams, error: e2 } = await supabase.from('teams').select('*');
  console.log('Teams:', teams, e2);
}
test();
