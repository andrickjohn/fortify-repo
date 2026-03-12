import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const vendorName = searchParams.get("vendor_name");
    const currentDistrictId = searchParams.get("current_district_id");

    if (!vendorName || !currentDistrictId) {
        return NextResponse.json(
            { error: "Missing vendor_name or current_district_id" },
            { status: 400 }
        );
    }

    try {
        // Verify user is super_admin via auth header
        const authHeader = request.headers.get("authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify super_admin role
        const { data: profile } = await supabaseAdmin
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "super_admin") {
            return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 });
        }

        // Find matching vendors across ALL districts (service role bypasses RLS)
        const { data: matchingVendors } = await supabaseAdmin
            .from("vendors")
            .select("id, district_id, vendor_name")
            .ilike("vendor_name", `%${vendorName}%`);

        if (!matchingVendors || matchingVendors.length === 0) {
            return NextResponse.json({ benchmarks: [], message: "No peer data found" });
        }

        const vendorIds = matchingVendors.map((v) => v.id);

        // Get contracts for those vendors
        const { data: contracts } = await supabaseAdmin
            .from("contracts")
            .select(`
                id,
                contract_name,
                annual_value,
                start_date,
                end_date,
                status,
                district_id,
                vendor_id,
                vendors (
                    vendor_name
                )
            `)
            .in("vendor_id", vendorIds)
            .neq("district_id", currentDistrictId)
            .order("annual_value", { ascending: true });

        // Get district names for the results
        const districtIds = [...new Set((contracts || []).map((c) => c.district_id))];
        const { data: districts } = await supabaseAdmin
            .from("districts")
            .select("id, name, enrollment_current")
            .in("id", districtIds);

        const districtMap = new Map(
            (districts || []).map((d) => [d.id, d])
        );

        // Format results with district context
        const benchmarks = (contracts || []).map((c: any) => {
            const district = districtMap.get(c.district_id);
            return {
                district_name: district?.name || "Unknown District",
                enrollment: district?.enrollment_current || 0,
                contract_name: c.contract_name,
                annual_value: Number(c.annual_value) || 0,
                start_date: c.start_date,
                end_date: c.end_date,
                status: c.status,
                vendor_name: Array.isArray(c.vendors)
                    ? c.vendors[0]?.vendor_name
                    : c.vendors?.vendor_name || vendorName,
            };
        });

        return NextResponse.json({
            benchmarks,
            vendor_name: vendorName,
            total_peer_contracts: benchmarks.length,
            lowest_rate: benchmarks.length > 0 ? Math.min(...benchmarks.map(b => b.annual_value)) : null,
            highest_rate: benchmarks.length > 0 ? Math.max(...benchmarks.map(b => b.annual_value)) : null,
        });
    } catch (err: any) {
        console.error("Benchmark API error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
