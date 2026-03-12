"use client";

import React, { useEffect, useState } from "react";
import { Settings, User, Bell, Shield, Database, Loader2, Users, Layers, School } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface District {
    id: string;
    name: string;
    subscription_tier: string;
    enrollment_current: number;
    settings_json: any;
}
import { UserManagement } from "@/components/settings/UserManagement";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { DataIntegrations } from "@/components/settings/DataIntegrations";
import { OrgChart } from "@/components/settings/OrgChart";
import { SchoolsList } from "@/components/settings/SchoolsList";
import { ManageDistricts } from "@/components/settings/ManageDistricts";

export default function SettingsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [district, setDistrict] = useState<District | null>(null);
    const [userID, setUserID] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userSettings, setUserSettings] = useState<any>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeSection, setActiveSection] = useState('profile');

    const baseSections = [
        { id: 'profile', label: 'District Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security & Access', icon: Shield },
        { id: 'integrations', label: 'Data Integrations', icon: Database },
    ];

    // Dynamically insert Users/OrgChart section for admins
    const sections = React.useMemo(() => {
        const base = [
            { id: 'profile', label: 'District Profile', icon: User },
        ];

        // Super admin gets Manage Districts at the top
        if (userRole === 'super_admin') {
            base.unshift({ id: 'manage_districts', label: '🏫 Manage Districts', icon: Layers });
        }

        if (userRole === 'super_admin' || userRole === 'district_admin') {
            base.push(
                { id: 'users', label: 'Team Members', icon: Users },
                { id: 'org_chart', label: 'Org Chart', icon: Layers },
            );
        }

        base.push(
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security & Access', icon: Shield },
            { id: 'integrations', label: 'Data Integrations', icon: Database },
        );

        return base;
    }, [userRole]);

    useEffect(() => {
        async function fetchDistrict() {
            try {
                // 1. Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setUserID(user.id);

                // 2. Get user profile
                const { data: userProfile, error: profileError } = await supabase
                    .from('users')
                    .select('district_id, role, settings_json')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;
                setUserRole(userProfile?.role);
                setUserSettings(userProfile?.settings_json || {});

                if (userProfile?.district_id) {
                    // 3. Get district details
                    const { data: districtData, error: districtError } = await supabase
                        .from('districts')
                        .select('*')
                        .eq('id', userProfile.district_id)
                        .single();

                    if (districtError) throw districtError;
                    setDistrict(districtData);
                }
            } catch (err: any) {
                console.error('Error fetching settings:', err);
                setMessage({ type: 'error', text: 'Failed to load settings. Please try again.' });
            } finally {
                setLoading(false);
            }
        }

        fetchDistrict();
    }, [supabase]);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!district) return;
        setSaving(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);

        // Preserve existing settings and merge new values
        const currentSettings = district.settings_json || {};
        const newSettings = {
            ...currentSettings,
            district_type: formData.get('districtType'),
            county: formData.get('county'),
            total_staff: formData.get('totalStaff'),
            school_sites: formData.get('schoolSites'),
        };

        const updates = {
            name: formData.get('districtName') as string,
            enrollment_current: parseInt(formData.get('enrollment') as string),
            settings_json: newSettings
        };

        try {
            const { error } = await supabase
                .from('districts')
                .update(updates)
                .eq('id', district.id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setDistrict(prev => prev ? { ...prev, ...updates } : null);

        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to save changes: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateUserSettings = async (newSettings: any) => {
        if (!userID) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ settings_json: newSettings })
                .eq('id', userID);

            if (error) throw error;
            setUserSettings(newSettings);
            setMessage({ type: 'success', text: 'User preferences updated!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to update user settings: ' + err.message });
        }
    };

    const handleUpdateDistrictSettings = async (newSettings: any) => {
        if (!district) return;

        try {
            const { error } = await supabase
                .from('districts')
                .update({ settings_json: newSettings })
                .eq('id', district.id);

            if (error) throw error;
            setDistrict(prev => prev ? { ...prev, settings_json: newSettings } : null);
            setMessage({ type: 'success', text: 'District integration settings updated!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to update district settings: ' + err.message });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 mt-1">Configure your district's Fortify platform and user preferences.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64 space-y-2">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeSection === section.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                                }`}
                        >
                            <section.icon size={18} />
                            <span>{section.label}</span>
                        </button>
                    ))}
                </aside>

                <div className={`${activeSection === 'org_chart' ? 'w-full max-w-full' : 'max-w-2xl'} flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-8`}>
                    {activeSection === 'profile' && (
                        <>
                            <h3 className="text-xl font-bold text-slate-900 mb-6">District Profile</h3>

                            {message && (
                                <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {message.text}
                                </div>
                            )}

                            {!district ? (
                                <div className="text-center py-12 text-slate-500">
                                    <p>No district profile found.</p>
                                    <p className="text-xs mt-2">Please contact support or run the account fix script.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">District Name</label>
                                            <input
                                                name="districtName"
                                                type="text"
                                                defaultValue={district.name}
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subscription</label>
                                            <input
                                                disabled
                                                value={district.subscription_tier.toUpperCase()}
                                                className="w-full bg-slate-100 text-slate-500 border-none rounded-xl px-4 py-3 text-sm font-medium cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Enrollment (CBEDS)</label>
                                        <input
                                            name="enrollment"
                                            type="number"
                                            defaultValue={district.enrollment_current || 0}
                                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">District Type</label>
                                            <input
                                                name="districtType"
                                                type="text"
                                                defaultValue={district.settings_json?.district_type || "Unified K-12"}
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                                placeholder="e.g. Unified K-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">County</label>
                                            <input
                                                name="county"
                                                type="text"
                                                defaultValue={district.settings_json?.county || "Orange"}
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Staff</label>
                                            <input
                                                name="totalStaff"
                                                type="text"
                                                defaultValue={district.settings_json?.total_staff || "0"}
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">School Sites</label>
                                            <input
                                                name="schoolSites"
                                                type="number"
                                                defaultValue={district.settings_json?.school_sites || 0}
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 my-8 pt-8">
                                        <SchoolsList districtId={district.id} />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 mt-4 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    {activeSection === 'users' && (
                        <UserManagement />
                    )}

                    {activeSection === 'org_chart' && (
                        <OrgChart />
                    )}

                    {activeSection === 'notifications' && (
                        <NotificationsSettings />
                    )}

                    {activeSection === 'security' && (
                        <SecuritySettings />
                    )}

                    {activeSection === 'integrations' && (
                        <DataIntegrations
                            userSettings={userSettings}
                            districtSettings={district?.settings_json || {}}
                            userRole={userRole}
                            onUpdateUserSettings={handleUpdateUserSettings}
                            onUpdateDistrictSettings={handleUpdateDistrictSettings}
                        />
                    )}

                    {activeSection === 'manage_districts' && (
                        <ManageDistricts />
                    )}

                    {activeSection !== 'profile' && activeSection !== 'users' && activeSection !== 'org_chart' && activeSection !== 'notifications' && activeSection !== 'security' && activeSection !== 'integrations' && activeSection !== 'manage_districts' && (
                        <div className="text-center py-20">
                            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                {sections.find(s => s.id === activeSection)?.icon && React.createElement(sections.find(s => s.id === activeSection)!.icon, { size: 32, className: "text-slate-300" })}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Coming Soon</h3>
                            <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                                The {sections.find(s => s.id === activeSection)?.label} module is currently under development.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
