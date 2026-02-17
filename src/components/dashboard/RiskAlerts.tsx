"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export function RiskAlerts() {
    const supabase = createClient();
    const [counts, setCounts] = useState({
        expired: 0,
        expiring: 0,
        savings: 0,
        savingsAmount: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchRiskData() {
            try {
                const now = new Date().toISOString().split('T')[0];
                const in90Days = new Date();
                in90Days.setDate(in90Days.getDate() + 90);
                const in90DaysStr = in90Days.toISOString().split('T')[0];

                const { data: contracts, error: cError } = await supabase
                    .from('contracts')
                    .select('status, end_date, annual_value');

                const { data: negs, error: nError } = await supabase
                    .from('negotiations')
                    .select('potential_savings');

                if (cError) throw cError;
                if (nError) throw nError;

                if (contracts) {
                    const expired = contracts.filter(c => c.status === 'expired' || (c.end_date && c.end_date < now)).length;
                    const expiring = contracts.filter(c =>
                        c.status === 'active' &&
                        c.end_date &&
                        c.end_date >= now &&
                        c.end_date <= in90DaysStr
                    ).length;

                    const savingsAmount = negs?.reduce((sum, n) => sum + (Number(n.potential_savings) || 0), 0) || 0;

                    setCounts({
                        expired,
                        expiring,
                        savings: negs?.length || 0,
                        savingsAmount
                    });
                }
            } catch (err: any) {
                console.error("RiskAlerts fetch error:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchRiskData();
    }, []);

    if (isLoading) {
        return <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
        </div>;
    }

    if (error) {
        return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 italic">
            Alerts Sync Failed: {error}
        </div>;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-l-4 border-red-500 pl-3 flex items-center space-x-2">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="uppercase tracking-tighter">Critical Risk Alerts</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-4">Immediate attention required</p>

            <div className="space-y-3">
                {/* Expired Contracts */}
                <Link href="/contracts?status=expired">
                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-center justify-between group hover:bg-red-50 transition-all cursor-pointer mb-3">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600 group-hover:scale-110 transition-transform">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 leading-none">{counts.expired} Contracts Expired</h4>
                                <p className="text-[10px] text-slate-500 mt-1 font-medium">Operating without valid agreements</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-black text-red-600 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm">High Risk</span>
                            <ChevronRight size={14} className="text-red-300 group-hover:text-red-500 transition-colors" />
                        </div>
                    </div>
                </Link>

                {/* Expiring Soon */}
                <Link href="/contracts?status=expiring">
                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex items-center justify-between group hover:bg-orange-50 transition-all cursor-pointer mb-3">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600 group-hover:scale-110 transition-transform">
                                <Clock size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 leading-none">{counts.expiring} Contracts Expiring soon</h4>
                                <p className="text-[10px] text-slate-500 mt-1 font-medium">Requires renewal negotiation (90 day window)</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm">Action Needed</span>
                            <ChevronRight size={14} className="text-orange-300 group-hover:text-orange-500 transition-colors" />
                        </div>
                    </div>
                </Link>

                {/* Savings Identified */}
                <Link href="/negotiations">
                    <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex items-center justify-between group hover:bg-green-50 transition-all cursor-pointer">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600 group-hover:scale-110 transition-transform">
                                <TrendingUp size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 leading-none">${(counts.savingsAmount / 1000).toFixed(0)}K Savings Identified</h4>
                                <p className="text-[10px] text-slate-500 mt-1 font-medium">{counts.savings} contracts with optimization opportunities</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm">Opportunity</span>
                            <ChevronRight size={14} className="text-green-300 group-hover:text-green-500 transition-colors" />
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
