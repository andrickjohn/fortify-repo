// Debug Singlewire text
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const SAMPLE_DIR = path.join(__dirname, '..', 'Sample Data');

(async () => {
    const buf = fs.readFileSync(path.join(SAMPLE_DIR, 'T80P0540 - SINGLEWIRE.pdf'));
    let text;
    // Use proper constructor
    if (typeof pdf.PDFParse === 'function') {
        const parser = new pdf.PDFParse({ data: buf });
        const textResult = await parser.getText();
        text = textResult.text;
    } else if (typeof pdf === 'function') {
        const data = await pdf(buf);
        text = data.text;
    }
    console.log(text);
})();
