import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ClipboardDocumentIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../supabaseClient';
import { fromSupabaseArray, SALE_FIELD_MAP, VEHICLE_FIELD_MAP, quoteSupabaseColumn } from '../../supabaseMapping';
import { GlassButton } from '@/components/ui/glass-button';
import type { Vehicle, Sale } from '../../types';
import { formatDateKey, getWeekStartUtc, parseDateStringToUtc, toUtcMidnight, addUtcDays } from '../../utils/date';
import { INVENTORY_STATUS_VALUES } from '../../constants';

// Define status sets matching Inventory.tsx logic
const ACTIVE_RETAIL_STATUSES = new Set(
    INVENTORY_STATUS_VALUES.filter(status => status !== 'Repairs'),
);

const BHPH_STATUSES = new Set(
    INVENTORY_STATUS_VALUES.filter(
        status => status !== 'Repairs' && status !== 'Cash',
    ),
);

interface StatusLog {
    id: number;
    vehicle_id: string;
    previous_status: string;
    new_status: string;
    changed_at: string;
}

interface NightlyReportData {
    sold: Array<{ vehicle: string; weeklyIndex: number }>;
    receivedNew: Array<{ vehicle: string; weeklyIndex: number }>;
    repairs: string[];
    trash: string[];
    receivedBack: string[];
    deposit: string[];
    totalInventory: number;
    bhphCount: number;
    cashCount: number;
}

/**
 * Compact widget button for Inventory Text Out that appears in the header.
 * Opens a popover with the nightly report when clicked.
 */
const InventoryTextOutWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<NightlyReportData | null>(null);
    const [copied, setCopied] = useState(false);
    const widgetRef = React.useRef<HTMLDivElement>(null);

    // Get today's date in YYYY-MM-DD format (local timezone)
    const getTodayDate = () => {
        const today = toUtcMidnight(new Date());
        return formatDateKey(today);
    };

    // Get last Monday (start of current week)
    const getLastMonday = () => {
        const today = toUtcMidnight(new Date());
        return getWeekStartUtc(today);
    };

    // Format date for Supabase query (YYYY-MM-DD)
    const formatDateForQuery = (date: Date) => {
        return formatDateKey(date);
    };

    // Format vehicle as "YY Model Last4VIN" (no Make)
    const formatVehicle = (vehicle: Vehicle | Sale): string => {
        const year = vehicle.year ? String(vehicle.year).slice(-2) : '';
        const model = vehicle.model || '';
        const vinLast4 = vehicle.vinLast4 || (vehicle.vin ? vehicle.vin.slice(-4) : '');
        return `${year} ${model} ${vinLast4}`.trim();
    };

    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        try {
            const today = getTodayDate();
            const lastMonday = getLastMonday();
            const mondayStr = formatDateForQuery(lastMonday);

            // Fetch SOLD vehicles (from Sales table where Sale Date is today)
            const { data: soldData, error: soldError } = await supabase
                .from('Sales')
                .select('*')
                .eq(quoteSupabaseColumn('Sale Date'), today);

            if (soldError) {
                console.error('Error fetching sold vehicles:', soldError);
            }

            // Fetch all sales since last Monday for weekly counter
            const { data: weeklySalesData } = await supabase
                .from('Sales')
                .select('*')
                .gte(quoteSupabaseColumn('Sale Date'), mondayStr);

            // Fetch RECEIVED - NEW vehicles (from Inventory where Arrival Date is today)
            const { data: receivedData, error: receivedError } = await supabase
                .from('Inventory')
                .select('*')
                .eq(quoteSupabaseColumn('Arrival Date'), today);

            if (receivedError) {
                console.error('Error fetching received vehicles:', receivedError);
            }

            // Fetch all arrivals since last Monday for weekly counter
            const { data: weeklyArrivalsData } = await supabase
                .from('Inventory')
                .select('*')
                .gte(quoteSupabaseColumn('Arrival Date'), mondayStr);

            // Fetch STATUS LOGS (from status_logs where changed_at is today)
            // Parse today string to UTC date and create proper UTC date range
            let statusLogsData = null;
            let logsError = null;
            
            const todayDate = parseDateStringToUtc(today);
            if (!todayDate) {
                console.error('Failed to parse today date:', today);
            } else {
                const todayStart = toUtcMidnight(todayDate);
                const todayEnd = addUtcDays(todayStart, 1);
                todayEnd.setMilliseconds(todayEnd.getMilliseconds() - 1);

                const result = await supabase
                    .from('status_logs')
                    .select('*')
                    .gte('changed_at', todayStart.toISOString())
                    .lte('changed_at', todayEnd.toISOString());
                
                statusLogsData = result.data;
                logsError = result.error;
            }

            if (logsError) {
                console.error('Error fetching status logs:', logsError);
            }

            // Fetch current inventory for footer count
            const { data: inventoryData } = await supabase
                .from('Inventory')
                .select('*')
                .neq('Status', 'Sold');

            // Process SOLD vehicles
            const soldVehicles = (soldData || []).map(sale => {
                const mappedSale = fromSupabaseArray([sale], SALE_FIELD_MAP)[0] as Sale;
                return {
                    vehicle: formatVehicle(mappedSale),
                    saleDate: mappedSale.saleDate,
                };
            });

            // Calculate weekly index for each sold vehicle
            // Sort all weekly sales by date, then assign index based on position
            const weeklySales = (weeklySalesData || []).map((s, idx) => {
                const mapped = fromSupabaseArray([s], SALE_FIELD_MAP)[0] as Sale;
                return {
                    vehicle: formatVehicle(mapped),
                    saleDate: mapped.saleDate,
                    originalIndex: idx,
                };
            }).sort((a, b) => {
                const dateA = a.saleDate ? (parseDateStringToUtc(a.saleDate)?.getTime() || 0) : 0;
                const dateB = b.saleDate ? (parseDateStringToUtc(b.saleDate)?.getTime() || 0) : 0;
                return dateA - dateB;
            });

            // Create a map of vehicle+date to weekly index
            const weeklyIndexMap = new Map<string, number>();
            weeklySales.forEach((sale, idx) => {
                const key = `${sale.vehicle}|${sale.saleDate}`;
                if (!weeklyIndexMap.has(key)) {
                    weeklyIndexMap.set(key, idx + 1);
                }
            });

            const soldWithIndex = soldVehicles.map(sold => {
                const key = `${sold.vehicle}|${sold.saleDate}`;
                const index = weeklyIndexMap.get(key) || 1;
                return {
                    vehicle: sold.vehicle,
                    weeklyIndex: index,
                };
            });

            // Process RECEIVED - NEW vehicles
            const receivedVehicles = (receivedData || []).map(vehicle => {
                const mapped = fromSupabaseArray([vehicle], VEHICLE_FIELD_MAP)[0] as Vehicle;
                return {
                    vehicle: formatVehicle(mapped),
                    arrivalDate: mapped.arrivalDate,
                };
            });

            // Calculate weekly index for each received vehicle
            // Sort all weekly arrivals by date, then assign index based on position
            const weeklyArrivals = (weeklyArrivalsData || []).map((v, idx) => {
                const mapped = fromSupabaseArray([v], VEHICLE_FIELD_MAP)[0] as Vehicle;
                return {
                    vehicle: formatVehicle(mapped),
                    arrivalDate: mapped.arrivalDate,
                    originalIndex: idx,
                };
            }).sort((a, b) => {
                const dateA = a.arrivalDate ? (parseDateStringToUtc(a.arrivalDate)?.getTime() || 0) : 0;
                const dateB = b.arrivalDate ? (parseDateStringToUtc(b.arrivalDate)?.getTime() || 0) : 0;
                return dateA - dateB;
            });

            // Create a map of vehicle+date to weekly index
            const weeklyArrivalIndexMap = new Map<string, number>();
            weeklyArrivals.forEach((arrival, idx) => {
                const key = `${arrival.vehicle}|${arrival.arrivalDate}`;
                if (!weeklyArrivalIndexMap.has(key)) {
                    weeklyArrivalIndexMap.set(key, idx + 1);
                }
            });

            const receivedWithIndex = receivedVehicles.map(rec => {
                const key = `${rec.vehicle}|${rec.arrivalDate}`;
                const index = weeklyArrivalIndexMap.get(key) || 1;
                return {
                    vehicle: rec.vehicle,
                    weeklyIndex: index,
                };
            });

            // Process STATUS LOGS
            const statusLogs = (statusLogsData || []) as StatusLog[];
            
            // Get vehicle details for status logs
            const vehicleIds = [...new Set(statusLogs.map(log => log.vehicle_id))];
            const vehicleDetailsMap = new Map<string, Vehicle>();
            
            if (vehicleIds.length > 0) {
                const { data: vehiclesData } = await supabase
                    .from('Inventory')
                    .select('*')
                    .in(quoteSupabaseColumn('Vehicle ID'), vehicleIds);
                
                if (vehiclesData) {
                    vehiclesData.forEach(v => {
                        const mapped = fromSupabaseArray([v], VEHICLE_FIELD_MAP)[0] as Vehicle;
                        vehicleDetailsMap.set(mapped.vehicleId || '', mapped);
                    });
                }
            }

            const repairs: string[] = [];
            const trash: string[] = [];
            const receivedBack: string[] = [];
            const deposit: string[] = [];

            statusLogs.forEach(log => {
                const vehicle = vehicleDetailsMap.get(log.vehicle_id);
                if (!vehicle) return;

                const vehicleStr = formatVehicle(vehicle);

                if (log.new_status === 'Repairs') {
                    repairs.push(`-${vehicleStr}`);
                } else if (log.new_status === 'Trash' || log.new_status === 'Sent to Nashville') {
                    trash.push(`-${vehicleStr}`);
                } else if (log.previous_status === 'Repairs' && (log.new_status === 'Available' || log.new_status === 'Available (Pending Title)')) {
                    receivedBack.push(`+${vehicleStr}`);
                } else if (log.new_status === 'Deposit') {
                    deposit.push(vehicleStr); // No +/- for deposit
                }
            });

            // Calculate inventory counts - using same logic as Inventory.tsx
            const inventory = (inventoryData || []).map(v => fromSupabaseArray([v], VEHICLE_FIELD_MAP)[0] as Vehicle);
            let totalInventory = 0;
            let bhphCount = 0;
            let cashCount = 0;

            inventory.forEach(vehicle => {
                if (vehicle.status === 'Sold') return;
                if (ACTIVE_RETAIL_STATUSES.has(vehicle.status || '')) {
                    totalInventory++;
                    if (BHPH_STATUSES.has(vehicle.status || '')) {
                        bhphCount++;
                    }
                    if (vehicle.status === 'Cash') {
                        cashCount++;
                    }
                }
            });

            setReportData({
                sold: soldWithIndex,
                receivedNew: receivedWithIndex,
                repairs,
                trash,
                receivedBack,
                deposit,
                totalInventory,
                bhphCount,
                cashCount,
            });
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && !reportData) {
            fetchReportData();
        }
    }, [isOpen, reportData, fetchReportData]);

    // Refresh data when day changes or when widget is opened
    useEffect(() => {
        if (!isOpen) return;

        let lastDateString = getTodayDate();
        const checkDayChange = () => {
            const currentDateString = getTodayDate();
            if (currentDateString !== lastDateString) {
                console.log('Day changed in Inventory Text Out widget, refreshing...');
                lastDateString = currentDateString;
                setReportData(null); // Clear old data
                fetchReportData();
            }
        };

        // Check every minute for day change
        const interval = setInterval(checkDayChange, 60000);
        
        // Also refresh when widget is opened (in case data is stale)
        fetchReportData();

        return () => clearInterval(interval);
    }, [isOpen, fetchReportData]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const generateReportText = (): string => {
        if (!reportData) return '';

        const sections: string[] = [];

        // 1. SOLD section
        if (reportData.sold.length > 0) {
            const soldLines = ['*Sold:*'];
            reportData.sold.forEach(({ vehicle, weeklyIndex }) => {
                soldLines.push(`-${vehicle} /${weeklyIndex}`);
            });
            sections.push(soldLines.join('\n'));
        }

        // 2. DEPOSIT section
        if (reportData.deposit.length > 0) {
            const depositLines = ['*Deposit:*'];
            reportData.deposit.forEach(vehicle => {
                depositLines.push(vehicle);
            });
            sections.push(depositLines.join('\n'));
        }

        // 3. RECEIVED section (new arrivals + returns from shop)
        const receivedItems: string[] = [];
        if (reportData.receivedNew.length > 0) {
            reportData.receivedNew.forEach(({ vehicle, weeklyIndex }) => {
                receivedItems.push(`+${vehicle} /${weeklyIndex}`);
            });
        }
        if (reportData.receivedBack.length > 0) {
            reportData.receivedBack.forEach(vehicle => {
                receivedItems.push(vehicle);
            });
        }
        if (receivedItems.length > 0) {
            sections.push(['*From Nashville:*', ...receivedItems].join('\n'));
        }

        // 4. REPAIRS section (Sent to Shop)
        if (reportData.repairs.length > 0) {
            const repairsLines = ['*Sent to Shop:*'];
            reportData.repairs.forEach(vehicle => {
                repairsLines.push(vehicle);
            });
            sections.push(repairsLines.join('\n'));
        }

        // 5. TRASH section (To Nashville)
        if (reportData.trash.length > 0) {
            const trashLines = ['*To Nashville:*'];
            reportData.trash.forEach(vehicle => {
                trashLines.push(vehicle);
            });
            sections.push(trashLines.join('\n'));
        }

        // 6. FOOTER (Always show) - Format: "29 (28 bhph/1 _CASH_)"
        sections.push(`${reportData.totalInventory} (${reportData.bhphCount} bhph/${reportData.cashCount} _CASH_)`);

        // Join all non-empty sections with double newline
        return sections.join('\n\n');
    };

    const handleCopy = async () => {
        const text = generateReportText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    };

    const reportText = useMemo(() => generateReportText(), [reportData]);

    return (
        <div ref={widgetRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-white/10 rounded transition-colors focus:outline-none group"
                aria-label="Open Inventory Text Out"
                title="Inventory Text Out"
            >
                <ClipboardDocumentIcon className="h-6 w-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </button>

            {/* Popover - Positioned below header */}
            {isOpen && (
                <div 
                    className="absolute top-full right-0 mt-2 z-[9999] max-h-[70vh] flex flex-col glass-card-accent"
                    style={{
                        width: '18.2rem',
                        borderRadius: '16px',
                        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.98) 0%, rgba(5, 5, 10, 0.99) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-cyan-500/20">
                        <h3 className="text-lg font-bold text-primary font-orbitron tracking-tight-lg">
                            Inventory Text Out
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-secondary hover:text-primary transition-colors p-1 rounded-full hover:bg-cyan-500/10"
                            aria-label="Close"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div 
                                    className="animate-spin rounded-full h-8 w-8 border-2 border-transparent"
                                    style={{
                                        borderTopColor: '#06b6d4',
                                        borderRightColor: '#06b6d4',
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="glass-panel rounded-lg p-4 border border-border-low">
                                <pre className="text-sm text-primary whitespace-pre-wrap leading-relaxed font-sans">
                                    {reportText || 'No data for today'}
                                </pre>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 flex justify-end gap-3 border-t border-cyan-500/20">
                        <GlassButton 
                            onClick={() => setIsOpen(false)}
                            size="sm"
                        >
                            Close
                        </GlassButton>
                        <GlassButton
                            onClick={handleCopy}
                            disabled={!reportText || isLoading}
                            size="sm"
                            contentClassName="flex items-center gap-2"
                        >
                            {copied ? (
                                <>
                                    <CheckIcon className="h-4 w-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                    Copy
                                </>
                            )}
                        </GlassButton>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryTextOutWidget;
