import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Shield, Lock, Key, Smartphone, Clock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface SecurityPreferences {
    require_2fa: boolean;
    session_timeout_minutes: number;
    password_expiry_days: number;
}

export function SecuritySettings() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [districtId, setDistrictId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // District-wide settings (Admin only)
    const [preferences, setPreferences] = useState<SecurityPreferences>({
        require_2fa: false,
        session_timeout_minutes: 60,
        password_expiry_days: 90
    });

    // Personal settings (Change Password)
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [policyMessage, setPolicyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userProfile } = await supabase
                .from('users')
                .select('district_id, role')
                .eq('id', user.id)
                .single();

            if (userProfile?.role === 'super_admin' || userProfile?.role === 'district_admin') {
                setIsAdmin(true);
            }

            if (userProfile?.district_id) {
                setDistrictId(userProfile.district_id);
                const { data: district } = await supabase
                    .from('districts')
                    .select('settings_json')
                    .eq('id', userProfile.district_id)
                    .single();

                if (district?.settings_json?.security) {
                    setPreferences(prev => ({ ...prev, ...district.settings_json.security }));
                }
            }
        } catch (err) {
            console.error('Error loading security settings:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 8) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPasswordMessage({ type: 'error', text: 'Failed to update password: ' + err.message });
        }
    };

    const handleSavePolicy = async () => {
        if (!districtId) return;
        setSaving(true);
        setPolicyMessage(null);

        try {
            const { data: district } = await supabase
                .from('districts')
                .select('settings_json')
                .eq('id', districtId)
                .single();

            const currentJson = district?.settings_json || {};
            const updatedJson = {
                ...currentJson,
                security: preferences
            };

            const { error } = await supabase
                .from('districts')
                .update({ settings_json: updatedJson })
                .eq('id', districtId);

            if (error) throw error;
            setPolicyMessage({ type: 'success', text: 'Security policies updated.' });
        } catch (err: any) {
            setPolicyMessage({ type: 'error', text: 'Failed to save policies: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="space-y-10">
            {/* 1. Personal Security (Change Password) */}
            <section>
                <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Login & Security</h3>
                        <p className="text-sm text-slate-500">Manage your personal account credentials.</p>
                    </div>
                </div>

                {passwordMessage && (
                    <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {passwordMessage.text}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Password</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Confirm New Password</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            Update Password
                        </button>
                    </div>
                </form>
            </section>

            {/* 2. District Policies (Admins Only) */}
            {isAdmin && (
                <section className="pt-8 border-t border-slate-100">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">District Policies</h3>
                            <p className="text-sm text-slate-500">Enforce security standards for all users in your district.</p>
                        </div>
                    </div>

                    {policyMessage && (
                        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${policyMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {policyMessage.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Multi-Factor Authentication (MFA)</div>
                                    <div className="text-xs text-slate-500">Require all admins to use 2FA.</div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={preferences.require_2fa}
                                    onChange={(e) => setPreferences({ ...preferences, require_2fa: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
                                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                                    <Clock size={16} className="text-slate-400" />
                                    <span>Session Timeout</span>
                                </div>
                                <select
                                    value={preferences.session_timeout_minutes}
                                    onChange={(e) => setPreferences({ ...preferences, session_timeout_minutes: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={15}>15 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                    <option value={60}>1 Hour</option>
                                    <option value={240}>4 Hours</option>
                                    <option value={1440}>24 Hours</option>
                                </select>
                            </div>

                            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
                                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                                    <Clock size={16} className="text-slate-400" />
                                    <span>Password Expiry</span>
                                </div>
                                <select
                                    value={preferences.password_expiry_days}
                                    onChange={(e) => setPreferences({ ...preferences, password_expiry_days: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={30}>Every 30 Days</option>
                                    <option value={60}>Every 60 Days</option>
                                    <option value={90}>Every 90 Days</option>
                                    <option value={365}>Yearly</option>
                                    <option value={0}>Never</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSavePolicy}
                                disabled={saving}
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? 'Saving Strategy...' : 'Update District Policies'}
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
