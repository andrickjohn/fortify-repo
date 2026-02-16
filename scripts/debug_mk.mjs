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

async function debugAllPages() {
    console.log("--- Scanning All Pages ---");
    const sampleDir = path.join(__dirname, '../Sample Data');
    const filename = 'W80B0137 - MK MANAGEMENT CO. 03.pdf';
    const filePath = path.join(sampleDir, filename);

    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        return;
    }

    const dataBuffer = fs.readFileSync(filePath);

    // Configure worker
    pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(dataBuffer),
        standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
        verbosity: 0
    });

    const doc = await loadingTask.promise;
    console.log(`\nPDF Loaded: ${doc.numPages} pages`);

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');

        console.log(`\n--- Page ${i} ---`);
        console.log(pageText.substring(0, 300) + "...");

        const matches = pageText.match(/([TW]80[BP]\d{4})/gi);
        if (matches) {
            console.log(`   POs Found: ${[...new Set(matches)].join(', ')}`);
        } else {
            console.log("   No POs found.");
        }
    }
}

debugAllPages();
