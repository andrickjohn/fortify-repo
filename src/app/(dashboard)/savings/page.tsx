"use client";

import React from "react";
import { TrendingUp, Download } from "lucide-react";

export default function SavingsPage() {
    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Savings & Optimization</h1>
                    <p className="text-slate-500 mt-1">Real-time tracking of cost reduction and Value Delta improvements.</p>
                </div>
                <button className="bg-white text-slate-600 px-6 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors flex items-center space-x-2">
                    <Download size={20} />
                    <span>Export Report</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-slate-900">Savings Timeline</h3>
                        <div className="flex space-x-2">
                            {['1M', '3M', '6M', '1Y'].map(t => (
                                <button key={t} className="px-3 py-1 text-xs font-bold rounded-lg hover:bg-slate-50 text-slate-400">{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="h-64 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400 italic">Financial data visualization loading...</p>
                    </div>
                </div>

                <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 flex flex-col justify-between">
                    <div>
                        <TrendingUp size={32} className="mb-4" />
                        <h3 className="text-xl font-bold">Total Savings Realized</h3>
                        <p className="text-blue-100 text-sm mt-1">Year-to-date performance</p>
                    </div>
                    <div>
                        <span className="text-4xl font-black">$0.00</span>
                        <p className="text-xs text-blue-200 font-bold mt-2 uppercase tracking-widest">Goal: $1,200,000</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
