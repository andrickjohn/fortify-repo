import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Shield, User, Mail, Calendar, Plus, X, Loader2, Trash2, Building2, AlertCircle } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    role: string;
    created_at: string;
    last_login: string;
    full_name?: string;
    organization?: string;
    district_id?: string;
    districts?: { name: string };
}

interface District {
    id: string;
    name: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [districts, setDistricts] = useState<District[]>([]); // For Super Admin
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const supabase = createClient();

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteMode, setInviteMode] = useState<'invite' | 'create'>('invite');
    const [inviteEmail, setInviteEmail] = useState('');
    const [createForm, setCreateForm] = useState({ fullName: '', password: '' });
    const [inviteRole, setInviteRole] = useState('district_viewer');
    const [selectedDistrictId, setSelectedDistrictId] = useState<string>(''); // For creation
    const [inviting, setInviting] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [currentUserDistrictId, setCurrentUserDistrictId] = useState<string>('');

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editForm, setEditForm] = useState({ full_name: '', organization: '', role: '', district_id: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch current user's role to verify admin status
            const { data: currentUserProfile } = await supabase
                .from('users')
                .select('role, district_id')
                .eq('id', user.id)
                .maybeSingle();

            if (currentUserProfile) {
                setCurrentUserRole(currentUserProfile.role);
                setCurrentUserDistrictId(currentUserProfile.district_id);
                setSelectedDistrictId(currentUserProfile.district_id); // Default to own district
            }

            if (currentUserProfile?.role !== 'super_admin' && currentUserProfile?.role !== 'district_admin') {
                setError('You do not have permission to view this page.');
                setLoading(false);
                return;
            }

            // Fetch Districts if Super Admin
            if (currentUserProfile.role === 'super_admin') {
                const { data: allDistricts } = await supabase
                    .from('districts')
                    .select('id, name')
                    .order('name');
                setDistricts(allDistricts || []);
            }

            let districtUsers;
            let usersError;

            if (currentUserProfile.role === 'super_admin') {
                // Super admin sees ALL users across all districts (including unassigned)
                const result = await supabase
                    .from('users')
                    .select('*, districts(name)')
                    .order('created_at', { ascending: false });
                districtUsers = result.data;
                usersError = result.error;
            } else {
                // District admin sees only their district's users
                const result = await supabase
                    .from('users')
                    .select('*, districts(name)')
                    .eq('district_id', currentUserProfile.district_id)
                    .order('created_at', { ascending: false });
                districtUsers = result.data;
                usersError = result.error;
            }

            if (usersError) throw usersError;
            setUsers(districtUsers || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Assign a pending user to a district + role
    const handleAssignUser = async (userId: string, districtId: string, role: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ district_id: districtId, role })
                .eq('id', userId);
            if (error) throw error;
            fetchUsers();
        } catch (err: any) {
            setError('Failed to assign user: ' + err.message);
        }
    };


    const handleInviteOrCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setModalError(null); // Clear previous errors

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Use selected district for Super Admin, otherwise enforce own district
            const targetDistrictId = currentUserRole === 'super_admin' ? selectedDistrictId : currentUserDistrictId;

            if (!targetDistrictId) throw new Error("Target district not valid");

            if (inviteMode === 'invite') {
                // Existing Invite Logic
                const { error: inviteError } = await supabase
                    .from('invitations')
                    .insert({
                        email: inviteEmail,
                        district_id: targetDistrictId,
                        role: inviteRole,
                        invited_by: user.id
                    });

                if (inviteError) {
                    // Check for unique constraint violation (Postgres code 23505) OR error message text
                    if (inviteError.code === '23505' || inviteError.message.includes('duplicate key') || inviteError.message.includes('unique constraint')) {
                        setModalError("This user has already been invited.");
                        setInviting(false);
                        return; // Stop here, don't close modal
                    } else {
                        throw inviteError;
                    }
                }

                // Send invitation email via Resend
                try {
                    const emailRes = await fetch('/api/invitations/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: inviteEmail,
                            role: inviteRole,
                            district_id: targetDistrictId // Ensure API handles this if needed, or relies on invite?
                            // Actually API relies on invite record for district, 
                            // but we might want to pass it for explicit context if needed.
                            // Checked API: It reads from invite body in database usually? 
                            // Wait, api/invitations/send just sends email. 
                            // The invite record is source of truth.
                        })
                    });

                    if (!emailRes.ok) {
                        const errData = await emailRes.json();
                        console.warn('Email send failed:', errData.error);
                        alert("Invitation saved, but the email could not be sent. The user can still sign up with this email.");
                    } else {
                        alert("Invitation sent! An email has been delivered to " + inviteEmail);
                    }
                } catch (emailErr) {
                    console.warn('Email send error:', emailErr);
                    alert("Invitation saved, but the email could not be sent. The user can still sign up with this email.");
                }
            } else {
                // Manual Create Logic
                const res = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: inviteEmail,
                        password: createForm.password,
                        fullName: createForm.fullName,
                        role: inviteRole,
                        district_id: targetDistrictId
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to create user');
                }

                alert(`User created successfully! Share the credentials with them.\nEmail: ${inviteEmail}\nPassword: ${createForm.password}`);
            }

            setIsInviteModalOpen(false);
            setInviteEmail('');
            setCreateForm({ fullName: '', password: '' });
            setInviteRole('district_viewer');
            fetchUsers(); // Refresh list
        } catch (err: any) {
            console.error(err);
            setModalError(err.message || "Operation failed");
        } finally {
            setInviting(false);
        }
    };

    const allRoles = [
        { id: 'super_admin', label: 'Fortify Superuser', desc: 'Full system access', type: 'fortify' },
        { id: 'fortify_admin', label: 'Fortify Admin', desc: 'Administrative control', type: 'fortify' },
        { id: 'fortify_viewer', label: 'Fortify Read', desc: 'Read-only system access', type: 'fortify' },
        { id: 'district_admin', label: 'District Admin', desc: 'Manage district settings & team access', type: 'district' },
        { id: 'district_manager', label: 'Manager', desc: 'Can manage contracts & team', type: 'district' },
        { id: 'negotiator', label: 'Negotiator', desc: 'Focus on contract negotiations', type: 'district' },
        { id: 'data_entry', label: 'Data Entry', desc: 'Can upload and edit data', type: 'district' },
        { id: 'district_viewer', label: 'Viewer', desc: 'Read-only access', type: 'district' },
    ];

    const roles = currentUserRole === 'super_admin'
        ? allRoles
        : allRoles.filter(r => r.type === 'district');

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
    if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>;

    const handleEditClick = (user: UserProfile) => {
        setEditingUser(user);
        setEditForm({
            full_name: user.full_name || '',
            organization: user.organization || '',
            role: user.role,
            district_id: user.district_id || ''
        });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setSaving(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: editForm.full_name,
                    organization: editForm.organization,
                    role: editForm.role,
                    district_id: editForm.district_id || null
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            // Update local state - actually it's better to refetch to get the full district name
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.message || "Failed to update user");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Team Members</h3>
                    <p className="text-sm text-slate-500">Manage access to your district's data.</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={!currentUserDistrictId && currentUserRole !== 'super_admin'}
                >
                    <Plus size={16} />
                    <span>Invite User</span>
                </button>
            </div>

            <div className="space-y-4">
                {currentUserRole === 'super_admin' && users.filter(u => !u.district_id).length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-amber-600 mb-3 flex items-center gap-2">
                            <AlertCircle size={16} /> Pending Assignment ({users.filter(u => !u.district_id).length})
                        </h4>
                        <div className="space-y-3">
                            {users.filter(u => !u.district_id).map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-amber-200 shrink-0">
                                            <User className="text-amber-500" size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {user.full_name || user.email}
                                                </span>
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-bold uppercase tracking-wider">
                                                    Unassigned
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium">
                                                <span>{user.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                        >
                                            Assign District
                                        </button>
                                        <button className="text-slate-400 hover:text-red-600 p-2 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {users.filter(u => !!u.district_id || currentUserRole !== 'super_admin').map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shrink-0">
                                    <User className="text-slate-400" size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-sm">
                                            {user.full_name || user.email}
                                        </span>
                                        {currentUserRole === 'super_admin' && user.districts && (
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <Building2 size={10} />
                                                {user.districts.name}
                                            </span>
                                        )}
                                        {user.organization && (
                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-bold uppercase tracking-wider">
                                                {user.organization}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                                        <span>{user.email}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>Last login: {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${user.role === 'super_admin' || user.role === 'fortify_admin' ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' :
                                            user.role === 'district_admin' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                            {user.role === 'super_admin' ? 'Fortify Superuser' :
                                                roles.find(r => r.id === user.role)?.label || user.role.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center">
                                            <Calendar size={10} className="mr-1" />
                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEditClick(user)}
                                    className="text-slate-400 hover:text-blue-600 p-2 transition-colors"
                                >
                                    <div className="sr-only">Edit</div>
                                    <User size={16} />
                                </button>
                                <button className="text-slate-400 hover:text-red-600 p-2 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invite / Create User Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-900">Add Team Member</h3>
                            <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {modalError && (
                            <div className="mx-6 mt-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                                <Shield className="shrink-0" size={16} />
                                <span>{modalError}</span>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100">
                            <button
                                onClick={() => setInviteMode('invite')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${inviteMode === 'invite' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Invite via Email
                            </button>
                            <button
                                onClick={() => setInviteMode('create')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${inviteMode === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Create Manually
                            </button>
                        </div>

                        <form onSubmit={handleInviteOrCreate} className="p-6 space-y-4">
                            {/* District Selector for Super Admin */}
                            {currentUserRole === 'super_admin' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target District</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <select
                                            value={selectedDistrictId}
                                            onChange={(e) => setSelectedDistrictId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select a District</option>
                                            {districts.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {inviteMode === 'create' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={createForm.fullName}
                                            onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="colleague@district.edu"
                                    />
                                </div>
                            </div>

                            {inviteMode === 'create' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Temporary Password</label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.password}
                                        onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                                        placeholder="Enter password"
                                    />
                                    <p className="text-[10px] text-slate-500">Provide this to the user securely. They can change it later.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Role</label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                                    {roles.map((role) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setInviteRole(role.id)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${inviteRole === role.id
                                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                : 'border-slate-100 hover:border-slate-200 bg-white'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${inviteRole === role.id ? 'border-blue-500' : 'border-slate-300'}`}>
                                                {inviteRole === role.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-bold ${inviteRole === role.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    {role.label}
                                                </div>
                                                <div className="text-[10px] text-slate-500">{role.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={inviting}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {inviting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                <span>
                                    {inviting ? 'Processing...' : inviteMode === 'create' ? 'Create User' : 'Send Invitation'}
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-900">Edit Team Member</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={editForm.full_name}
                                            onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Organization / Department</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={editForm.organization}
                                            onChange={e => setEditForm({ ...editForm, organization: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="e.g. Legal, Finance, Facilities"
                                        />
                                    </div>
                                </div>
                            </div>

                            {currentUserRole === 'super_admin' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Primary District</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <select
                                            value={editForm.district_id}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, district_id: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="">No District (Pending Assignment)</option>
                                            {districts.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Role</label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                                    {roles.map((role) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, role: role.id })}
                                            className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${editForm.role === role.id
                                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                : 'border-slate-100 hover:border-slate-200 bg-white'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${editForm.role === role.id ? 'border-blue-500' : 'border-slate-300'}`}>
                                                {editForm.role === role.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-bold ${editForm.role === role.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    {role.label}
                                                </div>
                                                <div className="text-[10px] text-slate-500">{role.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <User size={18} />}
                                <span>{saving ? 'Updating User...' : 'Update Team Member'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
