import React, { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import type { DailyCollectionSummary } from '../types';
import { UserContext } from '../App';
import { CalendarDaysIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabaseClient';
import CollectionsWeeklyPaymentsChart from '../components/CollectionsWeeklyPaymentsChart';
import CollectionsWeeklyDelinquencyChart from '../components/CollectionsWeeklyDelinquencyChart';
import CollectionsWeeklyForecast from '../components/CollectionsWeeklyForecast';
import CollectionsWeeklyPaymentMix from '../components/CollectionsWeeklyPaymentMix';
import {
    parseDateStringToUtc,
    getWeekStartUtc,
    formatDateKey,
    toUtcMidnight,
} from '../utils/date';
import { downloadHtmlElementAsPdf } from '../utils/export';
import { GlassButton } from '@/components/ui/glass-button';
import { usePrintView } from '../hooks/usePrintView';
import CollectionsShortcutButton from '../components/CollectionsShortcutButton';

const safeParseFloat = (val: unknown) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    const cleaned = String(val).replace(/[^0-9.+-]/g, '');
    const parsed = cleaned === '' ? NaN : Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

interface WeeklySummary {
    weekStart: Date;
    totalPayments: number;
    avgOpenAccounts: number;
}

type NormalizedDelinquencyEntry = {
    date: Date;
    openAccounts: number;
    overdueAccounts: number;
};

const CollectionsOverview: React.FC<{
    paymentsData: DailyCollectionSummary[];
    weeklyData: WeeklySummary[];
    delinquencyData: NormalizedDelinquencyEntry[];
    onLogComplete: () => void;
    onRegisterLogHandler?: (handler: (() => void) | null) => void;
    layoutVariant?: 'classic' | 'compact';
    canLogDailyData?: boolean;
}> = ({
    paymentsData,
    weeklyData,
    delinquencyData,
    onLogComplete,
    onRegisterLogHandler,
    layoutVariant = 'compact',
    canLogDailyData = true,
}) => {
        const { isPrintView } = usePrintView();
        const [isLogModalOpen, setIsLogModalOpen] = useState(false);
        const [isSubmittingLog, setIsSubmittingLog] = useState(false);
        const [logError, setLogError] = useState<string | null>(null);
        const dateInputRef = useRef<HTMLInputElement | null>(null);
        const [logForm, setLogForm] = useState(() => {
            const today = formatDateKey(toUtcMidnight(new Date()));
            return {
                date: today,
                payments: '',
                lateFees: '',
                boa: '',
                overdueAccounts: '',
                openAccounts: '',
            };
        });

        const paymentMix = useMemo(() => {
            const today = toUtcMidnight(new Date());
            const weekStart = getWeekStartUtc(today);

            let total = 0;
            let boaTotal = 0;

            paymentsData.forEach(entry => {
                const parsedDate = parseDateStringToUtc(entry.date);
                if (!parsedDate) return;
                const normalizedDate = toUtcMidnight(parsedDate);
                if (normalizedDate.getTime() < weekStart.getTime() || normalizedDate.getTime() > today.getTime()) return;

                const payments = safeParseFloat(entry.payments);
                const lateFees = safeParseFloat(entry.lateFees);
                const boa = safeParseFloat(entry.boaZelle);

                const dayTotal = payments + lateFees;
                if (dayTotal <= 0) return;

                total += dayTotal;
                boaTotal += Math.min(dayTotal, boa);
            });

            const cashTotal = Math.max(0, total - boaTotal);
            const data =
                total > 0
                    ? [
                        {
                            label: 'Cash',
                            value: cashTotal,
                            percentage: (cashTotal / total) * 100,
                            color: '#06b6d4', // Cyan blue base color
                        },
                        {
                            label: 'BOA',
                            value: boaTotal,
                            percentage: (boaTotal / total) * 100,
                            color: '#ec4899', // Hot pink base color
                        },
                    ]
                    : [
                        { label: 'Cash', value: 0, percentage: 0, color: '#06b6d4' },
                        { label: 'BOA', value: 0, percentage: 0, color: '#ec4899' },
                    ];

            return { total, data };
        }, [paymentsData]);

        const metrics = useMemo(() => {
            const today = toUtcMidnight(new Date());
            const weekStart = getWeekStartUtc(today);

            let todayPaymentsTotal = 0;
            let weekToDatePayments = 0;

            // Track daily totals for finding record
            const dailyTotals = new Map<string, number>();

            paymentsData.forEach(entry => {
                const parsedDate = parseDateStringToUtc(entry.date);
                if (!parsedDate) return;
                const normalizedDate = toUtcMidnight(parsedDate);
                const dayTotal = safeParseFloat(entry.payments) + safeParseFloat(entry.lateFees);

                // Track daily total
                const dateKey = formatDateKey(normalizedDate);
                dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + dayTotal);

                if (normalizedDate.getTime() === today.getTime()) {
                    todayPaymentsTotal += dayTotal;
                }
                if (normalizedDate.getTime() >= weekStart.getTime() && normalizedDate.getTime() <= today.getTime()) {
                    weekToDatePayments += dayTotal;
                }
            });

            // Find record daily total and date
            let recordDailyTotal = 0;
            let recordDailyDate: Date | null = null;
            dailyTotals.forEach((total, dateKey) => {
                if (total > recordDailyTotal) {
                    recordDailyTotal = total;
                    const parsed = parseDateStringToUtc(dateKey);
                    recordDailyDate = parsed ? toUtcMidnight(parsed) : null;
                }
            });

            // Find record weekly total and date range
            let recordWeeklyTotal = 0;
            let recordWeekStart: Date | null = null;
            let recordWeekEnd: Date | null = null;
            weeklyData.forEach(week => {
                if (week.totalPayments > recordWeeklyTotal) {
                    recordWeeklyTotal = week.totalPayments;
                    recordWeekStart = getWeekStartUtc(week.weekStart);
                    const end = new Date(recordWeekStart);
                    end.setDate(end.getDate() + 6);
                    recordWeekEnd = end;
                }
            });

            const todayDelinquencyEntry = delinquencyData.find(entry => entry.date.getTime() === today.getTime());
            const todayOpenAccounts = todayDelinquencyEntry ? todayDelinquencyEntry.openAccounts : 0;
            const todayOverdueAccounts = todayDelinquencyEntry ? todayDelinquencyEntry.overdueAccounts : 0;
            const todayDelinquencyRate =
                todayOpenAccounts > 0 ? (todayOverdueAccounts / todayOpenAccounts) * 100 : 0;

            const normalizedWeeks = weeklyData
                .map(week => ({
                    ...week,
                    weekStart: getWeekStartUtc(week.weekStart),
                }))
                .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

            const historicalPerAcctValues = normalizedWeeks
                .map(week => {
                    if (!week.avgOpenAccounts || week.avgOpenAccounts <= 0) return null;
                    return week.totalPayments / week.avgOpenAccounts;
                })
                .filter((value): value is number => value !== null);

            const perAccountWeeklyAverage =
                historicalPerAcctValues.length
                    ? historicalPerAcctValues.reduce((sum, value) => sum + value, 0) / historicalPerAcctValues.length
                    : 0;

            const currentWeekStart = getWeekStartUtc(today);
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

            return {
                todayOpenAccounts,
                todayOverdueAccounts,
                todayDelinquencyRate,
                todayPaymentsTotal,
                weekToDatePayments,
                expectedWeeklyTotal,
                recordDailyTotal,
                recordDailyDate,
                recordWeeklyTotal,
                recordWeekStart,
                recordWeekEnd,
            };
        }, [paymentsData, delinquencyData, weeklyData]);

        const cardData = useMemo(
            () => ({
                group1: [
                    {
                        title: "Today's Open Accounts",
                        value: metrics.todayOpenAccounts.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                        accent: 'text-green-400',
                    },
                    {
                        title: "Today's Overdue Accounts",
                        value: metrics.todayOverdueAccounts.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                        accent: 'text-red-400',
                    },
                    {
                        title: "Today's Delinquency Rate",
                        value: `${metrics.todayDelinquencyRate.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}%`,
                        accent: 'text-red-400',
                    },
                ],
                group2: [
                    {
                        title: "Today's Total Payments",
                        value: `$${metrics.todayPaymentsTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}`,
                        accent: 'text-white',
                    },
                    {
                        title: 'Week-to-Date Payments',
                        value: `$${metrics.weekToDatePayments.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}`,
                        accent: 'text-white',
                    },
                    {
                        title: 'Expected Payments (Week)',
                        value: `$${metrics.expectedWeeklyTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}`,
                        accent: 'text-white',
                    },
                ],
                recordCards: [
                    {
                        title: 'Record Daily Payments',
                        subtitle: metrics.recordDailyDate
                            ? metrics.recordDailyDate.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })
                            : '',
                        value: `$${metrics.recordDailyTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}`,
                        accent: 'text-white',
                        isRecord: true,
                    },
                    {
                        title: 'Record Weekly Payments',
                        subtitle: metrics.recordWeekStart && metrics.recordWeekEnd
                            ? `${metrics.recordWeekStart.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                            })} - ${metrics.recordWeekEnd.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}`
                            : '',
                        value: `$${metrics.recordWeeklyTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}`,
                        accent: 'text-white',
                        isRecord: true,
                    },
                ],
            }),
            [metrics]
        );

        const cardGridClasses =
            layoutVariant === 'compact'
                ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'
                : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';
        const cardPaddingClass = layoutVariant === 'compact' ? 'p-4' : 'p-6';
        const cardTitleClass =
            layoutVariant === 'compact'
                ? 'text-xs uppercase tracking-wide text-muted mb-1'
                : 'text-sm uppercase tracking-wide text-muted mb-2';
        const cardValueClass =
            layoutVariant === 'compact'
                ? 'text-3xl font-bold font-orbitron tracking-tight-lg'
                : 'text-3xl font-bold font-orbitron tracking-tight-lg';

        const handleLogInputChange = useCallback((field: keyof typeof logForm, value: string) => {
            setLogForm(prev => ({ ...prev, [field]: value }));
        }, []);

        const resetLogForm = useCallback(() => {
            const today = formatDateKey(toUtcMidnight(new Date()));
            setLogForm({
                date: today,
                payments: '',
                lateFees: '',
                boa: '',
                overdueAccounts: '',
                openAccounts: '',
            });
            setLogError(null);
        }, []);

        const openLogModal = useCallback(() => {
            if (!canLogDailyData) return;
            resetLogForm();
            setIsLogModalOpen(true);
        }, [resetLogForm, canLogDailyData]);

        useEffect(() => {
            if (!onRegisterLogHandler) return;
            if (isPrintView || !canLogDailyData) {
                onRegisterLogHandler(null);
                return;
            }
            onRegisterLogHandler(openLogModal);
            return () => {
                onRegisterLogHandler(null);
            };
        }, [onRegisterLogHandler, openLogModal, isPrintView, canLogDailyData]);

        const parseNumericInput = (value: string) => {
            if (!value) return 0;
            const cleaned = value.replace(/[^0-9.\-]/g, '');
            const parsed = Number(cleaned);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const handleSubmitLog = async (event: React.FormEvent) => {
            event.preventDefault();
            if (!canLogDailyData) return;
            if (isSubmittingLog) return;
            setIsSubmittingLog(true);
            setLogError(null);

            try {
                const dateIso = logForm.date || formatDateKey(toUtcMidnight(new Date()));
                const paymentsValue = parseNumericInput(logForm.payments);
                const lateFeesValue = parseNumericInput(logForm.lateFees);
                const boaValue = parseNumericInput(logForm.boa);
                const overdueValue = parseNumericInput(logForm.overdueAccounts);
                const openValue = parseNumericInput(logForm.openAccounts);

                const paymentPayload = {
                    Date: dateIso,
                    Payments: paymentsValue,
                    'Late Fees': lateFeesValue,
                    BOA: boaValue,
                } as Record<string, number | string>;

                const delinquencyPayload = {
                    Date: dateIso,
                    'Overdue Accounts': overdueValue,
                    'Open Accounts': openValue,
                } as Record<string, number | string>;

                const { error: paymentsError } = await supabase
                    .from('Payments')
                    .upsert(paymentPayload, { onConflict: 'Date' });
                if (paymentsError) throw paymentsError;

                const { error: delinquencyError } = await supabase
                    .from('Delinquency')
                    .upsert(delinquencyPayload, { onConflict: 'Date' });
                if (delinquencyError) throw delinquencyError;

                onLogComplete();
                resetLogForm();
                setIsLogModalOpen(false);
            } catch (error: any) {
                console.error('Error logging collections data', error);
                setLogError(error?.message ?? 'Failed to log data. Please try again.');
            } finally {
                setIsSubmittingLog(false);
            }
        };

        const containerClasses = isPrintView ? 'space-y-6 p-12 pdf-export-mode' : 'space-y-6 p-12';

        // Get current date in Central Standard Time (CST/CDT)
        const currentDateCST = useMemo(() => {
            const now = new Date();
            // Use America/Chicago timezone which automatically handles CST/CDT transitions
            return now.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'America/Chicago',
            });
        }, []); // Empty dependency array - date updates on page refresh/component mount

        return (
            <div id="collections-analytics-export" className={containerClasses}>
                {/* Header: Title on left, Date on right */}
                <div className="glass-card-accent flex justify-between items-center print:mb-6 mb-6 p-4">
                    <h1 
                        className="font-bold font-orbitron tracking-tight-lg text-white"
                        style={{
                            fontSize: '38px',
                        }}
                    >
                        SMYRNA COLLECTIONS REPORT
                    </h1>
                    <p className="text-lg text-secondary font-semibold">{currentDateCST}</p>
                </div>
                {canLogDailyData && isLogModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
                        <div className="w-full max-w-xl p-6 relative bg-[#1b1f26] border border-border-high rounded-2xl shadow-2xl">
                            <GlassButton
                                type="button"
                                size="icon"
                                className="absolute top-3 right-3 text-secondary hover:text-primary transition-colors"
                                onClick={() => {
                                    setIsLogModalOpen(false);
                                    resetLogForm();
                                }}
                                disabled={isSubmittingLog}
                            >
                                ✕
                            </GlassButton>
                            <h3 className="text-2xl font-semibold text-primary mb-1 tracking-tight-md">Log Daily Collections</h3>
                            <p className="text-sm text-muted mb-6">
                                Capture payments and delinquency data for a specific date.
                            </p>
                            <form onSubmit={handleSubmitLog} className="space-y-5">
                                <div>
                                    <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Date</label>
                                    <div className="relative">
                                        <input
                                            ref={dateInputRef}
                                            type="date"
                                            className="w-full rounded-md bg-glass-panel border border-border-low py-2.5 pl-3 pr-12 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-lava-core/60"
                                            value={logForm.date}
                                            onChange={event => handleLogInputChange('date', event.target.value)}
                                            required
                                            max={formatDateKey(toUtcMidnight(new Date()))}
                                        />
                                        <GlassButton
                                            type="button"
                                            size="icon"
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-primary transition-colors"
                                            onClick={() => {
                                                const input = dateInputRef.current as any;
                                                if (input && typeof input.showPicker === 'function') {
                                                    input.showPicker();
                                                } else if (dateInputRef.current) {
                                                    dateInputRef.current.focus();
                                                }
                                            }}
                                            tabIndex={-1}
                                        >
                                            <CalendarDaysIcon className="h-5 w-5" />
                                        </GlassButton>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Payments</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded-md bg-glass-panel border border-border-low py-2.5 px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-lava-core/60"
                                            value={logForm.payments}
                                            onChange={event => handleLogInputChange('payments', event.target.value)}
                                            placeholder="0.00"
                                            required
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Late Fees</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded-md bg-glass-panel border border-border-low py-2.5 px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-lava-core/60"
                                            value={logForm.lateFees}
                                            onChange={event => handleLogInputChange('lateFees', event.target.value)}
                                            placeholder="0.00"
                                            required
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wide text-muted mb-2 block">BOA</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded-md bg-glass-panel border border-border-low py-2.5 px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-lava-core/60"
                                            value={logForm.boa}
                                            onChange={event => handleLogInputChange('boa', event.target.value)}
                                            placeholder="0.00"
                                            required
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Overdue Accounts</label>
                                        <input
                                            type="number"
                                            step="1"
                                            className="w-full rounded-md bg-glass-panel border border-border-low py-2.5 px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-lava-core/60"
                                            value={logForm.overdueAccounts}
                                            onChange={event => handleLogInputChange('overdueAccounts', event.target.value)}
                                            placeholder="0"
                                            required
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Open Accounts</label>
                                        <input
                                            type="number"
                                            step="1"
                                            className="w-full rounded-md bg-glass-panel border border-border-low py-2.5 px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-lava-core/60"
                                            value={logForm.openAccounts}
                                            onChange={event => handleLogInputChange('openAccounts', event.target.value)}
                                            placeholder="0"
                                            required
                                            min="0"
                                        />
                                    </div>
                                </div>
                                {logError && (
                                    <div className="text-sm text-red-400">
                                        {logError}
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                    <GlassButton
                                        type="button"
                                        className="px-4 py-2 rounded-md border border-border-low text-sm text-secondary hover:bg-glass-panel transition-colors"
                                        onClick={() => {
                                            setIsLogModalOpen(false);
                                            resetLogForm();
                                        }}
                                        disabled={isSubmittingLog}
                                    >
                                        Cancel
                                    </GlassButton>
                                    <GlassButton
                                        type="submit"
                                        className="px-4 py-2 text-sm font-semibold"
                                        disabled={isSubmittingLog}
                                    >
                                        {isSubmittingLog ? 'Logging…' : 'Submit'}
                                    </GlassButton>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Regular Cards Container - 6 cards (group1 + group2) */}
                <div className="flex flex-wrap items-stretch gap-4 w-full">
                    {/* Group 1: Today's Accounts - 3 cards in a row */}
                    {cardData.group1.map(card => (
                        <div key={card.title} className={`glass-card-outline ${cardPaddingClass} flex-1 min-w-[200px] flex flex-col justify-between`}>
                            <p className={cardTitleClass}>{card.title}</p>
                            <p className={`${cardValueClass} ${card.accent} mt-auto`}>
                                {card.value}
                            </p>
                        </div>
                    ))}

                    {/* Vertical Divider 1 */}
                    <div className="hidden xl:block w-px bg-border-low self-stretch" />

                    {/* Group 2: Payments - 3 cards in a row */}
                    {cardData.group2.map(card => (
                        <div key={card.title} className={`glass-card-outline ${cardPaddingClass} flex-1 min-w-[200px] flex flex-col justify-between`}>
                            <p className={cardTitleClass}>{card.title}</p>
                            <p className={`${cardValueClass} ${card.accent} mt-auto`}>
                                {card.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Record Cards Container - Always on separate row below */}
                <div className="flex flex-wrap items-stretch gap-4 w-full">
                    {/* Record Cards - Accent Styling (like Next Account Number) - 2 cards in a row */}
                    {cardData.recordCards.map(card => (
                        <div
                            key={card.title}
                            className={`glass-card-accent ${cardPaddingClass} flex-1 min-w-[200px] flex flex-col justify-between`}
                        >
                            <p className={`text-xs text-cyan-200 uppercase tracking-wide font-semibold`}>
                                {card.title}
                                {card.subtitle && (
                                    <span className="block text-[10px] text-cyan-300/80 font-normal mt-1 normal-case">
                                        {card.subtitle}
                                    </span>
                                )}
                            </p>
                            <p 
                                className={`${cardValueClass} mt-auto`}
                                style={{
                                    background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #3b82f6 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {card.value}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="border-t border-border-low pt-6" />

                {layoutVariant === 'compact' ? (
                    <>
                        <div className="flex flex-col xl:flex-row gap-4 xl:items-stretch">
                            <div className="w-full xl:w-[25%]">
                                <CollectionsWeeklyPaymentMix data={paymentMix.data} total={paymentMix.total} compact />
                            </div>
                            <div className="w-full xl:w-[75%]">
                                <CollectionsWeeklyPaymentsChart payments={paymentsData} />
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col xl:flex-row gap-4">
                            <div className="w-full xl:w-[40%]">
                                <CollectionsWeeklyForecast
                                    weeklyData={weeklyData}
                                    paymentsData={paymentsData}
                                    compact
                                />
                            </div>
                            <div className="w-full xl:w-[60%]">
                                <CollectionsWeeklyDelinquencyChart delinquency={delinquencyData} />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
                            <div className="w-full lg:w-1/4">
                                <CollectionsWeeklyPaymentMix data={paymentMix.data} total={paymentMix.total} />
                            </div>
                            <div className="w-full lg:w-3/4">
                                <CollectionsWeeklyForecast weeklyData={weeklyData} paymentsData={paymentsData} />
                            </div>
                        </div>

                        <CollectionsWeeklyPaymentsChart payments={paymentsData} />
                        <CollectionsWeeklyDelinquencyChart delinquency={delinquencyData} />
                    </>
                )}
            </div>
        );
    };

const Collections: React.FC = () => {
    const [paymentsRaw, setPaymentsRaw] = useState<any[]>([]);
    const [delinquencyRaw, setDelinquencyRaw] = useState<any[]>([]);
    const userContext = useContext(UserContext);
    const role = userContext?.user.role ?? 'user';
    const isAdmin = role === 'admin';
    const canLogCollections = isAdmin;
    const [isExporting, setIsExporting] = useState(false);

    const loadPayments = useCallback(async () => {
        console.log('Loading payments from Supabase (Collections)...');
        const { data, error } = await supabase
            .from('Payments')
            .select('*')
            .order('"Date"', { ascending: false });

        if (error) {
            console.error('Error loading payments:', error);
        } else if (data) {
            setPaymentsRaw(data);
        } else {
            setPaymentsRaw([]);
        }
    }, []);

    const loadDelinquency = useCallback(async () => {
        console.log('Loading delinquency summaries from Supabase (Collections)...');
        const { data, error } = await supabase
            .from('Delinquency')
            .select('*')
            .order('"Date"', { ascending: false });

        if (error) {
            console.error('Error loading delinquency summaries:', error);
        } else if (data) {
            setDelinquencyRaw(data);
        } else {
            setDelinquencyRaw([]);
        }
    }, []);

    useEffect(() => {
        loadPayments();
        loadDelinquency();
    }, [loadPayments, loadDelinquency]);

    const paymentsNormalized = useMemo<DailyCollectionSummary[]>(() => {
        return paymentsRaw.map(record => {
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
    }, [paymentsRaw]);
    const delinquencyNormalized = useMemo<NormalizedDelinquencyEntry[]>(() => {
        return delinquencyRaw
            .map(record => {
                const parsedDate = parseDateStringToUtc(record.Date ?? record.date ?? record['Date']);
                if (!parsedDate) return null;
                const openAccounts = safeParseFloat(record['Open Accounts'] ?? record.openAccounts ?? record.open_accounts);
                const overdueAccounts = safeParseFloat(record['Overdue Accounts'] ?? record.overdueAccounts ?? record.overdue_accounts);
                return {
                    date: toUtcMidnight(parsedDate),
                    openAccounts,
                    overdueAccounts,
                };
            })
            .filter((entry): entry is NormalizedDelinquencyEntry => entry !== null);
    }, [delinquencyRaw]);

    const weeklySummaries = useMemo<WeeklySummary[]>(() => {
        const paymentsByWeek = new Map<string, number>();
        paymentsNormalized.forEach(entry => {
            const parsedDate = parseDateStringToUtc(entry.date);
            if (!parsedDate) return;
            const normalizedDate = toUtcMidnight(parsedDate);
            const weekStart = getWeekStartUtc(normalizedDate);
            const key = formatDateKey(weekStart);
            paymentsByWeek.set(key, (paymentsByWeek.get(key) || 0) + safeParseFloat(entry.total));
        });

        const openAccountsByWeek = new Map<string, { sum: number; count: number }>();
        delinquencyNormalized.forEach(entry => {
            if (Number.isNaN(entry.date.getTime())) return;
            const weekStart = getWeekStartUtc(entry.date);
            const key = formatDateKey(weekStart);
            const bucket = openAccountsByWeek.get(key) || { sum: 0, count: 0 };
            bucket.sum += entry.openAccounts;
            bucket.count += 1;
            openAccountsByWeek.set(key, bucket);
        });

        const keys = new Set<string>([
            ...paymentsByWeek.keys(),
            ...openAccountsByWeek.keys(),
        ]);

        return Array.from(keys)
            .map(key => {
                const weekStart = parseDateStringToUtc(key);
                const normalizedWeekStart = weekStart ? toUtcMidnight(weekStart) : new Date(key);
                const totalPayments = paymentsByWeek.get(key) || 0;
                const bucket = openAccountsByWeek.get(key);
                const avgOpenAccounts = bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0;
                if (process.env.NODE_ENV !== 'production' && bucket && bucket.count !== 7) {
                    console.debug('[Collections] Delinquency coverage', {
                        weekStart: key,
                        entries: bucket.count,
                        totalOpenAccounts: bucket.sum,
                    });
                }
                return {
                    weekStart: normalizedWeekStart,
                    totalPayments,
                    avgOpenAccounts,
                };
            })
            .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    }, [paymentsNormalized, delinquencyNormalized]);

    const overviewExportRef = useRef<HTMLDivElement | null>(null);
    const logModalHandlerRef = useRef<(() => void) | null>(null);

    const handleExportReport = useCallback(async () => {
        if (isExporting) return;

        const attemptHtmlFallback = async () => {
            if (!overviewExportRef.current) {
                throw new Error('Analytics layout not mounted.');
            }
            const today = new Date();
            const formattedDate = today.toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });
            await downloadHtmlElementAsPdf(overviewExportRef.current, {
                title: `Collections Report — ${formattedDate}`,
                filename: `collections_report_${today.toISOString().slice(0, 10)}.pdf`,
            });
        };

        setIsExporting(true);
        try {
            console.log('Calling export-collections-pdf Edge Function…');
            const exportUrl = typeof window !== 'undefined' ? `${window.location.origin}/collections` : 'https://jhymejbyuvavjsywnwjw.supabase.co/collections';
            const { data, error } = await supabase.functions.invoke('export-collections-pdf', {
                body: {
                    url: exportUrl,
                },
            });
            if (error) {
                console.error('Edge Function returned error:', {
                    message: error.message,
                    status: (error as any)?.status,
                    context: (error as any)?.context,
                    fullError: error,
                });
                throw error;
            }

            if (!data) {
                throw new Error('No PDF returned from export function.');
            }

            let pdfBytes: Uint8Array;
            if (data instanceof Uint8Array) {
                pdfBytes = data;
            } else if (data instanceof ArrayBuffer) {
                pdfBytes = new Uint8Array(data);
            } else if ((data as any).data) {
                pdfBytes = new Uint8Array((data as any).data);
            } else {
                throw new Error('Unexpected PDF payload format.');
            }

            console.log('Edge Function success: received PDF bytes', pdfBytes.byteLength);

            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const today = new Date();
            link.href = downloadUrl;
            link.download = `collections_report_${today.toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        } catch (error: any) {
            console.error('Export failed - full error:', error);
            if (error?.context) {
                console.error('Error context:', error.context);
            }
            console.error('Failed to export collections report via Edge Function', error);
            try {
                await attemptHtmlFallback();
                alert('Puppeteer export service is unavailable. Generated PDF using in-browser renderer instead.');
            } catch (fallbackError) {
                console.error('HTML fallback export failed', fallbackError);
                alert('Failed to export collections report. Please ensure the PDF server is running.');
            }
        } finally {
            setIsExporting(false);
        }
    }, [isExporting]);

    const handleOpenLogModal = useCallback(() => {
        logModalHandlerRef.current?.();
    }, []);

    const [isLogButtonPressed, setIsLogButtonPressed] = useState(false);
    const [isLogButtonHovered, setIsLogButtonHovered] = useState(false);

    const handleLogMouseDown = () => {
        setIsLogButtonPressed(true);
    };

    const handleLogMouseUp = () => {
        setTimeout(() => setIsLogButtonPressed(false), 150);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 print:hidden">
                <div className="flex items-center gap-3">
                    {canLogCollections && (
                        <button
                            type="button"
                            onMouseDown={handleLogMouseDown}
                            onMouseUp={handleLogMouseUp}
                            onMouseEnter={() => setIsLogButtonHovered(true)}
                            onMouseLeave={() => {
                                setIsLogButtonHovered(false);
                                setIsLogButtonPressed(false);
                            }}
                            onClick={handleOpenLogModal}
                            className={`glass-card-accent px-5 py-2 text-sm font-semibold text-white rounded-full transition-all duration-300 flex items-center gap-2 relative overflow-hidden ${
                                isLogButtonPressed ? 'scale-95' : 'scale-100'
                            } cursor-pointer`}
                            style={{
                                boxShadow: isLogButtonHovered 
                                    ? '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(6, 182, 212, 0.6), inset 0 0 30px rgba(34, 211, 238, 0.4)'
                                    : undefined,
                                backgroundColor: isLogButtonHovered 
                                    ? 'rgba(34, 211, 238, 0.15)'
                                    : undefined,
                            }}
                        >
                            {/* Interior glow overlay */}
                            {isLogButtonHovered && (
                                <div 
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
                                        pointerEvents: 'none',
                                    }}
                                />
                            )}
                            <span className="relative z-10">Log Today's Data</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <CollectionsShortcutButton />
                </div>
            </div>

            <div ref={overviewExportRef}>
                <CollectionsOverview
                    paymentsData={paymentsNormalized}
                    weeklyData={weeklySummaries}
                    delinquencyData={delinquencyNormalized}
                    onLogComplete={() => {
                        loadPayments();
                        loadDelinquency();
                    }}
                    onRegisterLogHandler={handler => {
                        logModalHandlerRef.current = handler ?? null;
                    }}
                    canLogDailyData={canLogCollections}
                />
            </div>
        </div >
    );
};

export default Collections;
