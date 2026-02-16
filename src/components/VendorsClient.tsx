"use client";

import React, { useState, useEffect } from "react";
import { Building2, Search, Filter } from "lucide-react";
import Link from "next/link";
import SpendByCategory from "@/components/charts/SpendByCategory";
import TopVendors from "@/components/charts/TopVendors";

interface Vendor {
    id: string;
    vendor_name: string;
    category: string;
    spend: number;
    contractCount: number;
    singleContractId?: string; // New field
}

interface VendorsClientProps {
    vendors: Vendor[];
    categorySpend: { [key: string]: number };
    topVendors: { vendor: string; amount: number }[];
}

export default function VendorsClient({ vendors, categorySpend, topVendors }: VendorsClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>(vendors);

    useEffect(() => {
        setFilteredVendors(
            vendors.filter(v =>
                v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm, vendors]);

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vendors</h1>
                    <p className="text-slate-500 mt-1">Manage your school district vendor relationships and performance.</p>
                </div>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
                    Add Vendor
                </button>
            </header>

            {/* Analytics Section */}
            {vendors.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Spend by Category</h3>
                        <div className="h-64 flex justify-center">
                            <SpendByCategory data={categorySpend} />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Top Vendors by Spend</h3>
                        <div className="h-64">
                            <TopVendors data={topVendors} />
                        </div>
                    </div>
                </div>
            )}

            {/* Vendor List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="relative w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        />
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors font-medium">
                        <Filter size={18} />
                        <span>Filters</span>
                    </button>
                </div>

                {filteredVendors.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 size={32} />
                        </div>
                        <p className="font-medium text-slate-600">No vendors found</p>
                        <p className="text-sm">Start by uploading a contract to automatically extract vendor data.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Vendor Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-center">Active Contracts</th>
                                <th className="px-6 py-4 text-right">Total Spend</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredVendors.map((vendor) => (
                                <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900">{vendor.vendor_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${vendor.category === 'software' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            vendor.category === 'services' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {vendor.category.charAt(0).toUpperCase() + vendor.category.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-slate-600">
                                        {vendor.contractCount}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-700 font-medium">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(vendor.spend)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={
                                                vendor.contractCount === 1 && vendor.singleContractId
                                                    ? `/contracts/${vendor.singleContractId}`
                                                    : `/contracts?search=${encodeURIComponent(vendor.vendor_name)}`
                                            }
                                        >
                                            <button className="text-blue-600 hover:text-blue-800 font-bold text-xs">View Data</button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
