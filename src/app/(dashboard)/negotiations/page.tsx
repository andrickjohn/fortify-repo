"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Users,
    Plus,
    MoreHorizontal,
    Calendar,
    DollarSign,
    Clock,
    X,
    Save,
    TrendingUp,
    FileText,
    CheckCircle2,
    Send,
    Sparkles
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
    rectSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from '@dnd-kit/utilities';
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// --- Types ---
interface Negotiation {
    id: string;
    title: string;
    vendor: string;
    value: number;
    stage: string; // Updated to be flexible string to match DB potentially
    startDate: string;
    owner: string;
    description?: string;
    email_draft?: {
        subject: string;
        body: string;
        last_updated: string;
    };
}

const STAGES = ['Draft', 'Internal Review', 'Negotiating', 'Legal Review', 'Finalizing', 'Signed'] as const;

// --- Sortable Item Component ---
function SortableItem({ negotiation, onClick }: { negotiation: Negotiation, onClick: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: negotiation.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{negotiation.vendor}</span>
                <button className="text-slate-300 hover:text-slate-600">
                    <MoreHorizontal size={14} />
                </button>
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-3 leading-snug">{negotiation.title}</h4>
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <span className="flex items-center space-x-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                    <DollarSign size={10} />
                    <span>{negotiation.value.toLocaleString()}</span>
                </span>
                <span className="flex items-center space-x-1 text-[10px] font-medium text-slate-400">
                    <Clock size={10} />
                    <span>{new Date(negotiation.startDate).toLocaleDateString()}</span>
                </span>
            </div>
            {negotiation.email_draft && (
                <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1 text-[10px] text-purple-500 font-bold">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    Draft Email Ready
                </div>
            )}
        </div>
    );
}

