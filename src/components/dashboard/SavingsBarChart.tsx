"use client";

import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { supabase } from '@/lib/supabase';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export function SavingsBarChart() {
    const [chartData, setChartData] = useState<any>(null);
    const [summary, setSummary] = useState({ total: 0, roi: "0.00" });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSavingsData() {
            try {
                const { data: negs, error: nError } = await supabase
                    .from('negotiations')
                    .select('status, potential_savings');

                const { data: realized, error: rError } = await supabase
                    .from('savings_realized')
                    .select('savings_amount');

                if (nError) throw nError;
                if (rError) throw rError;

                const statusMap: Record<string, number> = {
                    'identified': 0,
                    'in_progress': 0,
                    'vendor_contacted': 0,
                    'completed': 0
                };

                if (negs) {
                    negs.forEach(n => {
                        const status = n.status === 'completed' ? 'completed' : (n.status === 'identified' ? 'identified' : 'in_progress');
                        statusMap[status] = (statusMap[status] || 0) + Number(n.potential_savings || 0);
                    });
                }

                const realizedTotal = realized?.reduce((sum, r) => sum + Number(r.savings_amount), 0) || 0;

                const labels = ['Identified', 'In Negotiation', 'Realized', 'At Risk'];
                const values = [
                    statusMap['identified'],
                    statusMap['in_progress'],
                    realizedTotal,
                    320000 // Benchmark
                ];

                setChartData({
                    labels,
                    datasets: [
                        {
                            data: values,
                            backgroundColor: [
                                '#22D3EE', // Cyan
                                '#FBBF24', // Amber
                                '#4ADE80', // Green
                                '#F87171', // Red
                            ],
                        },
                    ],
                });

                const totalIdentified = (negs?.reduce((sum, n) => sum + Number(n.potential_savings), 0) || 0) + realizedTotal;
                setSummary({
                    total: totalIdentified,
                    roi: (totalIdentified / 125000).toFixed(2)
                });
            } catch (err: any) {
                console.error("SavingsBarChart fetch error:", err);
                setError(err.message || "Failed to fetch savings data");
            } finally {
                setIsLoading(false);
            }
        }
        fetchSavingsData();
    }, []);

    const options = {
        indexAxis: 'y' as const,
        elements: {
            bar: {
                borderWidth: 0,
                borderRadius: 4,
            },
        },
        responsive: true,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
            y: { grid: { display: false }, ticks: { font: { size: 9 } } }
        },
        maintainAspectRatio: false,
    };

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-2">
                    <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-64 flex flex-col items-center justify-center p-4 bg-red-50/50 rounded-2xl border border-red-50">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 text-center">Pipeline Unavailable</span>
                <span className="text-[9px] text-red-400 text-center">{error}</span>
            </div>
        );
    }

    if (!chartData) {
        return (
            <div className="h-64 flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No savings found</span>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <h3 className="text-sm font-black text-slate-900 border-l-4 border-yellow-500 pl-3 uppercase tracking-tighter mb-1">Savings Pipeline & Opportunities</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-4 mb-6">Identified savings across contract lifecycle</p>
            <div className="h-64">
                <Bar options={options} data={chartData} />
            </div>
            <div className="mt-4 bg-green-50 p-3 rounded-xl border border-green-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-green-800 uppercase tracking-tighter">
                        Total Identified Savings: ${summary.total.toLocaleString()}
                    </span>
                </div>
                <span className="text-[10px] text-green-600 font-bold italic">ROI Impact: ${summary.roi} per $1 invested</span>
            </div>
        </div>
    );
}
