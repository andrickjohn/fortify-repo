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

async function flagGhosts() {
    console.log("👻 Flagging Existing Ghost Contracts...");

    // 1. Update NULL values
    const { data: nullData, error: nullError } = await supabase
        .from('contracts')
        .update({ flag_ghost: true })
        .is('annual_value', null)
        .select();

    if (nullError) console.error("Error flagging NULLs:", nullError);
    else console.log(`Flagged ${nullData.length} NULL value contracts.`);

    // 2. Update 0 values
    const { data: zeroData, error: zeroError } = await supabase
        .from('contracts')
        .update({ flag_ghost: true })
        .eq('annual_value', 0)
        .select();

    if (zeroError) console.error("Error flagging Zeros:", zeroError);
    else console.log(`Flagged ${zeroData.length} Zero value contracts.`);

    console.log("✨ Ghost Flagging Complete!");
}

flagGhosts();
