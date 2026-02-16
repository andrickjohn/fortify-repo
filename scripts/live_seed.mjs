import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as pdf from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.join(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Refined extraction logic (sync with parser.ts)
function extractPattern(text, regexes) {
    for (const regex of regexes) {
        const match = text.match(regex);
        if (match && match[1]) return match[1].trim();
        if (match && !match[1]) return match[0].trim();
    }
    return null;
}

function extractLargestAmount(text, regexes) {
    for (const regex of regexes) {
        const match = text.match(regex);
        if (match) {
            const block = match[0];
            const numbers = block.match(/[\d,]+\.\d{2}/g);
            if (numbers) {
                const floatValues = numbers.map(n => parseFloat(n.replace(/,/g, '')));
                return Math.max(...floatValues);
            }
        }
    }
    return null;
}

function extractLineItems(text) {
    const lines = text.split('\n');
    const items = [];
    const itemRegex = /(\d+)\s+([A-Z0-9\-\s\(\)]+)\s+\$([\d,]+\.\d{2})/g;

    let match;
    while ((match = itemRegex.exec(text)) !== null) {
        items.push({
            description: match[2].trim(),
            quantity: parseInt(match[1]),
            unit_cost: parseFloat(match[3].replace(/,/g, '')),
            annual_cost: parseFloat(match[3].replace(/,/g, '')) * parseInt(match[1])
        });
    }

    // Fallback if regex fails - look for common patterns like 'Subtotal' or specific keywords
    if (items.length === 0) {
        const fallbackItems = text.match(/[A-Z\s]{10,}\s+\$[\d,]+\.\d{2}/g);
        if (fallbackItems) {
            fallbackItems.forEach(item => {
                const parts = item.split(/\s+\$/);
                items.push({
                    description: parts[0].trim(),
                    quantity: 1,
                    unit_cost: parseFloat(parts[1].replace(/,/g, '')),
                    annual_cost: parseFloat(parts[1].replace(/,/g, ''))
                });
            });
        }
    }

    return items.slice(0, 5); // Limit to top 5 for demo
}

async function seed() {
    console.log("🚀 Starting Live Seeding (Manual Check Mode)...");

    // 1. Create/Get District
    let { data: districtData, error: districtError } = await supabase
        .from('districts')
        .select('*')
        .eq('domain', 'orangeusd.org')
        .single();

    if (!districtData) {
        console.log("Creating district...");
        const { data: newDistrict, error: createError } = await supabase
            .from('districts')
            .insert({
                name: 'Orange Unified School District',
                domain: 'orangeusd.org',
                subscription_tier: 'pilot',
                enrollment_current: 25000
            })
            .select()
            .single();

        if (createError) {
            console.error("❌ District Creation Failed:", createError.message);
            return;
        }
        districtData = newDistrict;
    }

    const districtId = districtData.id;
    console.log(`✅ District Verified: ${districtData.name} (${districtId})`);

    // 2. Process Samples
    const sampleDir = path.join(__dirname, '../Sample Data');
    const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.pdf'));

    for (const file of files) {
        console.log(`\n📄 Processing: ${file}`);
        const filePath = path.join(sampleDir, file);
        const dataBuffer = fs.readFileSync(filePath);

        const pdfParser = new pdf.PDFParse({ data: dataBuffer });
        const textResult = await pdfParser.getText();
        const text = textResult.text;

        const vendorName = extractPattern(text, [
            /FRIDAY SYSTEMS INC/i,
            /SINGLEWIRE SOFTWARE LLC/i,
            /MK MANAGEMENT INC/i,
            /DEVELOPMENT GROUP INC/i,
            /INTER-PACIFIC/i,
            /inter-pacific/i,
            /Vendor:\s*(.*)/i,
            /TO:\s+([^\n]+)/i
        ]) || "Unknown Vendor";

        // Vendor Category Logic
        let category = 'other';
        const vLower = (vendorName || '').toLowerCase();
        if (vLower.includes('software')) category = 'software';
        else if (vLower.includes('systems') || vLower.includes('management') || vLower.includes('group') || vLower.includes('consulting') || vLower.includes('services')) category = 'services';
        else if (vLower.includes('computer') || vLower.includes('equipment')) category = 'hardware';
        else if (vLower.includes('supply') || vLower.includes('supplies')) category = 'supplies';
        else if (vLower.includes('transport') || vLower.includes('bus')) category = 'transportation';
        else if (vLower.includes('food')) category = 'food_service';

        const poNumber = extractPattern(text, [/([TW]80[BP]\d{4})/i]);

        // PAGE DETECTION LOGIC
        let pageNumber = null;
        if (poNumber) {
            try {
                // Dynamic import to avoid top-level await issues if any
                // const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

                // Force worker to match version if needed, or rely on standard structure
                pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

                const loadingTask = pdfjs.getDocument({
                    data: new Uint8Array(dataBuffer),
                    standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
                    verbosity: 0
                });
                const doc = await loadingTask.promise;

                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    if (pageText.includes(poNumber)) {
                        pageNumber = i;
                        console.log(`   📍 Found PO ${poNumber} on Page ${i}`);
                        break;
                    }
                }
            } catch (e) {
                console.error("   ⚠️ Header/Page extraction failed:", e.message);
            }
        }

        const annualValue = extractLargestAmount(text, [
            /PO Total:[\s\S]{0,200}/i,
            /Customer Net Total[\s\S]{0,100}/i,
            /Total Cost:[\s\S]{0,100}/i
        ]);

        // 3. Get/Create Vendor
        let { data: vendorData, error: vendorFetchError } = await supabase
            .from('vendors')
            .select('*')
            .eq('district_id', districtId)
            .eq('vendor_name', vendorName)
            .maybeSingle();

        if (!vendorData) {
            const { data: newVendor, error: vendorCreateError } = await supabase
                .from('vendors')
                .insert({
                    district_id: districtId,
                    vendor_name: vendorName,
                    category: category
                })
                .select()
                .single();

            if (vendorCreateError) {
                console.error(`❌ Vendor ${vendorName} Creation Failed:`, vendorCreateError.message);
                continue;
            }
            vendorData = newVendor;
        }

        // 4. Get/Update/Insert Contract
        const contractSearch = poNumber ?
            await supabase.from('contracts').select('*').eq('district_id', districtId).eq('contract_number', poNumber).maybeSingle() :
            { data: null };

        if (contractSearch.data) {
            const { error: updateError } = await supabase
                .from('contracts')
                .update({
                    annual_value: annualValue,
                    ai_confidence_score: 98,
                    page_number: pageNumber, // Update page number
                    flag_ghost: !annualValue || annualValue === 0 // Update ghost status
                })
                .eq('id', contractSearch.data.id);

            if (updateError) console.error(`❌ Contract ${poNumber} Update Failed:`, updateError.message);
            else console.log(`✅ Contract Updated: ${vendorName} | ${poNumber} | Page ${pageNumber}${(!annualValue || annualValue === 0) ? ' | 👻 Ghost' : ''}`);
        } else {
            const { error: contractError } = await supabase
                .from('contracts')
                .insert({
                    district_id: districtId,
                    vendor_id: vendorData.id,
                    contract_name: `PO ${poNumber || 'Draft'} - ${vendorName}`,
                    contract_number: poNumber,
                    annual_value: annualValue,
                    status: 'active',
                    page_number: pageNumber, // Insert page number
                    flag_ghost: !annualValue || annualValue === 0, // Set ghost status
                    ai_confidence_score: (poNumber && annualValue) ? 95 : 60
                });

            if (contractError) {
                console.error(`❌ Contract ${poNumber} Insertion Failed:`, contractError.message);
                continue;
            } else {
                console.log(`✅ Contract Ingested: ${vendorName} | ${poNumber} | Page ${pageNumber} | $${annualValue}`);
            }

            // 5. Ingest Line Items
            // Only fetch if we have a poNumber to lookup
            if (poNumber) {
                const { data: newContract } = await supabase.from('contracts').select('id').eq('contract_number', poNumber).single();
                if (newContract) {
                    const lineItems = extractLineItems(text);
                    if (lineItems.length > 0) {
                        const { error: liError } = await supabase
                            .from('contract_line_items')
                            .insert(
                                lineItems.map(li => ({
                                    ...li,
                                    contract_id: newContract.id
                                }))
                            );

                        if (liError) console.error(`❌ Line Items failed:`, liError.message);
                        else console.log(`   📦 Ingested ${lineItems.length} line items`);
                    }
                }
            }
        }
    }

    console.log("\n✨ Live Seeding Complete!");
}

seed().catch(console.error);
