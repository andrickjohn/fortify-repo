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
    CheckCircle2
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
    stage: 'Draft' | 'Internal Review' | 'Negotiating' | 'Legal Review' | 'Finalizing' | 'Signed';
    startDate: string;
    owner: string;
    description?: string;
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
                    <span>2d</span>
                </span>
            </div>
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
        // Load negotiations from local storage
        const saved = localStorage.getItem('fortify-negotiations');
        if (saved) {
            setNegotiations(JSON.parse(saved));
        } else {
            // Seed data if empty
            const seed: Negotiation[] = [
                { id: '1', title: 'Enterprise License Renewal', vendor: 'Salesforce', value: 120000, stage: 'Negotiating', startDate: '2023-10-01', owner: 'John Doe' },
                { id: '2', title: 'New Hardware Procurement', vendor: 'Dell', value: 45000, stage: 'Draft', startDate: '2023-10-05', owner: 'Jane Smith' },
            ];
            setNegotiations(seed);
            localStorage.setItem('fortify-negotiations', JSON.stringify(seed));
        }

        // Fetch vendors for dropdown
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
        fetchVendors();
    }, []);

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

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id; // This will likely be another item ID, need to map to stage if dropping on empty container

        // Find the stage of the over container or item
        // Note: Simplified logic here. dnd-kit requires managing multiple lists or a unified list with group logic.
        // For this single-list approach with visual columns, we need to know WHICH column we dropped into.

        // BETTER APPROACH for simple Kanban in dnd-kit: 
        // We typically need droppable containers for columns.

        // Let's implement active drag logic:
        // We will assume `over.id` is a container ID (Stage Name) OR an item ID.

        let newStage = over.id;

        // If dropped on an item, find that item's stage
        if (activeId !== overId) {
            const overItem = negotiations.find(n => n.id === overId);
            if (overItem) {
                newStage = overItem.stage;
            }
        }

        // If we found a valid stage (or dropped on a column header ideally, but simplification: columns are droppable)
        if (STAGES.includes(newStage)) {
            const updated = negotiations.map(n => n.id === activeId ? { ...n, stage: newStage } : n);
            setNegotiations(updated as Negotiation[]);
            localStorage.setItem('fortify-negotiations', JSON.stringify(updated));
        }
    };

    // Fix: We need droppable containers for the empty column case.
    // Modified: Each column will be a Droppable.

    const saveNegotiation = (item: Negotiation) => {
        let updated;
        if (negotiations.find(n => n.id === item.id)) {
            updated = negotiations.map(n => n.id === item.id ? item : n);
        } else {
            updated = [...negotiations, item];
        }
        setNegotiations(updated);
        localStorage.setItem('fortify-negotiations', JSON.stringify(updated));
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const deleteNegotiation = (id: string) => {
        const updated = negotiations.filter(n => n.id !== id);
        setNegotiations(updated);
        localStorage.setItem('fortify-negotiations', JSON.stringify(updated));
        setIsModalOpen(false);
        setEditingItem(null);
    };

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen overflow-x-hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Negotiations</h1>
                    <p className="text-slate-500 mt-1 font-medium">Track and manage outgoing vendor contract negotiations.</p>
                </div>
                <button
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
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
                            // Using a Droppable container needs useDroppable, but for simplicity we rely on items.
                            // To fix "dropping on empty column", we would ideally implement useDroppable here.
                            // For this MVP, we will rely on dropping onto existing items or implement a basic droppable.
                            <KanbanColumn key={stage} stage={stage} items={items} onEdit={(n) => { setEditingItem(n); setIsModalOpen(true); }} />
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
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-black text-slate-900">{editingItem ? 'Edit Negotiation' : 'New Negotiation'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
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
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"
                                        defaultValue={editingItem?.vendor}
                                        id="n-vendor"
                                    >
                                        <option value="">Select Vendor...</option>
                                        {vendorOptions.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                        {/* Fallback if editing an item with a vendor not in list */}
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
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-between">
                            {editingItem ? (
                                <button
                                    onClick={() => deleteNegotiation(editingItem.id)}
                                    className="text-red-500 font-bold hover:text-red-700 text-sm"
                                >
                                    Delete
                                </button>
                            ) : <div></div>}
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
                                            owner: editingItem?.owner || 'Me'
                                        });
                                    }
                                }}
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center space-x-2"
                            >
                                <Save size={18} />
                                <span>Save Negotiation</span>
                            </button>
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
