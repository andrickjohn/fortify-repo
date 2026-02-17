"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function PerformanceTable() {
    const router = useRouter();
    const supabase = createClient();
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});

    // Color mapping from SpendDonutChart
    const categoryColors: { [key: string]: string } = {
        'Services': 'bg-blue-50 text-blue-600 border-blue-100', // Matches #3B82F6
        'Software': 'bg-emerald-50 text-emerald-600 border-emerald-100', // Matches #10B981
        'Hardware': 'bg-amber-50 text-amber-600 border-amber-100', // Matches #F59E0B
        'Consulting': 'bg-indigo-50 text-indigo-600 border-indigo-100', // Matches #6366F1
        'Facilities': 'bg-pink-50 text-pink-600 border-pink-100', // Matches #EC4899
        'Logistics': 'bg-violet-50 text-violet-600 border-violet-100', // Matches #8B5CF6
        'Other': 'bg-slate-50 text-slate-500 border-slate-100' // Matches #64748B
    };

    // Helper to get color or fall back to hash-based deterministic color
    const getCategoryStyle = (category: string) => {
        if (!category) return categoryColors['Other'];

        // Exact match?
        if (categoryColors[category]) return categoryColors[category];

        // Case insensitive match
        const found = Object.keys(categoryColors).find(k => k.toLowerCase() === category.toLowerCase());
        if (found) return categoryColors[found];

        // Default
        return categoryColors['Other'];
    };

    useEffect(() => {
        async function fetchData() {
            try {
                // Select * to ensure we get all available fields including start_date and description_of_purpose
                const { data, error } = await supabase
                    .from('contracts')
                    .select(`
                        *,
                        vendors (
                            vendor_name,
                            category
                        )
                    `)
                    .order('annual_value', { ascending: false, nullsFirst: false })
                    .limit(50); // Increased limit for better grouping

                if (error) throw error;
                setContracts(data || []);
            } catch (error) {
                console.error("Error fetching performance data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Grouping logic
    const groupedContracts = React.useMemo(() => {
        const groups: Record<string, any[]> = {};
        contracts.forEach(c => {
            const vName = Array.isArray(c.vendors) ? c.vendors[0]?.vendor_name : c.vendors?.vendor_name || 'Unknown Vendor';
            if (!groups[vName]) groups[vName] = [];
            groups[vName].push(c);
        });

        return Object.entries(groups)
            .map(([vendor, items]) => ({
                vendor,
                items,
                totalValue: items.reduce((sum, item) => sum + (item.annual_value || 0), 0),
                category: Array.isArray(items[0].vendors) ? items[0].vendors[0]?.category : items[0].vendors?.category
            }))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [contracts]);

    const toggleVendor = (e: React.MouseEvent, vendor: string) => {
        e.stopPropagation();
        setExpandedVendors(prev => ({ ...prev, [vendor]: !prev[vendor] }));
    };

    if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

    // Even if empty, show the headers so it doesn't look broken
    if (contracts.length === 0) return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2 border-l-4 border-blue-600 pl-4 py-1">
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">All District Contracts - Performance View</h3>
            </div>
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No data available</div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 border-l-4 border-blue-600 pl-4 py-1">
                <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">All District Contracts - Performance View</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete Contract Inventory Sorted by Annual Spend</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="pb-4 pl-4">Vendor Name</th>
                            <th className="pb-4">Category</th>
                            <th className="pb-4">Annual Value / Purpose</th>
                            <th className="pb-4">Start Date</th>
                            <th className="pb-4">Status</th>
                            <th className="pb-4">Confidence</th>
                            <th className="pb-4">Savings Opp</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {groupedContracts.map((group) => {
                            const isExpanded = expandedVendors[group.vendor];
                            const hasChildren = group.items.length > 1;
                            const mainContract = group.items[0]; // Representative for single items or main parent info

                            return (
                                <React.Fragment key={group.vendor}>
                                    <tr
                                        onClick={() => !hasChildren ? router.push(`/contracts/${mainContract.id}`) : null}
                                        className={`group hover:bg-slate-50 transition-colors ${!hasChildren ? 'cursor-pointer' : ''}`}
                                    >
                                        <td className="py-4 pl-4">
                                            <div className="flex items-center space-x-2">
                                                {hasChildren && (
                                                    <button
                                                        onClick={(e) => toggleVendor(e, group.vendor)}
                                                        className="p-2 -ml-2 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronDown size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
                                                    </button>
                                                )}
                                                <div className={`font-bold text-slate-900 text-xs text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px] ${!hasChildren ? 'pl-6' : ''}`}>
                                                    {group.vendor}
                                                    {hasChildren && <span className="ml-2 text-[9px] text-slate-400 font-normal">({group.items.length})</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${getCategoryStyle(group.category)}`}>
                                                {group.category || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <div className="font-black text-slate-900 text-xs">
                                                    ${group.totalValue.toLocaleString()}
                                                </div>
                                                {/* Show purpose for single items if value is 0 */}
                                                {!hasChildren && mainContract.annual_value === 0 && mainContract.description_of_purpose && (
                                                    <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 w-fit uppercase tracking-tighter">
                                                        {mainContract.description_of_purpose}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {hasChildren ? 'Multiple' : (mainContract.start_date ? new Date(mainContract.start_date).toLocaleDateString() : '—')}
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className={`
                                                inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide
                                                ${mainContract.status === 'active' ? 'bg-green-50 text-green-600' :
                                                    mainContract.status === 'expired' ? 'bg-red-50 text-red-600' :
                                                        'bg-slate-100 text-slate-500'}
                                            `}>
                                                {mainContract.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            {hasChildren ? (
                                                <span className="text-[10px] font-bold text-slate-400">—</span>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${(mainContract.confidence_score || 0) > 80 ? 'bg-green-500' :
                                                                (mainContract.confidence_score || 0) > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${mainContract.confidence_score || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400">{mainContract.confidence_score || 0}%</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4">
                                            <span className="text-[10px] font-bold text-green-500">—</span>
                                        </td>
                                    </tr>

                                    {/* Children Rows */}
                                    {hasChildren && isExpanded && group.items.map((contract) => (
                                        <tr
                                            key={contract.id}
                                            onClick={() => router.push(`/contracts/${contract.id}`)}
                                            className="bg-slate-50/50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                                        >
                                            <td className="py-3 pl-6 relative">
                                                {/* Tree Visuals - High Contrast */}
                                                <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-slate-400"></div>
                                                <div className="absolute left-10 top-1/2 w-6 h-0.5 bg-slate-400"></div>

                                                <div className="flex flex-col pl-12">
                                                    <span className="font-bold text-slate-700 text-[11px]">{contract.contract_number || contract.contract_name || "Untitled Contract"}</span>
                                                    <span className="text-[9px] text-slate-400">{contract.contract_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3"></td>
                                            <td className="py-3">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-slate-700 text-[11px]">
                                                        {(contract.annual_value && Number(contract.annual_value) > 0)
                                                            ? `$${Number(contract.annual_value).toLocaleString()}`
                                                            : '$0'}
                                                    </div>
                                                    {(!contract.annual_value || Number(contract.annual_value) === 0) && contract.description_of_purpose && (
                                                        <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-1 w-fit uppercase tracking-tighter">
                                                            P: {contract.description_of_purpose}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="text-[10px] font-medium text-slate-500">
                                                    {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : '—'}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className={`
                                                    inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide
                                                    ${contract.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        contract.status === 'expired' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-200 text-slate-600'}
                                                `}>
                                                    {contract.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${(contract.confidence_score || 0) > 80 ? 'bg-green-500' :
                                                                (contract.confidence_score || 0) > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${contract.confidence_score || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400">{contract.confidence_score || 0}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3"></td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
