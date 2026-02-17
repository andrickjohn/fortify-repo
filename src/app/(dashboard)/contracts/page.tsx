"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    Search,
    Filter,
    ArrowUpRight,
    MoreVertical,
    FileText,
    Calendar,
    Users,
    DollarSign,
    UploadCloud,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
    ChevronRight,
    Settings,
    LogOut,
    Shield,
    ChevronDown,
    HelpCircle,
    Bot
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { AIAnalysisModal } from "@/components/dashboard/AIAnalysisModal";

import { SpendDonutChart } from "@/components/dashboard/SpendDonutChart";
import { ContractStatusChart } from "@/components/dashboard/ContractStatusChart";

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
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";


export const dynamic = 'force-dynamic';

// Initialize PDF.js worker dynamically in component

// --- Components ---
const PDFIngestion = ({ onUploadComplete }: { onUploadComplete: () => void }) => {
    const supabase = createClient();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [districtId, setDistrictId] = useState<string | null>(null);

    useEffect(() => {
        const getDistrict = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('district_id')
                .eq('id', user.id)
                .single();

            if (profile) setDistrictId(profile.district_id);
        };
        getDistrict();
    }, []);

    // Use dynamic import to avoid SSR issues with DOMMatrix
    const extractTextFromPDF = async (file: File): Promise<string> => {
        try {
            // Dynamically import pdfjs-dist
            const pdfjsLib = await import('pdfjs-dist');

            // Initialize worker
            if (typeof window !== 'undefined' && 'Worker' in window) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            let fullText = '';
            // Read first 2 pages (usually enough for analysis)
            const numPages = Math.min(pdf.numPages, 2);

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    // @ts-ignore
                    .map(item => item.str)
                    .join(' ');
                fullText += pageText + '\n';
            }
            return fullText;
        } catch (err) {
            console.error('PDF Parse Error:', err);
            return '';
        }
    };

    const extractPurpose = (text: string): string | null => {
        if (!text) return null;

        // MK Management / Admin Change Heuristic
        if (/Administrative Change/i.test(text) || /Modification/i.test(text)) {
            return "Administrative Change";
        }

        // Regex heuristics for "Purpose" or "Subject"
        // 1. Look for explicit headers
        const patterns = [
            /(?:RE|SUBJECT|PROJECT|AGREEMENT FOR|REGARDING)\s*[:\-]\s*(.{1,100})/i,
            /PURPOSE\s*[:\-]\s*(.{1,100})/i,
            /WHEREAS,\s*(.{1,100})/i
        ];

        for (const pat of patterns) {
            const match = text.match(pat);
            if (match && match[1]) {
                const raw = match[1].trim();
                const words = raw.split(/\s+/);
                const truncated = words.slice(0, 8).join(' ');
                return words.length > 8 ? truncated + '...' : truncated;
            }
        }

        // Fallback for MK Management if no specific header found but vendor matched
        if (text.includes("MK MANAGEMENT")) {
            return "Administrative Change";
        }

        // Fallback: If we find "MOU" or "Memorandum of Understanding"
        if (/Memorandum of Understanding/i.test(text)) return "MOU / Partnership";
        if (/Data Sharing Agreement/i.test(text)) return "Data Sharing";
        if (/Service Agreement/i.test(text)) return "Service Agreement";

        return null;
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (!districtId) {
            alert("Error: User district not found. Please verify your account.");
            return;
        }

        setIsUploading(true);

        try {
            const file = files[0];
            const contractName = file.name.replace('.pdf', '');

            // 1. Check for duplicates
            const { data: existing } = await supabase
                .from('contracts')
                .select('id')
                .eq('contract_name', contractName)
                .eq('district_id', districtId)
                .single();

            if (existing) {
                alert(`Duplicate detected: A contract named "${contractName}" already exists.`);
                setIsUploading(false);
                return;
            }

            // 2. Upload to Storage
            const filePath = `uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('contracts')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('contracts')
                .getPublicUrl(filePath);

            // 3. Parse PDF for Zero-Dollar Analysis
            let purpose = null;
            const text = await extractTextFromPDF(file);
            purpose = extractPurpose(text);

            console.log("Extracted Purpose:", purpose);

            // 4. Insert new contract
            const newContract = {
                contract_name: contractName,
                district_id: districtId,
                status: 'active',
                annual_value: 0,
                description_of_purpose: purpose, // New Field
                document_url: publicUrl,
                confidence_score: 0,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('contracts').insert(newContract);
            if (error) throw error;

            onUploadComplete();
        } catch (error: any) {
            console.error("Upload failed", error);
            alert("Upload failed: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleUpload(e.dataTransfer.files);
            }}
            className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center transition-all
        ${isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }
      `}
        >
            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleUpload(e.target.files)}
                accept=".pdf"
            />
            <div className="flex flex-col items-center space-y-4">
                <div className={`
          p-4 rounded-full 
          ${isUploading ? "bg-blue-100 animate-pulse" : "bg-blue-50"}
        `}>
                    {isUploading ? (
                        <Loader2 className="text-blue-600 animate-spin" size={24} />
                    ) : (
                        <UploadCloud className="text-blue-600" size={24} />
                    )}
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900">
                        {isUploading ? "Analyzing & Processing..." : "Upload Contract PDF"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Drag & drop to auto-analyze zero-dollar contracts
                    </p>
                </div>
            </div>
        </div>
    );
};

