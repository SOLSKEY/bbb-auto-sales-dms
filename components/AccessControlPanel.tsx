import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../supabaseClient';
import type { UserAccessPolicy, AppSectionKey } from '../types';

const APP_PAGES: AppSectionKey[] = [
    'Dashboard',
    'Inventory',
    'Sales',
    'Collections',
    'Reports',
    'Data',
    'Calendar',
    'Team Chat',
    'Settings',
];

interface AccessControlPanelProps {
    currentUserId?: string;
}

const AccessControlPanel: React.FC<AccessControlPanelProps> = ({ currentUserId }) => {
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [policies, setPolicies] = useState<Record<string, UserAccessPolicy['permissions']>>({});
    const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!adminSupabase) {
            setError('Admin Supabase client not configured.');
            return;
        }

        const loadUsers = async () => {
            setLoading(true);
            try {
                const { data, error: listError } = await adminSupabase.auth.admin.listUsers();
                if (listError) throw listError;
                const sanitized = (data?.users ?? [])
                    .filter(u => (currentUserId ? u.id !== currentUserId : true))
                    .map(user => ({ id: user.id, email: user.email ?? 'unknown@user' }));
                setUsers(sanitized);
            } catch (err: any) {
                setError(err.message ?? 'Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        loadUsers();
    }, [currentUserId]);

    useEffect(() => {
        if (!adminSupabase) return;

        const loadPolicy = async () => {
            if (!selectedUser) return;
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await adminSupabase
                    .from('UserPermissions')
                    .select('*')
                    .eq('user_id', selectedUser)
                    .maybeSingle();
                if (fetchError) throw fetchError;
                if (data) {
                    setPolicies(prev => ({ ...prev, [selectedUser]: data.permissions as UserAccessPolicy['permissions'] }));
                } else {
                    const defaultPolicy = APP_PAGES.reduce((acc, page) => {
                        acc[page] = { canView: true, canEdit: false };
                        return acc;
                    }, {} as UserAccessPolicy['permissions']);
                    setPolicies(prev => ({ ...prev, [selectedUser]: defaultPolicy }));
                }
            } catch (err: any) {
                setError(err.message ?? 'Failed to load policy');
            } finally {
                setLoading(false);
            }
        };

        loadPolicy();
    }, [selectedUser]);

    const updatePermission = (page: AppSectionKey, key: 'canView' | 'canEdit') => {
        if (!selectedUser) return;
        setPolicies(prev => ({
            ...prev,
            [selectedUser]: {
                ...prev[selectedUser],
                [page]: {
                    ...prev[selectedUser][page],
                    [key]: key === 'canEdit'
                        ? !prev[selectedUser][page].canEdit
                        : !prev[selectedUser][page].canView,
                },
            },
        }));
    };

    const handleSave = async () => {
        if (!selectedUser || !adminSupabase) return;
        setSaving(true);
        setError(null);
        try {
            const { error: saveError } = await adminSupabase.from('UserPermissions').upsert(
                {
                    user_id: selectedUser,
                    permissions: policies[selectedUser],
                },
                { onConflict: 'user_id' }
            );

            if (saveError) {
                console.error('Failed to save permissions:', saveError);
                console.error('Error details:', JSON.stringify(saveError, null, 2));
                throw new Error(saveError.message ?? 'Failed to save policy');
            }

            console.log('Successfully saved permissions for user:', selectedUser);
            alert('Permissions saved successfully!');
        } catch (err: any) {
            console.error('Exception saving permissions:', err);
            setError(err.message ?? 'Failed to save policy');
        } finally {
            setSaving(false);
        }
    };

    const selectedPolicy = selectedUser ? policies[selectedUser] : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <select
                    value={selectedUser}
                    onChange={event => setSelectedUser(event.target.value)}
                    className="w-80 rounded-lg border border-border-low bg-transparent px-3 py-2 text-primary focus:border-lava-core focus:outline-none"
                >
                    <option value="">Select a user</option>
                    {users.map(user => (
                        <option key={user.id} value={user.id}>
                            {user.email}
                        </option>
                    ))}
                </select>
                {selectedUser && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-lg bg-lava-core px-4 py-2 text-sm font-semibold text-white"
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {loading && <p className="text-sm text-secondary">Loading…</p>}

            {selectedPolicy && (
                <div className="overflow-x-auto rounded-xl border border-border-low">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-glass-panel/50 text-secondary">
                            <tr>
                                <th className="px-3 py-2">Page</th>
                                <th className="px-3 py-2">Can View</th>
                                <th className="px-3 py-2">Can Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {APP_PAGES.map(page => (
                                <tr key={page} className="border-t border-border-low text-primary">
                                    <td className="px-3 py-2 font-medium">{page}</td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 accent-lava-core"
                                            checked={selectedPolicy[page].canView}
                                            onChange={() => updatePermission(page, 'canView')}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 accent-lava-core"
                                            checked={selectedPolicy[page].canEdit}
                                            disabled={!selectedPolicy[page].canView}
                                            onChange={() => updatePermission(page, 'canEdit')}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AccessControlPanel;
