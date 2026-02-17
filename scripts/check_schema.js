
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon key, hoping RLS allows reading schema or I can just insert/select to test

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("--- Testing Negotiation Insert with Email Fields ---");

    // Use a random vendor name to avoid unique constraint issues if any, or just delete after
    const vendorName = 'TestVendor_' + Math.floor(Math.random() * 1000);

    const { error: insertError } = await supabase
        .from('negotiations')
        .insert({
            vendor_name: vendorName,
            status: 'draft',
            potential_savings: 100,
            strategy: 'Test strategy',
            // Try to insert email fields - if this fails, they don't exist
            email_subject: 'Test Subject',
            email_body: 'Test Body'
        });

    if (insertError) {
        console.error("Insert failed:", insertError.message);
        if (insertError.message.includes('column "email_subject" does not exist')) {
            console.log("CONCLUSION: Email columns DO NOT exist.");
        } else {
            console.log("CONCLUSION: Insert failed for other reason.");
        }
    } else {
        console.log("CONCLUSION: Email columns EXIST.");
        // Cleanup
        await supabase.from('negotiations').delete().eq('vendor_name', vendorName);
    }

    console.log("\n--- Checking Vendors Table ---");
    const { data: vendors, error: vError } = await supabase
        .from('vendors')
        .select('*')
        .limit(1);

    if (vError) {
        console.error("Error fetching vendors:", vError);
    } else if (vendors && vendors.length > 0) {
        console.log("Vendors Keys:", Object.keys(vendors[0]));
        console.log("Sample:", vendors[0]);
    } else {
        console.log("No vendors found.");
    }
}

checkSchema();
