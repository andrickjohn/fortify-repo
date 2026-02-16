
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugParser() {
    const filePath = path.join(__dirname, '../Sample Data/W80B0137 - MK MANAGEMENT CO. 03.pdf');
    const dataBuffer = fs.readFileSync(filePath);

    pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(dataBuffer),
        standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
        verbosity: 0
    });

    const doc = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + "\n";
    }

    console.log("--- Full Text Length:", fullText.length);

    // Strategy A
    const poTotalMatch = fullText.match(/PO Total:[\s\S]{0,400}(\$[\d,]+\.\d{2}|[\d,]+\.\d{2})/i);
    if (poTotalMatch) {
        console.log("Strategy A Matched:", poTotalMatch[1]);
        console.log("Context A:", poTotalMatch[0]);
    } else {
        console.log("Strategy A Failed");
    }

    // Strategy C
    const footerMatch = fullText.match(/ACCOUNTS AND AMOUNTS[\s\S]{0,1000}(\$[\d,]+\.\d{2}|[\d,]+\.\d{2})/ig);
    if (footerMatch) {
        console.log("Strategy C Matched Blocks:", footerMatch.length);
        const numbers = fullText.match(/[\d,]+\.\d{2}/g);
        if (numbers) {
            console.log("All Numbers found:", numbers.slice(-20)); // Last 20 numbers
            const candidates = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n > 100);
            console.log("Candidates > 100:", candidates);
            if (candidates.length > 0) {
                console.log("Max Candidate:", Math.max(...candidates));
            }
        }
    } else {
        console.log("Strategy C Failed");
    }
}

debugParser();
