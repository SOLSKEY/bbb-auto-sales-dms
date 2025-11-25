import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { HashtagIcon, ChartBarIcon, ArrowTrendingUpIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import YtdSalesComparison from '../components/YtdSalesComparison';
import YtdCumulativeSalesChart from '../components/YtdCumulativeSalesChart';
import YearOverYearComparison from '../components/YearOverYearComparison';
import MonthlySalesComparisonChart from '../components/MonthlySalesComparisonChart';
import CollectionsWeeklyForecast from '../components/CollectionsWeeklyForecast';
import CollectionsWeeklyDelinquencyChart from '../components/CollectionsWeeklyDelinquencyChart';
import NextStockCard from '../components/NextStockCard';
import DashboardPlannerCard from '../components/DashboardPlannerCard';
import { DataContext } from '../App';
import { computeNextAccountNumber, computeNextStockNumbers } from '../utils/stockNumbers';
import { buildSalesAggregates } from '../utils/salesAnalytics';
import {
    parseDateStringToUtc,
    toUtcMidnight,
    getWeekStartUtc,
    addUtcDays,
    formatDateKey,
} from '../utils/date';
import { CALENDAR_EVENTS, INVENTORY_STATUS_VALUES } from '../constants';
import type { DailyCollectionSummary } from '../types';
import { supabase } from '../supabaseClient';
import type { CalendarEvent } from '../types';

const safeParseFloat = (val: unknown) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    const cleaned = String(val).replace(/[^0-9.+-]/g, '');
    const parsed = cleaned === '' ? NaN : Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

type NormalizedDelinquencyEntry = {
    date: Date;
    openAccounts: number;
    overdueAccounts: number;
};

interface WeeklySummary {
    weekStart: Date;
    totalPayments: number;
    avgOpenAccounts: number;
}

const ACTIVE_RETAIL_STATUSES = new Set(
    INVENTORY_STATUS_VALUES.filter(status => status !== 'Repairs'),
);
const BHPH_STATUSES = new Set(
    INVENTORY_STATUS_VALUES.filter(status => status !== 'Repairs' && status !== 'Cash'),
);

const buildWeeklySummaries = (
    payments: DailyCollectionSummary[],
    delinquency: NormalizedDelinquencyEntry[],
): WeeklySummary[] => {
    const paymentsByWeek = new Map<string, number>();
    payments.forEach(entry => {
        const parsedDate = parseDateStringToUtc(entry.date);
        if (!parsedDate) return;
        const weekStart = formatDateKey(getWeekStartUtc(toUtcMidnight(parsedDate)));
        paymentsByWeek.set(weekStart, (paymentsByWeek.get(weekStart) || 0) + safeParseFloat(entry.total));
    });

    const openAccountsByWeek = new Map<string, { sum: number; count: number }>();
    delinquency.forEach(entry => {
        if (Number.isNaN(entry.date.getTime())) return;
        const weekStart = formatDateKey(getWeekStartUtc(entry.date));
        const bucket = openAccountsByWeek.get(weekStart) || { sum: 0, count: 0 };
        bucket.sum += entry.openAccounts;
        bucket.count += 1;
        openAccountsByWeek.set(weekStart, bucket);
    });

    const keys = new Set<string>([...paymentsByWeek.keys(), ...openAccountsByWeek.keys()]);

    return Array.from(keys)
        .map(key => {
            const startDate = parseDateStringToUtc(key) ?? new Date();
            const bucket = openAccountsByWeek.get(key);
            return {
                weekStart: toUtcMidnight(startDate),
                totalPayments: paymentsByWeek.get(key) || 0,
                avgOpenAccounts: bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0,
            };
        })
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
};

const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const DashboardStatCard: React.FC<{
    title: string;
    value: string;
    icon?: React.ElementType;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, icon: Icon, subtitle, trend }) => (
    <div className="glass-card-outline p-4 flex flex-col gap-2 h-full">
        <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-muted-contrast">{title}</p>
            {Icon ? <Icon className="h-5 w-5 icon-neon" /> : null}
        </div>
        <p className="text-3xl font-bold text-primary-contrast tracking-tight">{value}</p>
        {subtitle ? <p className="text-xs text-secondary-contrast">{subtitle}</p> : null}
    </div>
);

const InventorySummaryCard: React.FC<{ total: number; bhph: number; cash: number }> = ({ total, bhph, cash }) => (
    <div className="glass-card-outline p-4 flex flex-col gap-4 h-full">
        <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-contrast">Inventory Count</p>
            <p className="text-3xl font-bold mt-1 text-primary-contrast text-glow">
                {total.toLocaleString()}
            </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <div
                className="glass-card-outline-colored flex-1 p-2 flex flex-col justify-center"
                style={{ '--outline-color': '#06b6d4' } as React.CSSProperties}
            >
                <p className="text-[11px] uppercase tracking-wide text-muted-contrast">BHPH</p>
                <p className="text-base font-semibold text-primary-contrast mt-1">{bhph.toLocaleString()}</p>
            </div>
            <div
                className="glass-card-outline-colored flex-1 p-2 flex flex-col justify-center"
                style={{ '--outline-color': '#10b981' } as React.CSSProperties}
            >
                <p className="text-[11px] uppercase tracking-wide text-muted-contrast">Cash</p>
                <p className="text-base font-semibold text-primary-contrast mt-1">{cash.toLocaleString()}</p>
            </div>
        </div>
    </div>
);

