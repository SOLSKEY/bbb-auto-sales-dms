import { supabase } from '../supabaseClient';

const normalizeApiUrl = (rawUrl: string | undefined | null) => {
    if (!rawUrl || rawUrl.trim() === '') {
        // Check if we're in production - don't default to localhost in production
        const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
        if (isProduction) {
            console.error(
                '⚠️ VITE_API_URL is not configured! API requests will fail. ' +
                'Please set VITE_API_URL environment variable to your API server URL.'
            );
            // Return empty string to fail fast rather than hitting wrong server
            return '';
        }
        return 'http://localhost:4100';
    }

    const url = rawUrl.trim();

    // Ensure protocol is present (default to https for production)
    if (!/^https?:\/\//i.test(url)) {
        return `https://${url.replace(/^\/+/, '')}`;
    }

    return url;
};

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

// Log API URL in development for debugging (don't log in production for security)
if (!import.meta.env.PROD && API_URL) {
    console.log('🔗 Admin API URL:', API_URL);
} else if (!API_URL) {
    console.error('❌ Admin API URL is not configured. Admin features will not work.');
}

/**
 * Get the current user's auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Safely parse JSON response, handling non-JSON responses (like 404 HTML pages)
 */
async function safeParseJson(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    if (!isJson) {
        const text = await response.text();
        // If it's HTML, extract a meaningful error message
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
            throw new Error(
                `API endpoint returned HTML instead of JSON. This usually means:\n` +
                `1. The API server is not running or not accessible\n` +
                `2. VITE_API_URL is not configured correctly (currently: ${API_URL || 'NOT SET'})\n` +
                `3. The endpoint does not exist (404 error)\n` +
                `Response status: ${response.status} ${response.statusText}`
            );
        }
        throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}: ${text.substring(0, 200)}`);
    }
    
    try {
        return await response.json();
    } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
}

/**
 * Make an authenticated request to the admin API
 */
async function makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    // Check if API_URL is configured
    if (!API_URL) {
        throw new Error(
            'API server URL is not configured. Please set VITE_API_URL environment variable. ' +
            'The admin API server must be running and accessible.'
        );
    }

    const token = await getAuthToken();

    if (!token) {
        throw new Error('Not authenticated. Please log in again.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        return response;
    } catch (fetchError) {
        // Handle network errors (CORS, connection refused, etc.)
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
            throw new Error(
                `Failed to connect to API server at ${API_URL}. ` +
                `This could mean:\n` +
                `1. The API server is not running\n` +
                `2. The API server URL is incorrect\n` +
                `3. CORS is not configured correctly\n` +
                `Original error: ${fetchError.message}`
            );
        }
        throw fetchError;
    }
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
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to list users');
        }

        return safeParseJson(response);
    },

    /**
     * Get user permissions (admin only)
     */
    async getUserPermissions(userId: string) {
        const response = await makeAuthenticatedRequest(`/admin/user-permissions/${userId}`);

        if (!response.ok) {
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to fetch permissions');
        }

        return safeParseJson(response);
    },

    /**
     * Create a new user (admin only)
     */
    async createUser(userData: {
        email: string;
        password: string;
        username?: string;
        role: 'admin' | 'user';
        access?: any;
    }) {
        const response = await makeAuthenticatedRequest('/admin/create-user', {
            method: 'POST',
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to create user');
        }

        return safeParseJson(response);
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
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to update permissions');
        }

        return safeParseJson(response);
    },

    /**
     * Get user by ID (admin only)
     */
    async getUserById(userId: string) {
        const response = await makeAuthenticatedRequest(`/admin/users/${userId}`);

        if (!response.ok) {
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to fetch user');
        }

        return safeParseJson(response);
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
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to update user role');
        }

        return safeParseJson(response);
    },

    /**
     * Update user (role and/or username) (admin only)
     */
    async updateUser(userId: string, data: { role?: 'user' | 'admin'; username?: string | null }) {
        const response = await makeAuthenticatedRequest(`/admin/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to update user');
        }

        return safeParseJson(response);
    },

    /**
     * Delete a user (admin only)
     */
    async deleteUser(userId: string) {
        const response = await makeAuthenticatedRequest(`/admin/users/${userId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await safeParseJson(response).catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || 'Failed to delete user');
        }

        return safeParseJson(response);
    },

    /**
     * Health check
     */
    async healthCheck() {
        if (!API_URL) {
            throw new Error('API server URL is not configured');
        }
        try {
            const response = await fetch(`${API_URL}/health`);
            return safeParseJson(response);
        } catch (error) {
            throw new Error(`API server is not reachable at ${API_URL}: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
};
