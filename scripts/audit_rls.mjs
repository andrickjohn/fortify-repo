import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLS() {
    console.log('--- RLS POLICY AUDIT ---');

    const { data: policies, error } = await admin.rpc('get_policies_summary');

    if (error) {
        // Fallback to manual query if RPC doesn't exist
        console.log('Fetching policies via query...');
        const { data: raw, error: qError } = await admin.from('pg_policies').select('*');
        if (qError) {
            // pg_policies is a system view, usually accessible only via direct SQL
            // We will try to select from users and see if it hangs
            console.log('Trying to select from users...');
            const start = Date.now();
            const { data, error: uError } = await admin.from('users').select('*').limit(1);
            const end = Date.now();
            console.log(`Select from users took ${end - start}ms`);
            if (uError) console.error('Select error:', uError);
            else console.log('Successfully fetched user data (Admin).');

            console.log('Trying to select from users (Public)...');
            const publicClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
            const pStart = Date.now();
            const { data: pData, error: pError } = await publicClient.from('users').select('*').limit(1);
            const pEnd = Date.now();
            console.log(`Public select took ${pEnd - pStart}ms`);
            if (pError) console.error('Public error:', pError);
            else console.log('Public select success.');
        } else {
            console.log(raw);
        }
    } else {
        console.log(policies);
    }

    console.log('--- AUDIT END ---');
}

checkRLS()