// --- Main Page Component ---
export default function NegotiationsPage() {
    // State
    const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Negotiation | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [vendorOptions, setVendorOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal View State
    const [viewMode, setViewMode] = useState<'details' | 'email'>('details');
    const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });

    // Stats State
    const [stats, setStats] = useState({
        activeCount: 0,
        pipelineValue: 0,
        avgCycle: 14
    });

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Initial Load
    useEffect(() => {
        fetchNegotiations();
        fetchVendors();
    }, []);

    const fetchNegotiations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('negotiations')
                .select(`
                    *,
                    contracts (
                        contract_name,
                        vendors (
                            vendor_name
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (data) {
                const mapped: Negotiation[] = data.map((n: any) => {
                    // Safe access to nested vendor name
                    const vendorName = n.contracts?.vendors?.vendor_name || n.contracts?.contract_name || 'Unknown Vendor';

                    // Use the dedicated email_draft column
                    let emailDraft = n.email_draft;

                    // Map Status to Stage
                    let stage = 'Draft';
                    if (n.status === 'identified') stage = 'Draft';
                    else if (n.status === 'negotiation_started') stage = 'Negotiating';
                    else if (STAGES.includes(n.status)) stage = n.status;
                    else stage = 'Draft';

                    return {
                        id: n.id,
                        title: `Negotiation: ${vendorName}`,
                        vendor: vendorName,
                        value: Number(n.potential_savings) || 0,
                        stage: stage,
                        startDate: n.created_at || new Date().toISOString(),
                        owner: 'Me',
                        email_draft: emailDraft
                    };
                });
                setNegotiations(mapped);
            }
        } catch (e) {
            console.error("Failed to fetch negotiations", e);
        } finally {
            setLoading(false);
        }
    };

    async function fetchVendors() {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('vendor_name')
                .order('vendor_name');

            if (data) {
                setVendorOptions(data.map(v => v.vendor_name));
            }
        } catch (e) {
            console.error("Failed to fetch vendors", e);
        }
    }

    // Update Stats when negotiations change
    useEffect(() => {
        const active = negotiations.filter(n => n.stage !== 'Signed' && n.stage !== 'Draft');
        const value = negotiations.reduce((sum, n) => sum + (Number(n.value) || 0), 0);
        setStats({
            activeCount: active.length,
            pipelineValue: value,
            avgCycle: 14 // Mocked for now
        });
    }, [negotiations]);

    // Handlers
    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        let newStage = over.id;

        if (activeId !== overId) {
            const overItem = negotiations.find(n => n.id === overId);
            if (overItem) {
                newStage = overItem.stage;
            }
        }

        let dbStatus = newStage;
        if (newStage === 'Draft') dbStatus = 'identified';
        if (newStage === 'Negotiating') dbStatus = 'negotiation_started';

        if (STAGES.includes(newStage as any)) {
            const updated = negotiations.map(n => n.id === activeId ? { ...n, stage: newStage } : n);
            setNegotiations(updated as Negotiation[]);

            // Persist to DB - Status Only
            await supabase.from('negotiations').update({ status: dbStatus }).eq('id', activeId);
        }
    };

    const saveNegotiation = async (item: Negotiation) => {
        // Optimistic UI Update
        let updated;
        const exists = negotiations.find(n => n.id === item.id);

        if (exists) {
            updated = negotiations.map(n => n.id === item.id ? item : n);
            setNegotiations(updated);
            setIsModalOpen(false);
            setEditingItem(null);

            // Map back to DB Columns
            const dbStatus = item.stage === 'Draft' ? 'identified' : (item.stage === 'Negotiating' ? 'negotiation_started' : item.stage);

            await supabase.from('negotiations').update({
                status: dbStatus,
                email_draft: item.email_draft
            }).eq('id', item.id);
        } else {
            // New Negotiation Creation via UI not fully supported by schema yet (needs contract selection)
            alert("Creating new negotiations directly from this board is coming soon. Please start from the Contracts page analysis.");
            setIsModalOpen(false);
        }
    };

    const deleteNegotiation = async (id: string) => {
        const updated = negotiations.filter(n => n.id !== id);
        setNegotiations(updated);
        setIsModalOpen(false);
        setEditingItem(null);
        await supabase.from('negotiations').delete().eq('id', id);
    };

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen overflow-x-hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Negotiations</h1>
                    <p className="text-slate-500 mt-1 font-medium">Track and manage outgoing vendor contract negotiations.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setIsModalOpen(true);
                        setViewMode('details');
                        setEmailForm({ to: '', subject: '', body: '' });
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center space-x-2"
                >
                    <Plus size={20} />
                    <span>New Negotiation</span>
                </button>
            </header>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pipeline Value</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">${(stats.pipelineValue / 1000).toFixed(1)}k</p>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Deals</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stats.activeCount}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Cycle Time</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stats.avgCycle} days</p>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
            >
                <div className="flex space-x-4 overflow-x-auto pb-8 min-h-[600px]">
                    {STAGES.map((stage) => {
                        const items = negotiations.filter(n => n.stage === stage);
                        return (
                            <KanbanColumn
                                key={stage}
                                stage={stage}
                                items={items}
                                onEdit={(n) => {
                                    setEditingItem(n);
                                    setIsModalOpen(true);
                                    setViewMode('details');
                                    setEmailForm({
                                        to: '',
                                        subject: n.email_draft?.subject || '',
                                        body: n.email_draft?.body || ''
                                    });
                                }}
                            />
                        );
                    })}
                </div>
                <DragOverlay>
                    {activeId ? (
                        <div className="bg-white p-4 rounded-xl border border-blue-300 shadow-xl opacity-90 rotate-3 cursor-grabbing">
                            <div className="h-4 w-1/2 bg-slate-200 rounded mb-2" />
                            <div className="h-3 w-3/4 bg-slate-100 rounded" />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                            <h2 className="text-xl font-black text-slate-900">{editingItem ? 'Edit Negotiation' : 'New Negotiation'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                                <X size={24} />
                            </button>
                        </div>

                        {viewMode === 'details' ? (
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                                    <input
                                        autoFocus
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        defaultValue={editingItem?.title}
                                        id="n-title"
                                        placeholder="e.g. Software Renewal"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Vendor</label>
                                        <select
                                            disabled
                                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-500 cursor-not-allowed appearance-none"
                                            defaultValue={editingItem?.vendor}
                                            id="n-vendor"
                                        >
                                            <option value="">Select Vendor...</option>
                                            {vendorOptions.map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                            {editingItem?.vendor && !vendorOptions.includes(editingItem.vendor) && (
                                                <option value={editingItem.vendor}>{editingItem.vendor}</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Value ($)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                            defaultValue={editingItem?.value}
                                            id="n-value"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        defaultValue={editingItem?.stage || 'Draft'}
                                        id="n-stage"
                                    >
                                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Email Access Button */}
                                <div className="pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => {
                                            // Pre-fill email form with draft or defaults
                                            if (editingItem?.email_draft) {
                                                setEmailForm({
                                                    to: '', // We don't have this in DB yet
                                                    subject: editingItem.email_draft.subject,
                                                    body: editingItem.email_draft.body
                                                });
                                            } else {
                                                setEmailForm({
                                                    to: '',
                                                    subject: `Regarding ${editingItem?.title || 'Contract'}`,
                                                    body: `Hi Team,\n\nWe would like to discuss the renewal of ${editingItem?.title || 'our contract'}.\n\nBest,\nMe`
                                                });
                                            }
                                            setViewMode('email');
                                        }}
                                        className="w-full py-4 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 text-purple-600 font-bold hover:bg-purple-100 hover:border-purple-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} />
                                        Manage Email Draft
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-3">
                                    <Sparkles className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h5 className="text-sm font-bold text-yellow-800">AI Negotiation Draft</h5>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            We've prepared this draft based on the identified savings opportunity. Review and edit before sending to key stakeholders.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-500 w-16 font-medium">To:</span>
                                            <input
                                                className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-xs text-slate-900 w-full focus:outline-none focus:border-blue-500"
                                                value={emailForm.to}
                                                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                                                placeholder="vendor@example.com"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-500 w-16 font-medium">Subject:</span>
                                            <input
                                                className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                                value={emailForm.subject}
                                                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                                                placeholder="Subject line..."
                                            />
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full h-96 p-4 text-slate-700 text-sm leading-relaxed focus:outline-none resize-none font-sans"
                                        value={emailForm.body}
                                        onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                                        placeholder="Email body..."
                                    />
                                </div>
                            </div>
                        )}

                        <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50 flex-shrink-0 gap-3">
                            {viewMode === 'details' ? (
                                <>
                                    {editingItem ? (
                                        <button
                                            onClick={() => deleteNegotiation(editingItem.id)}
                                            className="text-red-500 font-bold hover:text-red-700 text-sm px-4"
                                        >
                                            Delete
                                        </button>
                                    ) : <div className="flex-1"></div>}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                const title = (document.getElementById('n-title') as HTMLInputElement).value;
                                                const vendor = (document.getElementById('n-vendor') as HTMLSelectElement).value;
                                                const value = Number((document.getElementById('n-value') as HTMLInputElement).value);
                                                const stage = (document.getElementById('n-stage') as HTMLSelectElement).value as any;

                                                if (title && vendor) {
                                                    saveNegotiation({
                                                        id: editingItem?.id || Math.random().toString(36).substr(2, 9),
                                                        title,
                                                        vendor,
                                                        value,
                                                        stage,
                                                        startDate: editingItem?.startDate || new Date().toISOString(),
                                                        owner: editingItem?.owner || 'Me',
                                                        email_draft: editingItem?.email_draft // Keep existing draft if simply saving details
                                                    });
                                                }
                                            }}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center space-x-2"
                                        >
                                            <Save size={18} />
                                            <span>Save</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            if (editingItem) {
                                                // Save draft on back?
                                                setEditingItem({
                                                    ...editingItem,
                                                    email_draft: {
                                                        ...(editingItem.email_draft || {}),
                                                        subject: emailForm.subject,
                                                        body: emailForm.body,
                                                        last_updated: new Date().toISOString()
                                                    }
                                                });
                                            }
                                            setViewMode('details');
                                        }}
                                        className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                                    >
                                        Back
                                    </button>

                                    <div className="flex gap-3 flex-1 justify-end">
                                        <button
                                            onClick={() => {
                                                if (confirm("Delete this draft?")) {
                                                    setEmailForm({ to: '', subject: '', body: '' });
                                                }
                                            }}
                                            className="text-red-400 font-bold hover:text-red-600 text-sm px-4 mr-auto"
                                        >
                                            Delete Draft
                                        </button>

                                        <button
                                            onClick={async () => {
                                                if (!emailForm.subject || !emailForm.body) {
                                                    alert("Please add a subject and body before sending.");
                                                    return;
                                                }

                                                if (!editingItem) return;

                                                // Update Local State Optimistically
                                                const updatedItem = {
                                                    ...editingItem,
                                                    stage: 'Negotiating',
                                                    email_draft: {
                                                        ...(editingItem.email_draft || {}),
                                                        subject: emailForm.subject,
                                                        body: emailForm.body,
                                                        last_updated: new Date().toISOString()
                                                    }
                                                };

                                                await saveNegotiation(updatedItem);
                                            }}
                                            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center gap-2"
                                        >
                                            <Send size={18} />
                                            <span>Send Email</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Column
import { useDroppable } from "@dnd-kit/core";

function KanbanColumn({ stage, items, onEdit }: { stage: string, items: Negotiation[], onEdit: (n: Negotiation) => void }) {
    const { setNodeRef } = useDroppable({ id: stage });

    return (
        <div ref={setNodeRef} className="min-w-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest text-slate-400">{stage}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{items.length}</span>
            </div>

            <div className={`flex-1 rounded-2xl p-2 transition-colors ${items.length === 0 ? 'bg-slate-100/50 border border-dashed border-slate-200' : 'bg-slate-100/30'}`}>
                {items.length === 0 && (
                    <div className="h-32 flex items-center justify-center text-slate-300">
                        <span className="text-xs font-medium">Empty</span>
                    </div>
                )}
                <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                    {items.map(item => (
                        <SortableItem key={item.id} negotiation={item} onClick={() => onEdit(item)} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}
