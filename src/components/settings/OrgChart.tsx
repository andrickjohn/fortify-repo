import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Building2, Shield, ChevronDown, ChevronRight,
    User, Crown, MapPin, Layers, Briefcase, GraduationCap, School
} from 'lucide-react';

interface District {
    id: string;
    name: string;
}

interface School {
    id: string;
    name: string;
    district_id: string;
    principal_name?: string;
    enrollment?: number;
}

interface UserProfile {
    id: string;
    email: string;
    role: string;
    full_name?: string;
    district_id?: string;
    districts?: { name: string };
}

interface TreeNode {
    id: string;
    type: 'root' | 'district' | 'role_group' | 'user' | 'school';
    label: string;
    data?: any;
    children: TreeNode[];
    icon?: any;
    color?: string;
}

export function OrgChart() {
    const supabase = createClient();
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'group-clients']));

    useEffect(() => {
        fetchOrgData();
    }, []);

    const fetchOrgData = async () => {
        try {
            // Fetch Districts
            const { data: districts, error: districtsError } = await supabase
                .from('districts')
                .select('id, name')
                .order('name');

            if (districtsError) throw districtsError;

            // Fetch Schools
            const { data: schools, error: schoolsError } = await supabase
                .from('schools')
                .select('*')
                .order('name');

            if (schoolsError) throw schoolsError;

            // Fetch Users
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('*, districts(name)')
                .order('role');

            if (usersError) throw usersError;

            // --- Build Tree Structure ---

            // Root: Fortify
            const root: TreeNode = {
                id: 'root',
                type: 'root',
                label: 'Fortify Operations',
                children: [],
                icon: Shield,
                color: 'bg-slate-900 text-white shadow-xl ring-4 ring-slate-100'
            };

            // 1. Fortify Team (Super Admins)
            const superAdmins = users?.filter(u => u.role === 'super_admin') || [];
            if (superAdmins.length > 0) {
                const fortifyTeam: TreeNode = {
                    id: 'group-fortify-team',
                    type: 'role_group',
                    label: 'Fortify Headquarters',
                    children: superAdmins.map(u => ({
                        id: u.id,
                        type: 'user',
                        label: u.full_name || u.email,
                        data: u,
                        children: [],
                        icon: Crown,
                        color: 'bg-purple-100 text-purple-700 border-purple-200'
                    })),
                    icon: Building2,
                    color: 'bg-white text-slate-800 border-slate-200 shadow-lg'
                };
                root.children.push(fortifyTeam);
            }

            // 2. Client Districts
            const clientGroup: TreeNode = {
                id: 'group-clients',
                type: 'role_group',
                label: 'Client Districts',
                children: [],
                icon: Briefcase,
                color: 'bg-blue-600 text-white shadow-lg'
            };

            districts?.forEach(d => {
                const dUsers = users?.filter(u => u.district_id === d.id && u.role !== 'super_admin') || [];
                const dSchools = schools?.filter(s => s.district_id === d.id) || [];

                const admins = dUsers.filter(u => u.role === 'district_admin');
                const others = dUsers.filter(u => u.role !== 'district_admin');

                const districtNode: TreeNode = {
                    id: `district-${d.id}`,
                    type: 'district',
                    label: d.name,
                    children: [],
                    icon: Layers,
                    color: 'bg-white text-blue-700 border-blue-200 shadow-md'
                };

                // A. District Administration
                if (admins.length > 0) {
                    districtNode.children.push({
                        id: `d-${d.id}-admins`,
                        type: 'role_group',
                        label: 'District Admin',
                        children: admins.map(u => ({
                            id: u.id,
                            type: 'user',
                            label: u.full_name || u.email,
                            data: u,
                            children: [],
                            icon: User,
                            color: 'bg-blue-50 text-blue-600 border-blue-100'
                        })),
                        icon: Shield,
                        color: 'bg-slate-50 text-slate-500 border-slate-200'
                    });
                }

                // B. Schools
                if (dSchools.length > 0) {
                    districtNode.children.push({
                        id: `d-${d.id}-schools`,
                        type: 'role_group',
                        label: 'School Sites',
                        children: dSchools.map(s => ({
                            id: s.id,
                            type: 'school',
                            label: s.name,
                            data: s,
                            children: [],
                            icon: School,
                            color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        })),
                        icon: GraduationCap,
                        color: 'bg-slate-50 text-slate-500 border-slate-200'
                    });
                }

                // C. Other Staff
                if (others.length > 0) {
                    districtNode.children.push({
                        id: `d-${d.id}-staff`,
                        type: 'role_group',
                        label: 'District Staff',
                        children: others.map(u => ({
                            id: u.id,
                            type: 'user',
                            label: u.full_name || u.email,
                            data: u,
                            children: [],
                            icon: User,
                            color: 'bg-gray-50 text-gray-600 border-gray-200'
                        })),
                        icon: Users,
                        color: 'bg-slate-50 text-slate-500 border-slate-200'
                    });
                }

                clientGroup.children.push(districtNode);
            });

            root.children.push(clientGroup);

            setTreeData(root);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleNode = (id: string) => {
        const newSet = new Set(expandedNodes);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedNodes(newSet);
    };

    // Zoom Handlers
    const handleWheel = (e: React.WheelEvent) => {
        const scaleAmount = -e.deltaY * 0.001;
        setZoom(z => Math.max(0.1, Math.min(3, z + scaleAmount)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (loading) return <div className="p-12 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
    if (!treeData) return <div>No data found</div>;

    return (
        <div className="relative border border-slate-200 rounded-3xl h-[600px] overflow-hidden bg-slate-50 select-none">
            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 bg-white p-2 rounded-xl shadow-lg border border-slate-100">
                <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 font-bold">+</button>
                <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 font-bold">-</button>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 font-bold text-xs">Reset</button>
            </div>

            <div className="absolute bottom-4 left-4 z-50 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-mono text-slate-400 border border-slate-200">
                {Math.round(zoom * 100)}%
            </div>

            <div
                className="w-full h-full cursor-grab active:cursor-grabbing origin-center"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <div className="flex flex-col items-center min-w-max min-h-max p-20">
                    <NodeComponent
                        node={treeData}
                        expandedNodes={expandedNodes}
                        toggleNode={toggleNode}
                        isRoot={true}
                    />
                </div>
            </div>
        </div>
    );
}

function NodeComponent({ node, expandedNodes, toggleNode, isRoot = false }: { node: TreeNode, expandedNodes: Set<string>, toggleNode: (id: string) => void, isRoot?: boolean }) {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="flex flex-col items-center">
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => hasChildren && toggleNode(node.id)}
                className={`
                    relative z-10 flex flex-col items-center justify-center 
                    cursor-pointer transition-all duration-200
                    ${isRoot ? 'mb-12' : 'mb-8'}
                `}
            >
                <div className={`
                    flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-sm select-none
                    ${node.color || 'bg-white border-slate-200 text-slate-700'}
                    ${hasChildren ? 'hover:scale-105 hover:shadow-md' : ''}
                `}>
                    {node.icon && <node.icon size={isRoot ? 24 : 18} />}
                    <div className="flex flex-col">
                        <span className={`font-bold ${isRoot ? 'text-lg' : 'text-sm'}`}>{node.label}</span>
                        {node.type === 'school' && node.data?.principal_name && (
                            <span className="text-[10px] opacity-75 font-medium">
                                Principal: {node.data.principal_name}
                            </span>
                        )}
                        {node.type === 'user' && node.data?.role && (
                            <span className="text-[10px] opacity-75 font-medium uppercase tracking-wider">
                                {node.data.role.replace('_', ' ')}
                            </span>
                        )}
                    </div>
                    {hasChildren && (
                        <div className={`ml-2 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown size={14} />
                        </div>
                    )}
                </div>

                {/* Vertical Connector Line (Down) */}
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 32 }} // 32px to reach next level
                        className="absolute top-full left-1/2 w-0.5 bg-slate-300 -translate-x-1/2 -z-10"
                    />
                )}
            </motion.div>

            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-row gap-8 items-start justify-center relative pt-8"
                    >
                        {/* 
                           Horizontal Bar logic: 
                           Draws a line spanning from the center of the first child to the center of the last child.
                           We use a simple absolute div positioned with left/right logic relative to the container.
                           Note: Exact pixel perfection requires knowing the width of children, but we can approximate visually
                           by saying "connect all children".
                           
                           Better logic: Each child draws its own "Up and Over" lines?
                           Let's stick to the "Tree" look:
                           - Parent has a line down (handled above).
                           - Children have lines going UP.
                           - A horizontal bar connects them.
                        */}

                        {node.children.length > 1 && (
                            // Horizontal connector bar
                            // Spans from 50% of first child to 50% of last child
                            <div className="absolute top-0 h-0.5 bg-slate-300 left-8 right-8" />
                            // This is imperfect without ref measurements.
                            // Alternative: Render individual connectors.
                        )}

                        {node.children.map((child, index) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Vertical Connector Line (Up) */}
                                <div className="absolute top-0 left-1/2 w-0.5 bg-slate-300 -translate-x-1/2 -mt-8 h-8 -z-20" />

                                {/* 
                                    Horizontal Connectors (Manual) 
                                    To create the "T" shape for children.
                                */}
                                {node.children.length > 1 && (
                                    <>
                                        {/* Line to the Right (if not last) */}
                                        {index < node.children.length - 1 && (
                                            <div className="absolute top-[-32px] left-[50%] w-[calc(50%+1rem)] h-0.5 bg-slate-300" />
                                        )}
                                        {/* Line to the Left (if not first) */}
                                        {index > 0 && (
                                            <div className="absolute top-[-32px] right-[50%] w-[calc(50%+1rem)] h-0.5 bg-slate-300" />
                                        )}
                                    </>
                                )}

                                <NodeComponent
                                    node={child}
                                    expandedNodes={expandedNodes}
                                    toggleNode={toggleNode}
                                />
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
