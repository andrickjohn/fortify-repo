
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

// Simulate Service Role Admin
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugVendorsPageQuery() {
    console.log("--- Debugging Vendors Page Query ---");

    // 1. Fetch Vendors
    const { data: vendorsData } = await supabaseAdmin.from('vendors').select('id, vendor_name');
    const mkVendor = vendorsData.find(v => v.vendor_name.includes('MK MANAGEMENT'));
    console.log("MK Vendor:", mkVendor);

    // 2. Fetch Contracts (Exact query from page.tsx)
    const { data: contractsData } = await supabaseAdmin.from('contracts').select('vendor_id, annual_value');

    // 3. Simulate Aggregation
    let spend = 0;
    let count = 0;
    contractsData.forEach(c => {
        if (c.vendor_id === mkVendor.id) {
            const val = Number(c.annual_value) || 0;
            spend += val;
            count++;
            // console.log(`Found Contract: ${val}`);
        }
    });

    console.log(`Calculated Spend: $${spend}`);
    console.log(`Count: ${count}`);
}

debugVendorsPageQuery();
