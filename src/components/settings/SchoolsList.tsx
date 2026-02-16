import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, School, MapPin, Users, User, Loader2 } from 'lucide-react';

interface School {
    id: string;
    name: string;
    address: string | null;
    principal_name: string | null;
    enrollment: number;
}

interface SchoolsListProps {
    districtId: string;
}

export function SchoolsList({ districtId }: SchoolsListProps) {
    const supabase = createClient();
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);

    // New School Form State
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newPrincipal, setNewPrincipal] = useState('');
    const [newEnrollment, setNewEnrollment] = useState('');

    useEffect(() => {
        fetchSchools();
    }, [districtId]);

    const fetchSchools = async () => {
        try {
            const { data, error } = await supabase
                .from('schools')
                .select('*')
                .eq('district_id', districtId)
                .order('name');

            if (error) throw error;
            setSchools(data || []);
        } catch (error) {
            console.error('Error fetching schools:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { data, error } = await supabase
                .from('schools')
                .insert({
                    district_id: districtId,
                    name: newName,
                    address: newAddress,
                    principal_name: newPrincipal,
                    enrollment: parseInt(newEnrollment) || 0
                })
                .select()
                .single();

            if (error) throw error;

            setSchools([...schools, data]);
            setIsAdding(false);
            // Reset form
            setNewName('');
            setNewAddress('');
            setNewPrincipal('');
            setNewEnrollment('');
        } catch (error) {
            console.error('Error adding school:', error);
            alert('Failed to add school');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSchool = async (id: string) => {
        if (!confirm('Are you sure you want to remove this school?')) return;

        try {
            const { error } = await supabase
                .from('schools')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSchools(schools.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting school:', error);
            alert('Failed to delete school');
        }
    };

    if (loading) return <div className="py-4 text-center text-slate-400">Loading schools...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <School size={18} className="text-slate-500" />
                    School Sites
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                        {schools.length}
                    </span>
                </h4>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-sm text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1"
                >
                    <Plus size={16} />
                    Add School
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddSchool} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                            required
                            placeholder="School Name"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            placeholder="Address"
                            value={newAddress}
                            onChange={e => setNewAddress(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            placeholder="Principal Name"
                            value={newPrincipal}
                            onChange={e => setNewPrincipal(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            type="number"
                            placeholder="Enrollment"
                            value={newEnrollment}
                            onChange={e => setNewEnrollment(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                        >
                            {saving && <Loader2 size={12} className="animate-spin" />}
                            Save School
                        </button>
                    </div>
                </form>
            )}

            <div className="grid gap-3">
                {schools.length === 0 && !isAdding && (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                        No schools added yet.
                    </div>
                )}

                {schools.map(school => (
                    <div key={school.id} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all shadow-sm">
                        <div>
                            <div className="font-bold text-slate-900">{school.name}</div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                {school.address && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={12} /> {school.address}
                                    </span>
                                )}
                                {school.principal_name && (
                                    <span className="flex items-center gap-1">
                                        <User size={12} /> {school.principal_name}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Users size={12} /> {school.enrollment} students
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDeleteSchool(school.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove School"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
