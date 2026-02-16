
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugMKValue() {
    const filePath = path.join(__dirname, '../Sample Data/W80B0137 - MK MANAGEMENT CO. 03.pdf');
    const dataBuffer = fs.readFileSync(filePath);

    pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(dataBuffer),
        standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
        verbosity: 0
    });

    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');

    console.log("--- Extracted Text Page 1 ---");
    console.log(text);

    console.log("\n--- Regex Tests ---");
    const regexes = [
        /PO Total:[\s\S]{0,200}/i,
        /Customer Net Total[\s\S]{0,100}/i,
        /Total Cost:[\s\S]{0,100}/i
    ];

    for (const regex of regexes) {
        const match = text.match(regex);
        if (match) {
            console.log(`Matched: ${regex}`);
            console.log(`Block: ${match[0]}`);
            const numbers = match[0].match(/[\d,]+\.\d{2}/g);
            console.log(`Numbers: ${numbers}`);
        } else {
            console.log(`Failed: ${regex}`);
        }
    }
}

debugMKValue();
