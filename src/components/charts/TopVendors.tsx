"use client";

import React from 'react';
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

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface TopVendorsProps {
    data: { vendor: string; amount: number }[];
}

export default function TopVendors({ data }: TopVendorsProps) {
    const sortedData = [...data].sort((a, b) => b.amount - a.amount).slice(0, 5); // Top 5

    const chartData = {
        labels: sortedData.map(d => d.vendor),
        datasets: [
            {
                label: 'Annual Spend ($)',
                data: sortedData.map(d => d.amount),
                backgroundColor: '#3B82F6', // Blue-500
                borderRadius: 4,
            },
        ],
    };

    const options = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.x !== null) {
                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.x);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false, // Cleaner look
                },
                ticks: {
                    callback: function (value: any) {
                        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact" }).format(value);
                    }
                }
            },
            y: {
                grid: {
                    display: false,
                }
            }
        }
    };

    return <Bar data={chartData} options={options} />;
}
