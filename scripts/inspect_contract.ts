
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspect() {
    console.log('Inspecting MK Management contracts...');

    // Get Vendor ID first or just search by name text in contract?
    // Actually, let's just search contracts with "MK MANAGEMENT" in vendor name via join?
    // Simpler: Search contracts where contract_name or number usually has PO... 
    // The user screenshot shows "PO W80B0043".

    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .or('contract_number.eq.W80B0043,contract_name.ilike.%MK MANAGEMENT%')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Contract Keys:', Object.keys(data[0]));
        console.log('Sample Data:', data[0]);
    } else {
        console.log('No matching contract found.');
    }

    // Also check if we have a file_path or file_url column
}

inspect();
