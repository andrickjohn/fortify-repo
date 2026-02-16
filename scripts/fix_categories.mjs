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

const MAPPINGS = {
    'SINGLEWIRE SOFTWARE LLC': 'software',
    'FRIDAY SYSTEMS INC': 'services', // IT Services
    'MK MANAGEMENT INC': 'services',  // Management Services
    'DEVELOPMENT GROUP INC': 'services', // Consulting
    'inter-pacific': 'services',      // Telecom Services
    'INTER-PACIFIC': 'services'
};

async function fix() {
    console.log("🛠  Fixing Vendor Categories...");

    const { data: vendors } = await supabase.from('vendors').select('*');

    for (const vendor of vendors) {
        let newCategory = 'other';

        // Exact match
        if (MAPPINGS[vendor.vendor_name]) {
            newCategory = MAPPINGS[vendor.vendor_name];
        } else {
            // Fuzzy match
            if (vendor.vendor_name.toLowerCase().includes('software')) newCategory = 'software';
            else if (vendor.vendor_name.toLowerCase().includes('systems')) newCategory = 'services';
            else if (vendor.vendor_name.toLowerCase().includes('management')) newCategory = 'services';
            else if (vendor.vendor_name.toLowerCase().includes('group')) newCategory = 'services';
        }

        if (vendor.category !== newCategory) {
            console.log(`Updating ${vendor.vendor_name}: ${vendor.category} -> ${newCategory}`);
            await supabase.from('vendors').update({ category: newCategory }).eq('id', vendor.id);
        } else {
            console.log(`Skipping ${vendor.vendor_name}: Already ${newCategory}`);
        }
    }
    console.log("✅ Done!");
}

fix().catch(console.error);
