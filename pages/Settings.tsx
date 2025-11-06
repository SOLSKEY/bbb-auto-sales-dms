import React, { useContext, useEffect, useMemo, useState } from 'react';
import { DataContext } from '../App';
import type { UserAccount } from '../types';
import { supabase } from '../supabaseClient';
import { fromSupabaseArray, toSupabase, USER_FIELD_MAP } from '../supabaseMapping';
import { PlusIcon, ArrowPathIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/solid';

const emptyAccount = (): Omit<UserAccount, 'id'> => ({
    name: '',
    username: '',
    password: '',
    phone: '',
});

const Settings: React.FC = () => {
    const dataContext = useContext(DataContext);
    const contextUsers = dataContext?.users ?? [];
    const setUsers = dataContext?.setUsers;

    const [drafts, setDrafts] = useState<UserAccount[]>(contextUsers);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setDrafts(contextUsers);
    }, [contextUsers]);

    const sortedDrafts = useMemo(
        () => [...drafts].sort((a, b) => a.name.localeCompare(b.name)),
        [drafts]
    );

    const showMessage = (type: 'error' | 'success', message: string) => {
        if (type === 'error') {
            setErrorMessage(message);
            setSuccessMessage(null);
        } else {
            setSuccessMessage(message);
            setErrorMessage(null);
        }
        window.setTimeout(() => {
            setErrorMessage(null);
            setSuccessMessage(null);
        }, 4000);
    };

    const refreshUsers = async () => {
        setIsRefreshing(true);
        const { data, error } = await supabase
            .from('Users')
            .select('*')
            .order('"Name"', { ascending: true });

        if (error) {
            console.error('Error refreshing users:', error);
            showMessage('error', 'Failed to refresh user list.');
        } else if (data) {
            const mapped = fromSupabaseArray(data, USER_FIELD_MAP) as UserAccount[];
            setDrafts(mapped);
            setUsers?.(mapped);
        }
        setIsRefreshing(false);
    };

    const handleFieldChange = (id: number, field: keyof Omit<UserAccount, 'id'>, value: string) => {
        setDrafts(prev =>
            prev.map(account => (account.id === id ? { ...account, [field]: value } : account))
        );
    };

    const handleSave = async (id: number) => {
        const draft = drafts.find(account => account.id === id);
        if (!draft) return;
        if (!draft.name.trim()) {
            showMessage('error', 'Name is required.');
            return;
        }
        if (!draft.username.trim()) {
            showMessage('error', 'Username is required.');
            return;
        }

        setSavingId(id);
        const prepared = {
            ...draft,
            name: draft.name.trim(),
            username: draft.username.trim(),
            password: draft.password,
            phone: draft.phone,
        };
        const { id: _omit, ...withoutId } = prepared;
        const payload = toSupabase(withoutId, USER_FIELD_MAP);
        const { error } = await supabase.from('Users').update(payload).eq('id', id);
        setSavingId(null);

        if (error) {
            console.error('Error updating user:', error);
            showMessage('error', 'Failed to save user changes.');
            return;
        }

        showMessage('success', 'User updated successfully.');
        await refreshUsers();
    };

    const handleAddUser = async () => {
        setSavingId(-1);
        const payload = toSupabase(emptyAccount(), USER_FIELD_MAP);
        const { data, error } = await supabase
            .from('Users')
            .insert([payload])
            .select('*')
            .single();
        setSavingId(null);

        if (error) {
            console.error('Error creating user:', error);
            showMessage('error', 'Failed to create user.');
            return;
        }

        const mapped = fromSupabaseArray([data], USER_FIELD_MAP) as UserAccount[];
        const createdUser = mapped[0];
        setDrafts(prev => [...prev, createdUser]);
        setUsers?.(prev => [...prev, createdUser]);
        showMessage('success', 'New user created. Please fill out the details.');
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this user account? This action cannot be undone.')) return;
        const { error } = await supabase.from('Users').delete().eq('id', id);
        if (error) {
            console.error('Error deleting user:', error);
            showMessage('error', 'Failed to delete user.');
            return;
        }
        const updated = drafts.filter(user => user.id !== id);
        setDrafts(updated);
        setUsers?.(updated);
        showMessage('success', 'User deleted.');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary font-orbitron tracking-tight-lg">Settings</h1>
                    <p className="text-sm text-muted">
                        Manage dealership user accounts, credentials, and contact information.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshUsers}
                        className="flex items-center gap-2 bg-glass-panel hover:bg-glass-panel/80 text-primary text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 border border-border-low"
                        disabled={isRefreshing}
                    >
                        <ArrowPathIcon
                            className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-lava-warm' : 'text-lava-core'}`}
                        />
                        Refresh
                    </button>
                    <button
                        onClick={handleAddUser}
                        className="btn-lava flex items-center gap-2 text-sm font-semibold"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add User
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div className="glass-card border-red-700 text-red-200 px-4 py-2">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="glass-card border-green-700 text-green-200 px-4 py-2">
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedDrafts.map(account => (
                    <div
                        key={account.id}
                        className="glass-card p-4 space-y-3"
                    >
                        <div>
                            <label className="block text-xs uppercase tracking-wide text-muted mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={account.name}
                                onChange={event => handleFieldChange(account.id, 'name', event.target.value)}
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none"
                                placeholder="Full name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-wide text-muted mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                value={account.username}
                                onChange={event =>
                                    handleFieldChange(account.id, 'username', event.target.value)
                                }
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none"
                                placeholder="Login username"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-wide text-muted mb-1">
                                Password
                            </label>
                            <input
                                type="text"
                                value={account.password}
                                onChange={event =>
                                    handleFieldChange(account.id, 'password', event.target.value)
                                }
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none"
                                placeholder="Password"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-wide text-muted mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={account.phone}
                                onChange={event =>
                                    handleFieldChange(account.id, 'phone', event.target.value)
                                }
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none"
                                placeholder="e.g. 615-555-0101"
                            />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => handleDelete(account.id)}
                                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs font-semibold"
                            >
                                <TrashIcon className="h-4 w-4" />
                                Delete
                            </button>
                            <button
                                onClick={() => handleSave(account.id)}
                                className="btn-lava flex items-center gap-2 text-sm font-semibold px-3 py-1.5 disabled:opacity-60"
                                disabled={savingId === account.id}
                            >
                                <CheckIcon
                                    className={`h-4 w-4 ${
                                        savingId === account.id ? 'animate-spin' : 'text-white'
                                    }`}
                                />
                                {savingId === account.id ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                ))}
                {sortedDrafts.length === 0 && (
                    <div className="col-span-full glass-card p-6 text-center text-muted border border-dashed border-border-low">
                        No user accounts found. Click "Add User" to create one.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
