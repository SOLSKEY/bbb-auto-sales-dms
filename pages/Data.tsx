import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { DATA_TABS } from '../constants';
import DataGrid from '../components/DataGrid';
import { UserContext, DataContext } from '../App';
import type { Vehicle, Sale, DailyCollectionSummary, DailyDelinquencySummary } from '../types';
import { VEHICLE_FIELD_MAP, SALE_FIELD_MAP, PAYMENTS_FIELD_MAP, DELINQUENCY_FIELD_MAP } from '../supabaseMapping';
import { buildWeekKey, getCommissionWeekRange, formatCommissionWeekLabel } from '../utils/commission';
import { parseDateStringToUtc } from '../utils/date';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import { supabase } from '../supabaseClient';
import { GlassButton } from '@/components/ui/glass-button';

const Data: React.FC = () => {
    const [activeTab, setActiveTab] = useState(DATA_TABS[0]);
    const userContext = useContext(UserContext);
    const dataContext = useContext(DataContext);
    const isAdmin = userContext?.user.role === 'admin';

    // State for non-centralized data
    const [collectionsData, setCollectionsData] = useState<DailyCollectionSummary[]>([]);
    const [delinquencyData, setDelinquencyData] = useState<DailyDelinquencySummary[]>([]);
    const [auctionData, setAuctionData] = useState<any[]>([]);
    const [collectionsBonusData, setCollectionsBonusData] = useState<Array<{ weekKey: string; weekRange: string; collectionsBonus: number | null }>>([]);
    const [loggedHoursData, setLoggedHoursData] = useState<Array<{ date: string; [salesperson: string]: string | number }>>([]);


    // Load data from Supabase when tab changes
    useEffect(() => {
        if (!dataContext) return;
        const { sales } = dataContext;
        
        const loadTabData = async () => {
            if (activeTab === 'Payments') {
                console.log('Loading payment records from Supabase...');
                const { data, error} = await supabase
                    .from('Payments')
                    .select('*')
                    .order('"Date"', { ascending: false });

                if (error) {
                    console.error('Error loading collection summaries:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                } else if (data) {
                    console.log(`Loaded ${data.length} collection summaries from Supabase`);
                    setCollectionsData(data);
                } else {
                    console.log('No collection summary data returned from Supabase');
                }
            } else if (activeTab === 'Delinquency') {
                console.log('Loading daily delinquency summaries from Supabase...');
                const { data, error } = await supabase
                    .from('Delinquency')
                    .select('*')
                    .order('"Date"', { ascending: false });

                if (error) {
                    console.error('Error loading delinquency summaries:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                } else if (data) {
                    console.log(`Loaded ${data.length} delinquency summaries from Supabase`);
                    setDelinquencyData(data);
                } else {
                    console.log('No delinquency data returned from Supabase');
                }
            } else if (activeTab === 'Collections Bonus') {
                console.log('Loading collections bonus data from Supabase...');
                
                // Generate all commission week ranges from sales data
                const weekBucketsMap = new Map<string, { start: Date; end: Date }>();
                (sales || []).forEach(sale => {
                    const parsedDate = parseDateStringToUtc(sale.saleDate);
                    if (!parsedDate) return;
                    const { start, end } = getCommissionWeekRange(parsedDate);
                    const weekKey = buildWeekKey(parsedDate);
                    if (!weekBucketsMap.has(weekKey)) {
                        weekBucketsMap.set(weekKey, { start, end });
                    }
                });
                
                // Load collections bonus data from Supabase
                const { data: bonusData, error: bonusError } = await supabase
                    .from('commission_report_collections_bonus')
                    .select('week_key, collections_bonus')
                    .order('week_key', { ascending: false });

                if (bonusError) {
                    console.error('Error loading collections bonus:', bonusError);
                }

                // Create a map of week_key to collections_bonus
                const bonusMap = new Map<string, number>();
                if (bonusData) {
                    bonusData.forEach(record => {
                        if (typeof record.collections_bonus === 'number') {
                            bonusMap.set(record.week_key, record.collections_bonus);
                        }
                    });
                }

                // Combine week ranges with bonus data
                const allWeeks = Array.from(weekBucketsMap.entries())
                    .map(([weekKey, { start, end }]) => ({
                        weekKey,
                        weekRange: formatCommissionWeekLabel(start, end),
                        collectionsBonus: bonusMap.get(weekKey) ?? null,
                    }))
                    .sort((a, b) => b.weekKey.localeCompare(a.weekKey)); // Sort descending by week key

                setCollectionsBonusData(allWeeks);
            } else if (activeTab === 'Logged Hours') {
                console.log('Loading logged hours data from Supabase...');
                
                // Get all unique salespeople (excluding Key)
                const allSalespeople = new Set<string>();
                (sales || []).forEach(sale => {
                    if (sale.salespersonSplit && sale.salespersonSplit.length > 0) {
                        sale.salespersonSplit.forEach(split => {
                            const name = split.name?.trim();
                            if (name && name.toLowerCase() !== 'unassigned' && name.toLowerCase() !== 'key') {
                                allSalespeople.add(name);
                            }
                        });
                    } else {
                        const name = sale.salesperson?.trim();
                        if (name && name.toLowerCase() !== 'unassigned' && name.toLowerCase() !== 'key') {
                            allSalespeople.add(name);
                        }
                    }
                });

                // Load missed hours data
                const { data: hoursData, error: hoursError } = await supabase
                    .from('missed_hours')
                    .select('*')
                    .order('date', { ascending: false });

                if (hoursError) {
                    console.error('Error loading logged hours:', hoursError);
                    setLoggedHoursData([]);
                } else if (hoursData) {
                    // Group by date
                    const dateMap = new Map<string, Record<string, string>>();
                    hoursData.forEach(entry => {
                        const date = entry.date;
                        if (!dateMap.has(date)) {
                            dateMap.set(date, { Date: date });
                        }
                        const salesperson = entry.salesperson;
                        const hours = entry.hours || 0;
                        const minutes = entry.minutes || 0;
                        let timeText = '';
                        if (hours > 0 && minutes > 0) {
                            timeText = `${hours}hr ${minutes}mins`;
                        } else if (hours > 0) {
                            timeText = `${hours}hr`;
                        } else if (minutes > 0) {
                            timeText = `${minutes}mins`;
                        }
                        dateMap.get(date)![salesperson] = timeText;
                    });

                    // Convert to array and ensure all salespeople columns exist
                    const result = Array.from(dateMap.values()).map(row => {
                        const newRow: { date: string; [salesperson: string]: string | number } = { date: row.Date };
                        Array.from(allSalespeople).sort().forEach(sp => {
                            newRow[sp] = row[sp] || '';
                        });
                        return newRow;
                    });

                    setLoggedHoursData(result);
                } else {
                    setLoggedHoursData([]);
                }
            } else if (activeTab === 'Auction') {
                // Note: Auction table does not exist in Supabase yet
                console.log('Auction table not implemented in Supabase');
                setAuctionData([]);
            }
        };

        loadTabData();
    }, [activeTab, dataContext]);

    // State for modals
    const [saleToRevert, setSaleToRevert] = useState<Sale | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    // Tab indicator state and ref
    const tabContainerRef = useRef<HTMLDivElement>(null);
    const [tabIndicatorStyle, setTabIndicatorStyle] = useState<React.CSSProperties>({});

    // Update tab indicator position when active tab changes
    useEffect(() => {
        if (!tabContainerRef.current) return;

        const activeButton = tabContainerRef.current.querySelector(
            `[data-tab="${activeTab}"]`
        ) as HTMLElement;
        
        if (activeButton) {
            const containerRect = tabContainerRef.current.getBoundingClientRect();
            const buttonRect = activeButton.getBoundingClientRect();
            
            setTabIndicatorStyle({
                left: `${buttonRect.left - containerRect.left}px`,
                width: `${buttonRect.width}px`,
                opacity: 1,
            });
        }
    }, [activeTab]);

    if (!dataContext) return null;
    const { inventory, setInventory, sales, setSales, revertSale } = dataContext;

    const startRevertProcess = (sale: Sale) => {
        setSaleToRevert(sale);
    };

    const confirmRevertSale = () => {
        if (saleToRevert) {
            revertSale(saleToRevert);
            setSaleToRevert(null);
            setIsAlertOpen(true);
        }
    };

    const sortedSalesDesc = useMemo(() => {
        return [...sales].sort((a, b) => {
            const getNumeric = (sale?: Sale) => {
                if (!sale) return -Infinity;
                const raw = sale.saleId ?? sale.accountNumber ?? '';
                const numeric = Number.parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
                return Number.isFinite(numeric) ? numeric : -Infinity;
            };
            return getNumeric(b) - getNumeric(a);
        });
    }, [sales]);

    const tabConfig = useMemo(() => {
        if (!dataContext) {
            return { columns: [], data: [], setData: () => {} };
        }
        const { sales } = dataContext;
        
        let config: { columns: any[]; data: any[]; setData: (...args: any) => void; onDeleteRow?: (row: any) => void; tableName?: string; primaryKey?: string; fieldMap?: Record<string, string>; } = { columns: [], data: [], setData: () => {} };

        switch (activeTab) {
            case 'Inventory':
                config = {
                    columns: [
                        { key: 'vehicleId', name: 'Vehicle ID' },
                        { key: 'status', name: 'Status' },
                        { key: 'arrivalDate', name: 'Arrival Date' },
                        { key: 'vinLast4', name: 'Vin Last 4' },
                        { key: 'year', name: 'Year' },
                        { key: 'make', name: 'Make' },
                        { key: 'model', name: 'Model' },
                        { key: 'trim', name: 'Trim' },
                        { key: 'exterior', name: 'Exterior' },
                        { key: 'interior', name: 'Interior' },
                        { key: 'upholstery', name: 'Upholstery' },
                        { key: 'bodyStyle', name: 'Body Style' },
                        { key: 'driveTrain', name: 'Drive Train' },
                        { key: 'mileage', name: 'Mileage' },
                        { key: 'mileageUnit', name: 'Mileage Unit' },
                        { key: 'transmission', name: 'Transmission' },
                        { key: 'fuelType', name: 'Fuel Type' },
                        { key: 'engine', name: 'Engine' },
                        { key: 'price', name: 'Price' },
                        { key: 'downPayment', name: 'Down Payment' },
                        { key: 'vin', name: 'VIN' },
                    ],
                    data: inventory,
                    setData: setInventory,
                    tableName: 'Inventory',
                    primaryKey: 'vin',
                    fieldMap: VEHICLE_FIELD_MAP,
                };
                break;
            case 'Sales':
                config = {
                    columns: [
                        { key: 'saleDate', name: 'Sale Date' },
                        { key: 'saleId', name: 'account_number' },
                        { key: 'stockNumber', name: 'Stock #' },
                        { key: 'saleType', name: 'Type' },
                        { key: 'salesperson', name: 'Salesman' },
                        { key: 'saleDownPayment', name: 'True Down Payment' },
                        { key: 'vinLast4', name: 'Vin Last 4' },
                        { key: 'year', name: 'Year' },
                        { key: 'make', name: 'Make' },
                        { key: 'model', name: 'Model' },
                        { key: 'trim', name: 'Trim' },
                        { key: 'exterior', name: 'Exterior' },
                        { key: 'interior', name: 'Interior' },
                        { key: 'upholstery', name: 'Upholstery' },
                        { key: 'mileage', name: 'Mileage' },
                        { key: 'mileageUnit', name: 'Mileage Unit' },
                        { key: 'salePrice', name: 'Price' },
                        { key: 'downPayment', name: 'Down Payment' },
                        { key: 'vin', name: 'VIN' },
                    ],
                    data: sortedSalesDesc,
                    setData: setSales,
                    onDeleteRow: startRevertProcess,
                    tableName: 'Sales',
                    primaryKey: 'saleId',
                    fieldMap: SALE_FIELD_MAP,
                };
                break;
            case 'Payments':
                 config = {
                    columns: [
                        { key: 'Date', name: 'Date' },
                        { key: 'Payments', name: 'Payments' },
                        { key: 'Late Fees', name: 'Late Fees' },
                        { key: 'BOA', name: 'BOA' }
                    ],
                    data: collectionsData,
                    setData: setCollectionsData,
                    tableName: 'Payments',
                    primaryKey: 'Date',
                    fieldMap: PAYMENTS_FIELD_MAP,
                 };
                 break;
            case 'Delinquency':
                config = {
                    columns: [
                        { key: 'Date', name: 'Date' },
                        { key: 'Overdue Accounts', name: 'Overdue Accounts' },
                        { key: 'Open Accounts', name: 'Open Accounts' }
                    ],
                    data: delinquencyData,
                    setData: setDelinquencyData,
                    tableName: 'Delinquency',
                    primaryKey: 'Date',
                    fieldMap: DELINQUENCY_FIELD_MAP,
                };
                break;
            case 'Collections Bonus':
                config = {
                    columns: [
                        { key: 'weekRange', name: 'Week Range' },
                        { key: 'collectionsBonus', name: 'Collections Bonus Amount' }
                    ],
                    data: collectionsBonusData,
                    setData: setCollectionsBonusData,
                    tableName: 'commission_report_collections_bonus',
                    primaryKey: 'weekKey',
                    fieldMap: {
                        weekKey: 'week_key',
                        collectionsBonus: 'collections_bonus',
                    },
                };
                break;
            case 'Logged Hours':
                // Get all unique salespeople for columns
                const allSalespeopleForHours = new Set<string>();
                (sales || []).forEach(sale => {
                    if (sale.salespersonSplit && sale.salespersonSplit.length > 0) {
                        sale.salespersonSplit.forEach(split => {
                            const name = split.name?.trim();
                            if (name && name.toLowerCase() !== 'unassigned' && name.toLowerCase() !== 'key') {
                                allSalespeopleForHours.add(name);
                            }
                        });
                    } else {
                        const name = sale.salesperson?.trim();
                        if (name && name.toLowerCase() !== 'unassigned' && name.toLowerCase() !== 'key') {
                            allSalespeopleForHours.add(name);
                        }
                    }
                });
                config = {
                    columns: [
                        { key: 'date', name: 'Date' },
                        ...Array.from(allSalespeopleForHours).sort().map(sp => ({ key: sp, name: sp }))
                    ],
                    data: loggedHoursData,
                    setData: setLoggedHoursData,
                    // No tableName - this is a pivoted view, not directly editable
                    // Use "Log Hours" button in Reports page to add/edit missed hours
                    primaryKey: 'date',
                };
                break;
            case 'Auction':
                config = {
                    columns: [
                        { key: 'id', name: 'ID' }, { key: 'vehicleName', name: 'Vehicle' }, { key: 'auctionDate', name: 'Auction Date' }, { key: 'soldPrice', name: 'Sold Price' }, { key: 'status', name: 'Status' }
                    ],
                    data: auctionData,
                    setData: setAuctionData,
                    tableName: 'Auction',
                    primaryKey: 'id',
                };
                break;
            default:
                config = { columns: [], data: [], setData: () => {} };
        }
        return config;
    }, [activeTab, inventory, sortedSalesDesc, collectionsData, auctionData, delinquencyData, collectionsBonusData, loggedHoursData, sales, setInventory, setSales, revertSale]);

    return (
        <div className="h-full flex flex-col">
            {/* Tab Navigation - Horizontal with Sliding Indicator */}
            <div className="glass-card-outline p-2 mb-6 print:hidden relative overflow-x-auto overflow-y-hidden w-full flex-shrink-0">
                <div 
                    ref={tabContainerRef}
                    className="flex flex-nowrap items-center gap-2 relative"
                    style={{ minWidth: 'max-content' }}
                >
                    {/* Sliding Indicator */}
                    <div
                        className="absolute bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-cyan-500/30 border border-cyan-400/50 rounded-lg transition-all duration-300 ease-out pointer-events-none"
                        style={{
                            ...tabIndicatorStyle,
                            top: '1px',
                            bottom: '1px',
                            height: 'auto',
                            boxShadow: '0 0 10px rgba(6, 182, 212, 0.5), inset 0 0 10px rgba(59, 130, 246, 0.3)',
                        }}
                    />
                    {DATA_TABS.map((tab) => (
                        <GlassButton
                            key={tab}
                            data-tab={tab}
                            onClick={() => setActiveTab(tab)}
                            size="sm"
                            className={`relative z-10 transition-colors flex-shrink-0 ${
                                activeTab === tab 
                                    ? 'glass-button-active pointer-events-none' 
                                    : 'hover:opacity-80'
                            }`}
                            contentClassName={activeTab === tab ? 'text-white' : undefined}
                            disabled={activeTab === tab}
                        >
                            {tab}
                        </GlassButton>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <DataGrid
                    columns={tabConfig.columns}
                    data={tabConfig.data}
                    setData={tabConfig.setData as React.Dispatch<React.SetStateAction<any[]>>}
                    editable={isAdmin && activeTab !== 'Logged Hours'}
                    onDeleteRow={isAdmin && activeTab !== 'Logged Hours' ? tabConfig.onDeleteRow : undefined}
                    tableName={tabConfig.tableName}
                    primaryKey={tabConfig.primaryKey}
                    fieldMap={tabConfig.fieldMap}
                />
            </div>

            {saleToRevert && (
                <ConfirmationModal
                    isOpen={!!saleToRevert}
                    onClose={() => setSaleToRevert(null)}
                    onConfirm={confirmRevertSale}
                    title="Revert Sale"
                    message={`Are you sure you want to revert the sale of the ${saleToRevert.year} ${saleToRevert.make} ${saleToRevert.model}? This will remove the sale record and mark the vehicle as "Available" again.`}
                    confirmButtonText="Confirm Revert"
                />
            )}
            
            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                title="Success"
                message="The sale has been successfully reverted, and the vehicle has been added back to inventory."
            />
        </div>
    );
};

export default Data;
