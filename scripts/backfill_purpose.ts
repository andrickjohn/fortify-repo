
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const extractPurpose = (text: string): string | null => {
    if (!text) return null;

    // Regex heuristics for "Purpose" or "Subject"
    // 1. Look for explicit headers
    const patterns = [
        /(?:RE|SUBJECT|PROJECT|AGREEMENT FOR|REGARDING)\s*[:\-]\s*(.{1,100})/i,
        /PURPOSE\s*[:\-]\s*(.{1,100})/i,
        /WHEREAS,\s*(.{1,100})/i
    ];

    for (const pat of patterns) {
        const match = text.match(pat);
        if (match && match[1]) {
            const raw = match[1].trim();
            const words = raw.split(/\s+/);
            const truncated = words.slice(0, 4).join(' ');
            return words.length > 4 ? truncated + '...' : truncated;
        }
    }

    // Fallback: If we find "MOU"
    if (/Memorandum of Understanding/i.test(text)) return "MOU / Partnership";
    if (/Data Sharing Agreement/i.test(text)) return "Data Sharing";
    if (/Service Agreement/i.test(text)) return "Service Agreement";

    // Fallback 2: Look for MK Management specific lines if generic fails?
    // User mentioned: "mk management has muliple subs ... text data that may indicate purpose"
    // Maybe look for "Description:" or similar?

    return null;
};

async function backfill() {
    console.log('Fetching contracts without purpose...');

    // Fetch contracts with extracted_text but NO description_of_purpose
    const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, contract_name, extracted_text')
        //.is('description_of_purpose', null) // Only backfill missing
        .not('extracted_text', 'is', null);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Found ${contracts?.length} contracts with text. Processing...`);

    let updatedCount = 0;

    for (const c of contracts || []) {
        const purpose = extractPurpose(c.extracted_text);
        if (purpose) {
            console.log(`[${c.contract_name}] Found purpose: "${purpose}"`);

            const { error: updateError } = await supabase
                .from('contracts')
                .update({ description_of_purpose: purpose })
                .eq('id', c.id);

            if (updateError) {
                console.error(`Failed to update ${c.id}:`, updateError);
            } else {
                updatedCount++;
            }
        } else {
            // console.log(`[${c.contract_name}] No purpose extracted.`);
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount} contracts.`);
}

backfill();
