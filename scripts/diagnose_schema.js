
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking User Schema...");

    // 1. Try to fetch a user (any user) and select settings_json
    // We might need to sign in, but let's try a public check or just see if the error indicates column missing
    // Actually, RLS might prevent listing users.
    // Let's rely on the error message structure.

    try {
        const { data, error } = await supabase
            .from('users')
            .select('settings_json')
            .limit(1);

        if (error) {
            console.error("Error selecting from users:", error);
        } else {
            console.log("Success! users.settings_json exists.");
        }
    } catch (e) {
        console.error("Exception checking users:", e);
    }

    console.log("\nChecking Districts Schema...");
    try {
        const { data, error } = await supabase
            .from('districts')
            .select('settings_json')
            .limit(1);

        if (error) {
            console.error("Error selecting from districts:", error);
        } else {
            console.log("Success! districts.settings_json exists.");
        }
    } catch (e) {
        console.error("Exception checking districts:", e);
    }
}

checkSchema();
