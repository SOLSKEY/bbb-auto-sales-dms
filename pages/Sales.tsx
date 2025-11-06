import React, { useState, useContext, useMemo, useEffect } from 'react';
import type { Sale, Vehicle } from '../types';
import DataGrid from '../components/DataGrid';
import { UserContext, DataContext } from '../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart, Area, LabelList } from 'recharts';
import { EyeIcon, TableCellsIcon, CalendarDaysIcon, FireIcon, ChartBarIcon, MagnifyingGlassIcon, TrophyIcon, HashtagIcon, TagIcon } from '@heroicons/react/24/solid';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import YtdSalesComparison from '../components/YtdSalesComparison';
import YtdCumulativeSalesChart from '../components/YtdCumulativeSalesChart';
import YearOverYearComparison from '../components/YearOverYearComparison';
import { useSupabaseSales } from '../hooks/useSupabaseSales';
import { buildSalesAggregates, formatDateKey, getYtdCountForYear } from '../utils/salesAnalytics';
import { computeNextAccountNumber, computeNextStockNumbers, StockPrefix, STOCK_PREFIXES, NextStockNumberEntry } from '../utils/stockNumbers';
import MarkSoldModal from '../components/MarkSoldModal';
import { supabase } from '../supabaseClient';
import { toSupabase, fromSupabase, SALE_FIELD_MAP, quoteSupabaseColumn } from '../supabaseMapping';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; variant?: 'default' | 'accent' }> = ({ title, value, icon: Icon, variant = 'default' }) => {
    const isAccent = variant === 'accent';
    const containerClasses = isAccent
        ? 'bg-gradient-to-r from-lava-warm via-lava-core to-lava-cool text-white border border-border-high'
        : 'glass-card text-primary';
    const iconWrapperClasses = isAccent ? 'bg-white/15' : 'bg-glass-panel';
    const titleClasses = isAccent ? 'text-xs text-white/80 uppercase tracking-wide' : 'text-sm text-muted';
    const valueClasses = isAccent ? 'text-2xl font-bold text-white font-orbitron tracking-tight-lg' : 'text-2xl font-bold text-primary font-orbitron tracking-tight-lg';

    return (
        <div className={`${containerClasses} p-3.5 rounded-lg shadow`}>
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${iconWrapperClasses}`}>
                    <Icon className={`h-5 w-5 ${isAccent ? 'text-white' : 'text-lava-core'}`} />
                </div>
                <div>
                    <h4 className={titleClasses}>{title}</h4>
                    <p className={valueClasses}>{value}</p>
                </div>
            </div>
        </div>
    );
};

const prefixDisplayConfig: Record<StockPrefix, { label: string; bg: string; text: string; border: string; description: string }> = {
    N: { label: 'N', bg: 'bg-sky-500/20', text: 'text-sky-200', border: 'border-sky-500/30', description: 'Nissan' },
    O: { label: 'O', bg: 'bg-yellow-500/20', text: 'text-yellow-200', border: 'border-yellow-500/30', description: 'Other' },
    D: { label: 'D', bg: 'bg-pink-500/20', text: 'text-pink-200', border: 'border-pink-500/30', description: 'Dodge' },
    F: { label: 'F', bg: 'bg-orange-500/20', text: 'text-orange-200', border: 'border-orange-500/30', description: 'Ford' },
    CH: { label: 'CH', bg: 'bg-emerald-500/20', text: 'text-emerald-200', border: 'border-emerald-500/30', description: 'Chevrolet' },
};

const NextStockCard: React.FC<{ stockNumbers: Record<StockPrefix, NextStockNumberEntry>; year: number }> = ({ stockNumbers, year }) => (
    <div className="glass-card p-3.5 h-full">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-glass-panel rounded-lg">
                <TagIcon className="h-5 w-5 text-lava-warm" />
            </div>
            <div>
                <h4 className="text-xs uppercase tracking-wide text-muted">Next Stock Numbers</h4>
                <p className="text-base font-semibold text-primary">For {year}</p>
            </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
            {STOCK_PREFIXES.map(prefix => {
                const config = prefixDisplayConfig[prefix];
                const entry = stockNumbers[prefix];
                const value = entry?.formatted ?? '--';
                return (
                    <div key={prefix} className={`rounded-md border ${config.border} ${config.bg} px-3 py-2 min-w-[110px] flex-shrink-0` }>
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
                            <span className="text-[11px] text-secondary">{config.description}</span>
                        </div>
                        <p className="mt-1 text-sm font-mono text-primary">{value}</p>
                    </div>
                );
            })}
        </div>
    </div>
);

const SalesAnalytics: React.FC = () => {
    const { data: salesData, loading, error, refresh } = useSupabaseSales();

    const { years, kpis, monthlyChartData, currentYear, nextAccountNumber, nextStockNumbers, activeSaleYear } = useMemo(() => {
        const aggregates = buildSalesAggregates(salesData);
        const { parsedSales, years, totalsByDate, totalsByYearMonth } = aggregates;

        // --- KPI CALCULATIONS ---
        const today = new Date();
        const currentYearValue = today.getFullYear();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayKey = formatDateKey(todayStart);

        const ytdSales = getYtdCountForYear(parsedSales, currentYearValue, today);
        const todaysSales = parsedSales.filter(({ date }) => formatDateKey(date) === todayKey).length;

        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const thisWeeksSales = parsedSales.filter(({ date }) => date >= startOfWeek && date <= endOfWeek).length;

        const startOfYear = new Date(currentYearValue, 0, 0);
        const diffInMs = today.getTime() - startOfYear.getTime();
        const oneDayInMs = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diffInMs / oneDayInMs);
        
        const recordDaySales = Object.values(totalsByDate || {}).length > 0 ? Math.max(...Object.values(totalsByDate || {})) : 0;

        let recordMonthSales = 0;
        Object.values(totalsByYearMonth || {}).forEach(monthMap => {
            Object.values(monthMap).forEach(count => {
                if (count > recordMonthSales) recordMonthSales = count;
            });
        });

        const kpis = {
            ytdSales: ytdSales.toLocaleString(),
            todaysSales: todaysSales.toLocaleString(),
            thisWeeksSales: thisWeeksSales.toLocaleString(),
            dayOfYear: dayOfYear.toLocaleString(),
            recordDaySales: `${recordDaySales} units`,
            recordMonthSales: `${recordMonthSales} units`,
        };
        
        const yearsInData = years;
        const latestYear = yearsInData.length > 0 ? Math.max(...yearsInData) : new Date().getFullYear();
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dataByMonth: { [month: string]: { [key: string]: string | number | undefined } } = {};
        
        monthNames.forEach(name => {
            dataByMonth[name] = { month: name };
        });
        
        parsedSales.forEach(({ date }) => {
            const year = date.getFullYear();
            const monthIndex = date.getMonth();
            const monthName = monthNames[monthIndex];
            
            if (dataByMonth[monthName]) {
                dataByMonth[monthName][String(year)] = (Number(dataByMonth[monthName][String(year)]) || 0) + 1;
            }
        });

        if (latestYear >= today.getFullYear()) { 
            const currentMonthIndex = today.getMonth();
            monthNames.forEach((name, index) => {
                if (index <= currentMonthIndex) {
                    if (dataByMonth[name][String(latestYear)] === undefined) {
                        dataByMonth[name][String(latestYear)] = 0;
                    }
                }
            });
        }
        
        const finalMonthlyData = monthNames.map(name => dataByMonth[name]);

        const nextAccountNumber = computeNextAccountNumber(salesData);
        const { nextByPrefix, latestYear: latestStockYear } = computeNextStockNumbers(salesData);
        const activeSaleYear = latestStockYear ?? currentYearValue;

        return {
            years: yearsInData,
            kpis,
            monthlyChartData: finalMonthlyData,
            currentYear: latestYear,
            nextAccountNumber,
            nextStockNumbers: nextByPrefix,
            activeSaleYear,
        };
    }, [salesData]);
    
    const [visibleYears, setVisibleYears] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const initialVisibility: Record<string, boolean> = {};
        years.forEach(year => {
            initialVisibility[String(year)] = true;
        });
        setVisibleYears(initialVisibility);
    }, [years]);


    const monthlyColors = ['#ffc658', '#ff4500', '#8884d8', '#ff7300', '#00C49F', '#82ca9d'];
    const currentYearColor = '#32CD32';

    const toggleYear = (year: string) => {
        setVisibleYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const renderLegend = (props: any) => {
        const { payload } = props;
        return (
            <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4">
                {payload.map((entry: any, index: number) => (
                    <div
                        key={`item-${index}`}
                        onClick={() => toggleYear(entry.value)}
                        className={`flex items-center cursor-pointer p-1 rounded-md transition-all ${!visibleYears[entry.value] ? 'opacity-50' : ''}`}
                    >
                        <div style={{ width: 12, height: 12, backgroundColor: entry.color, marginRight: 8, borderRadius: '50%' }}></div>
                        <span className="text-sm font-medium text-gray-300">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="glass-card p-6">
                <p className="text-secondary">Loading sales analytics from Supabase...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card p-6 space-y-4">
                <p className="text-red-400 font-semibold">Unable to load analytics data.</p>
                <p className="text-secondary text-sm">{error}</p>
                <button
                    onClick={refresh}
                    className="btn-lava inline-flex items-center"
                >
                    Retry
                </button>
            </div>
        );
    }

    const nextAccountNumberDisplay = nextAccountNumber !== null ? String(nextAccountNumber) : '—';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,200px)_1fr] gap-6 items-stretch">
                <div className="h-full">
                    <StatCard
                        title="Next Account Number"
                        value={nextAccountNumberDisplay}
                        icon={HashtagIcon}
                        variant="accent"
                    />
                </div>
                <NextStockCard stockNumbers={nextStockNumbers} year={activeSaleYear} />
            </div>

            <div className="border-t border-border-low pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Current Year's Total Sales" value={kpis.ytdSales} icon={ChartBarIcon} />
                    <StatCard title="Today's Sales" value={kpis.todaysSales} icon={CalendarDaysIcon} />
                    <StatCard title="This Week's Sales" value={kpis.thisWeeksSales} icon={CalendarDaysIcon} />
                    <StatCard title="Days Into Current Year" value={kpis.dayOfYear} icon={FireIcon} />
                    <StatCard title="Record Sales on One Day" value={kpis.recordDaySales} icon={TrophyIcon} />
                    <StatCard title="Most Sales in One Month" value={kpis.recordMonthSales} icon={TrophyIcon} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <YtdSalesComparison salesData={salesData} />
                <YearOverYearComparison salesData={salesData} />
            </div>

            <YtdCumulativeSalesChart salesData={salesData} />

            <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-primary mb-4 tracking-tight-md">Monthly Sales Comparison</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={monthlyChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                         <defs>
                            <linearGradient id="colorCurrentYear" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={currentYearColor} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={currentYearColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c2f33" />
                        <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1a1d21', border: '1px solid #2c2f33' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                        />
                        <Legend content={renderLegend} verticalAlign="bottom" />
                        {years.map((year, index) => {
                            if (!visibleYears[String(year)]) return null;

                            if (year === currentYear) {
                                return (
                                     <Area 
                                        key={year}
                                        type="step" 
                                        dataKey={String(year)} 
                                        name={String(year)}
                                        fill="url(#colorCurrentYear)"
                                        stroke={currentYearColor}
                                        strokeWidth={3}
                                    >
                                        <LabelList 
                                            dataKey={String(year)} 
                                            position="top" 
                                            offset={5}
                                            fill={currentYearColor}
                                            fontWeight="bold"
                                            formatter={(value: number) => (value !== undefined && value !== null) ? value : ''}
                                        />
                                    </Area>
                                );
                            } else {
                                return (
                                    <Bar 
                                        key={year}
                                        dataKey={String(year)} 
                                        name={String(year)}
                                        fill={monthlyColors[index % monthlyColors.length]} 
                                    />
                                );
                            }
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const Sales: React.FC = () => {
    const [viewMode, setViewMode] = useState<'analytics' | 'data'>('analytics');
    const userContext = useContext(UserContext);
    const dataContext = useContext(DataContext);
    const isAdmin = userContext?.user.role === 'admin';
    
    const [saleToRevert, setSaleToRevert] = useState<Sale | null>(null);
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
    const [isEditSaving, setIsEditSaving] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
    const [salesSearchTerm, setSalesSearchTerm] = useState('');

    if (!dataContext) return null;
    const { sales, setSales, revertSale, users } = dataContext;

    const salespeople = useMemo(() => {
        if (!users || users.length === 0) return [];
        return users.filter(user => user.name && user.name.trim().length > 0);
    }, [users]);

    const showAlert = (title: string, message: string) => {
        setAlertConfig({ open: true, title, message });
    };

    const filteredSales = useMemo(() => {
        const normalizeId = (sale: Sale) => {
            const rawId = sale.saleId ?? sale.accountNumber ?? '';
            const numeric = Number.parseInt(String(rawId).replace(/\D/g, ''), 10);
            return Number.isNaN(numeric) ? -Infinity : numeric;
        };

        const base = salesSearchTerm.trim()
            ? sales.filter(sale => {
                const lowercasedFilter = salesSearchTerm.toLowerCase();
                return Object.values(sale).some(value =>
                    String(value).toLowerCase().includes(lowercasedFilter)
                );
            })
            : sales;

        return [...base].sort((a, b) => normalizeId(b) - normalizeId(a));
    }, [sales, salesSearchTerm]);

    const startRevertProcess = (sale: Sale) => {
        if (new Date(sale.saleDate).getFullYear() < 2025) {
            alert("Historical sales records from before 2025 cannot be reverted as they lack full vehicle data.");
            return;
        }
        setSaleToRevert(sale);
    };

    const confirmRevertSale = () => {
        if (saleToRevert) {
            revertSale(saleToRevert);
            setSaleToRevert(null);
            showAlert('Success', 'The sale has been successfully reverted, and the vehicle has been added back to inventory.');
        }
    };

    const handleStartEditSale = (sale: Sale) => {
        setSaleToEdit(sale);
    };

    const buildVehicleFromSale = (sale: Sale): Vehicle => ({
        status: 'Sold',
        arrivalDate: sale.saleDate ?? new Date().toISOString().split('T')[0],
        vinLast4: sale.vinLast4 ?? sale.vin?.slice(-4) ?? '',
        year: sale.year ?? new Date().getFullYear(),
        make: sale.make ?? '',
        model: sale.model ?? '',
        trim: sale.trim ?? '',
        exterior: sale.exterior ?? '',
        interior: sale.interior ?? '',
        upholstery: sale.upholstery ?? '',
        bodyStyle: sale.bodyStyle ?? '',
        driveTrain: sale.driveTrain ?? '',
        mileage: sale.mileage ?? 0,
        mileageUnit: sale.mileageUnit ?? '',
        transmission: sale.transmission ?? '',
        fuelType: sale.fuelType ?? '',
        engine: sale.engine ?? '',
        price: sale.salePrice ?? sale.price ?? 0,
        downPayment: sale.saleDownPayment ?? sale.downPayment ?? 0,
        vin: sale.vin ?? '',
        images: sale.images ?? [],
    });

    const buildSaleQuery = (builder: any, sale: Sale) => {
        if (sale.id !== undefined) {
            return builder.eq('id', sale.id);
        }
        const identifier = sale.accountNumber || sale.saleId;
        if (!identifier) return null;
        return builder.eq(SALE_FIELD_MAP.accountNumber, identifier);
    };

    const performSaleUpdate = async (patch: Record<string, any>, sale: Sale) => {
        const payload = toSupabase(patch, SALE_FIELD_MAP, { quoteKeys: false });

        let query = supabase.from('Sales').update(payload);
        query = buildSaleQuery(query, sale);
        if (!query) {
            return { error: { message: 'Unable to locate sale record.' }, data: null, usedFallback: false };
        }

        const result = await query.select('*').single();

        if (
            result.error &&
            typeof result.error.message === 'string' &&
            result.error.message.includes('Salesperson Split')
        ) {
            console.warn('[Sales] Missing "Salesperson Split" column. Retrying without split payload.');
            const cloned = { ...payload };
            delete cloned[SALE_FIELD_MAP.salespersonSplit];
            delete cloned[quoteSupabaseColumn(SALE_FIELD_MAP.salespersonSplit)];

            let fallbackQuery = supabase.from('Sales').update(cloned);
            fallbackQuery = buildSaleQuery(fallbackQuery, sale);
            if (!fallbackQuery) {
                return { error: { message: 'Unable to locate sale record.' }, data: null, usedFallback: false };
            }
            const fallbackResult = await fallbackQuery.select('*').single();
            return { ...fallbackResult, usedFallback: !fallbackResult.error };
        }

        return { ...result, usedFallback: false };
    };

    const handleSaveEditedSale = async (details: {
        primarySalesperson: string;
        salespersonSplit: Array<{ name: string; share: number }>;
        downPayment: number;
        saleType: 'Sale' | 'Trade-in' | 'Name Change';
        stockNumber: string;
        accountNumber: string;
    }) => {
        if (!saleToEdit || isEditSaving) return;
        setIsEditSaving(true);

        try {
            const updatePatch: Record<string, any> = {
                saleDownPayment: details.downPayment,
                salesperson: details.primarySalesperson,
                salespersonSplit: details.salespersonSplit,
                saleType: details.saleType,
            };

            if (details.stockNumber && details.stockNumber !== (saleToEdit.stockNumber ?? '')) {
                updatePatch.stockNumber = details.stockNumber;
            }

            if (details.accountNumber && details.accountNumber !== (saleToEdit.accountNumber ?? '')) {
                updatePatch.accountNumber = details.accountNumber;
            }

            const { data, error, usedFallback } = await performSaleUpdate(updatePatch, saleToEdit);

            if (error) {
                console.error('Error updating sale record:', error);
                showAlert('Error', 'Failed to update sale. Please try again.');
                return;
            }

            const mapped = data ? (fromSupabase(data, SALE_FIELD_MAP) as Sale) : saleToEdit;
            const updatedSale: Sale = {
                ...saleToEdit,
                ...mapped,
                saleDownPayment: details.downPayment,
                salesperson: details.primarySalesperson,
                salespersonSplit: usedFallback
                    ? details.salespersonSplit
                    : mapped.salespersonSplit ?? details.salespersonSplit,
                saleType: details.saleType,
                stockNumber: details.stockNumber || saleToEdit.stockNumber,
                accountNumber: details.accountNumber || saleToEdit.accountNumber,
            };

            setSales(prev =>
                prev.map(existing => {
                    const matchesById = saleToEdit.id !== undefined && existing.id === saleToEdit.id;
                    const matchesByAccount =
                        saleToEdit.id === undefined &&
                        (existing.accountNumber === saleToEdit.accountNumber ||
                            existing.saleId === saleToEdit.saleId);
                    return matchesById || matchesByAccount ? updatedSale : existing;
                })
            );

            if (usedFallback) {
                showAlert(
                    'Sale Updated with Warning',
                    'Sale updated, but the Supabase "Sales" table is missing the "Salesperson Split" column. Please run the migration to store split details.',
                );
            } else {
                showAlert('Sale Updated', 'The sale details have been updated successfully.');
            }
            setSaleToEdit(null);
        } finally {
            setIsEditSaving(false);
        }
    };
    
    const columns = [
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
    ];
    
    return (
        <div>
            <div className="flex justify-end mb-6">
                <div className="flex space-x-1 bg-glass-panel p-1 rounded-lg border border-border-low">
                    <button
                        onClick={() => setViewMode('analytics')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'analytics' ? 'btn-lava' : 'text-secondary hover:bg-glass-panel'}`}
                    >
                       <EyeIcon className="h-5 w-5 inline-block mr-1"/> Analytics
                    </button>
                    <button
                        onClick={() => setViewMode('data')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'data' ? 'btn-lava' : 'text-secondary hover:bg-glass-panel'}`}
                    >
                       <TableCellsIcon className="h-5 w-5 inline-block mr-1"/> Raw Data
                    </button>
                </div>
            </div>
            
            {viewMode === 'analytics' ? (
                <SalesAnalytics />
            ) : (
                <div>
                    <div className="mb-4">
                        <div className="relative">
                            <MagnifyingGlassIcon className="h-5 w-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search all sales records by any keyword..."
                                value={salesSearchTerm}
                                onChange={e => setSalesSearchTerm(e.target.value)}
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md py-2 pl-10 pr-4 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <DataGrid
                        columns={columns}
                        data={filteredSales}
                        setData={setSales as React.Dispatch<React.SetStateAction<any[]>>}
                        editable={false}
                        onDeleteRow={isAdmin ? startRevertProcess : undefined}
                        onEditRow={isAdmin ? handleStartEditSale : undefined}
                        deleteButtonText="Revert"
                        deleteButtonTitle="Revert Sale"
                        editButtonText="Edit"
                        editButtonTitle="Edit Sale"
                        tableName="Sales"
                        primaryKey="saleId"
                    />
                </div>
            )}

            {saleToRevert && (
                <ConfirmationModal
                    isOpen={!!saleToRevert}
                    onClose={() => setSaleToRevert(null)}
                    onConfirm={confirmRevertSale}
                    title="Revert Sale"
                    message={`Are you sure you want to revert this sale? The vehicle will be marked as "Available" and this sale record will be removed.`}
                    confirmButtonText="Confirm Revert"
                />
            )}

            <AlertModal
                isOpen={alertConfig.open}
                onClose={() => setAlertConfig(prev => ({ ...prev, open: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
            />

            {saleToEdit && (
                <MarkSoldModal
                    vehicle={buildVehicleFromSale(saleToEdit)}
                    onClose={() => {
                        if (!isEditSaving) setSaleToEdit(null);
                    }}
                    onConfirm={handleSaveEditedSale}
                    defaultAccountNumber={saleToEdit.accountNumber ?? ''}
                    defaultStockNumber={saleToEdit.stockNumber ?? ''}
                    salespeople={salespeople}
                    title="Edit Sale"
                    confirmLabel={isEditSaving ? 'Saving…' : 'Save Changes'}
                    confirmDisabled={isEditSaving}
                    showStockNumberInput={true}
                    showAccountNumberInput={true}
                    requireStockNumber={false}
                    requireAccountNumber={false}
                    initialValues={{
                        stockNumber: saleToEdit.stockNumber ?? '',
                        accountNumber: saleToEdit.accountNumber ?? '',
                        saleType: saleToEdit.saleType ?? 'Sale',
                        downPayment: saleToEdit.saleDownPayment ?? saleToEdit.downPayment ?? 0,
                        salespersonSplit:
                            saleToEdit.salespersonSplit && saleToEdit.salespersonSplit.length
                                ? saleToEdit.salespersonSplit
                                : saleToEdit.salesperson
                                ? [{ name: saleToEdit.salesperson, share: 100 }]
                                : [],
                    }}
                />
            )}

        </div>
    );
};

export default Sales;
