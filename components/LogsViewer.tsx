import React, { useState, useEffect } from 'react';
import type { LoggedReport } from '../types';
import { TrashIcon } from '@heroicons/react/24/outline';

interface LogsViewerProps<T> {
    logs: LoggedReport<T>[];
    onDeleteLog: (logId: string) => void;
    renderLogContent: (log: LoggedReport<T>) => React.ReactNode;
}

const LogsViewer = <T,>({ logs, onDeleteLog, renderLogContent }: LogsViewerProps<T>) => {
    const [selectedLog, setSelectedLog] = useState<LoggedReport<T> | null>(logs.length > 0 ? logs[0] : null);

    useEffect(() => {
        // If the selected log is no longer in the list (e.g., it was deleted),
        // update the selection to the first available log or null.
        if (selectedLog && !logs.find(log => log.id === selectedLog.id)) {
            setSelectedLog(logs.length > 0 ? logs[0] : null);
        } else if (!selectedLog && logs.length > 0) {
            // If nothing is selected but there are logs, select the first one.
            setSelectedLog(logs[0]);
        }
    }, [logs, selectedLog]);

    if (logs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-gunmetal rounded-lg">
                <p className="text-gray-500">No logs found for this report type.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-6">
            <aside className="w-1/3 xl:w-1/4 flex-shrink-0">
                <div className="bg-gunmetal p-4 rounded-lg h-full overflow-y-auto">
                    <h3 className="text-lg font-bold text-white mb-4">Archived Reports</h3>
                    <ul className="space-y-2">
                        {logs.map(log => (
                            <li key={log.id} className="flex items-center gap-2 group">
                                <button
                                    onClick={() => setSelectedLog(log)}
                                    className={`flex-grow text-left p-3 rounded-lg transition-colors duration-200 ${
                                        selectedLog?.id === log.id
                                            ? 'bg-accent-red/80 text-white'
                                            : 'bg-gunmetal-light text-gray-300 hover:bg-gunmetal-dark'
                                    }`}
                                >
                                    <span className="font-semibold">Report for {log.reportDate}</span>
                                    <span className="block text-xs text-gray-400">
                                        Logged on {new Date(log.loggedAt).toLocaleDateString()}
                                    </span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteLog(log.id);
                                    }}
                                    className="p-2 rounded-md text-gray-500 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Log"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
                {selectedLog ? (
                    <div key={selectedLog.id}>{renderLogContent(selectedLog)}</div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-gunmetal rounded-lg">
                        <p className="text-gray-400">Select a log to view its details.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LogsViewer;
