
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

async function fixMKData() {
    console.log("--- Fixing MK Management Data ---");

    const masterPO = 'W80B0137';

    // 1. Get all MK Contracts
    const { data: contracts } = await supabase
        .from('contracts')
        .select('id, contract_number, annual_value')
        .ilike('contract_name', '%MK MANAGEMENT%');

    if (!contracts) return;

    console.log(`Found ${contracts.length} MK contracts.`);

    for (const c of contracts) {
        if (c.contract_number !== masterPO && c.annual_value > 0) {
            console.log(`Zeroing out non-master: ${c.contract_number}`);
            await supabase.from('contracts').update({
                annual_value: 0,
                flag_ghost: true
            }).eq('id', c.id);
        } else if (c.contract_number === masterPO) {
            console.log(`Preserving Master: ${c.contract_number} at $${c.annual_value}`);
        }
    }
    console.log("Done.");
}

fixMKData();
