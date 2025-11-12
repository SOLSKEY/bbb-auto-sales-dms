

import React, { useState, createContext, useMemo, useCallback, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Collections from './pages/Collections';
import Reports from './pages/Reports';
import Data from './pages/Data';
import Calendar from './pages/Calendar';
import TeamChat from './pages/TeamChat';
import Settings from './pages/Settings';
import type { User, Role, Vehicle, Sale, UserAccount, UserAccessPolicy, AppSectionKey } from './types';
import Header from './components/Header';
import { supabase } from './supabaseClient';
import { fromSupabaseArray, VEHICLE_FIELD_MAP, SALE_FIELD_MAP, USER_FIELD_MAP, quoteSupabaseColumn } from './supabaseMapping';
import Login from './pages/Login';
import AdminCreateUserForm from './components/AdminCreateUserForm';
import AdminUsers from './pages/AdminUsers';
import AdminUserPermissions from './pages/AdminUserPermissions';
import AccountSettings from './pages/AccountSettings';

const APP_PAGES: AppSectionKey[] = [
    'Dashboard',
    'Inventory',
    'Sales',
    'Collections',
    'Reports',
    'Data',
    'Calendar',
    'Team Chat',
    'Settings',
];

// Role-based permission defaults
const createPermissionsForRole = (role: Role): UserAccessPolicy['permissions'] => {
    if (role === 'admin') {
        // Admins get full access to everything
        return APP_PAGES.reduce((acc, page) => {
            acc[page] = { canView: true, canEdit: true };
            return acc;
        }, {} as UserAccessPolicy['permissions']);
    } else {
        // Regular users: can view all pages EXCEPT Settings, Reports, and Data
        // They cannot edit anything
        return APP_PAGES.reduce((acc, page) => {
            const canView = !['Settings', 'Reports', 'Data'].includes(page);
            acc[page] = { canView, canEdit: false };
            return acc;
        }, {} as UserAccessPolicy['permissions']);
    }
};

export const UserContext = createContext<{ user: User; setUser: React.Dispatch<React.SetStateAction<User>> } | null>(null);

interface DataContextType {
    inventory: Vehicle[];
    setInventory: React.Dispatch<React.SetStateAction<Vehicle[]>>;
    sales: Sale[];
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    revertSale: (saleToRevert: Sale) => void;
    users: UserAccount[];
    setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
}

export const DataContext = createContext<DataContextType | null>(null);

const PATH_TITLE_MAP: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/inventory': 'Inventory',
    '/sales': 'Sales',
    '/collections': 'Collections',
    '/reports': 'Reports',
    '/data': 'Data',
    '/calendar': 'Calendar',
    '/team-chat': 'Team Chat',
    '/settings': 'Settings',
    '/account-settings': 'Account Settings',
    '/admin': 'Admin Dashboard',
    '/admin/create-user': 'Create User',
    '/admin/users': 'Manage Users',
};

