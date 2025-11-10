import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSupabase } from '../supabaseClient';
import { supabase } from '../supabaseClient';

interface AdminCreateUserFormProps {
    onUserCreated?: () => void;
}

const pagePermissions = ['Dashboard', 'Inventory', 'Sales', 'Collections', 'Reports', 'Data', 'Calendar', 'Team Chat', 'Settings'];

type AccessRecord = Record<string, { canView: boolean; canEdit: boolean }>;

const defaultAccess: AccessRecord = pagePermissions.reduce((acc, page) => {
    acc[page] = { canView: true, canEdit: false };
    return acc;
}, {} as AccessRecord);

const AdminCreateUserForm: React.FC<AdminCreateUserFormProps> = ({ onUserCreated }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'user' | 'admin'>('user');
    const [access, setAccess] = useState<AccessRecord>(defaultAccess);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const togglePermission = (page: string, type: 'canView' | 'canEdit') => {
        setAccess(prev => ({
            ...prev,
            [page]: {
                ...prev[page],
                [type]: type === 'canEdit' ? !prev[page].canEdit : !prev[page].canView,
            },
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!adminSupabase) {
            setError('Admin Supabase client is not configured. Please set VITE_SUPABASE_SERVICE_ROLE_KEY.');
            return;
        }

        setSubmitting(true);
        try {
            // Create user with admin client
            const { data: userData, error: userError } = await adminSupabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role }, // Set role in user_metadata
            });

            if (userError || !userData?.user) {
                throw new Error(userError?.message || "Unable to create user.");
            }

            const userId = userData.user.id;

            // Insert permissions if UserPermissions table exists
            try {
                const { error: permError } = await supabase
                    .from('UserPermissions')
                    .insert({
                        user_id: userId,
                        permissions: access,
                    });

                if (permError) {
                    console.warn('Failed to save permissions:', permError);
                    // Don't fail the user creation if permissions fail
                }
            } catch (permErr) {
                console.warn('UserPermissions table may not exist:', permErr);
                // Continue even if permissions can't be saved
            }

            setSuccess("User created successfully.");
            setEmail("");
            setPassword("");
            setRole('user');
            setAccess(defaultAccess);
            onUserCreated?.();
            
            // Optionally redirect to admin users list after a short delay
            setTimeout(() => {
                navigate('/admin/users');
            }, 1500);
        } catch (err: any) {
            setError(err.message ?? "Failed to create user.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Create New User</h1>
                    <p className="text-secondary text-sm">Create a new user account. Only admins can create users.</p>
                </div>
            </header>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold text-secondary">
                        Email
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-border-low bg-transparent px-3 py-2 text-primary focus:border-lava-core focus:outline-none"
                            placeholder="user@example.com"
                        />
                    </label>
                    <label className="text-sm font-semibold text-secondary">
                        Temporary Password
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-border-low bg-transparent px-3 py-2 text-primary focus:border-lava-core focus:outline-none"
                            placeholder="Enter initial password"
                        />
                    </label>
                    <label className="text-sm font-semibold text-secondary">
                        Role
                        <select
                            value={role}
                            onChange={event => setRole(event.target.value as 'user' | 'admin')}
                            className="mt-1 w-full rounded-lg border border-border-low bg-transparent px-3 py-2 text-primary focus:border-lava-core focus:outline-none"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </label>
                </div>

            <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">Page access</h4>
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
                            {pagePermissions.map(page => (
                                <tr key={page} className="border-t border-border-low text-primary">
                                    <td className="px-3 py-2 font-medium">{page}</td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={access[page].canView}
                                            onChange={() => togglePermission(page, 'canView')}
                                            className="h-4 w-4 accent-lava-core"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={access[page].canEdit}
                                            disabled={!access[page].canView}
                                            onChange={() => togglePermission(page, 'canEdit')}
                                            className="h-4 w-4 accent-lava-core"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

                {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
                {success && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}

                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-lava-core px-6 py-2 font-semibold text-white transition hover:bg-lava-warm disabled:opacity-50"
                    >
                        {submitting ? 'Creating…' : 'Create User'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/users')}
                        className="rounded-xl border border-border-low bg-transparent px-6 py-2 font-semibold text-primary transition hover:bg-glass-panel"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminCreateUserForm;