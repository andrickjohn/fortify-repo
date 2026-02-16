// Script to extract text from sample PDFs for date pattern analysis
import pdf from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleDir = join(__dirname, '..', 'Sample Data');

const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.pdf'));

for (const file of files) {
    console.log(`\n${'='.repeat(60)}\n${file}\n${'='.repeat(60)}`);
    try {
        const buf = fs.readFileSync(join(sampleDir, file));
        const data = await pdf(buf);
        // Show first 1500 chars
        console.log(data.text.substring(0, 1500));
    } catch (err) {
        console.log('Error:', err.message);
    }
}
