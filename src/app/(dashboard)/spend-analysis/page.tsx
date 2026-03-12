"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useDistrictContext } from "@/lib/DistrictContext";
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    PieChart,
    Loader2
} from "lucide-react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useRouter } from "next/navigation";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

export default function SpendAnalysisPage() {
    const router = useRouter();
    const { activeDistrict } = useDistrictContext();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSpend: 0,
        avgContractValue: 0,
        topVendor: "N/A",
        topCategory: "N/A"
    });
    const [vendorData, setVendorData] = useState<any>(null);
    const [categoryData, setCategoryData] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            if (!activeDistrict?.id) return;
            setIsLoading(true);
            try {
                const { data: contracts, error } = await supabase
                    .from('contracts')
                    .select(`
                        annual_value,
                        contract_name,
                        vendors (
                            vendor_name,
                            category
                        )
                    `)
                    .eq('district_id', activeDistrict.id);

                if (error) throw error;

                if (!contracts) return;

                // Process Data
                let totalSpend = 0;
                const vendorMap: { [key: string]: number } = {};
                const categoryMap: { [key: string]: number } = {};

                contracts.forEach((c: any) => {
                    const val = Number(c.annual_value) || 0;
                    totalSpend += val;

                    const vendorName = Array.isArray(c.vendors) ? c.vendors[0]?.vendor_name : c.vendors?.vendor_name || "Unknown";
                    const category = Array.isArray(c.vendors) ? c.vendors[0]?.category : c.vendors?.category || "Uncategorized";

                    vendorMap[vendorName] = (vendorMap[vendorName] || 0) + val;
                    categoryMap[category] = (categoryMap[category] || 0) + val;
                });

                // Sort and Prepare Top Lists
                const sortedVendors = Object.entries(vendorMap).sort((a, b) => b[1] - a[1]);
                const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

                setStats({
                    totalSpend,
                    avgContractValue: totalSpend / (contracts.length || 1),
                    topVendor: sortedVendors[0]?.[0] || "N/A",
                    topCategory: sortedCategories[0]?.[0] || "N/A"
                });

                // Chart Data - Top 10 Vendors
                const top10Vendors = sortedVendors.slice(0, 10);
                setVendorData({
                    labels: top10Vendors.map(v => v[0]),
                    datasets: [{
                        label: 'Annual Spend',
                        data: top10Vendors.map(v => v[1]),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue 500
                        borderRadius: 4,
                        barThickness: 20, // Reduced thickness
                    }]
                });

                // Chart Data - Categories
                setCategoryData({
                    labels: sortedCategories.map(c => c[0]),
                    datasets: [{
                        data: sortedCategories.map(c => c[1]),
                        backgroundColor: [
                            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'
                        ],
                        borderWidth: 0,
                    }]
                });

            } catch (err) {
                console.error("Error fetching spend analysis:", err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [activeDistrict?.id]);

    const handleVendorClick = (_: any, elements: any[]) => {
        if (!elements.length || !vendorData) return;
        const index = elements[0].index;
        const vendorName = vendorData.labels[index];
        router.push(`/contracts?search=${encodeURIComponent(vendorName)}`);
    };

    const handleCategoryClick = (_: any, elements: any[]) => {
        if (!elements.length || !categoryData) return;
        const index = elements[0].index;
        const categoryName = categoryData.labels[index];
        router.push(`/contracts?category=${encodeURIComponent(categoryName)}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 size={48} className="animate-spin text-blue-600" />
                    <p className="text-slate-500 font-bold">Analyzing Spend Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Spend Analysis</h1>
                <p className="text-slate-500 mt-1 font-medium">Deep dive into vendor spending and category distribution.</p>
            </header>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Total Annual Spend", value: `$${(stats.totalSpend / 1000000).toFixed(1)}M`, icon: DollarSign, color: "text-green-600 bg-green-50" },
                    { label: "Avg Contract Value", value: `$${Math.round(stats.avgContractValue).toLocaleString()}`, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
                    { label: "Top Vendor", value: stats.topVendor, icon: BarChart3, color: "text-purple-600 bg-purple-50" },
                    { label: "Top Category", value: stats.topCategory, icon: PieChart, color: "text-orange-600 bg-orange-50" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-4">
                        <div className={`p-3 rounded-xl ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900 mt-1">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Bar Chart: Top Vendors */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                            <BarChart3 size={20} className="text-blue-500" />
                            <span>Top Vendors by Spend</span>
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Click bar to view contracts</span>
                    </div>
                    <div className="h-[400px]">
                        {vendorData && (
                            <Bar
                                data={vendorData}
                                options={{
                                    indexAxis: 'y', // Horizontal bars
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    onClick: handleVendorClick,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(ctx.parsed.x))
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: (value) => '$' + Number(value).toLocaleString(),
                                                font: {
                                                    size: 10
                                                }
                                            },
                                            grid: { color: '#f1f5f9' }
                                        },
                                        y: {
                                            grid: { display: false },
                                            ticks: {
                                                font: {
                                                    weight: 'bold',
                                                    size: 11
                                                }
                                            }
                                        }
                                    },
                                    onHover: (event: any, chartElement: any) => {
                                        if (event.native && event.native.target) {
                                            event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Pie Chart: Spend by Category */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                            <PieChart size={20} className="text-purple-500" />
                            <span>Spend by Category</span>
                        </h3>
                    </div>
                    <div className="h-[300px] flex items-center justify-center">
                        {categoryData && (
                            <Doughnut
                                data={categoryData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    onClick: handleCategoryClick,
                                    plugins: {
                                        legend: { position: 'bottom' },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => {
                                                    const val = ctx.parsed;
                                                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
                                                }
                                            }
                                        }
                                    },
                                    onHover: (event: any, chartElement: any) => {
                                        if (event.native && event.native.target) {
                                            event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                    <div className="text-center mt-4">
                        <p className="text-xs text-slate-400 font-bold">Click segment to filter contracts</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
