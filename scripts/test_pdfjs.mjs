import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
    console.log("Testing PDFJS Loading...");
    const sampleDir = path.join(__dirname, '../Sample Data');
    const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.pdf'));
    if (files.length === 0) {
        console.log("No files found!");
        return;
    }
    const file = path.join(sampleDir, files[0]);
    const data = new Uint8Array(fs.readFileSync(file));

    // Force legacy builds to ignore fonts?
    // pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

    try {
        const loadingTask = pdfjs.getDocument({
            data: data,
            standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
            verbosity: 0 // reduce warnings
        });

        const doc = await loadingTask.promise;
        console.log(`Document Loaded! Pages: ${doc.numPages}`);

        for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(' ');
            console.log(`Page ${i}: ${text.substring(0, 50)}...`);
        }
    } catch (e) {
        console.error("Test Failed:", e);
    }
}

runTest();
