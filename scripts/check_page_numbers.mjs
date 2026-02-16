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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking page_number values...");
    const { data, error } = await supabase
        .from('contracts')
        .select('contract_number, page_number')
        .not('page_number', 'is', null);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} contracts with page numbers.`);
    data.forEach(c => console.log(`PO: ${c.contract_number} -> Page ${c.page_number}`));
}

check();