const CollectionsPlaceholder: React.FC<{ message: string }> = ({ message }) => (
    <div className="glass-card-outline p-6 h-full flex items-center justify-center text-secondary-contrast text-sm">
        {message}
    </div>
);

const Dashboard: React.FC = () => {
    const dataContext = useContext(DataContext);
    const [paymentsData, setPaymentsData] = useState<DailyCollectionSummary[]>([]);
    const [delinquencyData, setDelinquencyData] = useState<NormalizedDelinquencyEntry[]>([]);
    const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
    const [collectionsLoading, setCollectionsLoading] = useState(false);
    const [collectionsError, setCollectionsError] = useState<string | null>(null);

    if (!dataContext) return null;

    const { sales, inventory } = dataContext;

    const loadCollectionsData = useCallback(async () => {
        setCollectionsLoading(true);
        setCollectionsError(null);
        try {
            const [paymentsResponse, delinquencyResponse] = await Promise.all([
                supabase.from('Payments').select('*').order('"Date"', { ascending: false }).limit(365),
                supabase.from('Delinquency').select('*').order('"Date"', { ascending: false }).limit(365),
            ]);

            if (paymentsResponse.error) throw paymentsResponse.error;
            if (delinquencyResponse.error) throw delinquencyResponse.error;

            const normalizedPayments: DailyCollectionSummary[] = (paymentsResponse.data ?? []).map(record => {
                const payments = safeParseFloat(record.Payments ?? record.payments);
                const lateFees = safeParseFloat(record['Late Fees'] ?? record.lateFees);
                const boa = safeParseFloat(record.BOA ?? record.boa ?? record.boaZelle);
                return {
                    date: record.Date ?? record.date ?? '',
                    day: record.Day ?? record.day ?? '',
                    payments,
                    lateFees,
                    total: payments + lateFees,
                    boaZelle: boa,
                };
            });

            const normalizedDelinquency: NormalizedDelinquencyEntry[] = (delinquencyResponse.data ?? [])
                .map(record => {
                    const parsedDate = parseDateStringToUtc(record.Date ?? record.date ?? record['Date']);
                    if (!parsedDate) return null;
                    return {
                        date: toUtcMidnight(parsedDate),
                        openAccounts: safeParseFloat(record['Open Accounts'] ?? record.openAccounts ?? record.open_accounts),
                        overdueAccounts: safeParseFloat(record['Overdue Accounts'] ?? record.overdueAccounts ?? record.overdue_accounts),
                    };
                })
                .filter((entry): entry is NormalizedDelinquencyEntry => entry !== null);

            setPaymentsData(normalizedPayments);
            setDelinquencyData(normalizedDelinquency);
            setWeeklySummaries(buildWeeklySummaries(normalizedPayments, normalizedDelinquency));
        } catch (error) {
            console.error('Failed to load collections metrics for dashboard:', error);
            setCollectionsError('Unable to load collections metrics right now.');
        } finally {
            setCollectionsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCollectionsData();
    }, [loadCollectionsData]);

    const today = toUtcMidnight(new Date());
    const weekStart = getWeekStartUtc(today);
    const weekEnd = addUtcDays(weekStart, 6);

    const salesStats = useMemo(() => {
        let todayCount = 0;
        let weekCount = 0;
        sales.forEach(sale => {
            const parsed = parseDateStringToUtc(sale.saleDate);
            if (!parsed) return;
            const normalized = toUtcMidnight(parsed);
            if (normalized.getTime() === today.getTime()) todayCount += 1;
            if (normalized.getTime() >= weekStart.getTime() && normalized.getTime() <= weekEnd.getTime()) {
                weekCount += 1;
            }
        });
        return { today: todayCount, week: weekCount };
    }, [sales, today, weekStart, weekEnd]);

    const inventoryCounts = useMemo(() => {
        let total = 0;
        let bhph = 0;
        let cash = 0;
        inventory.forEach(vehicle => {
            if (vehicle.status === 'Sold') return;
            if (ACTIVE_RETAIL_STATUSES.has(vehicle.status)) {
                total += 1;
                if (BHPH_STATUSES.has(vehicle.status)) bhph += 1;
                if (vehicle.status === 'Cash') cash += 1;
            }
        });
        return { total, bhph, cash };
    }, [inventory]);

    const nextAccountNumber = useMemo(() => computeNextAccountNumber(sales), [sales]);
    const nextStockInfo = useMemo(() => computeNextStockNumbers(sales), [sales]);

    const collectionsSnapshot = useMemo(() => {
        let weekToDate = 0;
        paymentsData.forEach(entry => {
            const parsed = parseDateStringToUtc(entry.date);
            if (!parsed) return;
            const normalized = toUtcMidnight(parsed);
            if (normalized.getTime() >= weekStart.getTime() && normalized.getTime() <= today.getTime()) {
                weekToDate += safeParseFloat(entry.payments) + safeParseFloat(entry.lateFees);
            }
        });

        const sortedDelinquency = [...delinquencyData].sort(
            (a, b) => b.date.getTime() - a.date.getTime(),
        );
        const latestEntry =
            sortedDelinquency.find(entry => entry.date.getTime() <= today.getTime()) ||
            sortedDelinquency[0] ||
            null;

        return {
            weekToDatePayments: weekToDate,
            openAccounts: latestEntry?.openAccounts ?? null,
            openAccountsDate: latestEntry?.date ?? null,
        };
    }, [paymentsData, delinquencyData, today, weekStart]);

    const salesAggregates = useMemo(() => buildSalesAggregates(sales), [sales]);
    const { parsedSales, years } = salesAggregates;
    const latestYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyChartData = useMemo(() => {
        const dataByMonth: Record<string, Record<string, string | number>> = {};
        monthNames.forEach(name => {
            dataByMonth[name] = { month: name };
        });
        parsedSales.forEach(({ date }) => {
            const year = date.getFullYear();
            const monthIndex = date.getMonth();
            const monthName = monthNames[monthIndex];
            dataByMonth[monthName][String(year)] = ((Number(dataByMonth[monthName][String(year)]) || 0) as number) + 1;
        });
        if (latestYear >= new Date().getFullYear()) {
            const currentMonthIndex = today.getMonth();
            monthNames.forEach((name, index) => {
                if (index <= currentMonthIndex && dataByMonth[name][String(latestYear)] === undefined) {
                    dataByMonth[name][String(latestYear)] = 0;
                }
            });
        }
        return monthNames.map(name => dataByMonth[name]);
    }, [parsedSales, latestYear, today]);

    const plannerEvents: CalendarEvent[] = useMemo(() => CALENDAR_EVENTS, []);

    const openAccountsSubtitle = collectionsSnapshot.openAccountsDate
        ? `Last updated ${collectionsSnapshot.openAccountsDate.toLocaleDateString()}`
        : 'Awaiting logged data';

    const wtdLabel = `Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

    const collectionsReady = paymentsData.length > 0 && delinquencyData.length > 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,280px)_1fr] gap-4">
                <DashboardStatCard
                    title="Next Account Number"
                    value={nextAccountNumber !== null ? nextAccountNumber.toLocaleString() : '—'}
                    icon={HashtagIcon}
                />
                <NextStockCard stockNumbers={nextStockInfo.nextByPrefix} year={nextStockInfo.latestYear ?? new Date().getFullYear()} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <DashboardStatCard title="Sales Today" value={salesStats.today.toLocaleString()} icon={ChartBarIcon} />
                <DashboardStatCard title="Sales This Week" value={salesStats.week.toLocaleString()} icon={ArrowTrendingUpIcon} />
                <InventorySummaryCard total={inventoryCounts.total} bhph={inventoryCounts.bhph} cash={inventoryCounts.cash} />
                <DashboardStatCard
                    title="Open Accounts"
                    value={
                        collectionsLoading
                            ? 'Loading…'
                            : collectionsSnapshot.openAccounts !== null
                                ? collectionsSnapshot.openAccounts.toLocaleString()
                                : '—'
                    }
                    icon={ChartBarIcon}
                    subtitle={collectionsLoading ? undefined : openAccountsSubtitle}
                />
                <DashboardStatCard
                    title="Week-to-Date Payments"
                    value={
                        collectionsLoading
                            ? 'Loading…'
                            : formatCurrency(collectionsSnapshot.weekToDatePayments)
                    }
                    icon={BanknotesIcon}
                    subtitle={wtdLabel}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <div className="order-2 xl:order-1">
                    <YtdSalesComparison salesData={sales} compact />
                </div>
                <div className="order-1 xl:order-2">
                    <DashboardPlannerCard events={plannerEvents} />
                </div>
                <div className="order-3 xl:order-3 xl:col-span-1">
                    <YtdCumulativeSalesChart salesData={sales} compactHeight />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <div className="col-span-1 h-full">
                    <YearOverYearComparison salesData={sales} compact />
                </div>
                <div className="col-span-1 xl:col-span-2 h-full">
                    <MonthlySalesComparisonChart
                        data={monthlyChartData}
                        years={years}
                        currentYear={latestYear}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <div className="xl:col-span-2 h-full">
                    {collectionsReady ? (
                        <CollectionsWeeklyForecast
                            weeklyData={weeklySummaries}
                            paymentsData={paymentsData}
                            compact
                        />
                    ) : (
                        <CollectionsPlaceholder
                            message={collectionsError ?? 'Collections forecast will appear once data is logged.'}
                        />
                    )}
                </div>
                <div className="xl:col-span-1 h-full">
                    {collectionsReady ? (
                        <CollectionsWeeklyDelinquencyChart delinquency={delinquencyData} />
                    ) : (
                        <CollectionsPlaceholder
                            message={collectionsError ?? 'Delinquency chart will appear once data is logged.'}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
