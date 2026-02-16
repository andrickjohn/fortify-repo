
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

async function checkRawData() {
    console.log("--- Checking Raw Data Types ---");
    const { data, error } = await supabase
        .from('contracts')
        .select('contract_number, annual_value')
        .ilike('contract_name', '%MK MANAGEMENT%')
        .limit(1);

    if (error) console.error(error);
    else {
        console.log("Raw Record:", data[0]);
        console.log("Type of annual_value:", typeof data[0].annual_value);
    }
}

checkRawData();
