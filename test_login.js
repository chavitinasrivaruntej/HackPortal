require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testLogin(role, user, pass) {
    if (role === 'admin') {
        const { data: adminData, error } = await supabase.from("admins").select("*").eq("admin_id", user).eq("password", pass).maybeSingle();
        console.log(`Admin Login (${user}):`, adminData ? "SUCCESS" : "FAILED", error ? `Error: ${error.message}` : "");
    } else {
        const { data: teamData, error } = await supabase.from("teams").select("*").eq("team_id", user).eq("password", pass).maybeSingle();
        console.log(`Team Login (${user}):`, teamData ? "SUCCESS" : "FAILED", error ? `Error: ${error.message}` : "");
    }
}

async function run() {
    await testLogin('admin', 'varun@admin', 'varuntej27*');
    await testLogin('admin', 'admin@1234', 'admin@1234');
    await testLogin('team', 'TEAM001', 'team001');
}

run();