const App: React.FC = () => {
    const [user, setUser] = useState<User>({ id: '', name: '', role: 'user' });
    const [session, setSession] = useState<Session | null>(null);
    const [authChecking, setAuthChecking] = useState(true);

    const [inventory, setInventory] = useState<Vehicle[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [permissions, setPermissions] = useState<UserAccessPolicy['permissions']>(() => createPermissionsForRole('user'));
    const [permissionsLoading, setPermissionsLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    const normalizeVehicle = (vehicle: Vehicle): Vehicle => {
        const numericFields: Array<keyof Vehicle> = ['year', 'mileage', 'price', 'downPayment'];
        const normalized = { ...vehicle } as Vehicle;
        numericFields.forEach(field => {
            const value = (normalized as any)[field];
            if (value !== undefined && value !== null && value !== '') {
                const parsed = Number(value);
                if (!Number.isNaN(parsed)) {
                    (normalized as any)[field] = parsed;
                }
            }
        });
        normalized.images = Array.isArray(normalized.images) ? normalized.images : [];
        return normalized;
    };

    // Track authentication session
    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!mounted) return;
            setSession(session);
            setAuthChecking(false);
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        initSession();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (session?.user) {
            // Use user_metadata.role (set by admin) or default to 'user'
            const derivedRole = (session.user.user_metadata?.role as Role | undefined) ?? 'user';
            setUser(prev => ({ 
                ...prev, 
                id: session.user.id,
                name: session.user.email ?? 'Dealer User', 
                role: derivedRole 
            }));
        } else {
            setUser({ id: '', name: '', role: 'user' });
        }
    }, [session]);

    useEffect(() => {
        const loadPermissions = () => {
            if (!session?.user) {
                // No session - use basic user permissions
                setPermissions(createPermissionsForRole('user'));
                setPermissionsLoading(false);
                return;
            }

            // Get role from session metadata
            const userRole = (session.user.user_metadata?.role as Role | undefined) ?? 'user';

            // Set permissions based on role
            console.log('Setting permissions for role:', userRole);
            setPermissions(createPermissionsForRole(userRole));
            setPermissionsLoading(false);
        };

        loadPermissions();
    }, [session]);

    // Load initial data from Supabase
    useEffect(() => {
        if (!session) {
            setInventory([]);
            setSales([]);
            setUsers([]);
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // Load inventory
                console.log('Loading inventory from Supabase...');
                const { data: inventoryData, error: inventoryError } = await supabase
                    .from('Inventory')
                    .select('*');

                if (inventoryError) {
                    console.error('Error loading inventory:', inventoryError);
                    console.error('Error details:', JSON.stringify(inventoryError, null, 2));
                } else if (inventoryData) {
                    console.log(`Loaded ${inventoryData.length} vehicles from Supabase`);
                    const mappedInventory = fromSupabaseArray(inventoryData, VEHICLE_FIELD_MAP)
                        .map(item => normalizeVehicle(item as Vehicle)) as Vehicle[];
                    setInventory(mappedInventory);
                } else {
                    console.log('No inventory data returned from Supabase');
                }

                // Load sales with pagination to handle large datasets
                console.log('Loading sales from Supabase...');
                const { count: totalSalesCount, error: countError } = await supabase
                    .from('Sales')
                    .select('*', { count: 'exact', head: true });

                if (countError) {
                    console.error('Error retrieving sales count from Supabase:', countError);
                }

                const pageSize = 1000;
                const allSalesRows: any[] = [];
                let page = 0;
                let hasMore = true;

                while (hasMore) {
                    const from = page * pageSize;
                    const to = from + pageSize - 1;

                    const { data: pageData, error: pageError } = await supabase
                        .from('Sales')
                        .select('*')
                        .order('"Sale Date"', { ascending: false })
                        .range(from, to);

                    if (pageError) {
                        console.error(`Error loading sales page starting at row ${from}:`, pageError);
                        break;
                    }

                    if (!pageData || pageData.length === 0) {
                        hasMore = false;
                    } else {
                        allSalesRows.push(...pageData);
                        hasMore = pageData.length === pageSize;
                        if (typeof totalSalesCount === 'number' && allSalesRows.length >= totalSalesCount) {
                            hasMore = false;
                        }
                        page += 1;
                    }
                }

                if (allSalesRows.length > 0) {
                    console.log(`Loaded ${allSalesRows.length} sales from Supabase${typeof totalSalesCount === 'number' ? ` (total count: ${totalSalesCount})` : ''}`);
                    const mappedSales = fromSupabaseArray(allSalesRows, SALE_FIELD_MAP);
                    setSales(mappedSales);
                } else {
                    console.log('No sales data returned from Supabase');
                    setSales([]);
                }

                console.log('Loading users from Supabase...');
                const { data: usersData, error: usersError } = await supabase
                    .from('Users')
                    .select('*')
                    .order('"Name"', { ascending: true });

                if (usersError) {
                    console.error('Error loading users:', usersError);
                    console.error('Error details:', JSON.stringify(usersError, null, 2));
                } else if (usersData) {
                    const mappedUsers = fromSupabaseArray(usersData, USER_FIELD_MAP) as UserAccount[];
                    setUsers(mappedUsers);
                } else {
                    setUsers([]);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [session]);

    const revertSale = useCallback(async (saleToRevert: Sale) => {
        const applyIdentifier = (query: any, useQuoted: boolean) => {
            if (saleToRevert.id !== undefined) {
                return query.eq('id', saleToRevert.id);
            }
            const fallbackValue = saleToRevert.accountNumber || saleToRevert.saleId;
            if (!fallbackValue) return null;
            const column = useQuoted
                ? quoteSupabaseColumn(SALE_FIELD_MAP.accountNumber)
                : SALE_FIELD_MAP.accountNumber;
            return query.eq(column, fallbackValue);
        };

        const performDelete = async (useQuoted: boolean) => {
            let query = supabase.from('Sales').delete({ returning: 'minimal' });
            query = applyIdentifier(query, useQuoted);
            if (!query) {
                return { error: { message: 'Unable to identify this sale record.' } };
            }
            return query;
        };

        try {
            let { error: deleteSaleError } = await performDelete(false);

            if (
                deleteSaleError?.code === 'PGRST204' &&
                typeof deleteSaleError.message === 'string' &&
                deleteSaleError.message.includes('"account_number"')
            ) {
                const fallback = await performDelete(true);
                deleteSaleError = fallback.error;
            }

            if (deleteSaleError) {
                console.error('Error deleting sale:', deleteSaleError);
                alert('Failed to revert sale in Supabase. Please try again.');
                return;
            }

            // Update vehicle status to Available in Supabase
            if (saleToRevert.vin) {
                const { error: updateVehicleError } = await supabase
                    .from('Inventory')
                    .update({ Status: 'Available' })
                    .eq('VIN', saleToRevert.vin);

                if (updateVehicleError) {
                    console.error('Error updating vehicle status:', updateVehicleError);
                }
            }

            // Update local state
            setSales(prev => {
                const fallbackValue = saleToRevert.accountNumber || saleToRevert.saleId;
                return prev.filter(s => {
                    if (saleToRevert.id !== undefined && s.id !== undefined) {
                        return s.id !== saleToRevert.id;
                    }
                    if (fallbackValue) {
                        const candidate = s.accountNumber || s.saleId;
                        return candidate !== fallbackValue;
                    }
                    return true;
                });
            });
            setInventory(prev => prev.map(v =>
                v.vin === saleToRevert.vin ? { ...v, status: 'Available' } : v
            ));
        } catch (error) {
            console.error('Error reverting sale:', error);
        }
    }, []);

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    }, [navigate]);

    const userContextValue = useMemo(() => ({ user, setUser }), [user]);
    const dataContextValue = useMemo(
        () => ({ inventory, setInventory, sales, setSales, revertSale, users, setUsers }),
        [inventory, sales, revertSale, users]
    );
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/dashboard';
    const currentTitle = useMemo(() => {
        if (normalizedPath.startsWith('/admin/user/') && normalizedPath.includes('/edit')) return 'Edit User';
        if (normalizedPath.startsWith('/admin/users/')) return 'Edit User';
        return PATH_TITLE_MAP[normalizedPath] ?? 'Dashboard';
    }, [normalizedPath]);
    const isAdmin = user.role === 'admin';
    const canViewPage = useCallback(
        (page: AppSectionKey) => {
            if (isAdmin) return true;
            // For non-admins, check permissions
            // If permissions are still loading, allow access to prevent blocking
            if (permissionsLoading) {
                console.log('Permissions loading, allowing access to', page);
                return true;
            }
            const hasAccess = Boolean(permissions[page]?.canView);
            console.log(`canViewPage check for ${page}:`, { hasAccess, permission: permissions[page], isAdmin });
            return hasAccess;
        },
        [isAdmin, permissions, permissionsLoading]
    );

    // Map routes to permission keys
    const routeToPermissionKey: Record<string, AppSectionKey> = {
        '/dashboard': 'Dashboard',
        '/': 'Dashboard',
        '/inventory': 'Inventory',
        '/sales': 'Sales',
        '/collections': 'Collections',
        '/reports': 'Reports',
        '/data': 'Data',
        '/calendar': 'Calendar',
        '/team-chat': 'Team Chat',
        '/settings': 'Settings',
    };

    // Check if current route requires permission and user has access
    // Only run this AFTER permissions have finished loading
    useEffect(() => {
        // Don't redirect while checking auth or loading permissions
        if (authChecking || permissionsLoading || !session) {
            return;
        }
        
        // Don't redirect admin routes - they're handled separately
        if (normalizedPath.startsWith('/admin')) return;
        
        // Don't redirect from login page
        if (normalizedPath === '/login') return;
        
        const permissionKey = routeToPermissionKey[normalizedPath];
        if (permissionKey) {
            // Check if user has access (only check if permissions are loaded)
            const hasAccess = canViewPage(permissionKey);
            
            if (!hasAccess) {
                console.log(`Access denied for ${permissionKey} at ${normalizedPath} - redirecting to dashboard`);
                console.log('Current permissions state:', { 
                    permissions, 
                    permissionKey, 
                    hasPermission: permissions[permissionKey],
                    isAdmin 
                });
                // Only redirect if trying to access a restricted page
                // Don't redirect if already on dashboard (to avoid loops)
                if (normalizedPath !== '/dashboard' && normalizedPath !== '/') {
                    navigate('/dashboard', { replace: true });
                }
            }
        }
    }, [normalizedPath, canViewPage, authChecking, permissionsLoading, session, navigate, isAdmin, permissions]);

    const NotAuthorized = (
        <div className="rounded-2xl border border-border-low bg-glass-panel/70 p-8 text-center text-secondary">
            <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
            <p>You do not have permission to view this page.</p>
            <button
                onClick={() => navigate('/dashboard')}
                className="mt-4 rounded-lg bg-lava-core px-4 py-2 text-sm font-semibold text-white transition hover:bg-lava-warm"
            >
                Go to Dashboard
            </button>
        </div>
    );

    if (authChecking) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-primary">
                Checking session…
            </div>
        );
    }

    // Redirect to login if no session
    if (!session) {
        // Show login page if on /login, otherwise redirect
        if (location.pathname === '/login') {
            return <Login />;
        }
        // Redirect to login for any other route when not authenticated
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin && permissionsLoading) {
        return (
            <div className="flex h-screen items-center justify-center spotlight-bg text-primary">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lava-core mx-auto"></div>
                    <p className="mt-4 text-lg text-secondary">Loading your permissions...</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center spotlight-bg text-primary">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lava-core mx-auto"></div>
                    <p className="mt-4 text-lg text-secondary">Loading data...</p>
                </div>
            </div>
        );
    }

    return (
        <UserContext.Provider value={userContextValue}>
            <DataContext.Provider value={dataContextValue}>
                <div className="flex h-screen spotlight-bg text-primary">
                    <Sidebar isAdmin={isAdmin} permissions={permissions} canViewPage={canViewPage} />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Header title={currentTitle} onLogout={handleLogout} />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                            <Routes>
                                {/* Redirect /login to /dashboard if already authenticated (handled by session check above) */}
                                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={
                                    !permissionsLoading && !canViewPage('Dashboard') ? NotAuthorized : <Dashboard />
                                } />
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/inventory" element={
                                    !permissionsLoading && !canViewPage('Inventory') ? NotAuthorized : <Inventory />
                                } />
                                <Route path="/sales" element={
                                    !permissionsLoading && !canViewPage('Sales') ? NotAuthorized : <Sales />
                                } />
                                <Route path="/collections" element={
                                    !permissionsLoading && !canViewPage('Collections') ? NotAuthorized : <Collections />
                                } />
                                <Route path="/reports" element={
                                    !permissionsLoading && !canViewPage('Reports') ? NotAuthorized : <Reports />
                                } />
                                <Route path="/data" element={
                                    !permissionsLoading && !canViewPage('Data') ? NotAuthorized : <Data />
                                } />
                                <Route path="/calendar" element={
                                    !permissionsLoading && !canViewPage('Calendar') ? NotAuthorized : <Calendar />
                                } />
                                <Route path="/team-chat" element={
                                    !permissionsLoading && !canViewPage('Team Chat') ? NotAuthorized : <TeamChat />
                                } />
                                <Route path="/settings" element={
                                    !permissionsLoading && !canViewPage('Settings') ? NotAuthorized : <Settings />
                                } />
                                {/* Account Settings - accessible to all authenticated users */}
                                <Route path="/account-settings" element={<AccountSettings />} />
                                {/* Admin routes - only accessible by admins */}
                                <Route
                                    path="/admin"
                                    element={isAdmin ? <AdminUsers /> : <Navigate to="/dashboard" replace />}
                                />
                                <Route
                                    path="/admin/create-user"
                                    element={isAdmin ? <AdminCreateUserForm /> : <Navigate to="/dashboard" replace />}
                                />
                                <Route
                                    path="/admin/users"
                                    element={isAdmin ? <AdminUsers /> : <Navigate to="/dashboard" replace />}
                                />
                                <Route
                                    path="/admin/user/:id/edit"
                                    element={isAdmin ? <AdminUserPermissions /> : <Navigate to="/dashboard" replace />}
                                />
                                {/* Legacy route for backwards compatibility */}
                                <Route
                                    path="/admin/users/:id"
                                    element={isAdmin ? <AdminUserPermissions /> : <Navigate to="/dashboard" replace />}
                                />
                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </main>
                    </div>
                </div>
            </DataContext.Provider>
        </UserContext.Provider>
    );
};

export default App;
