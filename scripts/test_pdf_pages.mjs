import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
    console.log("Starting PDF Page Extraction Test with Correct Regex...");
    const sampleDir = path.join(__dirname, '../Sample Data');
    let file;
    try {
        file = fs.readdirSync(sampleDir).find(f => f.endsWith('.pdf'));
    } catch (e) {
        console.log("Sample Data directory not found.");
        return;
    }

    if (!file) {
        console.log("No PDF found.");
        return;
    }
    const filePath = path.join(sampleDir, file);
    const dataBuffer = fs.readFileSync(filePath);
    const uint8Data = new Uint8Array(dataBuffer);

    const options = {};

    try {
        let parser = new pdf.PDFParse(uint8Data, options);
        await parser.getText();

        if (parser.doc) {
            console.log(`parser.doc exists. NumPages: ${parser.doc.numPages}`);
            const doc = parser.doc;
            let poFoundCount = 0;

            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');

                // Regex from parser.ts allows T or W, and generic structure
                // parser.ts uses: /[A-Z0-9]{8,10}/ for search but specifically looking for POs.
                // Let's use generic PO-like regex suitable for this project
                const matches = pageText.match(/[WT]80[BP]\d{4}/g);

                if (matches) {
                    // Unique matches
                    const uniqueMatches = [...new Set(matches)];
                    console.log(`Page ${i}: Found POs -> ${uniqueMatches.join(', ')}`);
                    poFoundCount++;
                }
            }
            console.log(`Summary: Found POs on ${poFoundCount} pages.`);
        } else {
            console.log("parser.doc is missing!");
        }

    } catch (e) {
        console.log("Error:", e);
    }
}

test().catch(console.error);
