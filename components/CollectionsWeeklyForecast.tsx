import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { usePrintView } from '../hooks/usePrintView';
import { useChartAnimation } from '../hooks/useChartAnimation';
import type { DailyCollectionSummary } from '../types';
import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
    Area,
} from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import {
    parseDateStringToUtc,
    getWeekStartUtc,
    toUtcMidnight,
    addUtcDays,
    formatDateKey,
    getWeekRangeForDate,
} from '../utils/date';
import AppSelect from './AppSelect';
import { LiquidContainer } from '@/components/ui/liquid-container';

const DOW_KEYS = ['mon', 'tue', 'wed', 'thr', 'fri', 'sat', 'sun'] as const;
type DowKey = typeof DOW_KEYS[number];

interface WeeklySummary {
    weekStart: Date;
    totalPayments: number;
    avgOpenAccounts: number;
}

interface CollectionsWeeklyForecastProps {
    weeklyData: WeeklySummary[];
    paymentsData: DailyCollectionSummary[];
    today?: Date;
    compact?: boolean;
}

interface NormalizedDailyEntry {
    date: Date;
    dateKey: string;
    dow: DowKey;
    payments: number;
    lateFees: number;
    total: number;
}

const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatCurrencyCompact = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Green gradient for Actual bars - matches the green color theme
const actualBarGradient = {
    id: 'gradient-actual-green',
    from: '#10b981', // Emerald green (current color)
    to: '#059669',   // Darker emerald green
    base: '#10b981',
};

const normalizeDowKey = (value?: string | null): DowKey | null => {
    if (!value) return null;
    const lower = value.toLowerCase();
    switch (lower) {
        case 'monday':
        case 'mon':
            return 'mon';
        case 'tuesday':
        case 'tue':
            return 'tue';
        case 'wednesday':
        case 'wed':
            return 'wed';
        case 'thursday':
        case 'thu':
        case 'thur':
        case 'thurs':
        case 'thr':
            return 'thr';
        case 'friday':
        case 'fri':
            return 'fri';
        case 'saturday':
        case 'sat':
            return 'sat';
        case 'sunday':
        case 'sun':
            return 'sun';
        default:
            return null;
    }
};

const getDowFromDate = (date: Date): DowKey => {
    const day = date.getDay();
    switch (day) {
        case 0:
            return 'sun';
        case 1:
            return 'mon';
        case 2:
            return 'tue';
        case 3:
            return 'wed';
        case 4:
            return 'thr';
        case 5:
            return 'fri';
        case 6:
        default:
            return 'sat';
    }
};

const formatDateLabel = (date: Date) =>
    date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric',
    });

