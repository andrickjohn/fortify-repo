"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useDistrictContext } from "@/lib/DistrictContext";
import {
    Building2,
    Plus,
    Users,
    MapPin,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    Globe,
    School,
    ChevronRight,
    ChevronDown,
    FileText,
    Package,
    Shield,
    Pencil,
} from "lucide-react";

interface SchoolRow {
    id: string;
    district_id: string;
    name: string;
    address: string | null;
    principal_name: string | null;
    principal_email: string | null;
    enrollment: number;
}

interface DistrictRow {
    id: string;
    name: string;
    domain: string | null;
    subscription_tier: string;
    enrollment_current: number | null;
    primary_contact: string | null;
    settings_json: any;
    onboarded_date: string | null;
    _schools: SchoolRow[];
    _contractCount: number;
    _vendorCount: number;
    _userCount: number;
}

function AddSchoolForm({
    districtId,
    onDone,
    supabase,
}: {
    districtId: string;
    onDone: () => void;
    supabase: any;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const form = new FormData(e.currentTarget);
        try {
            const { error } = await supabase.from("schools").insert({
                district_id: districtId,
                name: form.get("name") as string,
                address: (form.get("address") as string) || null,
                principal_name: (form.get("principal") as string) || null,
                principal_email: (form.get("email") as string) || null,
                enrollment: parseInt(form.get("enrollment") as string) || 0,
            });
            if (error) throw error;
            onDone();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3"
        >
            <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Add School</p>

            {error && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> {error}
                </p>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">School Name *</label>
                    <input name="name" required placeholder="e.g. Lincoln Elementary"
                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Address</label>
                    <input name="address" placeholder="123 Main St"
                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Principal Name</label>
                    <input name="principal" placeholder="Jane Doe"
                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Principal Email</label>
                    <input name="email" type="email" placeholder="principal@district.edu"
                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enrollment</label>
                    <input name="enrollment" type="number" placeholder="500"
                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {saving ? "Adding..." : "Add School"}
                </button>
                <button type="button" onClick={onDone}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                    Cancel
                </button>
            </div>
        </form>
    );
}

function DistrictCard({
    district,
    onRefresh,
    supabase,
}: {
    district: DistrictRow;
    onRefresh: () => void;
    supabase: any;
}) {
    const [expanded, setExpanded] = useState(true);
    const [showAddSchool, setShowAddSchool] = useState(false);

    const tierColors: Record<string, string> = {
        enterprise: "bg-purple-100 text-purple-700 border-purple-200",
        premium: "bg-blue-100 text-blue-700 border-blue-200",
        standard: "bg-green-100 text-green-700 border-green-200",
        pilot: "bg-amber-100 text-amber-700 border-amber-200",
    };
    const tierColor = tierColors[district.subscription_tier] || "bg-slate-100 text-slate-500 border-slate-200";

    return (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* District Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-start justify-between p-5 hover:bg-slate-50 transition-colors text-left"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-indigo-50 rounded-xl flex-shrink-0 mt-0.5">
                        <Building2 size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-900">{district.name}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierColor}`}>
                                {district.subscription_tier}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                            {district.settings_json?.county && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <MapPin size={10} /> {district.settings_json.county}
                                </span>
                            )}
                            {district.domain && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Globe size={10} /> {district.domain}
                                </span>
                            )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1">
                                <Users size={11} className="text-blue-500" />
                                <span className="text-xs font-bold text-slate-700">
                                    {district.enrollment_current?.toLocaleString() || "—"} students
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1">
                                <School size={11} className="text-emerald-500" />
                                <span className="text-xs font-bold text-slate-700">
                                    {district._schools.length} school{district._schools.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1">
                                <FileText size={11} className="text-purple-500" />
                                <span className="text-xs font-bold text-slate-700">
                                    {district._contractCount} contracts
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1">
                                <Package size={11} className="text-orange-500" />
                                <span className="text-xs font-bold text-slate-700">
                                    {district._vendorCount} vendors
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1">
                                <Shield size={11} className="text-rose-500" />
                                <span className="text-xs font-bold text-slate-700">
                                    {district._userCount} users
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-slate-400 flex-shrink-0 mt-1">
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
            </button>

            {/* Expanded Schools Hierarchy */}
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                    <div className="px-5 py-4 space-y-2">
                        {/* Schools header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-px h-5 bg-slate-200 ml-4" />
                                <School size={14} className="text-emerald-600" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Schools ({district._schools.length})
                                </span>
                            </div>
                            <button
                                onClick={() => setShowAddSchool(!showAddSchool)}
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus size={12} /> Add School
                            </button>
                        </div>

                        {/* Add School Form */}
                        {showAddSchool && (
                            <AddSchoolForm
                                districtId={district.id}
                                supabase={supabase}
                                onDone={() => {
                                    setShowAddSchool(false);
                                    onRefresh();
                                }}
                            />
                        )}

                        {district._schools.length === 0 && !showAddSchool ? (
                            <div className="ml-8 py-4 text-center">
                                <School size={28} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-xs text-slate-400 font-medium">No schools added yet</p>
                                <button
                                    onClick={() => setShowAddSchool(true)}
                                    className="text-xs text-blue-500 font-bold mt-1 hover:underline"
                                >
                                    + Add the first school
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1.5 ml-8">
                                {district._schools.map((school, idx) => (
                                    <div key={school.id}
                                        className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 hover:border-blue-100 hover:shadow-sm transition-all group"
                                    >
                                        {/* Tree line */}
                                        <div className="flex flex-col items-center flex-shrink-0 mt-1">
                                            <div className={`w-px ${idx < district._schools.length - 1 ? 'h-full' : 'h-3'} bg-slate-200`} />
                                            <div className="w-3 h-px bg-slate-200" />
                                        </div>
                                        <div className="p-1.5 bg-emerald-50 rounded-lg flex-shrink-0">
                                            <School size={13} className="text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900">{school.name}</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                                                {school.principal_name && (
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Users size={9} /> {school.principal_name}
                                                    </span>
                                                )}
                                                {school.address && (
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <MapPin size={9} /> {school.address}
                                                    </span>
                                                )}
                                                {school.enrollment > 0 && (
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {school.enrollment.toLocaleString()} students
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function ManageDistricts() {
    const supabase = createClient();
    const { isSuperAdmin } = useDistrictContext();
    const [districts, setDistricts] = useState<DistrictRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDistrict, setShowAddDistrict] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const { data: districtData } = await supabase
                .from("districts")
                .select("*")
                .order("name");

            const enriched = await Promise.all(
                (districtData || []).map(async (d: any) => {
                    const [
                        { data: schools },
                        { count: contractCount },
                        { count: vendorCount },
                        { count: userCount },
                    ] = await Promise.all([
                        supabase.from("schools").select("*").eq("district_id", d.id).order("name"),
                        supabase.from("contracts").select("*", { count: "exact", head: true }).eq("district_id", d.id),
                        supabase.from("vendors").select("*", { count: "exact", head: true }).eq("district_id", d.id),
                        supabase.from("users").select("*", { count: "exact", head: true }).eq("district_id", d.id),
                    ]);
                    return {
                        ...d,
                        _schools: schools || [],
                        _contractCount: contractCount || 0,
                        _vendorCount: vendorCount || 0,
                        _userCount: userCount || 0,
                    };
                })
            );

            setDistricts(enriched);
        } catch (err: any) {
            setMessage({ type: "error", text: "Failed to load districts: " + err.message });
        } finally {
            setLoading(false);
        }
    }

    async function handleAddDistrict(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        const form = new FormData(e.currentTarget);
        try {
            const { error } = await supabase.from("districts").insert({
                name: form.get("name") as string,
                domain: (form.get("domain") as string) || null,
                subscription_tier: form.get("tier") as string,
                enrollment_current: parseInt(form.get("enrollment") as string) || 0,
                primary_contact: (form.get("contact") as string) || null,
                settings_json: {
                    county: form.get("county") || null,
                    district_type: form.get("districtType") || "Unified K-12",
                },
            });
            if (error) throw error;
            setMessage({ type: "success", text: `District "${form.get("name")}" added!` });
            setShowAddDistrict(false);
            fetchAll();
        } catch (err: any) {
            setMessage({ type: "error", text: "Failed to add district: " + err.message });
        } finally {
            setSaving(false);
        }
    }

    if (!isSuperAdmin) {
        return (
            <div className="text-center py-20">
                <Shield size={48} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Super Admin Only</h3>
                <p className="text-sm text-slate-500">District management requires super admin access.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    // Summary stats
    const totalStudents = districts.reduce((sum, d) => sum + (d.enrollment_current || 0), 0);
    const totalSchools = districts.reduce((sum, d) => sum + d._schools.length, 0);
    const totalContracts = districts.reduce((sum, d) => sum + d._contractCount, 0);
    const totalVendors = districts.reduce((sum, d) => sum + d._vendorCount, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-900">District Hierarchy</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {districts.length} district{districts.length !== 1 ? "s" : ""} · {totalSchools} schools · {totalContracts} contracts
                    </p>
                </div>
                <button
                    onClick={() => setShowAddDistrict(!showAddDistrict)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    {showAddDistrict ? <X size={16} /> : <Plus size={16} />}
                    {showAddDistrict ? "Cancel" : "Add District"}
                </button>
            </div>

            {/* Rollup stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Districts", value: districts.length, icon: Building2, color: "text-indigo-600 bg-indigo-50" },
                    { label: "Schools", value: totalSchools, icon: School, color: "text-emerald-600 bg-emerald-50" },
                    { label: "Total Students", value: totalStudents.toLocaleString(), icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "Contracts", value: totalContracts, icon: FileText, color: "text-purple-600 bg-purple-50" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${stat.color}`}>
                            <stat.icon size={16} />
                        </div>
                        <div>
                            <p className="text-lg font-black text-slate-900">{stat.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Message */}
            {message && (
                <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
                    message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                    {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            {/* Add District Form */}
            {showAddDistrict && (
                <form onSubmit={handleAddDistrict} className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
                    <h4 className="text-sm font-black text-blue-900 flex items-center gap-2">
                        <Building2 size={16} /> New District
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">District Name *</label>
                            <input name="name" required placeholder="e.g. Los Angeles Unified"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Domain</label>
                            <input name="domain" placeholder="e.g. lausd.net"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Subscription *</label>
                            <select name="tier" required defaultValue="pilot"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                                <option value="pilot">Pilot</option>
                                <option value="standard">Standard</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enrollment</label>
                            <input name="enrollment" type="number" placeholder="e.g. 25000"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">County</label>
                            <input name="county" placeholder="e.g. Los Angeles"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Primary Contact</label>
                            <input name="contact" placeholder="e.g. John Smith"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {saving ? "Adding..." : "Add District"}
                    </button>
                </form>
            )}

            {/* Hierarchy Tree */}
            <div className="space-y-4">
                {districts.map((district) => (
                    <DistrictCard
                        key={district.id}
                        district={district}
                        supabase={supabase}
                        onRefresh={fetchAll}
                    />
                ))}

                {districts.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                        <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No districts yet</h3>
                        <p className="text-sm text-slate-400 mt-1">Add your first district to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
