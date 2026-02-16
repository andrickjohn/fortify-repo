import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixPageNumbers() {
    console.log("🚀 Starting Page Number Repair...");

    const sampleDir = path.join(__dirname, '../Sample Data');
    const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.pdf'));

    // Configure worker
    pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

    for (const file of files) {
        console.log(`\n📄 Scanning: ${file}`);
        const filePath = path.join(sampleDir, file);
        const dataBuffer = fs.readFileSync(filePath);

        try {
            const loadingTask = pdfjs.getDocument({
                data: new Uint8Array(dataBuffer),
                standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
                verbosity: 0
            });

            const doc = await loadingTask.promise;
            const poLocalMap = new Map();

            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');

                const matches = pageText.matchAll(/([TW]80[BP]\d{4})/gi);
                for (const match of matches) {
                    const po = match[1].toUpperCase();
                    if (!poLocalMap.has(po)) {
                        poLocalMap.set(po, i);
                        console.log(`   found ${po} on page ${i}`);
                    }
                }
            }

            // Update DB
            for (const [po, pageNum] of poLocalMap) {
                const { error } = await supabase
                    .from('contracts')
                    .update({ page_number: pageNum })
                    .eq('contract_number', po);

                if (error) console.error(`   ❌ Failed to update ${po}:`, error.message);
                else console.log(`   ✅ Updated ${po} -> Page ${pageNum}`);
            }

        } catch (e) {
            console.error(`   ⚠️ Error processing ${file}:`, e.message);
        }
    }
    console.log("\n✨ Repair Complete!");
}

fixPageNumbers().catch(console.error);
