"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Save,
    ArrowLeft,
    ShieldCheck,
    AlertCircle,
    TrendingUp,
    Plus,
    Trash2,
    Loader2,
    Edit,
    Check,
    ChevronLeft,
    ChevronRight,
    Calendar,
    FileText,
    Eye,
    EyeOff,
    CheckCircle,
    GripVertical
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ContractData {
    id: string;
    vendorName: string;
    poNumber: string;
    annualValue: number;
    startDate: string;
    endDate: string;
    termYears: number | null;
    requiresReview: boolean;
    reviewNotes: string | null;
    poIssueDate: string | null;
    status: string;
    confidence: number;
    docUrl: string | null;
    vendorCategory: string | null; // Added field
    pageNumber: number | null; // Added field
    lineItems: { id: number; description: string; qty: number; unitCost: number; total: number }[];
    linkedContracts?: { id: string; poNumber: string; value: number; isCurrent: boolean }[];
    flag_ghost?: boolean;
    is_hidden?: boolean;
}

export default function ReviewEditView() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;

    const [data, setData] = useState<ContractData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        startDate: "",
        endDate: "",
        annualValue: 0,
        poIssueDate: "",
        vendorName: ""
    });
    const [prevId, setPrevId] = useState<string | null>(null);
    const [nextId, setNextId] = useState<string | null>(null);
    const [showPdf, setShowPdf] = useState(true);

    // Resizable Pane State
    const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Percentage
    const [isDragging, setIsDragging] = useState(false);
    const [pdfRefreshKey, setPdfRefreshKey] = useState(0);
    const isResizing = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newWidth = (e.clientX / window.innerWidth) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setLeftPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isResizing.current) {
                setPdfRefreshKey(k => k + 1);
            }
            isResizing.current = false;
            document.body.style.cursor = 'default';
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResizing = () => {
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        setIsDragging(true);
    };

    useEffect(() => {
        async function fetchContract(): Promise<void> {
            if (!contractId) return;
            setIsLoading(true);
            setError(null);

            try {
                // Fetch contract details
                const { data: contract, error: contractError } = await supabase
                    .from('contracts')
                    .select('*')
                    .eq('id', contractId)
                    .single();

                if (contractError) throw contractError;
                if (!contract) throw new Error("Contract not found");

                // Fetch vendor name & category
                let vendorName = "Unknown Vendor";
                let vendorCategory = "Uncategorized";

                if (contract.vendor_id) {
                    const { data: vendor } = await supabase
                        .from('vendors')
                        .select('vendor_name, category')
                        .eq('id', contract.vendor_id)
                        .single();
                    if (vendor) {
                        vendorName = vendor.vendor_name;
                        vendorCategory = vendor.category || "Uncategorized";
                    }
                }

                // Fetch linked contracts (Same Document)
                let linkedContracts: { id: string; poNumber: string; value: number; isCurrent: boolean }[] = [];
                if (contract.document_url) {
                    const { data: linked } = await supabase
                        .from('contracts')
                        .select('id, contract_number, annual_value')
                        .eq('document_url', contract.document_url)
                        .order('contract_number');

                    if (linked) {
                        linkedContracts = linked.map((c: any) => ({
                            id: c.id,
                            poNumber: c.contract_number,
                            value: Number(c.annual_value),
                            isCurrent: c.id === contract.id
                        }));
                    }
                }

                // Fetch line items
                const { data: lineItemsValue, error: liError } = await supabase
                    .from('contract_line_items')
                    .select('*')
                    .eq('contract_id', contractId);

                if (liError) console.warn("Line items error:", liError);
                const lineItems = lineItemsValue;

                setData({
                    id: contract.id,
                    vendorName,
                    vendorCategory,
                    poNumber: contract.contract_number || contract.contract_name || "N/A",
                    annualValue: Number(contract.annual_value) || 0,
                    startDate: contract.start_date || "",
                    endDate: contract.end_date || "",
                    termYears: contract.term_years || null,
                    requiresReview: contract.requires_review || false,
                    reviewNotes: contract.review_notes || null,
                    poIssueDate: contract.po_issue_date || null,
                    pageNumber: contract.page_number || null,
                    flag_ghost: contract.flag_ghost,
                    is_hidden: contract.is_hidden,
                    status: contract.status || "active",
                    confidence: 94,
                    docUrl: contract.document_url || null,
                    lineItems: (lineItems || []).map((li: any, idx: number) => ({
                        id: idx + 1,
                        description: li.description || "Line Item",
                        qty: Number(li.quantity) || 1,
                        unitCost: Number(li.unit_cost) || 0,
                        total: Number(li.annual_cost) || 0
                    })),
                    linkedContracts // Add to state
                });

                // Fetch adjacent contracts for navigation
                const { data: adjacent } = await supabase
                    .from('contracts')
                    .select('id, contract_number')
                    .order('contract_number', { ascending: true });

                if (adjacent) {
                    const currentIndex = adjacent.findIndex((c: any) => c.id === contractId);
                    if (currentIndex > 0) setPrevId(adjacent[currentIndex - 1].id);
                    if (currentIndex < adjacent.length - 1) setNextId(adjacent[currentIndex + 1].id);
                }

            } catch (err: any) {
                console.error("Failed to fetch contract:", err);
                setError(err.message || "Failed to load contract");
            } finally {
                setIsLoading(false);
            }
        }

        if (contractId) {
            fetchContract();
        }
    }, [contractId]);

    // ... edit handlers ...
    const handleEditToggle = () => {
        // ... existing implementation ...
        if (!data) return;
        setEditForm({
            startDate: data.startDate,
            endDate: data.endDate,
            annualValue: data.annualValue,
            poIssueDate: data.poIssueDate || "",
            vendorName: data.vendorName
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        // ... existing implementation ...
        if (!data) return;
        try {
            const { error } = await supabase.from('contracts').update({
                start_date: (editForm.startDate || null) as any,
                end_date: (editForm.endDate || null) as any,
                annual_value: editForm.annualValue,
                po_issue_date: (editForm.poIssueDate || null) as any,
                requires_review: false
            }).eq('id', data.id);

            if (error) throw error;

            setData(prev => prev ? ({
                ...prev,
                startDate: editForm.startDate || "",
                endDate: editForm.endDate || "",
                annualValue: editForm.annualValue || 0,
                poIssueDate: editForm.poIssueDate || null,
                vendorName: editForm.vendorName || prev.vendorName,
                requiresReview: false
            }) : null);

            setIsEditing(false);
        } catch (err: any) {
            alert(`Error saving: ${err.message}`);
        }
    };

    const handleApprove = async () => {
        // ... existing implementation ...
        if (!data) return;
        try {
            const { error } = await supabase.from('contracts').update({
                requires_review: false
            }).eq('id', data.id);

            if (error) throw error;

            setData(prev => prev ? ({ ...prev, requiresReview: false }) : null);
        } catch (err: any) {
            console.error("Error approving:", err);
            alert("Failed to approve");
        }
    };

    const handleArchive = async () => {
        if (!data) return;
        try {
            const newHiddenStatus = !data.is_hidden;
            const { error } = await supabase.from('contracts').update({
                is_hidden: newHiddenStatus
            }).eq('id', data.id);

            if (error) throw error;

            setData(prev => prev ? ({ ...prev, is_hidden: newHiddenStatus }) : null);
            // Optional: Redirect if archiving? No, let them toggle it here.
        } catch (err: any) {
            console.error("Error archiving:", err);
            alert("Failed to update archive status");
        }
    };


    const goToPrev = () => { if (prevId) router.push(`/contracts/${prevId}`); };
    const goToNext = () => { if (nextId) router.push(`/contracts/${nextId}`); };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 size={48} className="animate-spin text-blue-600" />
                    <p className="text-slate-500 font-bold">Loading contract data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center max-w-md">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-red-700 mb-2">Failed to Load Contract</h2>
                    <p className="text-red-600 text-sm mb-4">{error || "Contract not found"}</p>
                    <Link href="/contracts" className="text-blue-600 font-bold text-sm hover:underline">
                        ← Back to Contracts
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC]">
            {/* Header ... */}
            <header className="bg-white border-b border-slate-100 p-6 flex justify-between items-center sticky top-0 z-10 shrink-0">
                <div className="flex items-center space-x-6">
                    <Link href="/contracts" className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-xl font-bold text-slate-900">Review Extraction: {data.poNumber}</h1>
                            <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100 flex items-center space-x-1">
                                <ShieldCheck size={10} />
                                <span>{data.confidence}% Confidence</span>
                            </span>
                            {data.flag_ghost && (
                                <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-100 flex items-center space-x-1">
                                    <span>👻 Ghost</span>
                                </span>
                            )}
                            {data.is_hidden && (
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
                                    <span>Hidden</span>
                                </span>
                            )}
                        </div>
                        {/* Navigation Controls */}
                        <div className="flex items-center space-x-3 mt-1.5">
                            <button
                                onClick={goToPrev}
                                disabled={!prevId}
                                className={`text-xs font-bold flex items-center space-x-1 ${!prevId ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
                            >
                                <ChevronLeft size={12} /> <span>Prev PO</span>
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                                onClick={goToNext}
                                disabled={!nextId}
                                className={`text-xs font-bold flex items-center space-x-1 ${!nextId ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
                            >
                                <span>Next PO</span> <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* PDF Toggle */}
                    <button
                        onClick={() => setShowPdf(!showPdf)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all ${showPdf
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        {showPdf ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span>{showPdf ? 'Hide PDF' : 'Show PDF'}</span>
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-2" />

                    {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg hover:bg-green-700 transition-all">
                                <Save size={18} />
                                <span>Save</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleEditToggle} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center space-x-2">
                                <Edit size={16} />
                                <span>Edit</span>
                            </button>
                            {(data.flag_ghost || data.is_hidden) && ( // Only show for ghosts or hidden items
                                <button onClick={handleArchive} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 border transition-all ${data.is_hidden ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'}`}>
                                    <Trash2 size={16} />
                                    <span>{data.is_hidden ? 'Unhide' : 'Hide'}</span>
                                </button>
                            )}
                            {data.requiresReview ? (
                                <button onClick={handleApprove} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                                    <Check size={18} />
                                    <span>Approve</span>
                                </button>
                            ) : (
                                <div className="px-6 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-bold flex items-center space-x-2 border border-green-100 cursor-default">
                                    <CheckCircle size={18} />
                                    <span>Reviewed</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left: PDF Preview */}
                <AnimatePresence>
                    {showPdf && (
                        <div
                            style={{ width: `${leftPanelWidth}%` }}
                            className="bg-slate-100 p-4 border-r border-slate-200 flex flex-col items-center overflow-hidden relative shrink-0"
                        >
                            {data.docUrl ? (
                                <iframe
                                    key={pdfRefreshKey}
                                    src={`${data.docUrl}#view=FitH&toolbar=0&navpanes=0${data.pageNumber ? `&page=${data.pageNumber}` : ''}`}
                                    className={`w-full h-full rounded-lg shadow-lg border border-slate-200 bg-white ${isDragging ? 'pointer-events-none' : ''}`}
                                    title="Contract PDF"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 w-full rounded-lg border border-dashed border-slate-300">
                                    <div className="text-center space-y-2">
                                        <FileText size={32} className="mx-auto text-slate-300" />
                                        <p>PDF not available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </AnimatePresence>

                {/* Resizer Handle */}
                {showPdf && (
                    <div
                        onMouseDown={startResizing}
                        className="w-4 bg-transparent hover:bg-blue-500/10 cursor-col-resize absolute top-0 bottom-0 z-20 flex items-center justify-center group transition-colors"
                        style={{ left: `calc(${leftPanelWidth}% - 8px)` }}
                    >
                        <div className="w-1 h-8 bg-slate-300 rounded-full group-hover:bg-blue-400 transition-colors" />
                    </div>
                )}

                {/* Right: Data Panel */}
                <aside className="flex-1 bg-white overflow-y-auto border-l border-slate-100 flex flex-col transition-all duration-300">
                    <div className="p-8 space-y-10">
                        {/* Section: Linked Contracts (Document Contents) */}
                        {data.linkedContracts && data.linkedContracts.length > 1 && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Document Contents</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {data.linkedContracts.map(c => (
                                        <Link href={`/contracts/${c.id}`} key={c.id}>
                                            <div className={`p-3 rounded-xl border flex justify-between items-center hover:shadow-sm transition-all ${c.isCurrent ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-2 h-2 rounded-full ${c.isCurrent ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                                    <span className={`text-sm font-bold ${c.isCurrent ? 'text-blue-900' : 'text-slate-600'}`}>
                                                        {c.poNumber}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-slate-500">
                                                    ${c.value.toLocaleString()}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Section: General Info */}
                        <section className="space-y-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Contract Details</h3>
                            <div className="grid gap-6">
                                <div className="space-y-1.5 flex-1 relative group">
                                    <label className="text-xs font-bold text-slate-500">Vendor Name</label>
                                    <input
                                        value={isEditing ? (editForm.vendorName || '') : data.vendorName}
                                        readOnly={!isEditing}
                                        onChange={e => isEditing && setEditForm({ ...editForm, vendorName: e.target.value })}
                                        className={`w-full ${isEditing ? 'bg-white border border-blue-300' : 'bg-slate-50 border-none'} rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all`}
                                    />
                                </div>
                                <div className="flex space-x-4">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-bold text-slate-500">PO Number</label>
                                        <input
                                            value={data.poNumber}
                                            readOnly
                                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-bold text-slate-500">Total Value</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                                            <input
                                                value={isEditing ? (editForm.annualValue || 0) : data.annualValue.toLocaleString()}
                                                readOnly={!isEditing}
                                                type={isEditing ? "number" : "text"}
                                                onChange={e => isEditing && setEditForm({ ...editForm, annualValue: parseFloat(e.target.value) })}
                                                className={`w-full ${isEditing ? 'bg-white border border-blue-300 pl-8' : 'bg-slate-50 border-none pl-8'} rounded-xl pr-4 py-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all`}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-4">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-bold text-slate-500">Start Date</label>
                                        <input
                                            value={isEditing ? (editForm.startDate || '') : data.startDate}
                                            type="date"
                                            readOnly={!isEditing}
                                            onChange={e => isEditing && setEditForm({ ...editForm, startDate: e.target.value })}
                                            className={`w-full ${isEditing ? 'bg-white border border-blue-300' : 'bg-slate-50 border-none'} rounded-xl px-4 py-3 text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all`}
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-bold text-slate-500">Renewal Date</label>
                                        <input
                                            value={isEditing ? (editForm.endDate || '') : data.endDate}
                                            type="date"
                                            readOnly={!isEditing}
                                            onChange={e => isEditing && setEditForm({ ...editForm, endDate: e.target.value })}
                                            className={`w-full ${isEditing ? 'bg-white border border-blue-300' : 'bg-slate-50 border-none'} rounded-xl px-4 py-3 text-sm font-bold text-orange-600 focus:ring-2 focus:ring-blue-500 transition-all`}
                                        />
                                    </div>
                                </div>
                                <div className="flex space-x-4">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-bold text-slate-500">PO Issue Date</label>
                                        <input
                                            value={isEditing ? (editForm.poIssueDate || '') : (data.poIssueDate || '')}
                                            type="date"
                                            readOnly={!isEditing}
                                            onChange={e => isEditing && setEditForm({ ...editForm, poIssueDate: e.target.value })}
                                            className={`w-full ${isEditing ? 'bg-white border border-blue-300' : 'bg-slate-50 border-none'} rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all`}
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-bold text-slate-500">Spending Category</label>
                                        <div className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-600 flex items-center">
                                            {data.vendorCategory === 'Software' && <span className="mr-2">💾</span>}
                                            {data.vendorCategory === 'Hardware' && <span className="mr-2">🖥️</span>}
                                            {data.vendorCategory === 'Services' && <span className="mr-2">🛠️</span>}
                                            {data.vendorCategory || 'Uncategorized'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section: Line Items */}
                        <section className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Line Item Extraction</h3>
                            </div>
                            <div className="space-y-3">
                                {data.lineItems.length > 0 ? data.lineItems.map((item) => (
                                    <div key={item.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-black text-slate-300">#{item.id}</span>
                                        </div>
                                        <input
                                            value={item.description}
                                            readOnly
                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 mb-3"
                                        />
                                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                            <div className="flex space-x-4 text-[11px] font-bold text-slate-400 uppercase">
                                                <span>Qty: {item.qty}</span>
                                                <span>Unit: ${item.unitCost}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-900">${item.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 text-sm">No line items extracted for this contract</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </aside>
            </div>
        </div>
    );
}
