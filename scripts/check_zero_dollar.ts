
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkContracts() {
    console.log('Checking contracts...');
    const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, contract_name, annual_value, description_of_purpose, vendors(vendor_name)');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const zeroDollar = contracts.filter(c => c.annual_value === 0 || c.annual_value === null || c.annual_value === '0');

    console.log(`Total contracts: ${contracts.length}`);
    console.log(`Zero dollar contracts: ${zeroDollar.length}`);

    zeroDollar.forEach(c => {
        console.log(`- [${c.id}] ${c.contract_name} (${c.vendors?.vendor_name}): Value='${c.annual_value}', Purpose='${c.description_of_purpose}'`);
    });
}

checkContracts();
