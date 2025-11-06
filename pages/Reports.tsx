import React, { useContext, useMemo, useRef, useState } from 'react';
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

    const dailyClosingRef = useRef<DailyClosingReportHandle | null>(null);
    const commissionRef = useRef<CommissionReportHandle | null>(null);

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

    const renderLiveReport = () => {
        if (activeReport === 'Daily Closing') {
            return <DailyClosingReport ref={dailyClosingRef} />;
        }

        if (activeReport === 'Commission') {
            return <CommissionReportLive ref={commissionRef} sales={sales} />;
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
                await downloadHtmlElementAsPdf(reportContainer, {
                    title: `Daily Closing Report • ${reportData.date}`,
                    filename: `daily-closing-report-${reportData.date}.pdf`,
                });
            } catch (error) {
                console.error('Failed to export daily closing report PDF:', error);
                alert('Unable to generate the daily closing report PDF. Please try again.');
            }
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full">
            <aside className="md:w-1/4 lg:w-1/5">
                <h2 className="text-xl font-bold text-primary mb-4 tracking-tight-lg">Report Types</h2>
                <ul className="space-y-2">
                    {REPORT_TYPES.map(report => (
                        <li key={report}>
                            <button
                                onClick={() => {
                                    setActiveReport(report);
                                    setReportView('live');
                                }}
                                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                                    activeReport === report
                                        ? 'btn-lava'
                                        : 'text-secondary hover:bg-glass-panel border border-border-low'
                                }`}
                            >
                                {report} Report
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>
            <main className="flex-1 glass-card p-6 flex flex-col">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold font-orbitron text-primary tracking-tight-lg">
                            {activeReport} Report
                        </h2>
                        <div className="flex space-x-1 bg-glass-panel p-1 rounded-lg border border-border-low">
                            <button
                                onClick={() => setReportView('live')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                    reportView === 'live'
                                        ? 'btn-lava'
                                        : 'text-secondary hover:bg-glass-panel'
                                }`}
                            >
                                Live Report
                            </button>
                            <button
                                onClick={() => setReportView('logs')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                    reportView === 'logs'
                                        ? 'btn-lava'
                                        : 'text-secondary hover:bg-glass-panel'
                                }`}
                            >
                                Archived Logs
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {reportView === 'live' && canLogReport && (
                            <button
                                onClick={handleLogReport}
                                disabled={isLogging}
                                className={`btn-lava flex items-center disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                <BookmarkIcon className="h-5 w-5 mr-2" />
                                {isLogging ? 'Logging…' : 'Log Report'}
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className={`btn-lava flex items-center ${
                                !canExportReport || reportView !== 'live'
                                    ? 'opacity-60 cursor-not-allowed'
                                    : ''
                            }`}
                            disabled={!canExportReport || reportView !== 'live'}
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            Export
                        </button>
                    </div>
                </div>

                {logsError && reportView === 'logs' && (
                    <div className="mb-4 glass-card border-red-700 text-red-200 px-4 py-2">
                        Failed to load archived logs: {logsError}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {reportView === 'live' ? renderLiveReport() : renderLoggedReport()}
                </div>
            </main>
        </div>
    );
};

export default Reports;
