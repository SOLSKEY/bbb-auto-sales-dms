import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { GlassButton } from '@/components/ui/glass-button';
import { UserCircleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { UserContext } from '../App';
import { useUserColors } from '../hooks/useUserColors';
import { USER_COLOR_PALETTE } from '../types';
import { formatPhoneNumber, isValidPhoneNumber, extractDigits } from '../utils/phoneNumber';

const AccountSettings: React.FC = () => {
    const userContext = useContext(UserContext);
    const currentUserId = userContext?.user?.id;
    const { getUserColor, setUserColor, userColors, refresh } = useUserColors();
    
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(true);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingUsername, setIsSavingUsername] = useState(false);
    const [isSavingPhoneNumber, setIsSavingPhoneNumber] = useState(false);
    const [isSavingSmsNotifications, setIsSavingSmsNotifications] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isSavingColor, setIsSavingColor] = useState(false);
    const [usernameMessage, setUsernameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [phoneNumberMessage, setPhoneNumberMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [smsNotificationsMessage, setSmsNotificationsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [colorMessage, setColorMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    
    // Get current user's color
    const currentUserColor = currentUserId ? getUserColor(currentUserId) : USER_COLOR_PALETTE[0].hex;
    const [selectedColor, setSelectedColor] = useState(currentUserColor);
    
    // Get used colors (to show which are taken)
    const usedColors = new Set(Object.values(userColors));

    useEffect(() => {
        loadUserData();
        refresh();
    }, []);
    
    useEffect(() => {
        if (currentUserId) {
            const userColor = getUserColor(currentUserId);
            setSelectedColor(userColor);
        }
    }, [currentUserId, getUserColor, userColors]);

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

            // Get phone_number and sms_notifications_enabled from profiles table
            // Handle case where sms_notifications_enabled column might not exist yet
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('phone_number, sms_notifications_enabled')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                // If column doesn't exist, try without it
                if (profileError.code === '42703') {
                    console.warn('sms_notifications_enabled column does not exist yet. Loading without it.');
                    const { data: profileWithoutSms, error: profileError2 } = await supabase
                        .from('profiles')
                        .select('phone_number')
                        .eq('id', user.id)
                        .maybeSingle();
                    
                    if (!profileError2 && profileWithoutSms) {
                        setPhoneNumber(profileWithoutSms?.phone_number ?? '');
                        setSmsNotificationsEnabled(true); // Default to true
                    }
                } else {
                    console.error('Error loading profile:', profileError);
                }
            } else {
                // Format phone number if it exists (remove +1 prefix for display, user will type 10 digits)
                const storedPhone = profile?.phone_number ?? '';
                if (storedPhone) {
                    // If it has +1 prefix, remove it for display (user only types 10 digits)
                    const digits = extractDigits(storedPhone.replace(/^\+1[- ]?/, ''));
                    setPhoneNumber(digits);
                } else {
                    setPhoneNumber('');
                }
                // Default to true if not set (for existing users)
                setSmsNotificationsEnabled(profile?.sms_notifications_enabled ?? true);
            }
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

    const handlePhoneNumberBlur = () => {
        // Auto-format on blur if valid
        if (phoneNumber && isValidPhoneNumber(phoneNumber)) {
            const digits = extractDigits(phoneNumber);
            setPhoneNumber(digits); // Show just digits while typing, will format on save
        }
    };

    const handlePhoneNumberUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneNumberMessage(null);

        if (!currentUserId) {
            setPhoneNumberMessage({ type: 'error', text: 'User ID not found' });
            return;
        }

        // Validate phone number if provided
        const trimmedPhone = phoneNumber.trim();
        if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
            setPhoneNumberMessage({ type: 'error', text: 'Please enter a valid 10-digit phone number' });
            return;
        }

        try {
            setIsSavingPhoneNumber(true);

            // Format phone number before saving (always store as +1-XXX-XXX-XXXX)
            const formattedPhone = trimmedPhone ? formatPhoneNumber(trimmedPhone) : null;

            // Update phone_number in profiles table
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: currentUserId,
                    phone_number: formattedPhone,
                }, {
                    onConflict: 'id'
                });

            if (error) throw error;

            // Update local state to show formatted version
            setPhoneNumber(formattedPhone ? extractDigits(formattedPhone.replace(/^\+1[- ]?/, '')) : '');
            setPhoneNumberMessage({ type: 'success', text: 'Phone number updated successfully!' });

            // Reload user data to reflect changes
            setTimeout(() => {
                loadUserData();
                setPhoneNumberMessage(null);
            }, 2000);
        } catch (error: any) {
            console.error('Error updating phone number:', error);
            setPhoneNumberMessage({ type: 'error', text: error.message || 'Failed to update phone number' });
        } finally {
            setIsSavingPhoneNumber(false);
        }
    };

    const handleSmsNotificationsToggle = async () => {
        setSmsNotificationsMessage(null);

        if (!currentUserId) {
            setSmsNotificationsMessage({ type: 'error', text: 'User ID not found' });
            return;
        }

        const newValue = !smsNotificationsEnabled;

        try {
            setIsSavingSmsNotifications(true);

            // Try to update sms_notifications_enabled in profiles table
            // Handle case where column might not exist yet
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: currentUserId,
                    sms_notifications_enabled: newValue,
                }, {
                    onConflict: 'id'
                });

            if (error) {
                // If column doesn't exist, inform user they need to run migration
                if (error.code === '42703') {
                    setSmsNotificationsMessage({ 
                        type: 'error', 
                        text: 'SMS notifications feature not available yet. Please run the database migration first.' 
                    });
                    setSmsNotificationsEnabled(!newValue); // Revert
                    return;
                }
                throw error;
            }

            setSmsNotificationsEnabled(newValue);
            setSmsNotificationsMessage({ 
                type: 'success', 
                text: `SMS notifications ${newValue ? 'enabled' : 'disabled'} successfully!` 
            });

            // Clear message after 2 seconds
            setTimeout(() => {
                setSmsNotificationsMessage(null);
            }, 2000);
        } catch (error: any) {
            console.error('Error updating SMS notifications setting:', error);
            setSmsNotificationsMessage({ type: 'error', text: error.message || 'Failed to update SMS notification setting' });
            // Revert the toggle on error
            setSmsNotificationsEnabled(!newValue);
        } finally {
            setIsSavingSmsNotifications(false);
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
                                className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low text-secondary rounded-md p-3 cursor-not-allowed opacity-60"
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
                                className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-lava-core text-primary placeholder:text-[#D5D5D5] rounded-md p-3 focus:outline-none transition-colors"
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

                {/* Phone Number Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border-low pb-2">
                        Contact Information
                    </h3>
                    <form onSubmit={handlePhoneNumberUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-2 uppercase tracking-wide">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => {
                                    // Allow any input format while typing
                                    setPhoneNumber(e.target.value);
                                }}
                                onBlur={handlePhoneNumberBlur}
                                placeholder="Enter 10-digit phone number (e.g., 5551234567)"
                                className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-lava-core text-primary placeholder:text-[#D5D5D5] rounded-md p-3 focus:outline-none transition-colors"
                            />
                            <p className="text-xs text-muted mt-1">
                                Enter your 10-digit phone number (area code + 7 digits). Country code +1 will be added automatically. You can type it in any format.
                            </p>
                        </div>

                        {phoneNumberMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-md ${
                                phoneNumberMessage.type === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                                {phoneNumberMessage.type === 'success' ? (
                                    <CheckCircleIcon className="h-5 w-5" />
                                ) : (
                                    <XCircleIcon className="h-5 w-5" />
                                )}
                                <span className="text-sm">{phoneNumberMessage.text}</span>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <GlassButton
                                type="submit"
                                disabled={isSavingPhoneNumber}
                            >
                                {isSavingPhoneNumber ? 'Saving...' : 'Save Phone Number'}
                            </GlassButton>
                        </div>
                    </form>
                </div>

                {/* SMS Notifications Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border-low pb-2">
                        Notification Preferences
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">
                                    SMS Notifications
                                </label>
                                <p className="text-xs text-muted">
                                    Receive SMS reminders for upcoming appointments. Make sure your phone number is set above.
                                </p>
                            </div>
                            <div className="ml-4">
                                <button
                                    type="button"
                                    onClick={handleSmsNotificationsToggle}
                                    disabled={isSavingSmsNotifications}
                                    className={`
                                        relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lava-core focus:ring-offset-2 focus:ring-offset-[rgba(35,35,40,0.9)]
                                        ${smsNotificationsEnabled 
                                            ? 'bg-lava-core' 
                                            : 'bg-gray-600'
                                        }
                                        ${isSavingSmsNotifications ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                    role="switch"
                                    aria-checked={smsNotificationsEnabled}
                                    aria-label="Toggle SMS notifications"
                                >
                                    <span
                                        className={`
                                            inline-block h-5 w-5 transform rounded-full bg-white transition-transform
                                            ${smsNotificationsEnabled ? 'translate-x-8' : 'translate-x-1'}
                                        `}
                                    />
                                </button>
                            </div>
                        </div>

                        {smsNotificationsMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-md ${
                                smsNotificationsMessage.type === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                                {smsNotificationsMessage.type === 'success' ? (
                                    <CheckCircleIcon className="h-5 w-5" />
                                ) : (
                                    <XCircleIcon className="h-5 w-5" />
                                )}
                                <span className="text-sm">{smsNotificationsMessage.text}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* User Color Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border-low pb-2">
                        User Color
                    </h3>
                    <div className="space-y-4">
                        <p className="text-sm text-muted">
                            Choose a color to identify your appointments and activities in the calendar. Each color can only be used by one user.
                        </p>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                            {USER_COLOR_PALETTE.map((color) => {
                                const isSelected = selectedColor === color.hex;
                                const isTaken = usedColors.has(color.hex) && !isSelected;
                                const isCurrentUserColor = currentUserId && userColors[currentUserId] === color.hex;
                                
                                return (
                                    <button
                                        key={color.hex}
                                        type="button"
                                        onClick={() => {
                                            if (!isTaken || isCurrentUserColor) {
                                                setSelectedColor(color.hex);
                                                setColorMessage(null);
                                            }
                                        }}
                                        disabled={isTaken && !isCurrentUserColor}
                                        className={`
                                            relative w-full aspect-square rounded-lg border-2 transition-all
                                            ${isSelected 
                                                ? 'border-white scale-110 shadow-lg shadow-current ring-2 ring-white/50' 
                                                : isTaken && !isCurrentUserColor
                                                ? 'border-gray-600 opacity-40 cursor-not-allowed'
                                                : 'border-transparent hover:border-white/50 hover:scale-105'
                                            }
                                        `}
                                        style={{
                                            backgroundColor: color.hex,
                                            boxShadow: isSelected ? `0 0 20px ${color.hex}80` : undefined,
                                        }}
                                        title={isTaken && !isCurrentUserColor ? `${color.name} (Taken)` : color.name}
                                    >
                                        {isSelected && (
                                            <CheckCircleIcon className="absolute top-1 right-1 h-5 w-5 text-white drop-shadow-lg" />
                                        )}
                                        {isTaken && !isCurrentUserColor && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <XCircleIcon className="h-6 w-6 text-gray-400" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {colorMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-md ${
                                colorMessage.type === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                                {colorMessage.type === 'success' ? (
                                    <CheckCircleIcon className="h-5 w-5" />
                                ) : (
                                    <XCircleIcon className="h-5 w-5" />
                                )}
                                <span className="text-sm">{colorMessage.text}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-end">
                            <GlassButton
                                type="button"
                                onClick={async () => {
                                    if (!currentUserId) return;
                                    
                                    // Check if color is already taken by another user
                                    const colorTakenBy = Object.entries(userColors).find(
                                        ([userId, color]) => color === selectedColor && userId !== currentUserId
                                    );
                                    
                                    if (colorTakenBy) {
                                        setColorMessage({ 
                                            type: 'error', 
                                            text: 'This color is already taken by another user. Please choose a different color.' 
                                        });
                                        return;
                                    }
                                    
                                    setIsSavingColor(true);
                                    setColorMessage(null);
                                    
                                    const success = await setUserColor(currentUserId, selectedColor, 'admin');
                                    
                                    if (success) {
                                        setColorMessage({ type: 'success', text: 'User color updated successfully!' });
                                        await refresh();
                                        setTimeout(() => {
                                            setColorMessage(null);
                                        }, 2000);
                                    } else {
                                        setColorMessage({ type: 'error', text: 'Failed to update user color. Please try again.' });
                                    }
                                    
                                    setIsSavingColor(false);
                                }}
                                disabled={isSavingColor || selectedColor === currentUserColor}
                            >
                                {isSavingColor ? 'Saving...' : 'Save Color'}
                            </GlassButton>
                        </div>
                    </div>
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
                                className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-lava-core text-primary placeholder:text-[#D5D5D5] rounded-md p-3 focus:outline-none transition-colors"
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
                                className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-lava-core text-primary placeholder:text-[#D5D5D5] rounded-md p-3 focus:outline-none transition-colors"
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
