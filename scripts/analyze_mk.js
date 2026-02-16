// Script to analyze MK Management PDF for multiple POs
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const SAMPLE_DIR = path.join(__dirname, '..', 'Sample Data');

(async () => {
    const file = 'W80B0137 - MK MANAGEMENT CO. 03.pdf';
    console.log(`Processing ${file}...`);
    try {
        const buf = fs.readFileSync(path.join(SAMPLE_DIR, file));

        let text;
        if (typeof pdf.PDFParse === 'function') {
            const parser = new pdf.PDFParse({ data: buf });
            const textResult = await parser.getText();
            text = textResult.text;
        } else if (typeof pdf === 'function') {
            const data = await pdf(buf);
            text = data.text;
        }

        console.log(text);

        // Try to find multiple POs
        const poMatches = text.matchAll(/([TW]80[BP]\d{4})/g);
        const pos = [...poMatches].map(m => m[1]);
        console.log('\nPotential PO Numbers found:', pos);

    } catch (err) {
        console.error(err);
    }
})();
