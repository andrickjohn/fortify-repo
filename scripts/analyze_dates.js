// Script to extract text from sample PDFs for date pattern analysis
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const sampleDir = path.join(__dirname, '..', 'Sample Data');

async function run() {
    const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.pdf'));

    for (const file of files) {
        console.log(`\n${'='.repeat(60)}\n${file}\n${'='.repeat(60)}`);
        try {
            const buf = fs.readFileSync(path.join(sampleDir, file));
            const data = await pdf(buf);
            // Show first 1500 chars
            console.log(data.text.substring(0, 1500));
        } catch (err) {
            console.log('Error:', err.message);
        }
    }
}

run();
