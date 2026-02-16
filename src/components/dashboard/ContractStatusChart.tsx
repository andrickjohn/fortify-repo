"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, getElementAtEvent } from 'react-chartjs-2';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

ChartJS.register(ArcElement, Tooltip, Legend);

export function ContractStatusChart() {
    const router = useRouter();
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            try {
                const { data, error } = await supabase
                    .from('contracts')
                    .select('status');

                if (error) throw error;

                // Aggregate by status
                const statusCounts: { [key: string]: number } = {};
                data?.forEach((contract: any) => {
                    // Normalize status formatting if needed (e.g. capitalized)
                    const status = contract.status || "Unknown";
                    statusCounts[status] = (statusCounts[status] || 0) + 1;
                });

                const labels = Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '));
                const values = Object.values(statusCounts);
                const rawLabels = Object.keys(statusCounts); // Keep raw for navigation

                setChartData({
                    labels,
                    rawLabels,
                    datasets: [
                        {
                            data: values,
                            backgroundColor: [
                                '#3B82F6', // Blue 500
                                '#10B981', // Emerald 500
                                '#F59E0B', // Amber 500
                                '#EF4444', // Red 500
                                '#8B5CF6', // Violet 500
                                '#6366F1', // Indigo 500
                                '#64748B', // Slate 500
                            ],
                            borderWidth: 0,
                        },
                    ],
                });

            } catch (error) {
                console.error("Error fetching contract status data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const { current: chart } = chartRef;
        if (!chart) return;

        const element = getElementAtEvent(chart, event);
        if (!element.length) return;

        const { index } = element[0];
        // Use raw label for filter logic
        const status = chartData.rawLabels[index];

        // Navigate to contracts page with status filter
        router.push(`/contracts?status=${encodeURIComponent(status)}`);
    };

    if (loading) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;
    }

    if (!chartData || chartData.labels.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No contract data available</div>;
    }

    return (
        <div className="h-64 flex items-center justify-center">
            <Doughnut
                ref={chartRef}
                data={chartData}
                onClick={onClick}
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right' as const,
                            labels: {
                                boxWidth: 10,
                                usePointStyle: true,
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 11,
                                    weight: 'bold'
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context: any) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed + ' Contracts';
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    cutout: '75%',
                    onHover: (event: any, chartElement: any) => {
                        if (event.native && event.native.target) {
                            event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                        }
                    }
                }}
            />
        </div>
    );
}
