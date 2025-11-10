import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100';

/**
 * Get the current user's auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Make an authenticated request to the admin API
 */
async function makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = await getAuthToken();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    return response;
}

/**
 * Admin API functions
 */
export const adminApi = {
    /**
     * List all users (admin only)
     */
    async listUsers() {
        const response = await makeAuthenticatedRequest('/admin/users');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to list users');
        }

        return response.json();
    },

    /**
     * Get user permissions (admin only)
     */
    async getUserPermissions(userId: string) {
        const response = await makeAuthenticatedRequest(`/admin/user-permissions/${userId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch permissions');
        }

        return response.json();
    },

    /**
     * Create a new user (admin only)
     */
    async createUser(userData: {
        email: string;
        password: string;
        role: 'admin' | 'user';
        access?: any;
    }) {
        const response = await makeAuthenticatedRequest('/admin/create-user', {
            method: 'POST',
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create user');
        }

        return response.json();
    },

    /**
     * Update user permissions (admin only)
     */
    async updateUserPermissions(userId: string, permissions: any) {
        const response = await makeAuthenticatedRequest('/admin/update-user-permissions', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                permissions,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to update permissions');
        }

        return response.json();
    },

    /**
     * Get user by ID (admin only)
     */
    async getUserById(userId: string) {
        const response = await makeAuthenticatedRequest(`/admin/users/${userId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch user');
        }

        return response.json();
    },

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId: string, role: 'user' | 'admin') {
        const response = await makeAuthenticatedRequest(`/admin/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to update user role');
        }

        return response.json();
    },

    /**
     * Delete a user (admin only)
     */
    async deleteUser(userId: string) {
        const response = await makeAuthenticatedRequest(`/admin/users/${userId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to delete user');
        }

        return response.json();
    },

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch(`${API_URL}/health`);
            return response.json();
        } catch (error) {
            throw new Error('API server is not reachable');
        }
    },
};
