import React, { useMemo } from 'react';
import { CalendarDaysIcon, FireIcon, ChartBarIcon, TrophyIcon, HashtagIcon } from '@heroicons/react/24/solid';
import YtdSalesComparison from '../components/YtdSalesComparison';
import YtdCumulativeSalesChart from '../components/YtdCumulativeSalesChart';
import YearOverYearComparison from '../components/YearOverYearComparison';
import NextStockCard from '../components/NextStockCard';
import MonthlySalesComparisonChart from '../components/MonthlySalesComparisonChart';
import { useSupabaseSales } from '../hooks/useSupabaseSales';
import { buildSalesAggregates, formatDateKey, getYtdCountForYear } from '../utils/salesAnalytics';
import { computeNextAccountNumber, computeNextStockNumbers } from '../utils/stockNumbers';
import { GlassButton } from '@/components/ui/glass-button';

const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ElementType;
    variant?: 'default' | 'accent';
    compact?: boolean;
    className?: string;
    titleClassName?: string;
    valueClassName?: string;
}> = ({ title, value, icon: Icon, variant = 'default', compact = false, className, titleClassName, valueClassName }) => {
    const isAccent = variant === 'accent';
    const containerClasses = isAccent
        ? 'bg-gradient-to-r from-lava-warm via-lava-core to-lava-cool text-white border border-border-high'
        : 'glass-card text-primary';
    const iconWrapperClasses = isAccent ? 'bg-white/15' : 'bg-glass-panel';
    const baseTitleClasses = isAccent
        ? compact
            ? 'text-xs text-white/80 uppercase tracking-wide'
            : 'text-xs text-white/80 uppercase tracking-wide'
        : compact
        ? 'text-xs text-muted uppercase tracking-wide'
        : 'text-sm text-muted';
    const baseValueClasses = isAccent
        ? compact
            ? 'text-2xl font-bold text-white font-orbitron tracking-tight-lg'
            : 'text-2xl font-bold text-white font-orbitron tracking-tight-lg'
        : compact
        ? 'text-3xl font-bold text-primary font-orbitron tracking-tight-lg'
        : 'text-2xl font-bold text-primary font-orbitron tracking-tight-lg';
    const titleClasses = `${baseTitleClasses} ${titleClassName ?? ''}`.trim();
    const valueClasses = `${baseValueClasses} ${valueClassName ?? ''}`.trim();

    return (
        <div className={`${containerClasses} p-3.5 rounded-lg shadow ${className ?? ''}`}>
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

const SalesAnalytics: React.FC<{ layoutVariant?: 'classic' | 'compact' }> = ({ layoutVariant = 'compact' }) => {
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
                <GlassButton
                    onClick={refresh}
                >
                    Retry
                </GlassButton>
            </div>
        );
    }

    const nextAccountNumberDisplay = nextAccountNumber !== null ? String(nextAccountNumber) : '—';
    const monthlyChartHeight = layoutVariant === 'compact' ? 360 : 420;
    const useCompactStatCards = layoutVariant === 'compact';

    const renderStatCards = () => (
        <div className="border-t border-border-low pt-6">
            <div
                className={
                    useCompactStatCards
                        ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4'
                        : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                }
            >
                <StatCard compact={useCompactStatCards} title="Current Year's Total Sales" value={kpis.ytdSales} icon={ChartBarIcon} />
                <StatCard compact={useCompactStatCards} title="Today's Sales" value={kpis.todaysSales} icon={CalendarDaysIcon} />
                <StatCard compact={useCompactStatCards} title="This Week's Sales" value={kpis.thisWeeksSales} icon={CalendarDaysIcon} />
                <StatCard compact={useCompactStatCards} title="Days Into Current Year" value={kpis.dayOfYear} icon={FireIcon} />
                <StatCard compact={useCompactStatCards} title="Record Sales on One Day" value={kpis.recordDaySales} icon={TrophyIcon} />
                <StatCard compact={useCompactStatCards} title="Most Sales in One Month" value={kpis.recordMonthSales} icon={TrophyIcon} />
            </div>
        </div>
    );

    const classicLayout = (
        <>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">
                <div className="xl:col-span-2 h-full">
                    <YtdSalesComparison salesData={salesData} />
                </div>
                <div className="xl:col-span-3 h-full">
                    <YtdCumulativeSalesChart salesData={salesData} />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <YearOverYearComparison salesData={salesData} />
                <MonthlySalesComparisonChart
                    data={monthlyChartData}
                    years={years}
                    currentYear={currentYear}
                    height={monthlyChartHeight}
                />
            </div>
        </>
    );

    const compactLayout = (
        <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <div className="col-span-1 h-full">
                    <YtdSalesComparison salesData={salesData} compact />
                </div>
                <div className="col-span-1 xl:col-span-2 h-full">
                    <YtdCumulativeSalesChart salesData={salesData} compactHeight />
                </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <div className="col-span-1 h-full">
                    <YearOverYearComparison salesData={salesData} compact />
                </div>
                <div className="col-span-1 xl:col-span-2 h-full">
                    <MonthlySalesComparisonChart
                        data={monthlyChartData}
                        years={years}
                        currentYear={currentYear}
                        height={monthlyChartHeight}
                    />
                </div>
            </div>
        </>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,200px)_1fr] gap-6 items-stretch">
                <div className="h-full">
                    <StatCard
                        title="Next Account Number"
                        value={nextAccountNumberDisplay}
                        icon={HashtagIcon}
                        variant="accent"
                        className="h-full flex flex-col justify-center"
                        titleClassName={layoutVariant === 'compact' ? 'text-sm tracking-tight uppercase' : undefined}
                        valueClassName={layoutVariant === 'compact' ? 'text-4xl sm:text-5xl' : undefined}
                    />
                </div>
                <NextStockCard stockNumbers={nextStockNumbers} year={activeSaleYear} />
            </div>

            {renderStatCards()}
            {layoutVariant === 'compact' ? compactLayout : classicLayout}
        </div>
    );
};

const Sales: React.FC = () => {
    const layoutVariant: 'classic' | 'compact' = 'compact';

    return (
        <div>
            <SalesAnalytics layoutVariant={layoutVariant} />
        </div>
    );
};

export default Sales;
