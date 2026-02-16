import React from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import VendorsClient from "@/components/VendorsClient";

// Force dynamic rendering so we always get fresh data
export const dynamic = 'force-dynamic';

interface Vendor {
    id: string;
    vendor_name: string;
    category: string;
    spend: number;
    contractCount: number;
    singleContractId?: string; // New field
}

export default async function VendorsPage() {
    // 1. Fetch Vendors with Service Role (Bypasses RLS)
    const { data: vendorsData, error: vendorError } = await supabaseAdmin
        .from('vendors')
        .select('id, vendor_name, category');

    if (vendorError) {
        console.error("Values Page Error:", vendorError);
        return <div>Error loading data.</div>;
    }

    // 2. Fetch Contracts with Service Role
    const { data: contractsData, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, vendor_id, annual_value') // Added 'id'
        .order('created_at', { ascending: false }); // Sort to get latest if needed

    if (contractError) {
        console.error("Values Page Contracts Error:", contractError);
        return <div>Error loading contracts.</div>;
    }

    // 3. Aggregate Data on Server
    const vendorMap = new Map<string, Vendor>();
    const categoryMap: { [key: string]: number } = {};

    // Initialize vendors
    vendorsData?.forEach(v => {
        vendorMap.set(v.id, {
            id: v.id,
            vendor_name: v.vendor_name,
            category: v.category || 'other',
            spend: 0,
            contractCount: 0,
            singleContractId: undefined
        });
    });

    // Sum up spend
    contractsData?.forEach(c => {
        if (c.vendor_id && vendorMap.has(c.vendor_id)) {
            const vendor = vendorMap.get(c.vendor_id)!;
            const value = Number(c.annual_value) || 0;
            vendor.spend += value;
            vendor.contractCount += 1;

            // Capture ID if it's the first one we find (useful if count ends up being 1)
            if (vendor.contractCount === 1) {
                vendor.singleContractId = c.id;
            } else {
                // If more than 1, we don't strictly need Single ID, 
                // but checking count later is what matters.
                // We keep the FIRST one found (newest) as 'singleContractId' in memory
                // but relying on contractCount === 1 in the client is the key.
            }

            // Category Aggregation
            const cat = vendor.category;
            categoryMap[cat] = (categoryMap[cat] || 0) + value;
        }
    });

    const vendorList = Array.from(vendorMap.values());
    const topVendors = vendorList.map(v => ({ vendor: v.vendor_name, amount: v.spend }));

    return (
        <VendorsClient
            vendors={vendorList}
            categorySpend={categoryMap}
            topVendors={topVendors}
        />
    );
}
