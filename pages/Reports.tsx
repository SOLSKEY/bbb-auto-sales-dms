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
            if (!snapshot.totals.collectionsComplete) {
                alert('Please select and lock a collections bonus for Key before exporting the commission report.');
                return;
            }

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
                            <CommissionShortcutButton />
                        )}
                        {reportView === 'live' && canLogReport && (
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
        </div>
    );
};

export default Reports;
