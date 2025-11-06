import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DATA_TABS } from '../constants';
import DataGrid from '../components/DataGrid';
import { UserContext, DataContext } from '../App';
import type { Vehicle, Sale, DailyCollectionSummary, DailyDelinquencySummary } from '../types';
import { VEHICLE_FIELD_MAP, SALE_FIELD_MAP } from '../supabaseMapping';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import { supabase } from '../supabaseClient';

const Data: React.FC = () => {
    const [activeTab, setActiveTab] = useState(DATA_TABS[0]);
    const userContext = useContext(UserContext);
    const dataContext = useContext(DataContext);
    const isAdmin = userContext?.user.role === 'admin';

    // State for non-centralized data
    const [collectionsData, setCollectionsData] = useState<DailyCollectionSummary[]>([]);
    const [delinquencyData, setDelinquencyData] = useState<DailyDelinquencySummary[]>([]);
    const [auctionData, setAuctionData] = useState<any[]>([]);

    // Load data from Supabase when tab changes
    useEffect(() => {
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
            } else if (activeTab === 'Auction') {
                // Note: Auction table does not exist in Supabase yet
                console.log('Auction table not implemented in Supabase');
                setAuctionData([]);
            }
        };

        loadTabData();
    }, [activeTab]);

    // State for modals
    const [saleToRevert, setSaleToRevert] = useState<Sale | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

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

    const tabConfig = useMemo(() => {
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
                    data: sales,
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
    }, [activeTab, inventory, sales, collectionsData, auctionData, delinquencyData, setInventory, setSales, revertSale]);

    return (
        <div className="h-full flex flex-col">
            <div className="border-b border-border-low mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {DATA_TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab
                                    ? 'border-lava-core text-lava-core'
                                    : 'border-transparent text-muted hover:text-primary hover:border-border-high'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 overflow-hidden">
                <DataGrid
                    columns={tabConfig.columns}
                    data={tabConfig.data}
                    setData={tabConfig.setData as React.Dispatch<React.SetStateAction<any[]>>}
                    editable={isAdmin}
                    onDeleteRow={isAdmin ? tabConfig.onDeleteRow : undefined}
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
