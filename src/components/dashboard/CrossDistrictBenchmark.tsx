"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    Building2,
    TrendingDown,
    TrendingUp,
    DollarSign,
    ChevronDown,
    ChevronUp,
    Loader2,
    Sparkles,
    ShieldCheck
} from "lucide-react";

interface BenchmarkData {
    district_name: string;
    enrollment: number;
    contract_name: string;
    annual_value: number;
    start_date: string;
    end_date: string;
    status: string;
    vendor_name: string;
}

interface CrossDistrictBenchmarkProps {
    vendorName: string;
    currentDistrictId: string;
    currentAnnualValue?: number;
}

export function CrossDistrictBenchmark({
    vendorName,
    currentDistrictId,
    currentAnnualValue,
}: CrossDistrictBenchmarkProps) {
    const supabase = createClient();
    const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{
        lowestRate: number | null;
        highestRate: number | null;
        totalPeerContracts: number;
    }>({ lowestRate: null, highestRate: null, totalPeerContracts: 0 });

    useEffect(() => {
        async function fetchBenchmarks() {
            if (!vendorName || !currentDistrictId) return;
            setLoading(true);
            setError(null);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    setError("Not authenticated");
                    return;
                }

                const res = await fetch(
                    `/api/benchmark?vendor_name=${encodeURIComponent(vendorName)}&current_district_id=${currentDistrictId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    }
                );

                if (!res.ok) {
                    if (res.status === 403) {
                        setError("Super admin access required");
                    } else {
                        setError("Failed to load benchmarks");
                    }
                    return;
                }

                const data = await res.json();
                setBenchmarks(data.benchmarks || []);
                setSummary({
                    lowestRate: data.lowest_rate,
                    highestRate: data.highest_rate,
                    totalPeerContracts: data.total_peer_contracts || 0,
                });
            } catch (err) {
                console.error("Benchmark fetch error:", err);
                setError("Failed to load peer data");
            } finally {
                setLoading(false);
            }
        }

        fetchBenchmarks();
    }, [vendorName, currentDistrictId, supabase]);

    if (error) return null; // Silently hide for non-super-admins

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-center gap-3">
                    <Loader2 size={18} className="text-indigo-500 animate-spin" />
                    <span className="text-sm font-bold text-indigo-600">Loading peer district intel...</span>
                </div>
            </div>
        );
    }

    if (benchmarks.length === 0) {
        return (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                    <Building2 size={16} />
                    <span className="text-sm font-medium">No peer district data found for this vendor</span>
                </div>
            </div>
        );
    }

    const bestRate = summary.lowestRate;
    const savingsDelta = currentAnnualValue && bestRate
        ? ((currentAnnualValue - bestRate) / currentAnnualValue * 100)
        : null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl border border-indigo-100 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <ShieldCheck size={18} className="text-indigo-600" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                            🏫 Peer District Intel
                            <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Super Admin
                            </span>
                        </h4>
                        <p className="text-xs text-indigo-500 mt-0.5">
                            {summary.totalPeerContracts} contract{summary.totalPeerContracts !== 1 ? "s" : ""} from peer districts
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {savingsDelta !== null && savingsDelta > 0 && (
                        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                            <TrendingDown size={12} />
                            {savingsDelta.toFixed(1)}% savings available
                        </div>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-400" />}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="px-6 pb-6 space-y-4">
                    {/* Savings callout */}
                    {savingsDelta !== null && savingsDelta > 0 && bestRate !== null && (
                        <div className="bg-white rounded-xl p-4 border border-emerald-100 flex items-start gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                                <Sparkles size={16} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">
                                    A peer district pays <span className="text-emerald-600">${bestRate.toLocaleString()}</span> for the same vendor — <span className="text-emerald-600">{savingsDelta.toFixed(1)}% less</span> than your current rate.
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Use this data point during negotiations to justify a rate reduction.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Benchmark table */}
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">District</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Annual Value</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">vs. Current</th>
                                </tr>
                            </thead>
                            <tbody>
                                {benchmarks.map((b, i) => {
                                    const delta = currentAnnualValue
                                        ? ((currentAnnualValue - b.annual_value) / currentAnnualValue * 100)
                                        : null;
                                    return (
                                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                                                    <span className="text-sm font-bold text-slate-900">{b.district_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {b.enrollment?.toLocaleString() || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm font-black text-slate-900">
                                                    ${b.annual_value.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {delta !== null ? (
                                                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        delta > 0
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : delta < 0
                                                                ? "bg-red-50 text-red-500"
                                                                : "bg-slate-50 text-slate-400"
                                                    }`}>
                                                        {delta > 0 ? <TrendingDown size={10} /> : delta < 0 ? <TrendingUp size={10} /> : null}
                                                        {delta > 0 ? `-${delta.toFixed(1)}%` : delta < 0 ? `+${Math.abs(delta).toFixed(1)}%` : "Same"}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
