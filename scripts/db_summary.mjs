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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
    console.log("\n📊 LIVE DATABASE SUMMARY:\n");

    const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
      contract_number,
      annual_value,
      vendors (
        vendor_name
      )
    `);

    if (error) {
        console.error("❌ Error fetching data:", error.message);
        return;
    }

    console.log("----------------------------------------------------------------------------------");
    console.log(`${"VENDOR".padEnd(30)} | ${"PO #".padEnd(15)} | ${"ANNUAL VALUE".padEnd(15)}`);
    console.log("----------------------------------------------------------------------------------");

    contracts.forEach(c => {
        const vendor = c.vendors?.vendor_name || "Unknown";
        const po = c.contract_number || "N/A";
        const val = c.annual_value ? `$${c.annual_value.toLocaleString()}` : "N/A";
        console.log(`${vendor.substring(0, 29).padEnd(30)} | ${po.padEnd(15)} | ${val.padEnd(15)}`);
    });
    console.log("----------------------------------------------------------------------------------\n");
}

checkDatabase().catch(console.error);