interface GroupedContract {
    vendor: string;
    items: any[];
    totalValue: number;
    category: string;
}



export default function ContractsPage() {
    return (
        <React.Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        }>
            <ContractsPageContent />
        </React.Suspense>
    );
};

// --- Main Page Component with Suspense ---
function ContractsPageContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const initialStatus = searchParams.get('status');
    const initialCategory = searchParams.get('category');
    const initialSearch = searchParams.get('search');

    const [contracts, setContracts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState(initialStatus || "all");
    const [categoryFilter, setCategoryFilter] = useState<string | null>(initialCategory);
    const [showGhost, setShowGhost] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch || "");

    const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});
    const [districtStatus, setDistrictStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
    const [districtName, setDistrictName] = useState<string | null>(null);

    // AI Modal State
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
    const [selectedContractName, setSelectedContractName] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [selectedCost, setSelectedCost] = useState<number>(0);
    const [selectedAnnualValue, setSelectedAnnualValue] = useState<number>(0);
    const [selectedVendorName, setSelectedVendorName] = useState<string>("");
    const [selectedVendorId, setSelectedVendorId] = useState<string>("");
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

    // API Config Check (Mocked for now - assume enabled if key present) -- set to TRUE for testing
    // Renamed from isAIEnabled to isAISetup to fix caching issues
    const [isAISetup, setIsAISetup] = useState(true);

    useEffect(() => {
        // Check local storage or existing config check
        // const key = localStorage.getItem('gemini_api_key');
        // setIsAISetup(!!key);
        console.log("DEBUG: isAISetup", isAISetup);
    }, []);

    const openAIModal = (contract: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedContractId(contract.id);
        setSelectedContractName(contract.contract_name || "Unknown Contract");
        setSelectedStatus(contract.ai_status || "not_started");
        setSelectedCost(contract.ai_cost || 0);
        setSelectedAnnualValue(contract.annual_value || 0);

        // Extract vendor details safely
        const vName = Array.isArray(contract.vendors)
            ? contract.vendors[0]?.vendor_name
            : contract.vendors?.vendor_name || 'Unknown Vendor';
        const vId = Array.isArray(contract.vendors)
            ? contract.vendors[0]?.id
            : contract.vendors?.id; // Assuming id is available in joined data or we need to ensure it is selected

        setSelectedVendorName(vName);
        setSelectedVendorId(vId); // Might be undefined if not selected, but okay

        setIsAIModalOpen(true);
    };

    const handleAIUpdate = () => {
        fetchContracts(); // Refresh data to show new status
    };

    // Widget State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [widgets, setWidgets] = useState([
        { id: "spend-donut", title: "Spend by Category", visible: true, size: 1 },
        { id: "contract-status", title: "Contract Status", visible: true, size: 1 },
    ]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
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

    useEffect(() => {
        // Update filters if URL params change
        if (initialStatus) setFilter(initialStatus);
        if (initialCategory) setCategoryFilter(initialCategory);
        if (initialSearch) setSearchQuery(initialSearch);
    }, [initialStatus, initialCategory, initialSearch]);

    async function fetchContracts() {
        setIsLoading(true);
        try {
            let query = supabase
                .from('contracts')
                .select(`
                            *,
                            vendors (
                            vendor_name,
                            category
                            )
                            `)
                .order('created_at', { ascending: false });

            // Apply Filters
            if (filter !== "all") {
                if (filter === "expiring") {
                    const now = new Date().toISOString().split('T')[0];
                    const in90Days = new Date();
                    in90Days.setDate(in90Days.getDate() + 90);
                    const in90DaysStr = in90Days.toISOString().split('T')[0];

                    query = query
                        .eq('status', 'active')
                        .gte('end_date', now)
                        .lte('end_date', in90DaysStr);
                } else {
                    query = query.eq('status', filter);
                }
            }

            // Client-side filtering for category (since it's a joined table) or use complex query
            if (categoryFilter) {
                query = supabase
                    .from('contracts')
                    .select(`
                    *,
                    vendors!inner (
                        vendor_name,
                        category
                    )
                `)
                    .eq('vendors.category', categoryFilter)
                    .order('created_at', { ascending: false });

                // Re-apply status filter since we reset query
                if (filter !== "all") {
                    if (filter === "expiring") {
                        const now = new Date().toISOString().split('T')[0];
                        const in90Days = new Date();
                        in90Days.setDate(in90Days.getDate() + 90);
                        const in90DaysStr = in90Days.toISOString().split('T')[0];

                        query = query
                            .eq('status', 'active')
                            .gte('end_date', now)
                            .lte('end_date', in90DaysStr);
                    } else {
                        query = query.eq('status', filter);
                    }
                }
            }

            if (!showGhost) {
                query = query.is('flag_ghost', false); // Or null
            }


            const { data, error } = await query;

            if (error) throw error;

            // Client side search for text
            let filtered = data || [];
            if (searchQuery) {
                const lower = searchQuery.toLowerCase();
                filtered = filtered.filter(c =>
                    c.contract_name?.toLowerCase().includes(lower) ||
                    c.contract_number?.toLowerCase().includes(lower) ||
                    c.vendors?.vendor_name?.toLowerCase().includes(lower)
                );
            }

            setContracts(filtered);
        } catch (error) {
            console.error("Error fetching contracts:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const checkDistrict = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('district_id, districts(name)')
                .eq('id', user.id)
                .single();

            if (profile && profile.district_id) {
                setDistrictStatus('connected');
                // @ts-ignore
                setDistrictName(profile.districts?.name || "Your District");
            } else {
                setDistrictStatus('disconnected');
            }
        };
        checkDistrict();
    }, []);

    useEffect(() => {
        if (districtStatus === 'connected') {
            fetchContracts();
        } else if (districtStatus === 'disconnected') {
            setIsLoading(false); // Stop loading spinner if we know we're disconnected
        }
    }, [filter, categoryFilter, showGhost, searchQuery, districtStatus]); // Re-fetch when filters change


    // Grouping Logic
    const groupedContracts = React.useMemo(() => {
        const groups: Record<string, any[]> = {};
        contracts.forEach(c => {
            const vName = Array.isArray(c.vendors) ? c.vendors[0]?.vendor_name : c.vendors?.vendor_name || 'Unknown Vendor';
            if (!groups[vName]) groups[vName] = [];
            groups[vName].push(c);
        });

        return Object.entries(groups)
            .map(([vendor, items]) => ({
                vendor,
                items,
                totalValue: items.reduce((sum, item) => sum + (item.annual_value || 0), 0),
                category: Array.isArray(items[0].vendors) ? items[0].vendors[0]?.category : items[0].vendors?.category
            }))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [contracts]);

    const toggleVendor = (e: React.MouseEvent, vendor: string) => {
        e.stopPropagation();
        setExpandedVendors(prev => ({ ...prev, [vendor]: !prev[vendor] }));
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <FileText className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 tracking-tight">Contract Repository</h1>
                            <p className="text-xs text-slate-500 font-medium">
                                {districtStatus === 'loading' ? 'Loading District...' : districtName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowGhost(!showGhost)}
                            className={`
                            px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                            ${showGhost
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-white text-slate-400 border-dashed border-slate-300 hover:border-slate-400"
                                }
                        `}
                        >
                            {showGhost ? '👻 Ghosts Visible' : '👻 Show Ghosts'}
                        </button>

                        {categoryFilter && (
                            <button
                                onClick={() => setCategoryFilter(null)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                                <X size={14} />
                                <span>Clear Category</span>
                            </button>
                        )}
                        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 m-8">
                <div className="flex items-center space-x-1 p-1 bg-slate-50 rounded-xl overflow-hidden">
                    {["all", "active", "expiring", "expired"].map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setFilter(s);
                                if (s === 'all') setCategoryFilter(null);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${filter === s && (s !== 'all' || !categoryFilter)
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {categoryFilter && (
                    <div className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold animate-fadeIn">
                        <span>Category: {categoryFilter}</span>
                        <button onClick={() => setCategoryFilter(null)} className="hover:text-blue-800"><X size={12} /></button>
                    </div>
                )}

                <div className="flex items-center w-full md:w-auto relative group">
                    <Search className="absolute left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search contracts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-64 pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                {/* Visuals - Movable */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(event) => setActiveId(event.active.id as string)}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SortableContext
                            items={widgets.map(w => w.id)}
                            strategy={rectSortingStrategy}
                        >
                            {widgets.map((widget) => (
                                <div key={widget.id} className="h-full">
                                    <DashboardWidget
                                        id={widget.id}
                                        title={widget.title}
                                        size={widget.size as 1 | 2 | 3}
                                    >
                                        {widget.id === "spend-donut" && <SpendDonutChart />}
                                        {widget.id === "contract-status" && (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-center">
                                                    <div className="text-center">
                                                        <h3 className="text-sm font-bold text-slate-900 mb-2">Contract Status</h3>
                                                        <div className="text-xs text-slate-400">Total Active: {contracts.filter(c => c.status === 'active').length}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                        <DashboardWidget
                                            id={widget.id}
                                            title={widget.title}
                                            size={widget.size as 1 | 2 | 3}
                                        >
                                            {widget.id === "spend-donut" && <SpendDonutChart />}
                                            {widget.id === "contract-status" && (
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="text-center">
                                                        <div className="text-center">
                                                            <h3 className="text-sm font-bold text-slate-900 mb-2">Contract Status</h3>
                                                            <div className="text-xs text-slate-400">Total Active: {contracts.filter(c => c.status === 'active').length}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </DashboardWidget>
                                    );
                                })()}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* Upload Area */}
                <PDFIngestion onUploadComplete={fetchContracts} />

                {/* Contract List */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
                    {districtStatus === 'disconnected' ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="p-4 bg-red-50 rounded-full">
                                <AlertCircle className="text-red-500" size={48} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Account Setup Required</h3>
                                <p className="text-slate-500 max-w-md mx-auto mt-2">
                                    Your account is not currently linked to a school district.
                                </p>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                            <p className="text-slate-400 font-bold text-sm">Loading contracts...</p>
                        </div>
                    ) : contracts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <FileText className="text-slate-200 mb-4" size={48} />
                            <p className="text-slate-400 font-bold text-sm">No contracts found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="pl-6 pr-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Contract / Vendor</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">AI Review</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Value / Purpose</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Category</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {groupedContracts.map((group) => {
                                    const isExpanded = expandedVendors[group.vendor];
                                    const hasChildren = group.items.length > 1;
                                    const mainContract = group.items[0];

                                    return (
                                        <React.Fragment key={group.vendor}>
                                            <tr className="group hover:bg-blue-50/10 transition-colors">
                                                <td className="pl-6 pr-6 py-4">
                                                    <div className="flex items-center space-x-2">
                                                        {hasChildren && (
                                                            <button
                                                                onClick={(e) => toggleVendor(e, group.vendor)}
                                                                className="p-1 -ml-2 rounded hover:bg-slate-200 text-slate-700 transition-colors"
                                                            >
                                                                {isExpanded ? <ChevronDown size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
                                                            </button>
                                                        )}
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`p-2 bg-white border border-slate-100 rounded-lg ${hasChildren ? 'border-dashed' : ''} ${!hasChildren ? 'ml-2' : ''}`}>
                                                                {hasChildren ? <Users size={16} className="text-slate-400" /> : <FileText size={16} className="text-slate-400" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-sm">
                                                                    {group.vendor}
                                                                    {hasChildren && <span className="text-slate-400 text-xs font-normal ml-2">({group.items.length} Contracts)</span>}
                                                                </div>
                                                                {!hasChildren && (
                                                                    <div className="text-[10px] text-slate-400 font-medium font-mono">
                                                                        {mainContract.contract_number || mainContract.contract_name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {!hasChildren && (
                                                        <div className="flex flex-col gap-1.5 w-max">
                                                            <button
                                                                onClick={(e) => openAIModal(mainContract, e)}
                                                                disabled={!isAISetup && (mainContract.ai_status === 'not_started' || mainContract.ai_status === 'rejected')}
                                                                className={`
                                                                    flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all shadow-sm
                                                                    ${(!isAISetup && mainContract.ai_status === 'not_started')
                                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                                                                        : mainContract.ai_status === 'completed' || mainContract.ai_status === 'approved'
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                            : mainContract.ai_status === 'negotiation_started'
                                                                                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                                                                : mainContract.ai_status === 'in_progress'
                                                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                                                    }
                                                                `}
                                                            >
                                                                <Bot size={14} />
                                                                {(mainContract.ai_status === 'not_started' || mainContract.ai_status === 'rejected') && (isAISetup ? 'Start Analysis' : 'AI Not Configured')}
                                                                {mainContract.ai_status === 'in_progress' && 'Analyzing...'}
                                                                {mainContract.ai_status === 'completed' && 'View Recommendation'}
                                                                {mainContract.ai_status === 'approved' && 'Approved'}
                                                                {mainContract.ai_status === 'negotiation_started' && 'Negotiation Created'}
                                                            </button>

                                                            {/* Status Bar / Progress Indicator */}
                                                            {mainContract.ai_status === 'in_progress' && (
                                                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                                                                    <div className="h-full bg-blue-500 animate-[progress_2s_ease-in-out_infinite] w-full origin-left"></div>
                                                                </div>
                                                            )}

                                                            {/* Running Cost */}
                                                            {(mainContract.ai_status === 'in_progress' || mainContract.ai_status === 'completed') && (
                                                                <div className="text-[9px] text-slate-400 font-mono text-center">
                                                                    ${(mainContract.ai_cost || 0).toFixed(3)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`
                                                            inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide
                                                            ${mainContract.status === 'active' ? 'bg-green-50 text-green-600' :
                                                            mainContract.status === 'expired' ? 'bg-red-50 text-red-600' :
                                                                'bg-slate-100 text-slate-500'}
                                                        `}>
                                                        {mainContract.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm">
                                                            ${group.totalValue.toLocaleString()}
                                                        </span>
                                                        {!hasChildren && mainContract.annual_value === 0 && mainContract.description_of_purpose && (
                                                            <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mt-1 w-fit">
                                                                P: {mainContract.description_of_purpose}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                                                        {group.category || 'Uncategorized'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {!hasChildren && (
                                                        <Link
                                                            href={`/contracts/${mainContract.id}`}
                                                            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                                        >
                                                            <span>Review</span>
                                                            <ArrowUpRight size={14} />
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Child Rows */}
                                            {hasChildren && isExpanded && group.items.map((contract) => (
                                                <tr
                                                    key={contract.id}
                                                    className="bg-slate-50/50 hover:bg-blue-50/30 transition-colors"
                                                >
                                                    <td className="pl-6 pr-6 py-4 relative">
                                                        {/* Tree Visuals - High Contrast Branching */}
                                                        <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-slate-400"></div>
                                                        <div className="absolute left-10 top-1/2 w-6 h-0.5 bg-slate-400"></div>

                                                        <div className="flex flex-col pl-16">
                                                            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">{contract.contract_number || contract.contract_name || "Untitled Contract"}</span>
                                                            <span className="text-[10px] text-slate-500 font-medium">{contract.contract_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex flex-col gap-1.5 w-max">
                                                            <button
                                                                onClick={(e) => openAIModal(contract, e)}
                                                                disabled={!isAISetup && contract.ai_status === 'not_started'}
                                                                className={`
                                                                    relative overflow-hidden flex items-center gap-2 px-2 py-1 rounded-md border text-[9px] font-bold transition-all shadow-sm
                                                                    ${!isAISetup && contract.ai_status === 'not_started'
                                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                                                                        : contract.ai_status === 'completed' || contract.ai_status === 'approved'
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                            : contract.ai_status === 'in_progress'
                                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                                                    }
                                                                `}
                                                            >
                                                                {/* Progress Bar Background */}
                                                                {contract.ai_status === 'in_progress' && (
                                                                    <div className="absolute inset-0 bg-blue-100/50 animate-[progress_2s_ease-in-out_infinite] origin-left w-full z-0"></div>
                                                                )}

                                                                <div className="relative z-10 flex items-center gap-2">
                                                                    <Bot size={14} />
                                                                    {contract.ai_status === 'not_started' ? (isAISetup ? 'Analyze' : 'N/A') :
                                                                        contract.ai_status === 'in_progress' ? '...' :
                                                                            contract.ai_status === 'completed' ? 'Results' :
                                                                                contract.ai_status}
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`
                                                                inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide
                                                                ${contract.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                contract.status === 'expired' ? 'bg-red-100 text-red-700' :
                                                                    'bg-slate-200 text-slate-600'}
                                                            `}>
                                                            {contract.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-600 text-xs text-slate-400">
                                                                {(contract.annual_value && Number(contract.annual_value) > 0)
                                                                    ? `$${Number(contract.annual_value).toLocaleString()}`
                                                                    : '$0'
                                                                }
                                                            </span>
                                                            {/* Force show purpose if value is falsy or 0 */}
                                                            {(!contract.annual_value || Number(contract.annual_value) === 0) && contract.description_of_purpose && (
                                                                <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-1 w-fit uppercase tracking-tighter">
                                                                    P: {contract.description_of_purpose}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <Link
                                                            href={`/contracts/${contract.id}`}
                                                            className="inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-[10px] font-bold hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                                                        >
                                                            <span>View</span>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* AI Analysis Modal */}
            {selectedContractId && (
                <AIAnalysisModal
                    isOpen={isAIModalOpen}
                    onClose={() => setIsAIModalOpen(false)}
                    contractId={selectedContractId}
                    contractName={selectedContractName}
                    currentStatus={selectedStatus}
                    currentCost={selectedCost}
                    annualValue={selectedAnnualValue}
                    vendorName={selectedVendorName}
                    vendorId={selectedVendorId}
                    onUpdate={handleAIUpdate}
                />
            )}
        </div >
    );
}
