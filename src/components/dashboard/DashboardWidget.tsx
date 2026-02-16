"use client";

import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import Link from 'next/link';

interface Props {
    id: string;
    children: React.ReactNode;
    title: string;
    isConfiguring?: boolean;
    onSizeChange?: (size: 1 | 2 | 3) => void;
    size?: 1 | 2 | 3;
    href?: string;
}

export interface DashboardWidgetBaseProps extends Props {
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    setNodeRef?: (node: HTMLElement | null) => void;
    isDragging?: boolean;
    isOverlay?: boolean;
}

export function DashboardWidgetBase({
    id, children, title, isConfiguring, onSizeChange, size = 1, href,
    style, attributes, listeners, setNodeRef, isDragging, isOverlay
}: DashboardWidgetBaseProps) {
    // If this item is being dragged in the list (not the overlay), show placeholder.
    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`rounded-2xl border-2 border-dashed border-slate-300/50 bg-slate-50/50 h-full w-full`}
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden group h-full ${isConfiguring
                ? "border-blue-400 border-dashed bg-blue-50/10 ring-4 ring-blue-500/5 shadow-md"
                : "border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200 ease-in-out"
                } ${isOverlay ? "shadow-2xl scale-[1.02] cursor-grabbing" : ""}`}
        >
            <div
                {...attributes}
                {...listeners}
                className="flex items-center justify-between p-4 border-b border-slate-50 cursor-grab active:cursor-grabbing hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center space-x-2">
                    <GripVertical size={16} className="text-slate-300" />
                    {href && !isConfiguring ? (
                        <Link href={href} className="text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <span>{title}</span>
                        </Link>
                    ) : (
                        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    )}
                </div>
                {isConfiguring && onSizeChange && (
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg space-x-1" onClick={(e) => e.stopPropagation()}>
                        {[1, 2, 3].map((s) => (
                            <button
                                key={s}
                                onClick={() => onSizeChange(s as 1 | 2 | 3)}
                                className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${size === s ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-1 p-6 overflow-hidden">
                {children}
            </div>
        </div>
    );
}

export function DashboardWidget(props: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    if (!mounted) return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden opacity-0`}>
            <div className="h-48" />
        </div>
    );

    return (
        <DashboardWidgetBase
            {...props}
            style={style}
            attributes={attributes}
            listeners={listeners}
            setNodeRef={setNodeRef}
            isDragging={isDragging}
        />
    );
}
