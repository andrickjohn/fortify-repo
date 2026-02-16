import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from Fortify/.env.local
const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log(`Checking connection to: ${supabaseUrl}`);

    // Try to list tables (using a query that should fail if table doesn't exist)
    const { data, error } = await supabase
        .from('districts')
        .select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') {
            console.log("❌ Table 'districts' does not exist. Schema needs to be applied.");
        } else {
            console.log("❌ Connection error:", error.message);
        }
    } else {
        console.log("✅ Successfully connected and verified 'districts' table exists.");
    }
}

verify().catch(console.error);
