import React, { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import type { DailyCollectionSummary } from '../types';
import DataGrid from '../components/DataGrid';
import { UserContext } from '../App';
import { EyeIcon, BanknotesIcon, ExclamationTriangleIcon, CalendarDaysIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
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
}> = ({ paymentsData, weeklyData, delinquencyData, onLogComplete, onRegisterLogHandler }) => {
    const isPdfMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pdf') === 'collections';
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
                          color: '#34d399',
                      },
                      {
                          label: 'BOA',
                          value: boaTotal,
                          percentage: (boaTotal / total) * 100,
                          color: '#f87171',
                      },
                  ]
                : [
                      { label: 'Cash', value: 0, percentage: 0, color: '#34d399' },
                      { label: 'BOA', value: 0, percentage: 0, color: '#f87171' },
                  ];

        return { total, data };
    }, [paymentsData]);

    const metrics = useMemo(() => {
        const today = toUtcMidnight(new Date());
        const weekStart = getWeekStartUtc(today);

        let todayPaymentsTotal = 0;
        let weekToDatePayments = 0;

        paymentsData.forEach(entry => {
            const parsedDate = parseDateStringToUtc(entry.date);
            if (!parsedDate) return;
            const normalizedDate = toUtcMidnight(parsedDate);
            const dayTotal = safeParseFloat(entry.payments) + safeParseFloat(entry.lateFees);
            if (normalizedDate.getTime() === today.getTime()) {
                todayPaymentsTotal += dayTotal;
            }
            if (normalizedDate.getTime() >= weekStart.getTime() && normalizedDate.getTime() <= today.getTime()) {
                weekToDatePayments += dayTotal;
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
        };
    }, [paymentsData, delinquencyData, weeklyData]);

    const cardData = useMemo(
        () => [
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
        [metrics]
    );

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
        resetLogForm();
        setIsLogModalOpen(true);
    }, [resetLogForm]);

    useEffect(() => {
        if (!onRegisterLogHandler) return;
        if (isPdfMode) {
            onRegisterLogHandler(null);
            return;
        }
        onRegisterLogHandler(openLogModal);
        return () => {
            onRegisterLogHandler(null);
        };
    }, [onRegisterLogHandler, openLogModal, isPdfMode]);

    const parseNumericInput = (value: string) => {
        if (!value) return 0;
        const cleaned = value.replace(/[^0-9.\-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const handleSubmitLog = async (event: React.FormEvent) => {
        event.preventDefault();
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

    const containerClasses = isPdfMode ? 'space-y-6 pdf-export-mode' : 'space-y-6';

    return (
        <div id="collections-analytics-export" className={containerClasses}>
            {isLogModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
                    <div className="glass-card w-full max-w-xl p-6 relative">
                        <button
                            type="button"
                            className="absolute top-3 right-3 text-secondary hover:text-primary transition-colors"
                            onClick={() => {
                                setIsLogModalOpen(false);
                                resetLogForm();
                            }}
                            disabled={isSubmittingLog}
                        >
                            ✕
                        </button>
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
                                    <button
                                        type="button"
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
                                    </button>
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
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-md border border-border-low text-sm text-secondary hover:bg-glass-panel transition-colors"
                                    onClick={() => {
                                        setIsLogModalOpen(false);
                                        resetLogForm();
                                    }}
                                    disabled={isSubmittingLog}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-lava px-4 py-2 text-sm font-semibold"
                                    disabled={isSubmittingLog}
                                >
                                    {isSubmittingLog ? 'Logging…' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {cardData.map(card => (
                    <div key={card.title} className="glass-card p-6">
                        <p className="text-sm uppercase tracking-wide text-muted mb-2">{card.title}</p>
                        <p className={`text-3xl font-bold font-orbitron tracking-tight-lg ${card.accent}`}>
                            {card.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="border-t border-border-low pt-6" />

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
        </div>
    );
};

const Collections: React.FC = () => {
    const [viewMode, setViewMode] = useState<'analytics' | 'payments' | 'delinquency'>('analytics');
    const [paymentsRaw, setPaymentsRaw] = useState<any[]>([]);
    const [delinquencyRaw, setDelinquencyRaw] = useState<any[]>([]);
    const userContext = useContext(UserContext);
    const isAdmin = userContext?.user.role === 'admin';
    const [isExporting, setIsExporting] = useState(false);
    const isPdfMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pdf') === 'collections';

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
        if (isExporting || viewMode !== 'analytics') return;

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
    }, [isExporting, viewMode]);

    const handleOpenLogModal = useCallback(() => {
        if (viewMode !== 'analytics' || isPdfMode) return;
        logModalHandlerRef.current?.();
    }, [viewMode, isPdfMode]);

    return (
        <div>
            {!isPdfMode && (
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                    <div className="w-full md:w-auto flex justify-start">
                        <button
                            type="button"
                            className="glass-card px-4 py-2 text-sm font-semibold text-primary border border-border-low hover:bg-glass-panel transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleExportReport}
                            disabled={viewMode !== 'analytics' || isExporting}
                        >
                            <ArrowDownTrayIcon className="h-5 w-5" /> {isExporting ? 'Exporting…' : 'Export'}
                        </button>
                    </div>
                    <div className="w-full md:flex-1 flex justify-center">
                        <button
                            type="button"
                            className="btn-lava px-5 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleOpenLogModal}
                            disabled={viewMode !== 'analytics'}
                        >
                            Log Today's Data
                        </button>
                    </div>
                    <div className="flex justify-center md:justify-end w-full md:w-auto">
                        <div className="flex space-x-1 bg-glass-panel p-1 rounded-lg border border-border-low">
                            <button
                                onClick={() => setViewMode('analytics')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    viewMode === 'analytics' ? 'btn-lava' : 'text-secondary hover:bg-glass-panel'
                                }`}
                            >
                                <EyeIcon className="h-5 w-5 inline-block mr-1" /> Analytics
                            </button>
                            <button
                                onClick={() => setViewMode('payments')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    viewMode === 'payments' ? 'btn-lava' : 'text-secondary hover:bg-glass-panel'
                                }`}
                            >
                                <BanknotesIcon className="h-5 w-5 inline-block mr-1" /> Payments
                            </button>
                            <button
                                onClick={() => setViewMode('delinquency')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    viewMode === 'delinquency' ? 'btn-lava' : 'text-secondary hover:bg-glass-panel'
                                }`}
                            >
                                <ExclamationTriangleIcon className="h-5 w-5 inline-block mr-1" /> Delinquency
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'analytics' ? (
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
                    />
                </div>
            ) : viewMode === 'payments' ? (
                <DataGrid
                    columns={[
                        { key: 'Date', name: 'Date' },
                        { key: 'Payments', name: 'Payments' },
                        { key: 'Late Fees', name: 'Late Fees' },
                        { key: 'BOA', name: 'BOA' },
                    ]}
                    data={paymentsRaw}
                    setData={setPaymentsRaw as React.Dispatch<React.SetStateAction<any[]>>}
                    editable={isAdmin}
                    tableName="Payments"
                    primaryKey="Date"
                />
            ) : (
                <DataGrid
                    columns={[
                        { key: 'Date', name: 'Date' },
                        { key: 'Overdue Accounts', name: 'Overdue Accounts' },
                        { key: 'Open Accounts', name: 'Open Accounts' },
                        { key: 'Overdue Rate', name: 'Overdue Rate' },
                    ]}
                    data={delinquencyRaw}
                    setData={setDelinquencyRaw as React.Dispatch<React.SetStateAction<any[]>>}
                    editable={isAdmin}
                    tableName="Delinquency"
                    primaryKey="Date"
                />
            )}
        </div>
    );
};

export default Collections;
