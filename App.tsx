

import React, { useState, createContext, useMemo, useCallback, useEffect } from 'react';
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
import type { User, Role, Vehicle, Sale, UserAccount } from './types';
import Header from './components/Header';
import { supabase } from './supabaseClient';
import { fromSupabaseArray, VEHICLE_FIELD_MAP, SALE_FIELD_MAP, USER_FIELD_MAP, quoteSupabaseColumn } from './supabaseMapping';

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

const App: React.FC = () => {
    const [activePage, setActivePage] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const requestedPage = params.get('page');
            if (requestedPage) {
                return requestedPage;
            }
        }
        return 'Inventory';
    });
    const [user, setUser] = useState<User>({ id: 1, name: 'Admin User', role: 'admin' });

    const [inventory, setInventory] = useState<Vehicle[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    // Load initial data from Supabase
    useEffect(() => {
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

                // Load sales
                console.log('Loading sales from Supabase...');
                const { data: salesData, error: salesError } = await supabase
                    .from('Sales')
                    .select('*')
                    .order('"Sale Date"', { ascending: false });

                if (salesError) {
                    console.error('Error loading sales:', salesError);
                    console.error('Error details:', JSON.stringify(salesError, null, 2));
                } else if (salesData) {
                    console.log(`Loaded ${salesData.length} sales from Supabase`);
                    const mappedSales = fromSupabaseArray(salesData, SALE_FIELD_MAP);
                    setSales(mappedSales);
                } else {
                    console.log('No sales data returned from Supabase');
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
    }, []);

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

    const userContextValue = useMemo(() => ({ user, setUser }), [user]);
    const dataContextValue = useMemo(
        () => ({ inventory, setInventory, sales, setSales, revertSale, users, setUsers }),
        [inventory, sales, revertSale, users]
    );

    const renderPage = () => {
        switch (activePage) {
            case 'Dashboard': return <Dashboard />;
            case 'Inventory': return <Inventory />;
            case 'Sales': return <Sales />;
            case 'Collections': return <Collections />;
            case 'Reports': return <Reports />;
            case 'Data': return <Data />;
            case 'Calendar': return <Calendar />;
            case 'Team Chat': return <TeamChat />;
            case 'Settings': return <Settings />;
            default: return <Dashboard />;
        }
    };

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
                    <Sidebar activePage={activePage} setActivePage={setActivePage} />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Header title={activePage} />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                            {renderPage()}
                        </main>
                    </div>
                </div>
            </DataContext.Provider>
        </UserContext.Provider>
    );
};

export default App;
