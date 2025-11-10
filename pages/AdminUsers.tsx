import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSupabase } from '../supabaseClient';
import { UserContext } from '../App';

interface ManagedUser {
    id: string;
    email: string;
    role: 'user' | 'admin';
}

const AdminUsers: React.FC = () => {
    const userContext = useContext(UserContext);
    const isAdmin = useMemo(() => userContext?.user.role === 'admin', [userContext?.user.role]);
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAdmin) return;
        if (!adminSupabase) {
            setError('Admin Supabase client is not configured.');
            setLoading(false);
            return;
        }

        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: listError } = await adminSupabase.auth.admin.listUsers();
                if (listError) throw listError;
                const sanitized = (data?.users ?? []).map(user => ({
                    id: user.id,
                    email: user.email ?? 'unknown@user',
                    role: (user.user_metadata?.role as 'user' | 'admin') ?? 'user',
                }));
                setUsers(sanitized);
            } catch (err: any) {
                setError(err.message ?? 'Failed to load users.');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [isAdmin]);

    if (!isAdmin) {
        return <p className="text-sm text-red-400">Admin privileges required.</p>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
                    <p className="text-secondary text-sm">View all users and manage their roles and permissions.</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/admin/create-user')}
                    className="rounded-xl bg-lava-core px-6 py-2 font-semibold text-white transition hover:bg-lava-warm"
                >
                    Create User
                </button>
            </header>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {loading ? (
                <p className="text-sm text-secondary">Loading users…</p>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-border-low bg-glass-panel/70">
                    <table className="min-w-full divide-y divide-border-low text-left text-sm">
                        <thead className="bg-glass-panel/50 text-secondary uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Email</th>
                                <th className="px-6 py-3 font-semibold">Role</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-low text-primary">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 font-medium">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                            user.role === 'admin' 
                                                ? 'bg-amber-500/20 text-amber-200' 
                                                : 'bg-slate-500/20 text-slate-200'
                                        }`}>
                                            {user.role === 'admin' ? 'Admin' : 'User'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/admin/user/${user.id}/edit`)}
                                            className="rounded-lg bg-lava-core px-4 py-2 text-sm font-semibold text-white transition hover:bg-lava-warm"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center text-secondary">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
