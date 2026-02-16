
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) process.env[k] = envConfig[k];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDupes() {
    console.log("--- Checking Duplicate Vendors ---");
    const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name')
        .ilike('vendor_name', '%MK MANAGEMENT%');

    if (error) console.error(error);
    else {
        console.table(data);
        if (data.length > 1) console.log("⚠️ DUPLICATES FOUND!");
        else console.log("✅ Unique vendor record.");
    }
}

checkDupes();
