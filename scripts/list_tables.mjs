import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTables() {
    // PostgREST doesn't have a direct "list tables" but we can try to query the RPC if enabled
    // or just check common ones. 
    // Alternatively, we can use the 'rpc' to query the information_schema if the user enabled it.

    console.log("Checking schema...");
    const { data, error } = await supabase.rpc('get_tables_list'); // Custom RPC if it exists

    if (error) {
        console.log("RPC get_tables_list failed (expected if not defined). Error:", error.message);

        // Attempting to query information_schema (often restricted)
        const { data: schemaData, error: schemaError } = await supabase
            .from('pg_tables') // This usually requires being in the allowed list or service role
            .select('tablename')
            .eq('schemaname', 'public');

        if (schemaError) {
            console.log("Direct pg_tables query failed. Error:", schemaError.message);
        } else {
            console.log("Tables found:", schemaData);
        }
    } else {
        console.log("Tables found via RPC:", data);
    }
}

listTables().catch(console.error);
