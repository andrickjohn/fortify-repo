"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { DistrictProvider, useDistrictContext } from "@/lib/DistrictContext";
import type { District } from "@/lib/DistrictContext";
import {
    LayoutDashboard,
    FileText,
    Users,
    Building2,
    TrendingUp,
    Settings,
    LogOut,
    ChevronDown,
    Check,
    Globe,
    Shield
} from "lucide-react";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DistrictProvider>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </DistrictProvider>
    );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const supabase = createClient();
    const {
        activeDistrict,
        setActiveDistrict,
        allDistricts,
        isSuperAdmin,
        isLoading: districtLoading,
    } = useDistrictContext();

    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    const supportEmail = activeDistrict?.settings_json?.support_email || "support@fortify.app";

    const menuItems = [
        { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { name: "Contracts", icon: FileText, href: "/contracts" },
        { name: "Vendors", icon: Building2, href: "/vendors" },
        { name: "Negotiations", icon: Users, href: "/negotiations" },
        { name: "Savings", icon: TrendingUp, href: "/savings" },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const handleSwitchDistrict = (district: District) => {
        setActiveDistrict(district);
        setIsSwitcherOpen(false);
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-100 flex flex-col">
                <div className="p-8 pb-6">
                    <Link href="/dashboard" className="flex items-center">
                        <div className="relative w-48 h-12">
                            <Image
                                src="/Fortify Logo.png"
                                alt="Fortify Logo"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>
                </div>

                {/* District Hierarchy — Super Admin Only */}
                {isSuperAdmin && (
                    <div className="px-6 mb-4 space-y-3">
                        {/* Super Admin Role Badge */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                                <Shield size={14} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Super Admin</p>
                                <p className="text-[10px] text-amber-600 font-medium">
                                    {allDistricts.length} district{allDistricts.length !== 1 ? "s" : ""} · Full access
                                </p>
                            </div>
                        </div>

                        {/* Active District Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center space-x-3 min-w-0">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-40" />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Active District</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">
                                            {activeDistrict?.name || "Select District..."}
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-indigo-400 transition-transform flex-shrink-0 ${isSwitcherOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {isSwitcherOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsSwitcherOpen(false)}
                                    />
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                                        <div className="p-2">
                                            <div className="px-3 py-2 flex items-center gap-2">
                                                <Globe size={12} className="text-indigo-400" />
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Switch District</span>
                                            </div>
                                            {allDistricts.map((district) => (
                                                <button
                                                    key={district.id}
                                                    onClick={() => handleSwitchDistrict(district)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                                                        activeDistrict?.id === district.id
                                                            ? "bg-indigo-50 text-indigo-700"
                                                            : "hover:bg-slate-50 text-slate-700"
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold truncate">{district.name}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {district.enrollment_current?.toLocaleString() || "—"} students
                                                        </p>
                                                    </div>
                                                    {activeDistrict?.id === district.id && (
                                                        <Check size={16} className="text-indigo-600 flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <nav className="flex-1 px-6 space-y-1 mt-4">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${pathname.startsWith(item.href)
                                ? "bg-blue-50 text-blue-600 font-bold shadow-sm shadow-blue-100"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <item.icon size={20} className={pathname.startsWith(item.href) ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-6 mt-auto border-t border-slate-50">
                    <Link
                        href="/settings"
                        className="flex items-center space-x-3 px-4 py-3 text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-600 transition-colors mt-1"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>

                    <div className="mt-8 bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                {activeDistrict?.subscription_tier?.toUpperCase() || "Enterprise"} Plan
                            </p>
                            <p className="text-sm font-bold mt-1">Priority Support</p>
                            <a href={`mailto:${supportEmail}?subject=Support Request`} className="mt-3 inline-block bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                Contact Support
                            </a>
                        </div>
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 bg-blue-600/20 blur-2xl group-hover:bg-blue-600/30 transition-all rounded-full" />
                    </div>

                    <div className="mt-4 text-[10px] text-slate-300 font-mono text-center select-none">
                        v0.1.0
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
