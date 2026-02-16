
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

async function checkVendorLinkage() {
    // 1. Get MK Vendor ID
    const { data: vendor } = await supabase.from('vendors').select('id, vendor_name').ilike('vendor_name', '%MK MANAGEMENT%').single();
    if (!vendor) {
        console.log("❌ MK Management vendor not found!");
        return;
    }
    console.log("Vendor:", vendor);

    // 2. Get Contracts for this Vendor
    const { data: contracts } = await supabase.from('contracts').select('id, contract_number, annual_value, vendor_id').eq('vendor_id', vendor.id);

    console.log(`Found ${contracts.length} linked contracts.`);
    console.table(contracts);

    // 3. Check for Orphaned MK Contracts (by name)
    const { data: orphans } = await supabase.from('contracts').select('id, contract_number, annual_value, vendor_id').ilike('contract_name', '%MK MANAGEMENT%').is('vendor_id', null);
    if (orphans && orphans.length > 0) {
        console.log(`⚠️ Found ${orphans.length} ORPHANED contracts (no vendor_id):`);
        console.table(orphans);
    }
}

checkVendorLinkage();
