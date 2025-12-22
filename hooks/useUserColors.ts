import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { UserColor } from '../types';
import { USER_COLOR_PALETTE } from '../types';

interface UseUserColorsReturn {
    userColors: Record<string, string>;
    loading: boolean;
    error: string | null;
    getUserColor: (userId: string) => string;
    setUserColor: (userId: string, color: string, assignedBy?: 'auto' | 'admin') => Promise<{ success: boolean; error?: string }>;
    autoAssignColor: (userId: string) => Promise<string>;
    isColorAvailable: (color: string, excludeUserId?: string) => boolean;
    getColorOwner: (color: string) => string | null;
    refresh: () => Promise<void>;
}

export const useUserColors = (): UseUserColorsReturn => {
    const [userColors, setUserColors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load all user colors
    const loadUserColors = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: err } = await supabase
                .from('user_colors')
                .select('*');

            if (err) {
                // Table might not exist yet
                console.log('User colors table not available');
                setUserColors({});
                return;
            }

            // Convert to record format
            const colors: Record<string, string> = {};
            (data || []).forEach((uc: UserColor) => {
                colors[uc.user_id] = uc.color;
            });
            setUserColors(colors);
        } catch (err) {
            console.error('Error loading user colors:', err);
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadUserColors();
    }, [loadUserColors]);

    // Get a user's color (with fallback to auto-generation)
    const getUserColor = useCallback((userId: string): string => {
        if (userColors[userId]) {
            return userColors[userId];
        }

        // Generate a consistent color based on user ID hash
        const hash = userId.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        const colorIndex = Math.abs(hash) % USER_COLOR_PALETTE.length;
        return USER_COLOR_PALETTE[colorIndex].hex;
    }, [userColors]);

    // Check if a color is available (not assigned to another user)
    const isColorAvailable = useCallback((color: string, excludeUserId?: string): boolean => {
        for (const [userId, userColor] of Object.entries(userColors)) {
            if (userId !== excludeUserId && userColor === color) {
                return false;
            }
        }
        return true;
    }, [userColors]);

    // Get the user ID that owns a specific color
    const getColorOwner = useCallback((color: string): string | null => {
        for (const [userId, userColor] of Object.entries(userColors)) {
            if (userColor === color) {
                return userId;
            }
        }
        return null;
    }, [userColors]);

    // Set a user's color with uniqueness validation
    const setUserColor = useCallback(async (
        userId: string,
        color: string,
        assignedBy: 'auto' | 'admin' | 'user' = 'admin'
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            // Check if color is already taken by another user
            if (!isColorAvailable(color, userId)) {
                return {
                    success: false,
                    error: 'This color is already assigned to another user. Please choose a different color.'
                };
            }

            const { error: err } = await supabase
                .from('user_colors')
                .upsert({
                    user_id: userId,
                    color,
                    assigned_by: assignedBy,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id'
                });

            if (err) throw err;

            // Update local state
            setUserColors(prev => ({
                ...prev,
                [userId]: color,
            }));

            return { success: true };
        } catch (err: any) {
            console.error('Error setting user color:', err);
            const errorMessage = err.message || 'Failed to set user color';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }, [isColorAvailable]);

    // Auto-assign a color to a user (picks next available color)
    const autoAssignColor = useCallback(async (userId: string): Promise<string> => {
        // Check if user already has a color
        if (userColors[userId]) {
            return userColors[userId];
        }

        // Find used colors
        const usedColors = new Set(Object.values(userColors));

        // Find first unused color from palette
        let selectedColor = USER_COLOR_PALETTE[0].hex;
        for (const colorOption of USER_COLOR_PALETTE) {
            if (!usedColors.has(colorOption.hex)) {
                selectedColor = colorOption.hex;
                break;
            }
        }

        // If all colors are used, pick based on hash
        if (usedColors.size >= USER_COLOR_PALETTE.length) {
            const hash = userId.split('').reduce((acc, char) => {
                return char.charCodeAt(0) + ((acc << 5) - acc);
            }, 0);
            const colorIndex = Math.abs(hash) % USER_COLOR_PALETTE.length;
            selectedColor = USER_COLOR_PALETTE[colorIndex].hex;
        }

        // Save to database
        await setUserColor(userId, selectedColor, 'auto');

        return selectedColor;
    }, [userColors, setUserColor]);

    return {
        userColors,
        loading,
        error,
        getUserColor,
        setUserColor,
        autoAssignColor,
        isColorAvailable,
        getColorOwner,
        refresh: loadUserColors,
    };
};

export default useUserColors;
