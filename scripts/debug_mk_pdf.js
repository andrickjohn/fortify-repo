const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'files', 'W80B0137 - MK MANAGEMENT CO. 03.pdf');

async function debug() {
    const buf = fs.readFileSync(filePath);
    let text;
    if (typeof pdf.PDFParse === 'function') {
        const parser = new pdf.PDFParse({ data: buf });
        const textResult = await parser.getText();
        text = textResult.text;
    } else if (typeof pdf === 'function') {
        const data = await pdf(buf);
        text = data.text;
    } else {
        throw new Error('Could not find PDFParse constructor or function');
    }
    fs.writeFileSync('debug_text.txt', text);
    console.log("Text written to debug_text.txt");
}

debug();
