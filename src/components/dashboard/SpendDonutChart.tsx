"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartEvent, ActiveElement } from 'chart.js';
import { Doughnut, getElementAtEvent } from 'react-chartjs-2';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

ChartJS.register(ArcElement, Tooltip, Legend);

export function SpendDonutChart() {
    const router = useRouter();
    const supabase = createClient();
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch contracts with vendor info
                const { data, error } = await supabase
                    .from('contracts')
                    .select(`
            annual_value,
            vendors (
              category
            )
          `);

                if (error) throw error;

                // Aggregate by category
                const categoryTotals: { [key: string]: number } = {};
                data?.forEach((contract: any) => {
                    const category = Array.isArray(contract.vendors)
                        ? contract.vendors[0]?.category
                        : contract.vendors?.category || "Uncategorized";
                    const value = Number(contract.annual_value) || 0;
                    categoryTotals[category] = (categoryTotals[category] || 0) + value;
                });

                const labels = Object.keys(categoryTotals);
                const values = Object.values(categoryTotals);

                setChartData({
                    labels,
                    datasets: [
                        {
                            data: values,
                            backgroundColor: [
                                '#3B82F6', // Blue 500
                                '#10B981', // Emerald 500
                                '#F59E0B', // Amber 500
                                '#6366F1', // Indigo 500
                                '#EC4899', // Pink 500
                                '#8B5CF6', // Violet 500
                                '#64748B', // Slate 500
                            ],
                            borderWidth: 0,
                        },
                    ],
                });

            } catch (error) {
                console.error("Error fetching spend data:", error);
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
        const category = chartData.labels[index];

        // Navigate to contracts page with category filter
        router.push(`/contracts?category=${encodeURIComponent(category)}`);
    };

    if (loading) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;
    }

    if (!chartData || chartData.labels.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No spend data available</div>;
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
                                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(context.parsed);
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    cutout: '75%',
                    onHover: (event: any, chartElement: any) => {
                        // Change cursor to pointer if hovering over a segment
                        if (event.native && event.native.target) {
                            event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                        }
                    }
                }}
            />
        </div>
    );
}
