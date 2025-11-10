import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { GlassButton } from '@/components/ui/glass-button';
import { UserCircleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const AccountSettings: React.FC = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingUsername, setIsSavingUsername] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [usernameMessage, setUsernameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            setIsLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) throw userError;
            if (!user) throw new Error('No user found');

            setEmail(user.email ?? '');

            // Get username from user_metadata
            const storedUsername = user.user_metadata?.username ?? '';
            setUsername(storedUsername);
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUsernameUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUsernameMessage(null);

        if (!username.trim()) {
            setUsernameMessage({ type: 'error', text: 'Username cannot be empty' });
            return;
        }

        if (username.length < 3) {
            setUsernameMessage({ type: 'error', text: 'Username must be at least 3 characters' });
            return;
        }

        try {
            setIsSavingUsername(true);

            // Update user metadata with username
            const { error } = await supabase.auth.updateUser({
                data: { username: username.trim() }
            });

            if (error) throw error;

            setUsernameMessage({ type: 'success', text: 'Username updated successfully!' });

            // Reload user data to reflect changes
            setTimeout(() => {
                loadUserData();
                setUsernameMessage(null);
            }, 2000);
        } catch (error: any) {
            console.error('Error updating username:', error);
            setUsernameMessage({ type: 'error', text: error.message || 'Failed to update username' });
        } finally {
            setIsSavingUsername(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (!newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Please fill in all password fields' });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        try {
            setIsChangingPassword(true);

            // Update password
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            setTimeout(() => {
                setPasswordMessage(null);
            }, 3000);
        } catch (error: any) {
            console.error('Error changing password:', error);
            setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password' });
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lava-core mx-auto"></div>
                    <p className="mt-4 text-secondary">Loading account settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="glass-card p-6">
                <div className="flex items-center gap-4 mb-6">
                    <UserCircleIcon className="h-16 w-16 text-lava-core" />
                    <div>
                        <h2 className="text-2xl font-orbitron font-bold text-primary">Account Settings</h2>
                        <p className="text-sm text-muted">Manage your profile and security settings</p>
                    </div>
                </div>

                {/* Email Display (Read-only) */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border-low pb-2">
                        Account Information
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-2 uppercase tracking-wide">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full bg-glass-panel border border-border-low text-secondary rounded-md p-3 cursor-not-allowed opacity-60"
                            />
                            <p className="text-xs text-muted mt-1">Email cannot be changed</p>
                        </div>
                    </div>
                </div>

                {/* Username Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border-low pb-2">
                        Display Name
                    </h3>
                    <form onSubmit={handleUsernameUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-2 uppercase tracking-wide">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-3 focus:outline-none transition-colors"
                                minLength={3}
                                maxLength={30}
                            />
                            <p className="text-xs text-muted mt-1">
                                This will be displayed in Team Chat, Calendar events, and other places
                            </p>
                        </div>

                        {usernameMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-md ${
                                usernameMessage.type === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                                {usernameMessage.type === 'success' ? (
                                    <CheckCircleIcon className="h-5 w-5" />
                                ) : (
                                    <XCircleIcon className="h-5 w-5" />
                                )}
                                <span className="text-sm">{usernameMessage.text}</span>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <GlassButton
                                type="submit"
                                disabled={isSavingUsername}
                            >
                                {isSavingUsername ? 'Saving...' : 'Save Username'}
                            </GlassButton>
                        </div>
                    </form>
                </div>

                {/* Password Change Section */}
                <div>
                    <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border-low pb-2">
                        Change Password
                    </h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-2 uppercase tracking-wide">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-3 focus:outline-none transition-colors"
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted mb-2 uppercase tracking-wide">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-3 focus:outline-none transition-colors"
                                minLength={6}
                            />
                        </div>

                        {passwordMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-md ${
                                passwordMessage.type === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                                {passwordMessage.type === 'success' ? (
                                    <CheckCircleIcon className="h-5 w-5" />
                                ) : (
                                    <XCircleIcon className="h-5 w-5" />
                                )}
                                <span className="text-sm">{passwordMessage.text}</span>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <GlassButton
                                type="submit"
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? 'Changing...' : 'Change Password'}
                            </GlassButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
