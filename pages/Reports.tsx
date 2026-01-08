import React, { useContext, useMemo, useRef, useState, useEffect } from 'react';
import { REPORT_TYPES } from '../constants';
import { ArrowDownTrayIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import DailyClosingReport from '../components/DailyClosingReport';
import LogsViewer from '../components/LogsViewer';
import {
    CommissionReportLive,
    CommissionReportViewer,
    CommissionReportHandle,
} from '../components/CommissionReport';
import type {
    DailyClosingReportState,
    CommissionReportSnapshot,
    LoggedReport,
} from '../types';
import { DataContext } from '../App';
import { useReportLogs } from '../hooks/useReportLogs';
import { downloadHtmlElementAsPdf } from '../utils/export';
import { GlassButton } from '@/components/ui/glass-button';
import { usePrintView } from '../hooks/usePrintView';
import AppSelect from '../components/AppSelect';
import CommissionShortcutButton from '../components/CommissionShortcutButton';
import { supabase } from '../supabaseClient';

const DAILY_CLOSING_TABLE = 'DailyClosingReportsLog';
const COMMISSION_TABLE = 'CommissionReportsLog';

type DailyClosingReportHandle = {
    getReportData: () => DailyClosingReportState;
    getReportContainer?: () => HTMLElement | null;
};

const Reports: React.FC = () => {
    const dataContext = useContext(DataContext);
    const sales = dataContext?.sales ?? [];

    const [activeReport, setActiveReport] = useState(REPORT_TYPES[0]);
    const [reportView, setReportView] = useState<'live' | 'logs'>('live');
    const [isLogging, setIsLogging] = useState(false);
    const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
    const [weekBuckets, setWeekBuckets] = useState<Array<{ key: string; label: string }>>([]);
    const [isCollectionsBonusModalOpen, setIsCollectionsBonusModalOpen] = useState(false);
    const [isLoggingCollectionsBonus, setIsLoggingCollectionsBonus] = useState(false);
    const [collectionsBonusForm, setCollectionsBonusForm] = useState({ weekKey: '', amount: '' });
    const [isLogHoursModalOpen, setIsLogHoursModalOpen] = useState(false);
    const [isLoggingHours, setIsLoggingHours] = useState(false);
    const [logHoursForm, setLogHoursForm] = useState({ salesperson: '', date: '', hours: '', minutes: '' });

    const dailyClosingRef = useRef<DailyClosingReportHandle | null>(null);
    const commissionRef = useRef<CommissionReportHandle | null>(null);
    const reportContainerRef = useRef<HTMLDivElement | null>(null);

    const {
        logs: dailyClosingLogs,
        loading: dailyClosingLoading,
        error: dailyClosingError,
        addLog: addDailyClosingLog,
        deleteLog: deleteDailyClosingLog,
    } = useReportLogs<DailyClosingReportState>({
        tableName: DAILY_CLOSING_TABLE,
        reportType: 'Daily Closing',
    });

    const {
        logs: commissionLogs,
        loading: commissionLoading,
        error: commissionError,
        addLog: addCommissionLog,
        deleteLog: deleteCommissionLog,
    } = useReportLogs<CommissionReportSnapshot>({
        tableName: COMMISSION_TABLE,
        reportType: 'Commission',
    });

    const activeLogs = useMemo<LoggedReport<any>[]>(() => {
        if (activeReport === 'Daily Closing') return dailyClosingLogs;
        if (activeReport === 'Commission') return commissionLogs;
        return [];
    }, [activeReport, dailyClosingLogs, commissionLogs]);

    const logsLoading = activeReport === 'Daily Closing' ? dailyClosingLoading : commissionLoading;
    const logsError = activeReport === 'Daily Closing' ? dailyClosingError : commissionError;

    const canLogReport = activeReport === 'Daily Closing' || activeReport === 'Commission';
    const canExportReport = activeReport === 'Commission' || activeReport === 'Daily Closing';

    // Get week buckets from commission report ref when available
    useEffect(() => {
        if (activeReport === 'Commission' && commissionRef.current) {
            const buckets = commissionRef.current.getWeekBuckets();
            setWeekBuckets(buckets);
            // Set initial selected week if not already set
            if (!selectedWeekKey && buckets.length > 0) {
                setSelectedWeekKey(buckets[0].key);
            }
        } else {
            setWeekBuckets([]);
        }
    }, [activeReport, sales, selectedWeekKey]);

    const renderLiveReport = () => {
        if (activeReport === 'Daily Closing') {
            return <DailyClosingReport ref={dailyClosingRef} />;
        }

        if (activeReport === 'Commission') {
            return (
                <CommissionReportLive
                    ref={commissionRef}
                    sales={sales}
                    selectedWeekKey={selectedWeekKey}
                    onWeekChange={setSelectedWeekKey}
                />
            );
        }

        return (
            <div className="glass-card h-full min-h-[500px] flex items-center justify-center text-muted border border-border-low">
                <p>Live data for the {activeReport} report is coming soon.</p>
            </div>
        );
    };

    const renderLoggedReport = () => {
        if (!canLogReport) {
            return (
                <div className="glass-card h-full min-h-[400px] flex items-center justify-center text-muted border border-border-low">
                    <p>No archived logs available for the {activeReport} report yet.</p>
                </div>
            );
        }

        if (logsLoading) {
            return (
                <div className="glass-card h-full min-h-[400px] flex items-center justify-center text-secondary">
                    <p>Loading archived logs...</p>
                </div>
            );
        }

        const renderContent = (log: LoggedReport<any>) => {
            if (activeReport === 'Daily Closing') {
                return (
                    <DailyClosingReport
                        key={log.id}
                        initialData={log.data as DailyClosingReportState}
                        isReadOnly
                    />
                );
            }

            if (activeReport === 'Commission') {
                return (
                    <CommissionReportViewer
                        snapshot={log.data as CommissionReportSnapshot}
                    />
                );
            }

            return (
                <div className="glass-card p-6 text-center text-muted">
                    <p>Unable to render this archived report.</p>
                </div>
            );
        };

        const handleDelete = async (logId: string) => {
            if (!window.confirm('Delete this archived report? This action cannot be undone.')) return;

            if (activeReport === 'Daily Closing') {
                await deleteDailyClosingLog(logId);
            } else if (activeReport === 'Commission') {
                await deleteCommissionLog(logId);
            }
        };

        return (
            <LogsViewer
                logs={activeLogs}
                onDeleteLog={handleDelete}
                renderLogContent={renderContent}
            />
        );
    };

    const handleLogReport = async () => {
        if (!canLogReport || reportView !== 'live') return;
        setIsLogging(true);

        try {
            if (activeReport === 'Daily Closing') {
                const reportData = dailyClosingRef.current?.getReportData();
                if (!reportData) {
                    alert('Unable to capture the Daily Closing report data.');
                    return;
                }
                const success = await addDailyClosingLog(reportData, reportData.date);
                if (success) {
                    alert('Daily Closing report logged successfully.');
                }
            } else if (activeReport === 'Commission') {
                const snapshot = commissionRef.current?.getSnapshot();
                if (!snapshot || snapshot.salespeople.length === 0) {
                    alert('No commission data available to log for this period.');
                    return;
                }
                if (!snapshot.totals.collectionsComplete) {
                    alert('Please select and lock a collections bonus for Key before logging the commission report.');
                    return;
                }
                const success = await addCommissionLog(snapshot, snapshot.periodEnd);
                if (success) {
                    alert('Commission report logged successfully.');
                }
            }
        } finally {
            setIsLogging(false);
        }
    };

    const handleExport = async () => {
        if (!canExportReport) {
            alert('Export is not yet available for this report.');
            return;
        }

        if (activeReport === 'Commission') {
            const snapshot = commissionRef.current?.getSnapshot();
            if (!snapshot || snapshot.salespeople.length === 0) {
                alert('No commission data available to export.');
                return;
            }
            // Collections bonus can now be logged separately, so we don't require collectionsComplete for export

            // Force a re-render to ensure the DOM reflects the snapshot values before export
            // This ensures the locked collections bonus is displayed correctly in the PDF
            await new Promise(resolve => setTimeout(resolve, 100));

            const reportContainer = commissionRef.current?.getReportContainer();
            if (!reportContainer) {
                alert('Unable to find the report to export.');
                return;
            }

            try {
                await downloadHtmlElementAsPdf(reportContainer, {
                    title: `Commission Report • ${snapshot.periodStart} → ${snapshot.periodEnd}`,
                    filename: `commission-report-${snapshot.periodEnd}.pdf`,
                });
            } catch (error) {
                console.error('Failed to export commission report PDF:', error);
                alert('Unable to generate the commission report PDF. Please try again.');
            }
        } else if (activeReport === 'Daily Closing') {
            const reportData = dailyClosingRef.current?.getReportData();
            if (!reportData) {
                alert('Unable to capture the Daily Closing report data.');
                return;
            }

            const reportContainer = dailyClosingRef.current?.getReportContainer?.();
            if (!reportContainer) {
                alert('Unable to find the Daily Closing report to export.');
                return;
            }

            try {
                // Use CSS2PDF to export with all styling preserved
                await downloadHtmlElementAsPdf(reportContainer, {
                    title: `Daily Closing Report • ${reportData.date}`,
                    filename: `daily-closing-report-${reportData.date}.pdf`,
                });
            } catch (error: any) {
                console.error('Failed to export daily closing report PDF:', error);
                alert(`Unable to generate the daily closing report PDF: ${error.message || error}`);
            }
        }
    };

    const { isPrintView } = usePrintView();
    const tabContainerRef = useRef<HTMLDivElement>(null);
    const [tabIndicatorStyle, setTabIndicatorStyle] = useState<React.CSSProperties>({});

    // Update tab indicator position when active report changes
    useEffect(() => {
        if (!tabContainerRef.current) return;

        const activeButton = tabContainerRef.current.querySelector(
            `[data-report-type="${activeReport}"]`
        ) as HTMLElement;
        
        if (activeButton) {
            const containerRect = tabContainerRef.current.getBoundingClientRect();
            const buttonRect = activeButton.getBoundingClientRect();
            
            setTabIndicatorStyle({
                left: `${buttonRect.left - containerRect.left}px`,
                width: `${buttonRect.width}px`,
                opacity: 1,
            });
        }
    }, [activeReport]);

    return (
        <div className="flex flex-col h-full w-full min-w-0">
            {/* Tab Navigation - Horizontal with Sliding Indicator */}
            <div className="glass-card-outline p-2 mb-6 print:hidden relative overflow-x-auto overflow-y-hidden w-full flex-shrink-0">
                <div 
                    ref={tabContainerRef}
                    className="flex flex-nowrap items-center gap-2 relative"
                    style={{ minWidth: 'max-content' }}
                >
                    {/* Sliding Indicator */}
                    <div
                        className="absolute bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-cyan-500/30 border border-cyan-400/50 rounded-lg transition-all duration-300 ease-out pointer-events-none"
                        style={{
                            ...tabIndicatorStyle,
                            top: '1px',
                            bottom: '1px',
                            height: 'auto',
                            boxShadow: '0 0 10px rgba(6, 182, 212, 0.5), inset 0 0 10px rgba(59, 130, 246, 0.3)',
                        }}
                    />
                    {REPORT_TYPES.map(report => (
                        <GlassButton
                            key={report}
                            data-report-type={report}
                            onClick={() => {
                                setActiveReport(report);
                                setReportView('live');
                            }}
                            size="sm"
                            className={`relative z-10 transition-colors flex-shrink-0 ${
                                activeReport === report 
                                    ? 'glass-button-active pointer-events-none' 
                                    : 'hover:opacity-80'
                            }`}
                            contentClassName={activeReport === report ? 'text-white' : undefined}
                            disabled={activeReport === report}
                        >
                            {report} Report
                        </GlassButton>
                    ))}
                </div>
            </div>
            <main id="reports-export-container" className="flex-1 glass-card p-6 flex flex-col print:shadow-none print:border-none print:bg-transparent print:p-0 min-w-0 w-full overflow-x-hidden">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 print:mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold font-orbitron text-primary tracking-tight-lg print:text-black">
                            {activeReport} Report
                        </h2>
                        <div className="flex space-x-1 bg-glass-panel p-1 rounded-lg border border-border-low print:hidden">
                            <GlassButton
                                onClick={() => setReportView('live')}
                                size="sm"
                                className={reportView === 'live' ? 'glass-button-active pointer-events-none' : undefined}
                                contentClassName={reportView === 'live' ? 'text-white' : 'text-secondary'}
                                disabled={reportView === 'live'}
                            >
                                Live Report
                            </GlassButton>
                            <GlassButton
                                onClick={() => setReportView('logs')}
                                size="sm"
                                className={reportView === 'logs' ? 'glass-button-active pointer-events-none' : undefined}
                                contentClassName={reportView === 'logs' ? 'text-white' : 'text-secondary'}
                                disabled={reportView === 'logs'}
                            >
                                Archived Logs
                            </GlassButton>
                        </div>
                        {activeReport === 'Commission' && reportView === 'live' && weekBuckets.length > 0 && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs uppercase tracking-wide text-muted">Select Week</label>
                                <div className="w-56">
                                    <AppSelect
                                        value={selectedWeekKey ?? ''}
                                        onChange={value => setSelectedWeekKey(value || null)}
                                        options={weekBuckets.map(bucket => ({
                                            value: bucket.key,
                                            label: bucket.label,
                                        }))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                        {activeReport === 'Commission' && reportView === 'live' && (
                            <CommissionShortcutButton 
                                weekBuckets={weekBuckets}
                                selectedWeekKey={selectedWeekKey}
                                onWeekChange={setSelectedWeekKey}
                            />
                        )}
                        {activeReport === 'Commission' && reportView === 'live' && (
                            <GlassButton
                                onClick={handleExport}
                                disabled={!canExportReport}
                                contentClassName="flex items-center"
                            >
                                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                                Export
                            </GlassButton>
                        )}
                        {activeReport === 'Commission' && reportView === 'live' && (
                            <GlassButton
                                onClick={() => {
                                    setIsLogHoursModalOpen(true);
                                }}
                                disabled={isLoggingHours}
                                contentClassName="flex items-center"
                            >
                                <BookmarkIcon className="h-5 w-5 mr-2" />
                                {isLoggingHours ? 'Logging…' : 'Log Hours'}
                            </GlassButton>
                        )}
                        {activeReport === 'Commission' && reportView === 'live' && (
                            <GlassButton
                                onClick={() => {
                                    if (weekBuckets.length > 0 && !collectionsBonusForm.weekKey) {
                                        setCollectionsBonusForm(prev => ({ ...prev, weekKey: selectedWeekKey || weekBuckets[0].key }));
                                    }
                                    setIsCollectionsBonusModalOpen(true);
                                }}
                                disabled={isLoggingCollectionsBonus}
                                contentClassName="flex items-center"
                            >
                                <BookmarkIcon className="h-5 w-5 mr-2" />
                                {isLoggingCollectionsBonus ? 'Logging…' : 'Log Collections Bonus'}
                            </GlassButton>
                        )}
                        {activeReport !== 'Commission' && reportView === 'live' && canLogReport && (
                            <GlassButton
                                onClick={handleLogReport}
                                disabled={isLogging}
                                contentClassName="flex items-center"
                            >
                                <BookmarkIcon className="h-5 w-5 mr-2" />
                                {isLogging ? 'Logging…' : 'Log Report'}
                            </GlassButton>
                        )}
                    </div>
                </div>

                {logsError && reportView === 'logs' && (
                    <div className="mb-4 glass-card border-red-700 text-red-200 px-4 py-2 print:hidden">
                        Failed to load archived logs: {logsError}
                    </div>
                )}

                <div id="commission-report-export-container" className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible min-w-0" ref={reportContainerRef}>
                    {reportView === 'live' ? renderLiveReport() : renderLoggedReport()}
                </div>
            </main>

            {/* Log Hours Modal */}
            {isLogHoursModalOpen && activeReport === 'Commission' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
                    <div className="w-full max-w-xl p-6 relative bg-[#1b1f26] border border-border-high rounded-2xl shadow-2xl">
                        <GlassButton
                            type="button"
                            size="icon"
                            className="absolute top-3 right-3 text-secondary hover:text-primary transition-colors"
                            onClick={() => {
                                setIsLogHoursModalOpen(false);
                                setLogHoursForm({ salesperson: '', date: '', hours: '', minutes: '' });
                            }}
                            disabled={isLoggingHours}
                        >
                            ✕
                        </GlassButton>
                        <h3 className="text-2xl font-semibold text-primary mb-1 tracking-tight-md">Log Hours</h3>
                        <p className="text-sm text-muted mb-6">
                            Log missed hours for a salesperson.
                        </p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!logHoursForm.salesperson || !logHoursForm.date) {
                                alert('Please select both salesperson and date.');
                                return;
                            }
                            const hours = Number(logHoursForm.hours) || 0;
                            const minutes = Number(logHoursForm.minutes) || 0;
                            if (hours === 0 && minutes === 0) {
                                alert('Please enter at least one hour or minute.');
                                return;
                            }
                            setIsLoggingHours(true);
                            try {
                                const { error } = await supabase
                                    .from('missed_hours')
                                    .upsert(
                                        {
                                            salesperson: logHoursForm.salesperson,
                                            date: logHoursForm.date,
                                            hours: hours,
                                            minutes: minutes,
                                            updated_at: new Date().toISOString(),
                                        },
                                        {
                                            onConflict: 'salesperson,date',
                                        }
                                    );

                                if (error) {
                                    console.error('Error logging missed hours:', error);
                                    alert('Failed to log missed hours. Please try again.');
                                    return;
                                }

                                alert('Missed hours logged successfully.');
                                setIsLogHoursModalOpen(false);
                                setLogHoursForm({ salesperson: '', date: '', hours: '', minutes: '' });
                                
                                // Refresh the commission report to show the logged hours
                                if (commissionRef.current && selectedWeekKey) {
                                    const currentKey = selectedWeekKey;
                                    setSelectedWeekKey(null);
                                    setTimeout(() => setSelectedWeekKey(currentKey), 50);
                                }
                            } catch (error) {
                                console.error('Error logging missed hours:', error);
                                alert('An error occurred while logging missed hours.');
                            } finally {
                                setIsLoggingHours(false);
                            }
                        }} className="space-y-5">
                            <div>
                                <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Select Salesperson</label>
                                <AppSelect
                                    value={logHoursForm.salesperson}
                                    onChange={value => setLogHoursForm(prev => ({ ...prev, salesperson: value || '' }))}
                                    options={(() => {
                                        const allSalespeople = new Set<string>();
                                        sales.forEach(sale => {
                                            if (sale.salespersonSplit && sale.salespersonSplit.length > 0) {
                                                sale.salespersonSplit.forEach(split => {
                                                    const name = split.name?.trim();
                                                    if (name && name.toLowerCase() !== 'unassigned' && name.toLowerCase() !== 'key') {
                                                        allSalespeople.add(name);
                                                    }
                                                });
                                            } else {
                                                const name = sale.salesperson?.trim();
                                                if (name && name.toLowerCase() !== 'unassigned' && name.toLowerCase() !== 'key') {
                                                    allSalespeople.add(name);
                                                }
                                            }
                                        });
                                        return [
                                            { value: '', label: 'Select salesperson' },
                                            ...Array.from(allSalespeople).sort().map(sp => ({ value: sp, label: sp })),
                                        ];
                                    })()}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Select Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={logHoursForm.date}
                                        onChange={e => setLogHoursForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full bg-glass-panel border border-border-low text-primary rounded-md px-3 py-2 focus:border-lava-core focus:outline-none"
                                        required
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                                        📅
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Hours</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={logHoursForm.hours}
                                        onChange={e => setLogHoursForm(prev => ({ ...prev, hours: e.target.value }))}
                                        className="w-full bg-glass-panel border border-border-low text-primary rounded-md px-3 py-2 focus:border-lava-core focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Minutes</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={logHoursForm.minutes}
                                        onChange={e => setLogHoursForm(prev => ({ ...prev, minutes: e.target.value }))}
                                        className="w-full bg-glass-panel border border-border-low text-primary rounded-md px-3 py-2 focus:border-lava-core focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <GlassButton
                                    type="submit"
                                    disabled={isLoggingHours || !logHoursForm.salesperson || !logHoursForm.date || (Number(logHoursForm.hours) === 0 && Number(logHoursForm.minutes) === 0)}
                                    className="flex-1"
                                >
                                    {isLoggingHours ? 'Logging…' : 'Log Hours'}
                                </GlassButton>
                                <GlassButton
                                    type="button"
                                    onClick={() => {
                                        setIsLogHoursModalOpen(false);
                                        setLogHoursForm({ salesperson: '', date: '', hours: '', minutes: '' });
                                    }}
                                    disabled={isLoggingHours}
                                    className="opacity-70 hover:opacity-100"
                                >
                                    Cancel
                                </GlassButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Log Collections Bonus Modal */}
            {isCollectionsBonusModalOpen && activeReport === 'Commission' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
                    <div className="w-full max-w-xl p-6 relative bg-[#1b1f26] border border-border-high rounded-2xl shadow-2xl">
                        <GlassButton
                            type="button"
                            size="icon"
                            className="absolute top-3 right-3 text-secondary hover:text-primary transition-colors"
                            onClick={() => {
                                setIsCollectionsBonusModalOpen(false);
                                setCollectionsBonusForm({ weekKey: '', amount: '' });
                            }}
                            disabled={isLoggingCollectionsBonus}
                        >
                            ✕
                        </GlassButton>
                        <h3 className="text-2xl font-semibold text-primary mb-1 tracking-tight-md">Log Collections Bonus</h3>
                        <p className="text-sm text-muted mb-6">
                            Select a week and collections bonus amount to log.
                        </p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!collectionsBonusForm.weekKey || !collectionsBonusForm.amount) {
                                alert('Please select both week and collections bonus amount.');
                                return;
                            }
                            setIsLoggingCollectionsBonus(true);
                            try {
                                const amount = Number(collectionsBonusForm.amount);
                                if (!Number.isFinite(amount) || amount < 0) {
                                    alert('Invalid collections bonus amount.');
                                    return;
                                }
                                
                                const { error } = await supabase
                                    .from('commission_report_collections_bonus')
                                    .upsert(
                                        {
                                            week_key: collectionsBonusForm.weekKey,
                                            collections_bonus: amount,
                                            locked: true,
                                            updated_at: new Date().toISOString(),
                                        },
                                        {
                                            onConflict: 'week_key',
                                        }
                                    );

                                if (error) {
                                    console.error('Error logging collections bonus:', error);
                                    alert('Failed to log collections bonus. Please try again.');
                                    return;
                                }

                                alert('Collections bonus logged successfully.');
                                setIsCollectionsBonusModalOpen(false);
                                
                                // Refresh the commission report to show the logged value
                                if (commissionRef.current && collectionsBonusForm.weekKey === selectedWeekKey) {
                                    // Trigger a refresh by temporarily changing and restoring the week key
                                    const currentKey = selectedWeekKey;
                                    setSelectedWeekKey(null);
                                    setTimeout(() => setSelectedWeekKey(currentKey), 50);
                                }
                                
                                setCollectionsBonusForm({ weekKey: '', amount: '' });
                            } catch (error) {
                                console.error('Error logging collections bonus:', error);
                                alert('An error occurred while logging collections bonus.');
                            } finally {
                                setIsLoggingCollectionsBonus(false);
                            }
                        }} className="space-y-5">
                            <div>
                                <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Select Week</label>
                                <AppSelect
                                    value={collectionsBonusForm.weekKey}
                                    onChange={value => setCollectionsBonusForm(prev => ({ ...prev, weekKey: value || '' }))}
                                    options={weekBuckets.map(bucket => ({
                                        value: bucket.key,
                                        label: bucket.label,
                                    }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wide text-muted mb-2 block">Collections Bonus Amount</label>
                                <AppSelect
                                    value={collectionsBonusForm.amount}
                                    onChange={value => setCollectionsBonusForm(prev => ({ ...prev, amount: value || '' }))}
                                    options={[
                                        { value: '', label: 'Select bonus' },
                                        { value: '0', label: '$0.00' },
                                        { value: '50', label: '$50.00' },
                                        { value: '100', label: '$100.00' },
                                    ]}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <GlassButton
                                    type="submit"
                                    disabled={isLoggingCollectionsBonus || !collectionsBonusForm.weekKey || !collectionsBonusForm.amount}
                                    className="flex-1"
                                >
                                    {isLoggingCollectionsBonus ? 'Logging…' : 'Log Collections Bonus'}
                                </GlassButton>
                                <GlassButton
                                    type="button"
                                    onClick={() => {
                                        setIsCollectionsBonusModalOpen(false);
                                        setCollectionsBonusForm({ weekKey: '', amount: '' });
                                    }}
                                    disabled={isLoggingCollectionsBonus}
                                    className="opacity-70 hover:opacity-100"
                                >
                                    Cancel
                                </GlassButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
