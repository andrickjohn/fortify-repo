import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Bell, Mail, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface NotificationSettings {
    support_email: string;
    notify_contract_expiry: boolean;
    notify_budget_threshold: boolean;
    notify_new_vendor: boolean;
}

export function NotificationsSettings() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [districtId, setDistrictId] = useState<string | null>(null);
    const [settings, setSettings] = useState<NotificationSettings>({
        support_email: 'support@fortify.app',
        notify_contract_expiry: true,
        notify_budget_threshold: true,
        notify_new_vendor: false,
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userProfile } = await supabase
                .from('users')
                .select('district_id')
                .eq('id', user.id)
                .single();

            if (userProfile?.district_id) {
                setDistrictId(userProfile.district_id);
                const { data: district } = await supabase
                    .from('districts')
                    .select('settings_json')
                    .eq('id', userProfile.district_id)
                    .single();

                if (district?.settings_json) {
                    setSettings(prev => ({ ...prev, ...district.settings_json }));
                }
            }
        } catch (err) {
            console.error('Error loading notification settings:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!districtId) return;
        setSaving(true);
        setMessage(null);

        try {
            // First get current settings to merge
            const { data: district } = await supabase
                .from('districts')
                .select('settings_json')
                .eq('id', districtId)
                .single();

            const currentJson = district?.settings_json || {};
            const updatedJson = { ...currentJson, ...settings };

            const { error } = await supabase
                .from('districts')
                .update({ settings_json: updatedJson })
                .eq('id', districtId);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Notification preferences saved.' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to save: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <form onSubmit={handleSave} className="space-y-8">
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Notification Preferences</h3>
                <p className="text-slate-500 text-sm">Manage how and when you receive alerts.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Support Contact Destination</label>
                    <p className="text-xs text-slate-400">Where should support requests from the dashboard be sent?</p>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="email"
                            value={settings.support_email}
                            onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="support@fortify.app"
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alert Triggers</label>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">Contract Expiration</div>
                                <div className="text-xs text-slate-500">Notify when contracts are expiring in 30/60/90 days</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.notify_contract_expiry}
                                onChange={(e) => setSettings({ ...settings, notify_contract_expiry: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">Budget Thresholds</div>
                                <div className="text-xs text-slate-500">Notify when spending exceeds 80% of budget</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.notify_budget_threshold}
                                onChange={(e) => setSettings({ ...settings, notify_budget_threshold: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <CheckCircle size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">New Vendor Onboarding</div>
                                <div className="text-xs text-slate-500">Notify when a new vendor is added</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.notify_new_vendor}
                                onChange={(e) => setSettings({ ...settings, notify_new_vendor: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving Preferences...' : 'Save Preferences'}
                </button>
            </div>
        </form>
    );
}
