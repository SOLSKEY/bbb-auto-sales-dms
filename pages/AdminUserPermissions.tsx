import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminSupabase } from '../supabaseClient';
import { UserContext } from '../App';

const AdminUserPermissions: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const userContext = useContext(UserContext);
    const isAdmin = useMemo(() => userContext?.user.role === 'admin', [userContext?.user.role]);
    const [userEmail, setUserEmail] = useState<string>('');
    const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAdmin || !id) return;
        if (!adminSupabase) {
            setError('Admin Supabase client is not configured.');
            setLoading(false);
            return;
        }

        const loadUserData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(id);

                if (userError) throw userError;

                if (userData?.user) {
                    setUserEmail(userData.user.email ?? 'unknown@user');
                    const role = (userData.user.user_metadata?.role as 'user' | 'admin') ?? 'user';
                    setUserRole(role);
                }
            } catch (err: any) {
                setError(err.message ?? 'Failed to load user data.');
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [id, isAdmin]);

    const handleSave = async () => {
        if (!id || !adminSupabase) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            // Update user role - permissions are now determined automatically by role
            const { error: roleError } = await adminSupabase.auth.admin.updateUserById(id, {
                user_metadata: { role: userRole },
            });

            if (roleError) {
                throw new Error(roleError.message ?? 'Failed to update user role.');
            }

            console.log('Successfully updated role for user:', id, 'to:', userRole);

            setSuccess('User role updated successfully.');
            setTimeout(() => {
                navigate('/admin/users');
            }, 1500);
        } catch (err: any) {
            setError(err.message ?? 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return <p className="text-sm text-red-400">Admin privileges required.</p>;
    }

    if (!id) {
        return <p className="text-sm text-red-400">No user id provided.</p>;
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/users')}
                        className="text-sm font-semibold text-secondary transition hover:text-primary"
                    >
                        ← Back to Users
                    </button>
                    <h1 className="text-2xl font-bold text-primary">Edit User</h1>
                    <p className="text-secondary text-sm">{userEmail ? `User: ${userEmail}` : 'Loading user…'}</p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="rounded-lg bg-lava-core px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </header>
            {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            {success && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}
            {loading ? (
                <p className="text-sm text-secondary">Loading user data…</p>
            ) : (
                <>
                    {/* Role Section */}
                    <div className="rounded-2xl border border-border-low bg-glass-panel/70 p-6">
                        <h2 className="mb-4 text-lg font-semibold text-primary">User Role</h2>
                        <label className="block text-sm font-medium text-secondary">
                            Role
                            <select
                                value={userRole}
                                onChange={event => setUserRole(event.target.value as 'user' | 'admin')}
                                className="mt-2 w-full rounded-lg border border-border-low bg-transparent px-3 py-2 text-primary focus:border-lava-core focus:outline-none"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>
                        <div className="mt-4 space-y-2">
                            <p className="text-xs text-secondary font-semibold">Role Permissions:</p>
                            {userRole === 'admin' ? (
                                <ul className="text-xs text-secondary space-y-1 list-disc list-inside">
                                    <li>Full access to all pages</li>
                                    <li>Can view and edit all content</li>
                                    <li>Can manage other users</li>
                                </ul>
                            ) : (
                                <ul className="text-xs text-secondary space-y-1 list-disc list-inside">
                                    <li>Can view: Dashboard, Inventory, Sales, Collections, Calendar, Team Chat</li>
                                    <li>Cannot view: Settings, Reports, Data</li>
                                    <li>Cannot edit any content</li>
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminUserPermissions;
