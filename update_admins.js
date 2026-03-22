require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function updateDB() {
    console.log("Starting DB Update...");

    const newAdmins = [
        { admin_id: 'varun@admin', password: 'varuntej27*' },
        { admin_id: 'sreeja@admin', password: 'Sree@2006' },
        { admin_id: 'hemanth@admin', password: 'phani2007' }
    ];

    // 1. Delete old admin if exists
    const { error: delError } = await supabase.from('admins').delete().eq('admin_id', 'admin@1234');
    if (delError) console.error("Could not delete old admin:", delError);
    else console.log("Old admin deleted or didn't exist.");

    // 2. Insert new admins
    for (const admin of newAdmins) {
        // First check if it exists so we don't violate unique constraints
        const { data: existing } = await supabase.from('admins').select('*').eq('admin_id', admin.admin_id).maybeSingle();
        if (!existing) {
            const { error: insError } = await supabase.from('admins').insert([admin]);
            if (insError) console.error("Failed to insert", admin.admin_id, insError);
            else console.log("Successfully inserted", admin.admin_id);
        } else {
            console.log("Admin already exists:", admin.admin_id);
        }
    }

    // 3. Verify
    const { data: finalAdmins } = await supabase.from('admins').select('*');
    console.log("Final Admins list in DB:");
    console.dir(finalAdmins, { depth: null });
}

updateDB();
