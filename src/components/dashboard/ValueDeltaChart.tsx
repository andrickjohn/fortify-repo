"use client";

import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
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

export function ValueDeltaChart() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 6,
                    font: { weight: 'bold' as const, size: 10 }
                }
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            }
        },
        elements: {
            line: {
                tension: 0.4,
            },
            point: {
                radius: 0,
            }
        }
    };

    const labels = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];

    const data = {
        labels,
        datasets: [
            {
                label: 'Total Contract Spend',
                data: [100, 105, 115, 125, 132, 145, 155],
                borderColor: '#2563EB',
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.1)');
                    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
                    return gradient;
                },
                borderWidth: 3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#2563EB',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            },
            {
                label: 'Student Enrollment (indexed)',
                data: [100, 99, 97, 96, 95, 94, 93],
                borderColor: '#F97316',
                backgroundColor: 'rgba(249, 115, 22, 0.05)',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0,
            },
        ],
    };

    if (!mounted) return <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl" />;

    return (
        <div className="h-full w-full">
            <Line options={options} data={data} />
        </div>
    );
}
