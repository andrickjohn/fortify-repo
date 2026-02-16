// Script to re-parse sample PDFs and update the database with enhanced date extraction & multi-PO support
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SAMPLE_DIR = path.join(__dirname, '..', 'Sample Data');

// --- Shared Logic from parser.ts (duplicated here for script standalone execution) ---

function extractDatesEnhanced(text) {
    let startDate = null;
    let endDate = null;
    let termYears = null;
    let requiresReview = false;
    let reviewNotes = null;

    // Pattern 1: Period range
    const periodMatch = text.match(/FOR\s+THE\s+PERIOD[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (periodMatch) {
        startDate = normalizeDate(periodMatch[1]);
        endDate = normalizeDate(periodMatch[2]);
    }

    // Pattern 2: Quote date with term
    if (!startDate) {
        const datedMatch = text.match(/DATED:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (datedMatch) startDate = normalizeDate(datedMatch[1]);

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

    // Pattern 3: Explicit dates
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
            if (!endDate) {
                requiresReview = true;
                reviewNotes = "End date not found - using PO date as start";
            }
        }
    }

    // Pattern 5: Fiscal year
    if (!startDate) {
        const fyMatch = text.match(/(?:FY|Fiscal\s*Year)\s*['"]?(\d{2,4})/i);
        if (fyMatch) {
            const year = fyMatch[1].length === 2 ? `20${fyMatch[1]}` : fyMatch[1];
            startDate = `${year}-07-01`;
            endDate = `${parseInt(year) + 1}-06-30`;
            reviewNotes = `Inferred from fiscal year ${fyMatch[0]}`;
        }
    }

    if (startDate && !endDate && !termYears) {
        requiresReview = true;
        if (!reviewNotes) reviewNotes = "End date not found";
    }

    return { startDate, endDate, termYears, requiresReview, reviewNotes };
}

function normalizeDate(dateStr) {
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
    return `${year}-${month}-${day}`;
}

function calculateEndDate(startDate, termYears) {
    if (!startDate) return null;
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return null;
    start.setFullYear(start.getFullYear() + termYears);
    return start.toISOString().split('T')[0];
}

function inferCategory(text) {
    const lower = text.toLowerCase();
    if (lower.includes('software') || lower.includes('license') || lower.includes('subscription') || lower.includes('saas')) return 'Software';
    if (lower.includes('hardware') || lower.includes('server') || lower.includes('laptop') || lower.includes('equipment')) return 'Hardware';
    if (lower.includes('service') || lower.includes('labor') || lower.includes('consulting') || lower.includes('support')) return 'Services';
    if (lower.includes('freight') || lower.includes('shipping') || lower.includes('delivery')) return 'Shipping';
    return 'Other';
}

function extractPOTotal(text, poNumber) {
    // Determine context for this PO
    // Split text by occurrences of PO Number?
    // Or just look for "PO Total" near "PO Number: X"
    const poRegex = new RegExp(`(?:Purchase Order Number|PO Number|PO#)[\\s:]*${poNumber}`, 'gi');
    let match;
    let maxVal = 0;

    while ((match = poRegex.exec(text)) !== null) {
        // Look ahead 2000 chars for "PO Total"
        const start = match.index;
        const end = Math.min(text.length, start + 3000);
        const chunk = text.substring(start, end);

        // Find "PO Total" label
        const totalLabel = chunk.match(/PO\s*Total/i);
        if (totalLabel) {
            // Look at 500 chars AFTER "PO Total"
            const labelIdx = totalLabel.index;
            const context = chunk.substring(labelIdx, labelIdx + 500);

            // Extract all currency-like numbers
            const numbers = context.match(/[\d,]+\.\d{2}/g);
            if (numbers) {
                for (const numStr of numbers) {
                    const val = parseFloat(numStr.replace(/,/g, ''));
                    if (val > maxVal) maxVal = val;
                }
            }
        }
    }
    return maxVal;
}

function extractLineItems(text) {
    const items = [];
    const regex = /(\d+)\s+([A-Za-z]+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        const start = Math.max(0, match.index - 100);
        const context = text.substring(start, match.index).trim();
        const lines = context.split('\n');
        let description = lines[lines.length - 1] || "Item";
        if (description.length < 5 && lines.length > 1) description = lines[lines.length - 2] + " " + description;

        description = description.replace(/\s+/g, ' ').trim();
        if (description.length > 80) description = description.substring(description.length - 80);

        items.push({
            description: description,
            quantity: parseInt(match[1]),
            unit: match[2],
            unit_cost: parseFloat(match[3].replace(/,/g, '')),
            total_cost: parseFloat(match[4].replace(/,/g, '')),
            category: inferCategory(description)
        });
    }
    return items;
}

// --- Reseed Logic ---

async function reseedMultiPO() {
    console.log("🚀 Starting enhanced multi-PO reseed...\n");

    const files = fs.readdirSync(SAMPLE_DIR).filter(f => f.endsWith('.pdf'));

    for (const file of files) {
        console.log(`\n📄 Processing: ${file}`);

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
            } else {
                throw new Error('Could not find PDFParse constructor or function');
            }

            // 1. Extract Dates
            const dates = extractDatesEnhanced(text);

            // 2. Extract PO Issue Date
            let poIssueDate = null;
            const issueDateMatch = text.match(/(?:Purchase Order Date|PO Date|ISSUED\/PRINTED|DATED)\s*[:]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
            if (issueDateMatch) {
                poIssueDate = normalizeDate(issueDateMatch[1]);
                console.log(`  📅 Found PO Issue Date: ${poIssueDate}`);
            }

            // 3. Find Unique POs
            const poMatches = text.matchAll(/([TW]80[BP]\d{4})/gi);
            const uniquePOs = new Set();
            for (const match of poMatches) {
                uniquePOs.add(match[1].toUpperCase());
            }
            const poList = Array.from(uniquePOs);

            if (poList.length === 0) {
                console.log(`  ⚠️ No PO numbers found in ${file}`);
                continue;
            }

            console.log(`  📎 Found ${poList.length} unique POs: ${poList.join(', ')}`);

            // 4. Update or Insert Contracts
            for (const poNumber of poList) {
                // Check if contract exists
                const { data: contracts, error } = await supabase
                    .from('contracts')
                    .select('id, contract_name, vendor_id')
                    .or(`contract_number.ilike.%${poNumber}%,contract_name.ilike.%${poNumber}%`);

                let contractId;
                let isNew = false;
                let vendorId = null;

                if (contracts && contracts.length > 0) {
                    contractId = contracts[0].id;
                    vendorId = contracts[0].vendor_id;
                } else {
                    process.stdout.write(`    ➕ Creating NEW contract for ${poNumber}... `);
                    isNew = true;

                    // Fetch vendor
                    if (file.toLowerCase().includes("mk management")) {
                        const { data: v } = await supabase.from('vendors').select('id').ilike('vendor_name', '%MK MANAGEMENT%').single();
                        if (v) vendorId = v.id;
                    } else if (file.toLowerCase().includes("singlewire")) {
                        const { data: v } = await supabase.from('vendors').select('id').ilike('vendor_name', '%SINGLEWIRE%').single();
                        if (v) vendorId = v.id;
                    } else if (file.toLowerCase().includes("friday")) {
                        const { data: v } = await supabase.from('vendors').select('id').ilike('vendor_name', '%FRIDAY%').single();
                        if (v) vendorId = v.id;
                    } else if (file.toLowerCase().includes("inter-pacific")) {
                        const { data: v } = await supabase.from('vendors').select('id').ilike('vendor_name', '%inter-pacific%').single();
                        if (v) vendorId = v.id;
                    } else if (file.toLowerCase().includes("development group")) {
                        const { data: v } = await supabase.from('vendors').select('id').ilike('vendor_name', '%DEVELOPMENT GROUP%').single();
                        if (v) vendorId = v.id;
                    }

                    // Create new contract
                    const { data: newContract, error: createError } = await supabase
                        .from('contracts')
                        .insert({
                            contract_number: poNumber,
                            contract_name: `PO ${poNumber}`,
                            vendor_id: vendorId,
                            status: 'active',
                            document_url: `/files/${file}`,
                            annual_value: 0
                        })
                        .select('id')
                        .single();

                    if (createError) {
                        console.log(`❌ Create failed: ${createError.message}`);
                        continue;
                    }
                    contractId = newContract.id;
                    console.log(`Done`);
                }

                // Update Vendor Category
                if (vendorId) {
                    const category = inferCategory(text);
                    await supabase.from('vendors').update({ category }).eq('id', vendorId);
                    // console.log(`    🏷️  Updated Vendor Category: ${category}`);
                }

                // Update data
                const updateData = {};
                updateData.document_url = `/files/${file}`;
                if (dates.startDate) updateData.start_date = dates.startDate;
                if (dates.endDate) {
                    updateData.end_date = dates.endDate;
                    updateData.renewal_date = dates.endDate;
                }
                if (dates.termYears) updateData.term_years = dates.termYears;
                if (dates.requiresReview !== undefined) updateData.requires_review = dates.requiresReview;
                if (dates.reviewNotes) updateData.review_notes = dates.reviewNotes;
                if (dates.termYears) updateData.term_years = dates.termYears;
                if (dates.requiresReview !== undefined) updateData.requires_review = dates.requiresReview;
                if (dates.reviewNotes) updateData.review_notes = dates.reviewNotes;
                // 3. Split text into context sections based on "PURCHASE ORDER NUMBER"
                const sections = text.split(/PURCHASE ORDER NUMBER/i);
                const poDataMap = {}; // Map PO Number -> { value, lines, date }

                // Helper to process a section
                const processSection = (sectionText) => {
                    // Find PO Number in this section
                    const poMatch = sectionText.match(/W\d{2}[B|P]\d{4}/);
                    if (!poMatch) return;
                    const poNum = poMatch[0];

                    // Initialize if new
                    if (!poDataMap[poNum]) {
                        poDataMap[poNum] = { value: 0, lines: [], date: null };
                    }

                    // Extract Total
                    const totalLabel = sectionText.match(/PO\s*Total/i);
                    if (totalLabel) {
                        const labelIdx = totalLabel.index;
                        const context = sectionText.substring(labelIdx, labelIdx + 500);
                        const numbers = context.match(/[\d,]+\.\d{2}/g);
                        if (numbers) {
                            const maxVal = Math.max(...numbers.map(n => parseFloat(n.replace(/,/g, ''))));
                            if (maxVal > poDataMap[poNum].value) poDataMap[poNum].value = maxVal;
                        }
                    }

                    // Extract Date
                    const dateMatch = sectionText.match(/PO Issue Date:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
                        sectionText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                    if (dateMatch && !poDataMap[poNum].date) {
                        poDataMap[poNum].date = dateMatch[1];
                    }

                    // Extract Line Items for this section
                    const sectionLines = extractLineItems(sectionText);
                    if (sectionLines.length > 0) {
                        poDataMap[poNum].lines.push(...sectionLines);
                    }
                };

                // Process all sections
                sections.forEach(processSection);

                // Also process the "Master" matches found via regex earlier to ensure they exist in map
                uniquePOs.forEach(po => {
                    if (!poDataMap[po]) poDataMap[po] = { value: 0, lines: [], date: null };
                });

                console.log(`    📊 Analyzed ${Object.keys(poDataMap).length} PO contexts.`);

                // 4. Update Database
                for (const po of uniquePOs) { // Only update POs recognized in this file
                    const data = poDataMap[po];
                    const updateData = {};

                    if (data.value > 0) {
                        updateData.annual_value = data.value;
                        console.log(`    💰 ${po}: $${data.value.toLocaleString()}`);
                    } else {
                        console.log(`    Ref ${po}: $0 (No specific PO section found)`);
                    }

                    if (Object.keys(updateData).length > 0) {
                        const { data: contracts } = await supabase.from('contracts').select('id').eq('contract_number', po);
                        if (contracts && contracts.length > 0) {
                            for (const c of contracts) {
                                await supabase.from('contracts').update(updateData).eq('id', c.id);

                                // Update Line Items
                                if (data.lines.length > 0) {
                                    console.log(`    📝 ${po}: Updating ${data.lines.length} line items`);
                                    await supabase.from('contract_line_items').delete().eq('contract_id', c.id);
                                    for (const item of data.lines) {
                                        await supabase.from('contract_line_items').insert({
                                            contract_id: c.id,
                                            description: item.description,
                                            quantity: item.quantity,
                                            unit_cost: item.unit_cost,
                                            annual_cost: item.total_cost,
                                            category: item.category,
                                            parsed_confidence_score: 85
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            } // End of PO Loop

            if (poList.length > 5) console.log(`    ...Processed all ${poList.length} POs`);

        } catch (err) {
            console.log(`  ❌ Error processing file ${file}: ${err.message}`);
        }
    } // End of File Loop

    console.log("\n✅ Multi-PO reseed complete!");
}

reseedMultiPO();
