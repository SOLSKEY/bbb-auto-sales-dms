import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../lib/adminApi';
import { UserContext } from '../App';

interface ManagedUser {
    id: string;
    email: string;
    username: string | null;
    phone_number: string | null;
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

        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const { users: fetchedUsers } = await adminApi.listUsers();
                const sanitized = fetchedUsers.map((user: any) => ({
                    id: user.id,
                    email: user.email ?? 'unknown@user',
                    username: user.username ?? null,
                    phone_number: user.phone_number ?? null,
                    role: (user.role as 'user' | 'admin') ?? 'user',
                }));
                setUsers(sanitized);
            } catch (err: any) {
                console.error('Error loading users:', err);
                // Show more helpful error messages with better formatting
                const errorMessage = err.message || 'Failed to load users.';
                let displayMessage = errorMessage;
                
                // Handle multi-line error messages (replace \n with spaces for single line display)
                if (errorMessage.includes('\n')) {
                    displayMessage = errorMessage.split('\n').join(' ');
                }
                
                // Provide more specific guidance based on error type
                if (errorMessage.includes('VITE_API_URL') || errorMessage.includes('API server URL is not configured')) {
                    displayMessage = '⚠️ API server is not configured. Please set VITE_API_URL environment variable to your API server URL.';
                } else if (errorMessage.includes('connect to API server') || errorMessage.includes('not reachable')) {
                    displayMessage = '⚠️ Cannot connect to API server. Please ensure the server is running and VITE_API_URL is correct.';
                } else if (errorMessage.includes('HTML instead of JSON')) {
                    displayMessage = '⚠️ API endpoint returned HTML (likely a 404). The API server may not be accessible. Please check VITE_API_URL configuration.';
                } else if (errorMessage.includes('Not authenticated')) {
                    displayMessage = '⚠️ Authentication required. Please log in again.';
                }
                
                setError(displayMessage);
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
            {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                    <p className="text-sm text-red-400 whitespace-pre-wrap">{error}</p>
                </div>
            )}
            {loading ? (
                <p className="text-sm text-secondary">Loading users…</p>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-border-low bg-glass-panel/70">
                    <table className="min-w-full divide-y divide-border-low text-left text-sm">
                        <thead className="bg-glass-panel/50 text-secondary uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Email</th>
                                <th className="px-6 py-3 font-semibold">Username</th>
                                <th className="px-6 py-3 font-semibold">Phone Number</th>
                                <th className="px-6 py-3 font-semibold">Role</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-low text-primary">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 font-medium">{user.email}</td>
                                    <td className="px-6 py-4 text-secondary">{user.username || '—'}</td>
                                    <td className="px-6 py-4 text-secondary">{user.phone_number || '—'}</td>
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
                                    <td colSpan={5} className="px-6 py-4 text-center text-secondary">
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