const CollectionsWeeklyForecast: React.FC<CollectionsWeeklyForecastProps> = ({
    weeklyData,
    paymentsData,
    today = new Date(),
    compact = false,
}) => {
    const { isPrintView } = usePrintView();
    const isInitializing = useChartAnimation(1500); // Bar chart animation duration
    
    // Handle animation start - optimize rendering with willChange
    const handleAnimationStart = useCallback(() => {
        flushSync(() => {
            if (typeof document !== 'undefined') {
                document.querySelectorAll('.recharts-surface').forEach((el: Element) => {
                    (el as HTMLElement).style.willChange = 'transform';
                });
            }
        });
    }, []);
    
    // Handle animation end - reset willChange
    const handleAnimationEnd = useCallback(() => {
        flushSync(() => {
            if (typeof document !== 'undefined') {
                document.querySelectorAll('.recharts-surface').forEach((el: Element) => {
                    (el as HTMLElement).style.willChange = 'auto';
                });
            }
        });
    }, []);
    const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);

    useEffect(() => {
        if (!weeklyData.length || selectedWeekKey) return;
        const normalizedToday = toUtcMidnight(today);
        const currentWeekStart = getWeekStartUtc(normalizedToday);
        setSelectedWeekKey(formatDateKey(currentWeekStart));
    }, [weeklyData, today, selectedWeekKey]);

    const availableWeeks = useMemo(() => {
        return weeklyData
            .map(week => {
                const weekStart = getWeekStartUtc(week.weekStart);
                const { end } = getWeekRangeForDate(weekStart);
                return {
                    key: formatDateKey(weekStart),
                    label: `${formatDateLabel(weekStart)} – ${formatDateLabel(end)}`,
                };
            })
            .sort((a, b) => (a.key < b.key ? 1 : -1));
    }, [weeklyData]);

    const handleWeekChange = (value: string) => {
        setSelectedWeekKey(value || null);
    };

    useEffect(() => {
        if (!selectedWeekKey && availableWeeks.length) {
            setSelectedWeekKey(availableWeeks[0].key);
        }
    }, [availableWeeks, selectedWeekKey]);

    const forecast = useMemo(() => {
        if (!weeklyData.length || !paymentsData.length) {
            return null;
        }

        const normalizedToday = toUtcMidnight(today);

        const normalizedWeeks = weeklyData
            .map(week => ({
                ...week,
                weekStart: getWeekStartUtc(week.weekStart),
            }))
            .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

        if (!normalizedWeeks.length) {
            return null;
        }

        const historicalPerAcctValues = normalizedWeeks
            .map(week => {
                const { totalPayments, avgOpenAccounts } = week;
                if (!avgOpenAccounts || avgOpenAccounts <= 0) return null;
                return totalPayments / avgOpenAccounts;
            })
            .filter((value): value is number => value !== null);

        if (!historicalPerAcctValues.length) {
            return null;
        }

        const perAccountWeeklyAverage =
            historicalPerAcctValues.reduce((sum, value) => sum + value, 0) /
            historicalPerAcctValues.length;

        const selectedWeekStart = selectedWeekKey
            ? getWeekStartUtc(parseDateStringToUtc(selectedWeekKey) ?? normalizedToday)
            : getWeekStartUtc(normalizedToday);
        const todayWeekStart = getWeekStartUtc(normalizedToday);
        const isCurrentWeek = selectedWeekStart.getTime() === todayWeekStart.getTime();

        const currentWeekStart = selectedWeekStart;
        const currentWeekIndex = normalizedWeeks.findIndex(
            week => week.weekStart.getTime() === currentWeekStart.getTime()
        );
        const currentWeek =
            currentWeekIndex >= 0
                ? normalizedWeeks[currentWeekIndex]
                : normalizedWeeks[normalizedWeeks.length - 1];

        const lagIndex =
            currentWeekIndex >= 0 ? currentWeekIndex - 2 : normalizedWeeks.length - 3;
        const lagWeek = lagIndex >= 0 ? normalizedWeeks[lagIndex] : undefined;

        const lagOpenAccounts =
            lagWeek?.avgOpenAccounts ?? currentWeek?.avgOpenAccounts ?? 0;

        const expectedWeeklyTotal = perAccountWeeklyAverage * lagOpenAccounts;

        // Normalize payments data and compute DOW shares
        const normalizedDaily: NormalizedDailyEntry[] = paymentsData.map(entry => {
            const parsed = parseDateStringToUtc(entry.date);
            const date = parsed ? toUtcMidnight(parsed) : null;
            if (!date) {
                return null;
            }
            const payments = Number(entry.payments ?? entry.total ?? 0) || 0;
            const lateFees = Number(entry.lateFees ?? 0) || 0;
            const dow =
                normalizeDowKey(
                    (entry as any).dow ??
                    (entry as any).day ??
                    null
                ) ?? getDowFromDate(date);
            return {
                date,
                dateKey: formatDateKey(date),
                dow,
                payments,
                lateFees,
                total: payments + lateFees,
            };
        }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        const weeklyBuckets = new Map<string, { start: Date; end: Date; records: NormalizedDailyEntry[] }>();
        normalizedDaily.forEach(entry => {
            const weekStart = getWeekStartUtc(entry.date);
            const key = formatDateKey(weekStart);
            let bucket = weeklyBuckets.get(key);
            if (!bucket) {
                bucket = {
                    start: weekStart,
                    end: addUtcDays(weekStart, 6),
                    records: [],
                };
                weeklyBuckets.set(key, bucket);
            }
            bucket.records.push(entry);
        });

        const dowTotals: Record<DowKey, number> = {
            mon: 0,
            tue: 0,
            wed: 0,
            thr: 0,
            fri: 0,
            sat: 0,
            sun: 0,
        };

        let dowIncludedTotal = 0;
        normalizedDaily.forEach(entry => {
            const include =
                entry.dow === 'sun' ? true : entry.total !== 0;
            if (include) {
                dowTotals[entry.dow] += entry.total;
                dowIncludedTotal += entry.total;
            }
        });

        let dowShares: Record<DowKey, number> = { ...dowTotals };
        if (dowIncludedTotal > 0) {
            dowShares = Object.fromEntries(
                Object.entries(dowTotals).map(([dow, sum]) => [
                    dow,
                    sum / dowIncludedTotal,
                ])
            ) as Record<DowKey, number>;
        } else {
            const uniformShare = 1 / 7;
            dowShares = {
                mon: uniformShare,
                tue: uniformShare,
                wed: uniformShare,
                thr: uniformShare,
                fri: uniformShare,
                sat: uniformShare,
                sun: uniformShare,
            };
        }

        const expectedPerDay: Record<DowKey, number> = Object.fromEntries(
            DOW_KEYS.map(dow => [dow, expectedWeeklyTotal * (dowShares[dow] || 0)])
        ) as Record<DowKey, number>;

        const daysToDisplay: Date[] = [];
        for (let offset = 0; offset < 7; offset += 1) {
            const date = addUtcDays(currentWeekStart, offset);
            if (isCurrentWeek && date.getTime() > normalizedToday.getTime()) break;
            daysToDisplay.push(date);
        }

        const actualByDateKey = new Map<string, number>();
        normalizedDaily.forEach(entry => {
            const dow = entry.dow;
            if (!dow) return;
            const dateKey = entry.dateKey;
            actualByDateKey.set(
                dateKey,
                (actualByDateKey.get(dateKey) || 0) + entry.total
            );
        });

        const dailyRows = daysToDisplay.map((date, index) => {
            const dateKey = formatDateKey(date);
            const dow = getDowFromDate(date);
            const expected = expectedPerDay[dow] || 0;
            const actual = actualByDateKey.get(dateKey) || 0;
            return {
                index,
                dateKey,
                label: formatDateLabel(date),
                expected,
                actual,
            };
        });

        const actualSoFar = dailyRows.reduce((sum, row) => sum + row.actual, 0);
        const expectedSoFar = dailyRows.reduce(
            (sum, row) => sum + row.expected,
            0
        );
        const difference = actualSoFar - expectedSoFar;

        const displayRows: Array<{
            position: number;
            expectedStep: number;
            actual: number | null;
            label: string;
            dateKey: string;
            kind: 'boundary' | 'day';
        }> = [];

        dailyRows.forEach((row, idx) => {
            if (idx === 0) {
                displayRows.push({
                    position: idx,
                    expectedStep: row.expected,
                    actual: null,
                    label: row.label,
                    dateKey: row.dateKey,
                    kind: 'boundary',
                });
            } else {
                displayRows.push({
                    position: idx,
                    expectedStep: row.expected,
                    actual: null,
                    label: dailyRows[idx - 1].label,
                    dateKey: row.dateKey,
                    kind: 'boundary',
                });
            }
            displayRows.push({
                position: idx + 0.5,
                expectedStep: row.expected,
                actual: row.actual,
                label: row.label,
                dateKey: row.dateKey,
                kind: 'day',
            });
        });

        if (dailyRows.length) {
            const lastRow = dailyRows[dailyRows.length - 1];
            displayRows.push({
                position: dailyRows.length,
                expectedStep: lastRow.expected,
                actual: null,
                label: lastRow.label,
                dateKey: lastRow.dateKey,
                kind: 'boundary',
            });
        }

        const tickPositions = dailyRows.map(row => row.index + 0.5);
        const tickLabelMap = tickPositions.reduce<Record<string, string>>((acc, position, idx) => {
            acc[position.toFixed(1)] = dailyRows[idx].label;
            return acc;
        }, {});

        if (process.env.NODE_ENV !== 'production') {
            const debugPayload: Record<string, { range: string; totals: number; records: Array<{ date: string; payments: number; lateFees: number; total: number }> }> = {};
            const currentBucket = weeklyBuckets.get(formatDateKey(currentWeekStart));
            const debugTargets = [currentBucket];
            debugTargets.forEach(bucket => {
                if (!bucket) return;
                const key = formatDateKey(bucket.start);
                debugPayload[key] = {
                    range: `${formatDateKey(bucket.start)} → ${formatDateKey(bucket.end)}`,
                    totals: bucket.records.reduce((sum, record) => sum + record.total, 0),
                    records: bucket.records
                        .slice()
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .map(record => ({
                            date: formatDateKey(record.date),
                            payments: record.payments,
                            lateFees: record.lateFees,
                            total: record.total,
                        })),
                };
            });
            if (Object.keys(debugPayload).length > 0) {
                console.debug('[CollectionsWeeklyForecast] Debug weekly breakdown', debugPayload);
            }
        }

        return {
            chartData: displayRows,
            currentWeekStart,
            expectedWeeklyTotal,
            expectedSoFar,
            actualSoFar,
            difference,
            tickPositions,
            tickLabelMap,
        };
    }, [weeklyData, paymentsData, today, selectedWeekKey]);

    if (!forecast) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-primary mb-2 tracking-tight-md">
                    Weekly Payments Forecast
                </h3>
                <p className="text-muted text-sm">
                    Not enough data to generate a forecast yet.
                </p>
            </div>
        );
    }

    const {
        chartData,
        currentWeekStart,
        expectedWeeklyTotal,
        expectedSoFar,
        actualSoFar,
        difference,
        tickPositions,
        tickLabelMap,
    } = forecast;

    const tickFormatter = (value: number) => tickLabelMap[value.toFixed(1)] ?? '';

    const currentWeekEnd = addUtcDays(currentWeekStart, 6);

    const differencePositive = difference >= 0;
    const DifferenceIcon = differencePositive
        ? ArrowTrendingUpIcon
        : ArrowTrendingDownIcon;

    return (
        <LiquidContainer variant="cyan-blue" className={`${compact ? 'p-5' : 'p-6'} relative overflow-hidden`}>
            <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${compact ? 'mb-4' : 'mb-6'}`}>
                <div>
                    <h3 className="text-xl font-semibold text-primary tracking-tight-md">
                        Weekly Payments Forecast
                    </h3>
                    <p className="text-sm text-muted">
                        Week of{' '}
                        {currentWeekStart.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                        })}{' '}
                        –{' '}
                        {currentWeekEnd.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                        })}
                    </p>
                </div>
                <div className="text-right space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted">
                        Week Total vs Avg
                    </p>
                    <div className="flex items-baseline justify-end gap-2">
                        <span 
                            className="text-sm uppercase tracking-wide"
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            Actual
                        </span>
                        <span 
                            className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold font-orbitron tracking-tight-lg`}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            {formatCurrency(actualSoFar)}
                        </span>
                    </div>
                    <div className="flex items-baseline justify-end gap-2">
                        <span className="text-sm uppercase tracking-wide text-white">
                            Expected
                        </span>
                        <span className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-primary font-orbitron tracking-tight-lg`}>
                            {formatCurrency(expectedSoFar)}
                        </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-sm font-semibold">
                        <DifferenceIcon 
                            className="h-4 w-4"
                            style={{
                                color: differencePositive ? '#10b981' : '#ef4444',
                            }}
                        />
                        <span
                            style={differencePositive ? {
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                color: 'transparent',
                            } : {
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            {differencePositive ? '+' : ''}
                            {formatCurrencyCompact(difference)}
                        </span>
                        <span className="text-xs text-white ml-1">
                            Actual vs Expected
                        </span>
                    </div>
                    <p className="text-xs text-muted">
                        Full week target: {formatCurrency(expectedWeeklyTotal)}
                    </p>
                </div>
            </div>

            <div className="flex justify-end mb-6">
                <label className="text-xs uppercase tracking-wide text-muted mr-3 self-center">
                    Week
                </label>
                <div className="w-56">
                    <AppSelect
                        value={selectedWeekKey ?? ''}
                        onChange={handleWeekChange}
                        disabled={!availableWeeks.length}
                        options={availableWeeks.map(week => ({
                            value: week.key,
                            label: week.label,
                        }))}
                    />
                </div>
            </div>

            <div className={compact ? 'h-56' : 'h-64'} style={{ pointerEvents: isInitializing ? 'none' : 'auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                        data={chartData}
                        onAnimationStart={handleAnimationStart}
                        onAnimationEnd={handleAnimationEnd}
                    >
                        <defs>
                            <linearGradient
                                id={actualBarGradient.id}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor={actualBarGradient.from} stopOpacity={0.7} />
                                <stop offset="30%" stopColor={actualBarGradient.to} stopOpacity={0.6} />
                                <stop offset="70%" stopColor={actualBarGradient.to} stopOpacity={0.5} />
                                <stop offset="100%" stopColor={actualBarGradient.to} stopOpacity={0.4} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis
                            type="number"
                            dataKey="position"
                            domain={[0, tickPositions.length ? Math.max(...tickPositions) + 0.5 : 6.5]}
                            ticks={tickPositions}
                            tickFormatter={tickFormatter}
                            stroke="#9ca3af"
                            tick={{ fontSize: 12 }}
                            allowDuplicatedCategory={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            tick={{ fontSize: 12 }}
                            tickFormatter={value =>
                                `$${Number(value).toLocaleString()}`
                            }
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
                            labelFormatter={value => tickFormatter(Number(value))}
                            formatter={(value, _name, props) => [
                                formatCurrencyCompact(Number(value)),
                                props?.dataKey === 'expectedStep'
                                    ? 'Expected'
                                    : 'Actual',
                            ]}
                            filterNull={false}
                        />
                        <Legend />
                        <Area
                            type="stepAfter"
                            dataKey="expectedStep"
                            name="Expected"
                            stroke="#e5e7eb"
                            strokeWidth={2}
                            fill="rgba(209, 213, 219, 0.35)"
                            activeDot={{ r: 5 }}
                            animationDuration={1500}
                            animationEasing="ease-in-out"
                        />
                        <Bar
                            dataKey="actual"
                            name="Actual"
                            fill={`url(#${actualBarGradient.id})`}
                            barSize={20}
                            radius={[4, 4, 0, 0]}
                            stroke={actualBarGradient.from}
                            strokeWidth={1}
                            animationDuration={1500}
                            animationEasing="ease-in-out"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </LiquidContainer>
    );
};

export default CollectionsWeeklyForecast;
