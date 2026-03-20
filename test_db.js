const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Testing Supabase Connection...');
    const { data: admins, error: adminErr } = await supabase.from('admins').select('*').limit(5);
    console.log('Admins Data:', admins);
    if (adminErr) console.log('Admin Error:', adminErr);

    const { data: teams, error: teamErr } = await supabase.from('teams').select('*').limit(5);
    console.log('Teams Data:', teams);
    if (teamErr) console.log('Team Error:', teamErr);
}
check();
