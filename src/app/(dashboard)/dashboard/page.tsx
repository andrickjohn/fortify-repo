"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDistrictContext } from "@/lib/DistrictContext";
import { motion } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
    Settings2,
    X,
    Eye,
    EyeOff,
    Save,
    GripVertical,
    BarChart3,

    Building2,
    Users,
    Hash,
    School,
    MapPin,
    PieChart
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from "@dnd-kit/sortable";
import { DashboardWidget, DashboardWidgetBase } from "@/components/dashboard/DashboardWidget";
import { RiskAlerts } from "@/components/dashboard/RiskAlerts";
import { SpendDonutChart } from "@/components/dashboard/SpendDonutChart";
import { SavingsBarChart } from "@/components/dashboard/SavingsBarChart";
import { PerformanceTable } from "@/components/dashboard/PerformanceTable";
import { ContractStatusChart } from "@/components/dashboard/ContractStatusChart";


export default function Dashboard() {
    const supabase = createClient();
    const { activeDistrict, isSuperAdmin } = useDistrictContext();
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [widgets, setWidgets] = useState([
        { id: "risk-alerts", title: "Critical Risk Alerts", visible: true, size: 2 },
        { id: "contract-status", title: "Contract Status", visible: true, size: 1 },
        { id: "spend-donut", title: "Spend by Category", visible: true, size: 1 },
        { id: "savings-bar", title: "Savings Pipeline", visible: true, size: 2 },
        { id: "performance-table", title: "Performance Inventory", visible: true, size: 3 },
    ]);

    // Helper to render widget content to avoid repetition in Overlay
    const renderWidgetContent = (id: string) => {
        switch (id) {
            case "risk-alerts": return <RiskAlerts />;
            case "contract-status": return <ContractStatusChart />;
            case "spend-donut": return <SpendDonutChart />;
            case "savings-bar": return <SavingsBarChart />;
            case "performance-table": return <PerformanceTable />;
            default: return null;
        }
    };

    const [stats, setStats] = useState({
        totalContracts: 0,
        expiredContracts: 0,
        totalSpend: 0,
        activeVendors: 0
    });

    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        async function fetchDashboardData() {
            if (!activeDistrict?.id) return;
            setIsLoading(true);
            setFetchError(null);
            try {
                // Fetch contracts for stats — scoped to active district
                const { data: contracts, error: cError } = await supabase
                    .from('contracts')
                    .select('status, annual_value')
                    .eq('district_id', activeDistrict.id);

                if (cError) throw cError;

                // Fetch vendor count — scoped to active district
                const { count: vendorCount, error: vError } = await supabase
                    .from('vendors')
                    .select('*', { count: 'exact', head: true })
                    .eq('district_id', activeDistrict.id);

                if (vError) throw vError;

                // Fetch user dashboard config
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('dashboard_config')
                        .eq('id', user.id)
                        .single();

                    if (profile) {

                        // Load saved widget configuration if present
                        if (profile.dashboard_config && Array.isArray(profile.dashboard_config) && profile.dashboard_config.length > 0) {
                            // Merge with default widgets to ensure new features appear
                            const savedConfig = profile.dashboard_config;
                            // Create a map of saved widgets for easy lookup
                            const savedMap = new Map(savedConfig.map((w: any) => [w.id, w]));

                            // Start with saved order, but filter out removed widgets
                            const mergedWidgets = savedConfig.filter((w: any) =>
                                widgets.some(def => def.id === w.id)
                            ).map((w: any) => ({
                                ...widgets.find(def => def.id === w.id)!, // Get latest metadata (title, etc)
                                ...w // Override with saved settings (visible, size)
                            }));

                            // Append any new widgets that weren't in saved config
                            widgets.forEach(def => {
                                if (!savedMap.has(def.id)) {
                                    mergedWidgets.push(def);
                                }
                            });

                            setWidgets(mergedWidgets);
                        }
                    }
                }

                if (contracts) {
                    const totalSpend = contracts.reduce((sum: number, c: any) => sum + (Number(c.annual_value) || 0), 0);
                    const expiredCount = contracts.filter((c: any) => c.status === 'expired').length;

                    setStats({
                        totalContracts: contracts.length,
                        expiredContracts: expiredCount,
                        totalSpend: totalSpend,
                        activeVendors: vendorCount || 0
                    });
                }
            } catch (err: any) {
                console.error("Dashboard stats fetch error:", err);
                setFetchError(err.message || "Connection to Supabase failed");
            } finally {
                setIsLoading(false);
            }
        }

        fetchDashboardData();
    }, [supabase, activeDistrict?.id]);

    // Save configuration to DB whenever widgets change
    useEffect(() => {
        if (!mounted) return;

        const saveConfig = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                await supabase
                    .from('users')
                    .update({ dashboard_config: widgets })
                    .eq('id', user.id);
            } catch (err) {
                console.error("Failed to save dashboard config:", err);
            }
        };

        // Debounce save to avoid too many requests during drag
        const timer = setTimeout(saveConfig, 1000);
        return () => clearTimeout(timer);
    }, [widgets, mounted, supabase]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Require slightly less movement to start drag
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSizeChange = (id: string, size: 1 | 2 | 3) => {
        setWidgets((prev) => {
            return prev.map(w => w.id === id ? { ...w, size } : w);
        });
    };

    return (
        <div className="min-h-screen bg-white">
            {/* MVP Dark Blue Header */}
            <header className="bg-[#2563EB] text-white p-8 relative overflow-hidden">
                <div className="relative z-10 flex items-center space-x-3 mb-2">
                    <BarChart3 className="text-blue-200" size={24} />
                    <h1 className="text-2xl font-black tracking-tight uppercase">Contract Intelligence Dashboard</h1>
                </div>
                <p className="text-blue-100 text-xs font-medium tracking-wide">
                    {activeDistrict?.name || "Loading..."} - Real-time Contract Performance & Efficiency Analysis
                </p>


                {/* District Info Strip */}
                <div className="grid grid-cols-5 gap-4 mt-8">
                    {[
                        { label: "District Type", value: activeDistrict?.settings_json?.district_type || "Unified K-12", icon: Building2 },
                        { label: "Enrollment", value: activeDistrict?.enrollment_current ? Number(activeDistrict.enrollment_current).toLocaleString() : "0", icon: Users },
                        { label: "Total Staff", value: activeDistrict?.settings_json?.total_staff || "0", icon: Hash },
                        { label: "School Sites", value: activeDistrict?.settings_json?.school_sites || "0", icon: School },
                        { label: "County", value: activeDistrict?.settings_json?.county || "—", icon: MapPin },
                    ].map((item, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                            <h3 className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-1">{item.label}</h3>
                            <div className="text-lg font-black">{item.value}</div>
                        </div>
                    ))}
                </div>
            </header>

            <div className="p-8 space-y-8 bg-[#F8FAFC]">
                {/* Secondary Header with Configuration */}
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-6 relative group">
                    {/* Stats Group */}
                    <div className="flex flex-1 items-center space-x-12 min-w-0">
                        {fetchError ? (
                            <div className="flex items-center space-x-3 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                                <span className="text-red-600 font-black text-xs uppercase">Sync Error:</span>
                                <span className="text-red-400 text-[10px] font-bold">{fetchError}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col items-start border-r border-slate-100 pr-12 shrink-0">
                                    <span className="text-4xl font-black text-slate-900 leading-none">
                                        {isLoading ? "..." : stats.totalContracts}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Total Contracts</span>
                                    <span className="mt-2 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                        {stats.expiredContracts} Expired
                                    </span>
                                </div>
                                <div className="flex items-center space-x-12 min-w-0">
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Spend</span>
                                        <span className="text-xl font-black text-slate-900">
                                            {isLoading ? "..." : `$${(stats.totalSpend / 1000000).toFixed(1)}M`}
                                        </span>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Active Vendors</span>
                                        <span className="text-xl font-black text-slate-900">
                                            {isLoading ? "..." : stats.activeVendors}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions Group */}
                    <div className="flex items-center space-x-4 shrink-0">
                        <button
                            onClick={() => setIsConfiguring(true)}
                            className="flex items-center space-x-2 bg-white border border-slate-200 px-5 py-3 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                        >
                            <Settings2 size={18} />
                            <span className="text-sm">Customize Dashboard</span>
                        </button>

                        <div className="bg-slate-50 border border-slate-100 p-2 rounded-2xl flex items-center space-x-6 px-8 h-14">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Efficiency</span>
                                <span className="text-xl font-black text-green-600 leading-none">84.2%</span>
                            </div>
                            <div className="h-8 w-[1px] bg-slate-200" />
                            <div className="text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Health</div>
                                <div className="text-xs font-black text-slate-900 uppercase tracking-tighter">Optimal</div>
                            </div>
                        </div>
                    </div>
                </div>

                {!mounted ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-2xl h-64 border border-slate-100" />
                        ))}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={(event) => setActiveId(event.active.id as string)}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => setActiveId(null)}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <SortableContext
                                items={widgets.map(w => w.id)}
                                strategy={rectSortingStrategy}
                            >
                                {widgets.filter(w => w.visible).map((widget) => (
                                    <div
                                        key={widget.id}
                                        className={
                                            (widget.size === 3 ? "lg:col-span-3 " :
                                                widget.size === 2 ? "lg:col-span-2 " :
                                                    "lg:col-span-1 ") + "h-full"
                                        }
                                    >
                                        <DashboardWidget
                                            id={widget.id}
                                            title={widget.title}
                                            isConfiguring={isConfiguring}
                                            size={widget.size as 1 | 2 | 3}
                                            onSizeChange={(s) => handleSizeChange(widget.id, s)}
                                            href={
                                                widget.id === 'spend-donut' ? '/spend-analysis' :
                                                    widget.id === 'savings-bar' ? '/negotiations' :
                                                        widget.id === 'contract-status' ? '/contracts' :
                                                            undefined
                                            }
                                        >
                                            {renderWidgetContent(widget.id)}
                                        </DashboardWidget>
                                    </div>
                                ))}
                            </SortableContext>
                        </div>

                        <DragOverlay>
                            {activeId ? (
                                <div className="h-full opacity-90 rotate-2 scale-105 cursor-grabbing">
                                    {(() => {
                                        const widget = widgets.find(w => w.id === activeId);
                                        if (!widget) return null;
                                        return (
                                            <DashboardWidgetBase
                                                id={widget.id}
                                                title={widget.title}
                                                isConfiguring={isConfiguring}
                                                size={widget.size as 1 | 2 | 3}
                                                isOverlay={true}
                                            >
                                                {renderWidgetContent(widget.id)}
                                            </DashboardWidgetBase>
                                        );
                                    })()}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {/* Configuration Overlay */}
            {isConfiguring && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-end">
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
                    >
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuration</h2>
                                <p className="text-slate-500 text-sm mt-1">Customize your dashboard layout</p>
                            </div>
                            <button
                                onClick={() => setIsConfiguring(false)}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Widget Visibility</h3>
                                <div className="space-y-3">
                                    {widgets.map((widget) => (
                                        <div
                                            key={widget.id}
                                            className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <GripVertical size={18} className="text-slate-300" />
                                                <span className="text-sm font-bold text-slate-700">{widget.title}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const next = widgets.map(w => w.id === widget.id ? { ...w, visible: !w.visible } : w);
                                                    setWidgets(next);
                                                }}
                                                className={`p-2 rounded-lg transition-all ${widget.visible ? "text-blue-600 bg-blue-50" : "text-slate-400 bg-slate-100"}`}
                                            >
                                                {widget.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="p-8 border-t border-slate-100">
                            <button
                                onClick={() => setIsConfiguring(false)}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all shadow-lg"
                            >
                                <Save size={18} />
                                <span>Save Configuration</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
