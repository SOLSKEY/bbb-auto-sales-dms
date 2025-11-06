import React, { useMemo, useState, useEffect } from 'react';
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
}) => {
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
        <div className="glass-card p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
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
                        <span className="text-sm uppercase tracking-wide text-green-400">
                            Actual
                        </span>
                        <span className="text-3xl font-bold text-green-400 font-orbitron tracking-tight-lg">
                            {formatCurrency(actualSoFar)}
                        </span>
                    </div>
                    <div className="flex items-baseline justify-end gap-2">
                        <span className="text-sm uppercase tracking-wide text-white">
                            Expected
                        </span>
                        <span className="text-3xl font-bold text-primary font-orbitron tracking-tight-lg">
                            {formatCurrency(expectedSoFar)}
                        </span>
                    </div>
                    <div
                        className={`flex items-center justify-end gap-2 text-sm font-semibold ${
                            differencePositive ? 'text-green-400' : 'text-red-400'
                        }`}
                    >
                        <DifferenceIcon className="h-4 w-4" />
                        <span>
                            {differencePositive ? '+' : ''}
                            {formatCurrencyCompact(difference)}
                        </span>
                        <span className="text-xs text-muted ml-1">
                            actual vs expected
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

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#2c2f33" />
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
                                backgroundColor: '#1f2933',
                                border: '1px solid #374151',
                            }}
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
                        />
                        <Bar
                            dataKey="actual"
                            name="Actual"
                            fill="#10b981"
                            barSize={20}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CollectionsWeeklyForecast;
