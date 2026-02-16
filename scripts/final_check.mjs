import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(supabaseUrl, supabaseServiceKey)
const publicClient = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
    console.log('--- DIAGNOSTIC START ---');

    console.log('Checking with Service Role (Admin)...');
    const { data: adminData } = await admin.from('contracts').select('id');
    console.log(`Admin count: ${adminData?.length || 0} contracts`);

    console.log('Checking with Anon Key (Public)...');
    const { data: publicData } = await publicClient.from('contracts').select('id');
    console.log(`Public count: ${publicData?.length || 0} contracts`);

    if (adminData?.length > 0 && (publicData === null || publicData?.length === 0)) {
        console.log('🚨 BLOCKED: RLS is active and preventing public access.');
    } else if (adminData?.length === 0) {
        console.log('❓ EMPTY: No contracts found even with Admin key.');
    } else {
        console.log('✅ PASS: Contracts are publicly accessible.');
    }

    console.log('--- DIAGNOSTIC END ---');
}

check()
