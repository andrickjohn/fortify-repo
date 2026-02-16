import React, { useState, useEffect } from 'react';
import { Database, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, Bot, FileText, Cpu, Key, Lock, Settings2, User } from 'lucide-react';

interface IntegrationConfig {
    apiKey?: string;
    model?: string;
    enabled?: boolean;
}

interface IntegrationDef {
    id: string;
    name: string;
    icon: React.ElementType;
    description: string;
    status: 'connected' | 'disconnected' | 'coming_soon';
    defaultModel: string;
    availableModels: string[];
}

interface DataIntegrationsProps {
    userSettings: any;
    districtSettings: any;
    userRole: string | null;
    onUpdateUserSettings: (settings: any) => Promise<void>;
    onUpdateDistrictSettings: (settings: any) => Promise<void>;
}

const DEFINITIONS: IntegrationDef[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        icon: Bot,
        description: 'Power contract analysis and risk detection.',
        status: 'connected',
        defaultModel: 'gpt-4o',
        availableModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo']
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        icon: Cpu,
        description: 'Advanced reasoning for negotiation strategies.',
        status: 'connected',
        defaultModel: 'gemini-2.0-flash',
        availableModels: ['gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro-002', 'gemini-1.5-flash-002']
    }
];

export function DataIntegrations({
    userSettings,
    districtSettings,
    userRole,
    onUpdateUserSettings,
    onUpdateDistrictSettings
}: DataIntegrationsProps) {
    const isAdmin = userRole === 'super_admin' || userRole === 'district_admin';
    const [editMode, setEditMode] = useState<'user' | 'district'>('user');
    const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

    // Formatting helper
    const maskKey = (key?: string) => {
        if (!key) return '';
        if (key.length < 8) return '********';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    // Calculate effective settings for display
    const getEffectiveSetting = (id: string, field: 'apiKey' | 'model' | 'enabled') => {
        const userVal = userSettings?.integrations?.[id]?.[field];
        const districtVal = districtSettings?.integrations?.[id]?.[field];
        const systemDefault = DEFINITIONS.find(d => d.id === id) as any;

        // Model fallback: User > District > System Default
        if (field === 'model') {
            return userVal || districtVal || systemDefault?.defaultModel;
        }

        // Enabled fallback: User > District > false (default for safety)
        if (field === 'enabled') {
            if (userVal !== undefined) return userVal;
            if (districtVal !== undefined) return districtVal;
            return false;
        }

        // API Key fallback: User > District
        if (field === 'apiKey') {
            if (userVal) return { value: userVal, source: 'user' };
            if (districtVal) return { value: districtVal, source: 'district' };
            return { value: null, source: 'system' };
        }
    };

    const handleSave = async (id: string, field: string, value: any) => {
        const targetSettings = editMode === 'user' ? userSettings : districtSettings;
        const currentIntegrations = targetSettings?.integrations || {};

        const newIntegrations = {
            ...currentIntegrations,
            [id]: {
                ...(currentIntegrations[id] || {}),
                [field]: value
            }
        };

        const newFullSettings = {
            ...targetSettings,
            integrations: newIntegrations
        };

        if (editMode === 'user') {
            await onUpdateUserSettings(newFullSettings);
        } else {
            await onUpdateDistrictSettings(newFullSettings);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Data Integrations</h3>
                    <p className="text-slate-500 mt-1">Manage external connections and AI model providers.</p>
                </div>

                {isAdmin && (
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setEditMode('user')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${editMode === 'user' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <User size={14} />
                            My Personal Keys
                        </button>
                        <button
                            onClick={() => setEditMode('district')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${editMode === 'district' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Database size={14} />
                            District Defaults
                        </button>
                    </div>
                )}
            </div>

            {/* Context Banner */}
            <div className={`p-4 rounded-xl border flex gap-3 text-sm ${editMode === 'district'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-100 text-blue-900'
                }`}>
                {editMode === 'district' ? (
                    <AlertCircle size={20} className="shrink-0 text-amber-600" />
                ) : (
                    <Key size={20} className="shrink-0 text-blue-600" />
                )}
                <div>
                    <span className="font-bold block mb-1">
                        {editMode === 'district' ? 'EDITING DISTRICT DEFAULTS' : 'EDITING YOUR PERSONAL SETTINGS'}
                    </span>
                    <span className="opacity-90">
                        {editMode === 'district'
                            ? 'Keys set here will be used by everyone in your district who hasn\'t provided their own personal key.'
                            : 'Settings here override district defaults only for you. Use this to use your own personal API key.'}
                    </span>
                </div>
            </div>

            <div className="grid gap-4">
                {DEFINITIONS.map((def) => {
                    const activeSettings = editMode === 'user' ? userSettings?.integrations?.[def.id] : districtSettings?.integrations?.[def.id];
                    const effectiveKey = getEffectiveSetting(def.id, 'apiKey') as { value: string | null, source: string };
                    const isEnabled = activeSettings?.enabled ?? false;

                    return (
                        <div
                            key={def.id}
                            className={`p-6 rounded-2xl border transition-all ${isEnabled ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 w-full">
                                    <div className={`p-3 rounded-xl ${isEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <def.icon size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between pr-4">
                                            <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                                {def.name}
                                                {def.status === 'connected' && (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                        <CheckCircle2 size={10} />
                                                        Ready
                                                    </span>
                                                )}
                                            </h4>

                                            <button
                                                onClick={() => handleSave(def.id, 'enabled', !isEnabled)}
                                                className={`transition-colors ${isEnabled ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`}
                                            >
                                                {isEnabled ? <ToggleRight size={40} className="fill-current" /> : <ToggleLeft size={40} className="fill-current" />}
                                            </button>
                                        </div>

                                        <p className="text-slate-500 text-sm mt-1 mb-4">{def.description}</p>

                                        {/* Configuration Zone */}
                                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl border ${editMode === 'district' ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50/50 border-slate-100'
                                            }`}>

                                            {/* API Key Input */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Key size={12} />
                                                    {editMode === 'district' ? 'District API Key' : 'Your Personal API Key'}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={openKeys[def.id] ? "text" : "password"}
                                                        value={activeSettings?.apiKey || ''}
                                                        onChange={(e) => handleSave(def.id, 'apiKey', e.target.value)}
                                                        placeholder={
                                                            editMode === 'user'
                                                                ? (effectiveKey.source === 'district' ? 'Using District Default (Override here)' : 'Enter User API Key')
                                                                : 'Enter District-wide API Key'
                                                        }
                                                        className={`
                                                            w-full pl-3 pr-10 py-2 border rounded-lg text-sm font-mono text-slate-700 outline-none focus:ring-2 transition-all
                                                            ${editMode === 'district'
                                                                ? 'bg-amber-50 border-amber-200 focus:ring-amber-500'
                                                                : 'bg-white border-slate-200 focus:ring-blue-500'}
                                                        `}
                                                    />
                                                    <button
                                                        onClick={() => setOpenKeys(p => ({ ...p, [def.id]: !p[def.id] }))}
                                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {openKeys[def.id] ? <Settings2 size={14} /> : <Lock size={14} />}
                                                    </button>
                                                </div>
                                                {/* Source Indicator */}
                                                {editMode === 'user' && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                                                        <span className="text-slate-400">CURRENTLY USING:</span>
                                                        {effectiveKey.source === 'user' && <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">MY PERSONAL KEY</span>}
                                                        {effectiveKey.source === 'district' && <span className="text-amber-600 bg-amber-50 px-1 py-0.5 rounded">DISTRICT KEY</span>}
                                                        {effectiveKey.source === 'system' && <span className="text-slate-500 bg-slate-100 px-1 py-0.5 rounded">SYSTEM DEFAULT</span>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Model Selection */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Cpu size={12} />
                                                    Model
                                                </label>
                                                <select
                                                    value={activeSettings?.model || ''}
                                                    onChange={(e) => handleSave(def.id, 'model', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="">
                                                        {editMode === 'user'
                                                            ? `Default (${getEffectiveSetting(def.id, 'model')})`
                                                            : `System Default (${def.defaultModel})`
                                                        }
                                                    </option>
                                                    {def.availableModels.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}


                <div className="p-6 rounded-2xl border bg-slate-50 border-slate-200 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-slate-200 text-slate-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                BoardDocs
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </h4>
                            <p className="text-slate-500 text-sm mt-1">Import board meeting agendas and minutes.</p>
                        </div>
                    </div>
                </div>

            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <div>
                    <h5 className="font-bold text-blue-900 text-sm">Platform Status</h5>
                    <p className="text-blue-700 text-xs mt-1">
                        Use the "My Settings" tab to override District defaults. API keys are encrypted at rest.
                    </p>
                </div>
            </div>
        </div>
    );
}
