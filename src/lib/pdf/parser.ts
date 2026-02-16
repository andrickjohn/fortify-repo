const pdf = require('pdf-parse');

/**
 * Fortify PDF Parser - Multi-PO & Enhanced Date Extraction
 * Extracts structured data from school district vendor contracts.
 * Returns an ARRAY of contract data objects.
 */
export async function parseContractPDF(dataBuffer: Buffer) {
    // Standard parser for metadata
    const parser = new pdf.PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;

    // PAGE EXTRACTION LOGIC
    // We map each PO to its first appearing page.
    const poPageMap = new Map<string, number>();

    try {
        // PDFJS-DIST implementation for robust page detection
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const path = require('path');

        // Use process.cwd() for Next.js server environment detection
        const workerPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
        const fontPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');

        // Configure worker to avoid version mismatch
        pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(dataBuffer),
            standardFontDataUrl: fontPath,
            verbosity: 0
        });

        const doc = await loadingTask.promise;

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');

            const matches = pageText.matchAll(/([TW]80[BP]\d{4})/gi);
            for (const match of matches) {
                const po = match[1].toUpperCase();
                if (!poPageMap.has(po)) {
                    poPageMap.set(po, i);
                }
            }
        }
    } catch (e) {
        console.error("Error extracting page numbers with pdfjs:", e);
    }

    // 1. Extract Common Metadata
    const vendorName = extractPattern(text, [
        /FRIDAY SYSTEMS INC/i,
        /SINGLEWIRE SOFTWARE LLC/i,
        /MK MANAGEMENT INC/i,
        /DEVELOPMENT GROUP INC/i,
        /INTER-PACIFIC/i,
        /Vendor:\s*(.*)/i,
        /TO:\s+([^\n]+)/i
    ]);

    // 4. Extract Annual Value
    let candidates: number[] = [];

    // Strategy A: "PO Total"
    const poTotalMatches = text.matchAll(/PO Total:[\s\S]{0,400}?(\$[\d,]+\.\d{2}|[\d,]+\.\d{2})/gi);
    for (const m of poTotalMatches) {
        if (m[1]) candidates.push(parseFloat(m[1].replace(/[$,]/g, '')));
    }

    // Strategy B: "Total Cost"
    const totalCostMatches = text.matchAll(/Total Cost:[\s\S]{0,100}?(\$[\d,]+\.\d{2}|[\d,]+\.\d{2})/gi);
    for (const m of totalCostMatches) {
        if (m[1]) candidates.push(parseFloat(m[1].replace(/[$,]/g, '')));
    }

    // Strategy C: "ACCOUNTS AND AMOUNTS" (MK Specific)
    const footerMatches = text.matchAll(/ACCOUNTS AND AMOUNTS[\s\S]{0,1000}?(\$[\d,]+\.\d{2}|[\d,]+\.\d{2})/gi);
    for (const m of footerMatches) {
        // This block match is large, find all numbers inside
        const block = m[0];
        const numbers = block.match(/[\d,]+\.\d{2}/g);
        if (numbers) {
            numbers.forEach((n: string) => candidates.push(parseFloat(n.replace(/,/g, ''))));
        }
    }

    // Filter noise (filters out 0.00 tax lines and unreasonably small amounts)
    candidates = candidates.filter(n => n > 1 && n < 100000000);

    // Use the largest found amount as the Annual Value
    const annualValue = candidates.length > 0 ? Math.max(...candidates) : null;

    // 2. Extract Dates (Document-level)
    const dateExtraction = extractDatesEnhanced(text);

    // 3. Extract PO Issue Date
    let poIssueDate: string | null = null;
    const issueDateMatch = text.match(/(?:Purchase Order Date|PO Date|ISSUED\/PRINTED|DATED)\s*[:]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (issueDateMatch) {
        poIssueDate = normalizeDate(issueDateMatch[1]);
    }

    // 4. Find all Unique PO Numbers
    // We can use the map keys if populated, or fallback to regex on full text if map failed.
    const poMatches = text.matchAll(/([TW]80[BP]\d{4})/gi);
    const uniquePOs = new Set<string>();
    for (const match of poMatches) {
        uniquePOs.add(match[1].toUpperCase());
    }

    const contracts: any[] = [];

    // Vendor Category Logic
    let category = 'other';
    const vLower = (vendorName || '').toLowerCase();
    if (vLower.includes('software')) category = 'software';
    else if (vLower.includes('systems') || vLower.includes('management') || vLower.includes('group') || vLower.includes('consulting') || vLower.includes('services')) category = 'services';
    else if (vLower.includes('computer') || vLower.includes('equipment')) category = 'hardware';
    else if (vLower.includes('supply') || vLower.includes('supplies')) category = 'supplies';
    else if (vLower.includes('transport') || vLower.includes('bus')) category = 'transportation';
    else if (vLower.includes('food')) category = 'food_service';

    const poList = Array.from(uniquePOs);

    if (poList.length === 0) {
        // Fallback for no PO found
        contracts.push(createContractObject(text, null, vendorName, category, annualValue, dateExtraction, poIssueDate, null));
    } else {
        // Create a contract entry for each unique PO
        for (let i = 0; i < poList.length; i++) {
            const poNumber = poList[i];
            const pageNumber = poPageMap.get(poNumber) || null;

            // LOGIC FIX: Only the first PO (Master) gets the full annual value.
            // Others are sub-items or ghosts ($0).
            // We assume the first PO found is the Master.
            // In MK PDF, W80B0137 is usually first or text order implies significance.
            // If we have a huge value ($100k), it's unlikely to apply to ALL of them individually.

            const isMasterCandidate = i === 0;
            const allocatedValue = isMasterCandidate ? annualValue : 0;

            contracts.push(createContractObject(text, poNumber, vendorName, category, allocatedValue, dateExtraction, poIssueDate, pageNumber));
        }
    }

    return contracts;
}

