
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSchema() {
    const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_name, extracted_text')
        .not('extracted_text', 'is', null)
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample contracts with extracted_text:', data?.length);
        if (data && data.length > 0) {
            console.log('Sample text:', data[0].extracted_text.substring(0, 100));
        } else {
            console.log('No contracts with extracted_text found.');
        }
    }
}

checkSchema();
