import React, { useMemo, useState, useEffect } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
} from 'recharts';
import { getWeekStartUtc, addUtcDays, formatDateKey } from '../utils/date';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidContainer } from '@/components/ui/liquid-container';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

// Red gradient palette - different shades of red for each year, all maintaining red theme
const redGradients = [
    { from: '#ff6b6b', to: '#ff5252', base: '#ff5252' }, // Bright Red
    { from: '#ff5252', to: '#f44336', base: '#f44336' }, // Red
    { from: '#f44336', to: '#e53935', base: '#e53935' }, // Darker Red
    { from: '#e53935', to: '#d32f2f', base: '#d32f2f' }, // Deep Red
    { from: '#d32f2f', to: '#c62828', base: '#c62828' }, // Dark Red
    { from: '#c62828', to: '#b71c1c', base: '#b71c1c' }, // Very Dark Red
    { from: '#ff8a80', to: '#ff5252', base: '#ff5252' }, // Light Red
    { from: '#ff5252', to: '#d32f2f', base: '#d32f2f' }, // Medium Red
];

const getYearFirstWeekStart = (year: number) => getWeekStartUtc(new Date(year, 0, 1));

type DelinquencyEntry = {
    date: Date;
    openAccounts: number;
    overdueAccounts: number;
};

interface CollectionsWeeklyDelinquencyChartProps {
    delinquency: DelinquencyEntry[];
}

