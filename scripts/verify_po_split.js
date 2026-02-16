const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const filePath = path.join(__dirname, '../public/files/W80B0137 - MK MANAGEMENT CO. 03.pdf');

async function verifySplit() {
    const buf = fs.readFileSync(filePath);
    let text = '';

    if (typeof pdf.PDFParse === 'function') {
        const parser = new pdf.PDFParse({ data: buf });
        const textResult = await parser.getText();
        text = textResult.text;
    } else {
        const data = await pdf(buf);
        text = data.text;
    }

    // Split by "PURCHASE ORDER NUMBER"
    // Note: The text might have newlines or spaces.
    // Regex lookahead? Or just simple split.
    // "PURCHASE ORDER NUMBER" is a good delimiter.

    const parts = text.split(/PURCHASE ORDER NUMBER/i);
    console.log(`Found ${parts.length} parts.`);

    parts.forEach((part, index) => {
        if (index === 0) return; // Header junk before first PO?

        // Find PO Number in this part (should be near the start)
        const poMatch = part.match(/W\d{2}[B|P]\d{4}/);
        const poNumber = poMatch ? poMatch[0] : "Unknown";

        // Find Total
        // Look for "PO Total" or "Total"
        let total = 0;
        // The context specific extraction I wrote before:
        const totalLabel = part.match(/PO\s*Total/i);
        if (totalLabel) {
            const labelIdx = totalLabel.index;
            const context = part.substring(labelIdx, labelIdx + 500);
            const numbers = context.match(/[\d,]+\.\d{2}/g);
            if (numbers) {
                total = Math.max(...numbers.map(n => parseFloat(n.replace(/,/g, ''))));
            }
        }

        console.log(`Part ${index}: PO=${poNumber}, Total=$${total}`);

        // Check for W80B0147 specifically
        if (poNumber === 'W80B0147') {
            console.log("--- START W80B0147 CONTEXT ---");
            console.log(part.substring(0, 500)); // Print start of context
            console.log("--- END W80B0147 CONTEXT ---");
        }
    });

}

verifySplit().catch(console.error);
