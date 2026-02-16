"use client";

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SpendByCategoryProps {
    data: { [category: string]: number };
}

export default function SpendByCategory({ data }: SpendByCategoryProps) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Spend ($)',
                data: values,
                backgroundColor: [
                    '#3B82F6', // Blue-500
                    '#10B981', // Emerald-500
                    '#F59E0B', // Amber-500
                    '#EF4444', // Red-500
                    '#8B5CF6', // Violet-500
                    '#64748B', // Slate-500
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 20,
                    font: {
                        size: 11
                    }
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
                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                        }
                        return label;
                    }
                }
            }
        },
        cutout: '60%',
        maintainAspectRatio: false,
    };

    return <Doughnut data={chartData} options={options} />;
}
