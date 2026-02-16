"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    LayoutDashboard,
    FileText,
    Users,
    Building2,
    TrendingUp,
    Settings,
    LogOut,
    Shield
} from "lucide-react";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);
    const [supportEmail, setSupportEmail] = useState("support@fortify.app");
    const supabase = createClient();

    useEffect(() => {
        async function checkRole() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Update last_login on every dashboard visit
                await supabase
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', user.id);

                const { data } = await supabase
                    .from('users')
                    .select('role, district_id')
                    .eq('id', user.id)
                    .single();

                if (data?.role === 'super_admin' || data?.role === 'district_admin') {
                    setIsAdmin(true);
                }

                if (data?.district_id) {
                    const { data: district } = await supabase
                        .from('districts')
                        .select('settings_json')
                        .eq('id', data.district_id)
                        .single();

                    if (district?.settings_json?.support_email) {
                        setSupportEmail(district.settings_json.support_email);
                    }
                }
            }
        }
        checkRole();
    }, [supabase]);

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
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Enterprise Plan</p>
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
