"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export function TotalContractsChart() {
    const router = useRouter();
    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [growth, setGrowth] = useState(0);

    useEffect(() => {
        async function fetchData() {
            try {
                const { data, error } = await supabase
                    .from('contracts')
                    .select('start_date, status')
                    .order('start_date', { ascending: true });

                if (error) throw error;

                if (!data || data.length === 0) {
                    setChartData(null);
                    return;
                }

                // Process data for cumulative growth
                const monthMap: { [key: string]: number } = {};
                let cumulative = 0;

                // Initialize with some data points if needed or just use actuals
                data.forEach(c => {
                    if (!c.start_date) return;
                    const date = new Date(c.start_date);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
                    monthMap[key] = (monthMap[key] || 0) + 1;
                });

                const sortedMonths = Object.keys(monthMap).sort();
                const labels: string[] = [];
                const values: number[] = [];

                // Basic cumulative calc
                sortedMonths.forEach(month => {
                    cumulative += monthMap[month];
                    // Format Label: "Jan 24"
                    const [y, m] = month.split('-');
                    const date = new Date(Number(y), Number(m) - 1);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
                    values.push(cumulative);
                });

                // Calculate Last Month Growth %
                const total = values[values.length - 1];
                const prev = values.length > 1 ? values[values.length - 2] : 0;
                const percentGrowth = prev > 0 ? ((total - prev) / prev) * 100 : 100;
                setGrowth(percentGrowth);

                setChartData({
                    labels,
                    datasets: [
                        {
                            label: 'Total Contracts',
                            data: values,
                            fill: true,
                            backgroundColor: (context: any) => {
                                const ctx = context.chart.ctx;
                                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                                gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
                                gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                                return gradient;
                            },
                            borderColor: '#3B82F6',
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                        },
                    ],
                });

            } catch (error) {
                console.error("Error fetching contracts history:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;
    if (!chartData) return <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center px-4">No contract history available. Add start dates to contracts.</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <TrendingUp size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Growth</span>
                </div>
                <span className="text-xs font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    +{growth.toFixed(1)}% Last Month
                </span>
            </div>

            <div className="flex-1 w-full min-h-[200px]">
                <Line
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: () => router.push('/contracts'),
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                intersect: false,
                                backgroundColor: '#1E293B',
                                padding: 12,
                                titleFont: { size: 12, weight: 'bold' },
                                bodyFont: { size: 12 },
                                displayColors: false,
                                callbacks: {
                                    label: (ctx) => `${ctx.parsed.y} Contracts`
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: {
                                    font: { size: 10 },
                                    maxTicksLimit: 6,
                                    maxRotation: 0
                                }
                            },
                            y: {
                                grid: { color: '#F1F5F9' },
                                ticks: {
                                    font: { size: 10 },
                                    stepSize: 5
                                },
                                border: { display: false }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        }
                    }}
                />
            </div>
        </div>
    );
}
