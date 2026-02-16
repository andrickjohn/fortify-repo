import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    console.log("Attempting to insert test district...");
    const { data, error } = await supabase
        .from('districts')
        .insert([
            { name: 'Verification Pilot District', subscription_tier: 'pilot', domain: 'test-pilot.edu' }
        ])
        .select();

    if (error) {
        console.error("❌ Insert failed:", error.message);
        if (error.message.includes("row-level security")) {
            console.log("Tip: I need the 'service_role' key to bypass RLS for initial verification.");
        }
    } else {
        console.log("✅ Success! Inserted district:", data);
    }
}

testInsert().catch(console.error);
