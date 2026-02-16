
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parseContractPDF } from '../src/lib/pdf/parser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Env
const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) process.env[k] = envConfig[k];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function reseedMK() {
    console.log("♻️  Re-seeding MK Management...");

    const filePath = path.join(__dirname, '../Sample Data/W80B0137 - MK MANAGEMENT CO. 03.pdf');
    const dataBuffer = fs.readFileSync(filePath);

    pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

    // Parse - NOTE: parseContractPDF returns an array directly
    const contracts = await parseContractPDF(dataBuffer);

    console.log(`Found ${contracts.length} contracts in file.`);

    // Check W80B0137
    const master = contracts.find((c: any) => c.poNumber === 'W80B0137');
    console.log("Master Contract Extraction:", master);

    // Upsert
    for (const contract of contracts) {
        // Only update values, don't create dupes if logic changed
        const { data: existing } = await supabase.from('contracts').select('id').eq('contract_number', contract.poNumber).maybeSingle();

        if (existing) {
            await supabase.from('contracts').update({
                annual_value: contract.annualValue,
                flag_ghost: contract.flag_ghost
            }).eq('id', existing.id);
            console.log(`Updated ${contract.poNumber} -> $${contract.annualValue} (Ghost: ${contract.flag_ghost})`);
        } else {
            console.log(`Skipping insert for ${contract.poNumber} (Focus is update)`);
        }
    }
}

reseedMK();
