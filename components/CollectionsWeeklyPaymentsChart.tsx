import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { usePrintView } from '../hooks/usePrintView';
import type { DailyCollectionSummary } from '../types';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    DotProps,
} from 'recharts';
import {
    parseDateStringToUtc,
    toUtcMidnight,
    getWeekStartUtc,
    addUtcDays,
    formatDateKey,
} from '../utils/date';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidContainer } from '@/components/ui/liquid-container';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

// Neon cyan blue gradient palette - darker to lighter (left to right)
const cyanGradients = [
    { from: '#0891b2', to: '#06b6d4', base: '#06b6d4' }, // Darker cyan to cyan
    { from: '#06b6d4', to: '#22d3ee', base: '#22d3ee' }, // Cyan to light cyan
    { from: '#22d3ee', to: '#67e8f9', base: '#67e8f9' }, // Light cyan to lighter cyan
    { from: '#67e8f9', to: '#a5f3fc', base: '#a5f3fc' }, // Lighter cyan to very light cyan
    { from: '#06b6d4', to: '#00d4ff', base: '#00d4ff' }, // Cyan to bright cyan
    { from: '#00d4ff', to: '#00ffff', base: '#00ffff' }, // Bright cyan to brightest cyan
];

const parseNumeric = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value).trim().replace(/[^0-9.+-]/g, '');
    const parsed = cleaned === '' ? NaN : Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getYearFirstWeekStart = (year: number) => getWeekStartUtc(new Date(year, 0, 1));

