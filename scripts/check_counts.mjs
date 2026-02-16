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

async function check() {
    const { count: vendorCount, data: vendors } = await supabase.from('vendors').select('*', { count: 'exact' });
    const { count: contractCount } = await supabase.from('contracts').select('*', { count: 'exact' });

    console.log(`Vendors: ${vendorCount}`);
    console.log(`Contracts: ${contractCount}`);
    console.log('Categories:', vendors.map(v => `${v.vendor_name}: ${v.category}`));
}

check();