const formatPercent = (value: number) =>
    `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const CollectionsWeeklyDelinquencyChart: React.FC<CollectionsWeeklyDelinquencyChartProps> = ({ delinquency }) => {
    const { chartData, years, barKeys, defaultVisibleYears, xTicks, yDomainMax, yTicks } = useMemo(() => {
        if (!delinquency || delinquency.length === 0) {
            return {
                chartData: [] as Array<Record<string, number | string | null>>,
                years: [] as number[],
                barKeys: [] as string[],
                defaultVisibleYears: {} as Record<string, boolean>,
                xTicks: [] as string[],
                yDomainMax: 30,
                yTicks: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
            };
        }

        const normalized = delinquency
            .map(entry => ({
                date: entry.date,
                openAccounts: Number.isFinite(entry.openAccounts) ? entry.openAccounts : 0,
                overdueAccounts: Number.isFinite(entry.overdueAccounts) ? entry.overdueAccounts : 0,
            }))
            .filter(entry => !Number.isNaN(entry.date.getTime()))
            .map(entry => ({
                date: new Date(entry.date.getTime()),
                openAccounts: entry.openAccounts,
                overdueAccounts: entry.overdueAccounts,
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (!normalized.length) {
            return {
                chartData: [],
                years: [],
                barKeys: [],
                defaultVisibleYears: {},
                xTicks: [],
                yDomain: [0, 100] as [number, number],
            };
        }

        normalized.forEach(item => item.date.setHours(0, 0, 0, 0));

        const minYear = normalized.reduce((acc, item) => Math.min(acc, item.date.getFullYear()), normalized[0].date.getFullYear()) - 1;
        const maxYear = normalized.reduce((acc, item) => Math.max(acc, item.date.getFullYear()), normalized[0].date.getFullYear()) + 1;

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

        const weeklyTotals: Record<number, Record<number, { overdueSum: number; openSum: number; count: number }>> = {};

        normalized.forEach(({ date, overdueAccounts, openAccounts }) => {
            const assignedYear = assignYear(date);
            if (!weeklyTotals[assignedYear]) {
                weeklyTotals[assignedYear] = {};
            }
            const yearStart = getYearFirstWeekStart(assignedYear);
            const weekStart = getWeekStartUtc(date);
            const diffDays = Math.round((weekStart.getTime() - yearStart.getTime()) / MS_IN_DAY);
            const weekNumber = Math.floor(diffDays / 7) + 1;
            const bucket = weeklyTotals[assignedYear][weekNumber] || { overdueSum: 0, openSum: 0, count: 0 };
            bucket.overdueSum += overdueAccounts;
            bucket.openSum += openAccounts;
            bucket.count += 1;
            weeklyTotals[assignedYear][weekNumber] = bucket;
        });

        const years = Object.keys(weeklyTotals)
            .map(Number)
            .sort((a, b) => a - b);

        const maxWeeksAvailable = years.reduce((max, year) => {
            const weeks = Object.keys(weeklyTotals[year] || {}).map(Number);
            return Math.max(max, weeks.length ? Math.max(...weeks) : 0);
        }, 0);

        const latestYear = years.length ? Math.max(...years) : null;
        let maxDisplayWeeks = maxWeeksAvailable;

        if (latestYear !== null) {
            const latestYearStart = getYearFirstWeekStart(latestYear);
            const todayUtc = new Date();
            todayUtc.setHours(0, 0, 0, 0);
            const currentWeekStart = getWeekStartUtc(todayUtc);
            let completedWeeks = 0;

            Object.keys(weeklyTotals[latestYear] || {}).forEach(weekKey => {
                const weekNumber = Number(weekKey);
                if (!Number.isFinite(weekNumber)) return;
                const weekStart = addUtcDays(latestYearStart, (weekNumber - 1) * 7);
                if (weekStart.getTime() <= currentWeekStart.getTime()) {
                    completedWeeks = Math.max(completedWeeks, weekNumber);
                }
            });

            if (completedWeeks > 0) {
                maxDisplayWeeks = Math.min(maxWeeksAvailable, completedWeeks);
            }
        }

        if (maxDisplayWeeks === 0) {
            maxDisplayWeeks = maxWeeksAvailable;
        }

        const chartLength = Math.max(0, Math.min(maxWeeksAvailable, maxDisplayWeeks));

        const chartData = Array.from({ length: chartLength }, (_, idx) => {
            const weekNumber = idx + 1;
            const entry: Record<string, number | string | null> = { week: `W${weekNumber}`, weekNumber };
            years.forEach(year => {
                const bucket = weeklyTotals[year]?.[weekNumber];
                if (bucket && bucket.count > 0 && bucket.openSum > 0) {
                    const avgOverdue = bucket.overdueSum / bucket.count;
                    const avgOpen = bucket.openSum / bucket.count;
                    const rate = avgOpen > 0 ? (avgOverdue / avgOpen) * 100 : null;
                    entry[String(year)] = rate !== null && Number.isFinite(rate) ? rate : null;
                } else {
                    entry[String(year)] = null;
                }
            });
            return entry;
        });

        const barKeys = years.map(year => String(year));

        const defaultVisibleYears = barKeys.reduce((acc, key) => {
            acc[key] = latestYear !== null ? Number(key) === latestYear : true;
            return acc;
        }, {} as Record<string, boolean>);

        const xTicks = Array.from({ length: chartLength }, (_, idx) => idx + 1)
            .filter(weekNumber => weekNumber % 2 === 1)
            .map(weekNumber => `W${weekNumber}`);

        const values: number[] = [];
        chartData.forEach(row => {
            barKeys.forEach(key => {
                const value = row[key];
                if (typeof value === 'number' && Number.isFinite(value)) {
                    values.push(value);
                }
            });
        });

        let yDomainMax = 30;
        if (values.length) {
            const rawMax = Math.max(...values);
            const adjusted = Math.ceil(rawMax / 2) * 2;
            yDomainMax = Math.max(30, adjusted);
        }

        const tickCount = Math.floor(yDomainMax / 2);
        const yTicks = Array.from({ length: tickCount + 1 }, (_, idx) => idx * 2);

        return { chartData, years, barKeys, defaultVisibleYears, xTicks, yDomainMax, yTicks };
    }, [delinquency]);

    const [visibleYears, setVisibleYears] = useState<Record<string, boolean>>(defaultVisibleYears);
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        setVisibleYears(defaultVisibleYears);
    }, [defaultVisibleYears]);

    // Generate gradient definitions for each year (using sorted years to maintain color consistency)
    const gradientDefs = useMemo(() => {
        const sortedYears = [...years].sort((a, b) => a - b);
        return sortedYears.map((year, index) => {
            const gradient = redGradients[index % redGradients.length];
            return {
                year,
                id: `gradient-${year}`,
                ...gradient,
            };
        });
    }, [years]);

    const activeKeys = barKeys.filter(key => visibleYears[key]);
    const currentYear = activeKeys.length ? Math.max(...activeKeys.map(Number)) : Math.max(...barKeys.map(Number));

    if (!chartData.length) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-primary mb-2 tracking-tight-md">Weekly Delinquency Percentage</h3>
                <p className="text-muted text-sm">No delinquency data available yet.</p>
            </div>
        );
    }

    const toggleYear = (year: string) => {
        setVisibleYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    return (
        <LiquidContainer variant="cyan-blue" className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-primary tracking-tight-md">Weekly Delinquency Percentage</h3>
                    <p className="text-sm text-muted">Average overdue vs open accounts (Monday – Sunday).</p>
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
                            {barKeys.map(year => (
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
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <defs>
                        {gradientDefs.map(gradient => (
                            <linearGradient
                                key={gradient.id}
                                id={gradient.id}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor={gradient.from} stopOpacity={0.7} />
                                <stop offset="30%" stopColor={gradient.to} stopOpacity={0.6} />
                                <stop offset="70%" stopColor={gradient.to} stopOpacity={0.5} />
                                <stop offset="100%" stopColor={gradient.to} stopOpacity={0.4} />
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
                        tickFormatter={value => formatPercent(Number(value))}
                        domain={[0, yDomainMax]}
                        ticks={yTicks}
                        allowDecimals
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
                        formatter={(value, name) => [formatPercent(Number(value)), name]}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#d1d5db' }} />
                    {barKeys.map(year => {
                        if (!visibleYears[year]) return null;
                        const gradient = gradientDefs.find(g => g.year === Number(year));
                        if (!gradient) return null;
                        return (
                            <Bar
                                key={year}
                                dataKey={year}
                                name={year === String(currentYear) ? `${year} (Current)` : year}
                                fill={`url(#${gradient.id})`}
                                barSize={18}
                                radius={[4, 4, 0, 0]}
                                stroke={gradient.from}
                                strokeWidth={1}
                            />
                        );
                    })}
                </BarChart>
            </ResponsiveContainer>
        </LiquidContainer>
    );
};

export default CollectionsWeeklyDelinquencyChart;