const formatCurrency = (value?: number | null) =>
    value === undefined || value === null
        ? ''
        : `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface CollectionsWeeklyPaymentsChartProps {
    payments: DailyCollectionSummary[];
}

const CollectionsWeeklyPaymentsChart: React.FC<CollectionsWeeklyPaymentsChartProps> = ({ payments }) => {
    const { isPrintView } = usePrintView();
    
    // Detect export mode from URL parameter (memoized to prevent re-computation)
    const isExporting = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return new URLSearchParams(window.location.search).get('export') === 'true';
    }, []);
    
    // In export mode, set animationComplete flag immediately since animation is disabled
    useEffect(() => {
        if (isExporting && typeof window !== 'undefined') {
            (window as any).animationComplete = true;
        }
    }, [isExporting]);
    
    // Handle animation end callback - set flag for Puppeteer in export mode (if animation runs)
    const handleAnimationEnd = useCallback(() => {
        // In export mode, set window flag for Puppeteer
        if (isExporting && typeof window !== 'undefined') {
            (window as any).animationComplete = true;
        }
    }, [isExporting]);
    
    const { chartData, years, lineKeys, defaultVisibleYears, xTicks } = useMemo(() => {
        if (!payments || payments.length === 0) {
            return {
                chartData: [],
                years: [] as number[],
                lineKeys: [] as string[],
                defaultVisibleYears: {} as Record<string, boolean>,
                xTicks: [] as string[],
            };
        }

        const normalized = payments
            .map(record => {
                const parsedDate = parseDateStringToUtc(record.date);
                if (!parsedDate) return null;
                const paymentsValue = parseNumeric(record.payments);
                const lateFeesValue = parseNumeric(record.lateFees);
                return {
                    date: toUtcMidnight(parsedDate),
                    payments: paymentsValue,
                    lateFees: lateFeesValue,
                    total: paymentsValue + lateFeesValue,
                };
            })
            .filter((item): item is { date: Date; payments: number; lateFees: number; total: number } => !!item);

        if (normalized.length === 0) {
            return {
                chartData: [],
                years: [] as number[],
                lineKeys: [] as string[],
                defaultVisibleYears: {} as Record<string, boolean>,
                xTicks: [] as string[],
            };
        }

        const sortedRecords = normalized.sort((a, b) => a.date.getTime() - b.date.getTime());
        const minYear = sortedRecords.reduce((acc, item) => Math.min(acc, item.date.getFullYear()), sortedRecords[0].date.getFullYear()) - 1;
        const maxYear = sortedRecords.reduce((acc, item) => Math.max(acc, item.date.getFullYear()), sortedRecords[0].date.getFullYear()) + 1;

        const yearStarts: { year: number; start: Date }[] = [];
        for (let year = minYear; year <= maxYear + 1; year += 1) {
            yearStarts.push({ year, start: getYearFirstWeekStart(year) });
        }
        yearStarts.sort((a, b) => a.start.getTime() - b.start.getTime());

        const assignYear = (date: Date) => {
            let assigned = yearStarts[0].year;
            for (const entry of yearStarts) {
                if (date >= entry.start) {
                    assigned = entry.year;
                } else {
                    break;
                }
            }
            return assigned;
        };

        const weekTotals: Record<number, Record<number, number>> = {};
        const debugRecords: Record<string, Array<{ date: string; payments: number; lateFees: number; total: number; week: number }>> = {};

        sortedRecords.forEach(({ date, payments, lateFees, total }) => {
            const assignedYear = assignYear(date);
            if (!weekTotals[assignedYear]) {
                weekTotals[assignedYear] = {};
            }
            const yearStart = getYearFirstWeekStart(assignedYear);
            const weekStart = getWeekStartUtc(date);
            const diffDays = Math.round((weekStart.getTime() - yearStart.getTime()) / MS_IN_DAY);
            const weekNumber = Math.floor(diffDays / 7) + 1;
            weekTotals[assignedYear][weekNumber] = (weekTotals[assignedYear][weekNumber] || 0) + total;

            const debugKey = `${assignedYear}-${weekNumber}`;
            if (!debugRecords[debugKey]) debugRecords[debugKey] = [];
            debugRecords[debugKey].push({
                date: formatDateKey(date),
                payments,
                lateFees,
                total,
                week: weekNumber,
            });
        });

        const years = Object.keys(weekTotals)
            .map(Number)
            .sort((a, b) => a - b);

        const latestYear = years.length ? Math.max(...years) : null;
        const maxWeeksAvailable = years.reduce((max, year) => {
            const weeks = Object.keys(weekTotals[year] || {}).map(Number);
            return Math.max(max, weeks.length ? Math.max(...weeks) : 0);
        }, 0);

        let maxDisplayWeeks = 0;
        if (latestYear !== null) {
            const latestYearStart = getYearFirstWeekStart(latestYear);
            const todayUtc = toUtcMidnight(new Date());
            const currentWeekStart = getWeekStartUtc(todayUtc);
            Object.keys(weekTotals[latestYear] || {}).forEach(weekKey => {
                const weekNumber = Number(weekKey);
                if (!Number.isFinite(weekNumber)) return;
                const weekStart = addUtcDays(latestYearStart, (weekNumber - 1) * 7);
                if (weekStart.getTime() < currentWeekStart.getTime()) {
                    maxDisplayWeeks = Math.max(maxDisplayWeeks, weekNumber);
                }
            });
        }

        if (maxDisplayWeeks === 0) {
            maxDisplayWeeks = maxWeeksAvailable;
        }

        const chartLength = Math.max(0, Math.min(maxWeeksAvailable, maxDisplayWeeks));

        const chartData = Array.from({ length: chartLength }, (_, idx) => {
            const weekNumber = idx + 1;
            const entry: Record<string, number | null | string> = { week: `W${weekNumber}`, weekNumber };
            years.forEach(year => {
                const value = weekTotals[year]?.[weekNumber];
                entry[String(year)] = value ?? null;
            });
            return entry;
        });

        const lineKeys = years.map(year => String(year));
        const defaultVisibleYears = lineKeys.reduce((acc, yearKey) => {
            acc[yearKey] = latestYear !== null ? Number(yearKey) === latestYear : true;
            return acc;
        }, {} as Record<string, boolean>);

        const xTicks = Array.from({ length: chartLength }, (_, idx) => idx + 1)
            .filter(weekNumber => weekNumber % 2 === 1)
            .map(weekNumber => `W${weekNumber}`);

        if (process.env.NODE_ENV !== 'production') {
            const debugWeekRanges: Record<string, { range: string; records: Array<{ date: string; payments: number; lateFees: number; total: number }> }> = {};

            const weekRangeCache: Record<string, { start: Date; end: Date }> = {};
            years.forEach(year => {
                const yearStart = getYearFirstWeekStart(year);
                Object.keys(weekTotals[year] || {}).forEach(weekKey => {
                    const weekNumber = Number(weekKey);
                    const start = addUtcDays(yearStart, (weekNumber - 1) * 7);
                    const end = addUtcDays(start, 6);
                    weekRangeCache[`${year}-${weekNumber}`] = { start, end };
                });
            });

            const focusYear = Math.max(...years);
            const focusWeeks = [1, 10];

            focusWeeks.forEach(week => {
                const focusKey = `${focusYear}-${week}`;
                const records = debugRecords[focusKey] || [];
                const range = weekRangeCache[focusKey];
                debugWeekRanges[`${focusYear}-W${week}`] = {
                    range: range ? `${formatDateKey(range.start)} → ${formatDateKey(range.end)}` : 'n/a',
                    records: records.map(item => ({
                        date: item.date,
                        payments: item.payments,
                        lateFees: item.lateFees,
                        total: item.total,
                        assignedWeek: `W${item.week}`,
                    })),
                };
            });

            console.debug('[CollectionsWeeklyPaymentsChart] Week breakdown (focus on weeks 1 and 10 of current latest year)', debugWeekRanges);
        }

        return { chartData, years, lineKeys, defaultVisibleYears, xTicks };
    }, [payments]);

    const [visibleYears, setVisibleYears] = useState<Record<string, boolean>>(defaultVisibleYears);
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        setVisibleYears(defaultVisibleYears);
    }, [defaultVisibleYears]);

    const activeLineKeys = useMemo(() => {
        const enabled = lineKeys.filter(key => visibleYears[key]);
        return enabled.length ? enabled : lineKeys;
    }, [lineKeys, visibleYears]);

    const { yDomainMin, yDomainMax, yTicks } = useMemo(() => {
        const values: number[] = [];
        chartData.forEach(row => {
            activeLineKeys.forEach(key => {
                const value = row[key];
                if (typeof value === 'number' && Number.isFinite(value)) {
                    values.push(value);
                }
            });
        });

        if (!values.length) {
            return {
                yDomainMin: 0,
                yDomainMax: 100000,
                yTicks: [0, 25000, 50000, 75000],
            };
        }

        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const range = Math.max(rawMax - rawMin, Math.max(rawMax, 1) * 0.05);

        const desiredIntervals = 3; // produces 4 ticks
        const roughStep = range / desiredIntervals;
        const stepCandidates = [1000, 2000, 2500, 5000, 7500, 10000, 20000, 50000, 100000];
        const step = stepCandidates.find(candidate => roughStep <= candidate) ?? stepCandidates[stepCandidates.length - 1];

        let domainMin = Math.max(0, Math.floor(rawMin / step) * step);
        let domainMax = Math.ceil(rawMax / step) * step;

        if (domainMax - domainMin < step * desiredIntervals) {
            domainMax = domainMin + step * desiredIntervals;
        }

        const interval = Math.max(step, Math.round((domainMax - domainMin) / desiredIntervals / step) * step);
        const ticks = Array.from({ length: desiredIntervals + 1 }, (_, idx) => domainMin + idx * interval);

        return {
            yDomainMin: ticks[0],
            yDomainMax: ticks[ticks.length - 1],
            yTicks: ticks,
        };
    }, [chartData, activeLineKeys]);

    // Generate gradient definitions for each year (using sorted years to maintain color consistency)
    const gradientDefs = useMemo(() => {
        const sortedYears = [...years].sort((a, b) => a - b);
        return sortedYears.map((year, index) => {
            const gradient = cyanGradients[index % cyanGradients.length];
            return {
                year,
                id: `lineGradient-${year}`,
                ...gradient,
            };
        });
    }, [years]);

    const lineColors = useMemo(() => {
        const map: Record<string, string> = {};
        lineKeys.forEach((year, idx) => {
            const gradient = gradientDefs.find(g => g.year === Number(year));
            map[year] = gradient?.base || '#06b6d4';
        });
        return map;
    }, [lineKeys, gradientDefs]);

    if (!chartData.length) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-primary mb-2 tracking-tight-md">Weekly Total Payments</h3>
                <p className="text-muted text-sm">No payment data available yet.</p>
            </div>
        );
    }

    const toggleYear = (year: string) => {
        setVisibleYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const currentYear = activeLineKeys.length ? Math.max(...activeLineKeys.map(Number)) : Math.max(...lineKeys.map(Number));

    return (
        <LiquidContainer variant="cyan-blue" className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-primary tracking-tight-md">Weekly Total Payments</h3>
                    <p className="text-sm text-muted">Sum of payments and late fees per week (Monday – Sunday).</p>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setFilterOpen(prev => !prev)}
                        className="glass-select text-xs cursor-pointer pr-8"
                    >
                        Filter Years
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon className={`h-4 w-4 text-muted transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {filterOpen && (
                        <div className="absolute right-0 mt-2 w-44 bg-glass-panel border border-border-high rounded-lg shadow-xl z-20 p-2 backdrop-blur-glass">
                            {lineKeys.map(year => (
                                <label
                                    key={year}
                                    className="flex items-center gap-3 px-2 py-1.5 text-sm text-secondary rounded hover:bg-glass-panel cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleYears[year]}
                                        onChange={() => toggleYear(year)}
                                        className="form-checkbox h-4 w-4 text-lava-warm"
                                    />
                                    <span>{year}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
                <LineChart 
                    data={chartData} 
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    // Animation should play on initial load, but NOT in export mode
                    // React.memo prevents re-renders, so animation only plays once on mount
                    isAnimationActive={!isExporting}
                    // Animation duration: 1.2 seconds
                    animationDuration={isExporting ? 0 : 1200}
                    // Callback when animation completes (for export mode detection)
                    onAnimationEnd={handleAnimationEnd}
                >
                    <defs>
                        {gradientDefs.map(gradient => (
                            <linearGradient
                                key={gradient.id}
                                id={gradient.id}
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                            >
                                <stop offset="0%" stopColor={gradient.from} />
                                <stop offset="100%" stopColor={gradient.to} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                        dataKey="week"
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        angle={-20}
                        height={50}
                        textAnchor="end"
                        ticks={xTicks}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        tickFormatter={value => `$${Number(value).toLocaleString()}`}
                        domain={[yDomainMin, yDomainMax]}
                        ticks={yTicks}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)',
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        formatter={(value, name) => [formatCurrency(Number(value)), name]}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ color: '#d1d5db' }}
                    />
                    {lineKeys.map(year => {
                        if (!visibleYears[year]) return null;
                        const gradient = gradientDefs.find(g => g.year === Number(year));
                        const isCurrentYear = year === String(currentYear);
                        const strokeColor = gradient ? `url(#${gradient.id})` : lineColors[year];
                        
                        return (
                            <Line
                                key={year}
                                type="monotone"
                                dataKey={year}
                                name={year === String(currentYear) ? `${year} (Current)` : year}
                                stroke={strokeColor}
                                strokeWidth={isCurrentYear ? 3 : 2}
                                dot={{ r: isCurrentYear ? 4 : 2 } as DotProps}
                                activeDot={{ 
                                    r: 6,
                                    fill: gradient?.base || lineColors[year],
                                    stroke: '#fff',
                                    strokeWidth: 2,
                                }}
                                connectNulls
                                // Animation controlled by parent LineChart component
                                // No need to set here as it inherits from LineChart
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </LiquidContainer>
    );
};

// Wrap component in React.memo to prevent unnecessary re-renders
// This prevents the chart from re-rendering on mouse movement
export default React.memo(CollectionsWeeklyPaymentsChart, (prevProps, nextProps) => {
    // Only re-render if payments data actually changes
    // This prevents re-renders from parent component state changes
    if (prevProps.payments.length !== nextProps.payments.length) {
        return false; // Re-render if length changes
    }
    
    // Deep comparison of payments data
    const paymentsChanged = prevProps.payments.some((prev, index) => {
        const next = nextProps.payments[index];
        return !next || 
               prev.date !== next.date || 
               prev.payments !== next.payments || 
               prev.lateFees !== next.lateFees;
    });
    
    // Only re-render if payments data actually changed
    return !paymentsChanged;
});