function createContractObject(
    rawText: string,
    poNumber: string | null,
    vendorName: string | null,
    category: string,
    annualValue: number | null,
    dates: any,
    poIssueDate: string | null,
    pageNumber: number | null
) {
    const result = {
        vendorName,
        category,
        poNumber,
        pageNumber, // New field
        annualValue: annualValue, // Note: If multiple POs, this might be the total for document, or specific. MVP: Use doc total.
        startDate: dates.startDate,
        endDate: dates.endDate,
        termYears: dates.termYears,
        requiresReview: dates.requiresReview,
        reviewNotes: dates.reviewNotes,
        poIssueDate: poIssueDate,
        flag_ghost: !annualValue || annualValue === 0, // Auto-flag if no value
        is_hidden: false,
        confidence: 0,
        rawText
    };

    // calculate confidence
    let matches = 0;
    if (result.vendorName) matches++;
    if (result.annualValue !== null && result.annualValue !== 0) matches++;
    if (result.poNumber) matches++;
    if (result.startDate || result.endDate) matches++;
    if (result.poIssueDate) matches++;
    result.confidence = Math.round((matches / 5) * 100);

    return result;
}

/**
 * Enhanced date extraction with multiple pattern types
 */
function extractDatesEnhanced(text: string): {
    startDate: string | null;
    endDate: string | null;
    termYears: number | null;
    requiresReview: boolean;
    reviewNotes: string | null;
} {
    let startDate: string | null = null;
    let endDate: string | null = null;
    let termYears: number | null = null;
    let requiresReview = false;
    let reviewNotes: string | null = null;

    // Pattern 1: Period range (e.g., "FOR THE PERIOD: 07/01/25 - 06/30/26")
    const periodMatch = text.match(/FOR\s+THE\s+PERIOD[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (periodMatch) {
        startDate = normalizeDate(periodMatch[1]);
        endDate = normalizeDate(periodMatch[2]);
    }

    // Pattern 2: Quote date with term (Singlewire style)
    if (!startDate) {
        // "DATED: 07/24/23"
        const datedMatch = text.match(/DATED:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (datedMatch) startDate = normalizeDate(datedMatch[1]);

        // Fallback to "Quote Date:"
        if (!startDate) {
            const quoteDateMatch = text.match(/Quote\s*Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
            if (quoteDateMatch) startDate = normalizeDate(quoteDateMatch[1]);
        }

        const termMatch = text.match(/Term[:\s]*(\d+)\s*Years?/i);
        if (startDate && termMatch) {
            termYears = parseInt(termMatch[1], 10);
            endDate = calculateEndDate(startDate, termYears);
        }
    }

    // Pattern 3: Explicit start/end dates
    if (!startDate) {
        const startMatch = text.match(/(?:Start\s*Date|Effective\s*Date|Begin\s*Date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (startMatch) startDate = normalizeDate(startMatch[1]);
    }
    if (!endDate) {
        const endMatch = text.match(/(?:End\s*Date|Termination\s*Date|Expiration\s*Date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (endMatch) endDate = normalizeDate(endMatch[1]);
    }

    // Pattern 4: PO Date (fallback)
    if (!startDate) {
        const poDateMatch = text.match(/(?:PO\s*Date|Order\s*Date|Date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (poDateMatch) {
            startDate = normalizeDate(poDateMatch[1]);
            // PO Date alone implies review needed for end date
            if (!endDate) {
                requiresReview = true;
                reviewNotes = "End date not found - using PO date as start";
            }
        }
    }

    // Pattern 5: Fiscal year (e.g., "FY25")
    if (!startDate) {
        const fyMatch = text.match(/(?:FY|Fiscal\s*Year)\s*['"]?(\d{2,4})/i);
        if (fyMatch) {
            const year = fyMatch[1].length === 2 ? `20${fyMatch[1]}` : fyMatch[1];
            startDate = `${year}-07-01`;
            endDate = `${parseInt(year) + 1}-06-30`;
            reviewNotes = `Inferred from fiscal year ${fyMatch[0]}`;
        }
    }

    // If we have start but no end and no term, flag for review
    if (startDate && !endDate && !termYears) {
        requiresReview = true;
        if (!reviewNotes) reviewNotes = "End date not found";
    }

    return { startDate, endDate, termYears, requiresReview, reviewNotes };
}

function normalizeDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    let [month, day, year] = parts;
    if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
    }
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');

    const isoDate = `${year}-${month}-${day}`;
    const parsed = new Date(isoDate);
    if (isNaN(parsed.getTime())) return null;

    return isoDate;
}

function calculateEndDate(startDate: string | null, termYears: number): string | null {
    if (!startDate) return null;
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return null;

    start.setFullYear(start.getFullYear() + termYears);
    return start.toISOString().split('T')[0];
}

function extractPattern(text: string, regexes: RegExp[]) {
    for (const regex of regexes) {
        const match = text.match(regex);
        if (match && match[1]) return match[1].trim();
        if (match && !match[1]) return match[0].trim();
    }
    return null;
}
