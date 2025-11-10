import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';
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

        const loadUserData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { user: userData } = await adminApi.getUserById(id);

                if (userData) {
                    setUserEmail(userData.email ?? 'unknown@user');
                    const role = (userData.role as 'user' | 'admin') ?? 'user';
                    setUserRole(role);
                }
            } catch (err: any) {
                console.error('Error loading user:', err);
                setError(err.message ?? 'Failed to load user data. Make sure the API server is running.');
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [id, isAdmin]);

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await adminApi.updateUserRole(id, userRole);

            console.log('Successfully updated role for user:', id, 'to:', userRole);

            setSuccess('User role updated successfully.');
            setTimeout(() => {
                navigate('/admin/users');
            }, 1500);
        } catch (err: any) {
            console.error('Error updating user:', err);
            setError(err.message ?? 'Failed to save changes. Make sure the API server is running.');
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
