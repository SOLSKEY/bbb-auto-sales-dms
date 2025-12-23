import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { LoggedReport } from '../types';

interface UseReportLogsOptions<T> {
    tableName: string;
    reportType: string;
    transformOnLoad?: (payload: any) => T;
}

export interface UseReportLogsResult<T> {
    logs: LoggedReport<T>[];
    loading: boolean;
    error: string | null;
    addLog: (snapshot: T, reportDate: string) => Promise<boolean>;
    deleteLog: (logId: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}

export function useReportLogs<T>({
    tableName,
    reportType,
    transformOnLoad,
}: UseReportLogsOptions<T>): UseReportLogsResult<T> {
    const [logs, setLogs] = useState<LoggedReport<T>[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const mapRow = useCallback(
        (row: any): LoggedReport<T> => ({
            id: String(row.id),
            type: reportType,
            loggedAt: row.logged_at,
            reportDate: row.report_date,
            data: transformOnLoad ? transformOnLoad(row.payload) : (row.payload as T),
        }),
        [reportType, transformOnLoad],
    );

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error: supabaseError } = await supabase
            .from(tableName)
            .select('*')
            .order('report_date', { ascending: false });

        if (supabaseError) {
            console.error(`Error loading ${reportType} logs:`, supabaseError);
            setError(supabaseError.message ?? 'Failed to load logs.');
            setLogs([]);
        } else if (data) {
            // Sort by report_date (already sorted) then by logged_at as secondary sort
            const sortedData = [...data].sort((a, b) => {
                const dateA = new Date(a.report_date).getTime();
                const dateB = new Date(b.report_date).getTime();
                if (dateA !== dateB) {
                    return dateB - dateA; // Descending order
                }
                // If report_date is the same, sort by logged_at descending
                const loggedA = new Date(a.logged_at).getTime();
                const loggedB = new Date(b.logged_at).getTime();
                return loggedB - loggedA; // Descending order
            });
            setLogs(sortedData.map(mapRow));
        } else {
            setLogs([]);
        }
        setLoading(false);
    }, [tableName, reportType, mapRow]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const addLog = useCallback(
        async (snapshot: T, reportDate: string) => {
            setError(null);
            const payload = snapshot as unknown;
            const insertPayload = {
                report_date: reportDate,
                logged_at: new Date().toISOString(),
                payload,
            };
            const { data, error: supabaseError } = await supabase
                .from(tableName)
                .insert({ ...insertPayload })
                .select()
                .single();

            if (supabaseError) {
                console.error(`Error logging ${reportType} report:`, supabaseError);
                setError(supabaseError.message ?? 'Failed to log report.');
                return false;
            }

            if (data) {
                setLogs(prev => [mapRow(data), ...prev]);
            }
            return true;
        },
        [tableName, reportType, mapRow],
    );

    const deleteLog = useCallback(
        async (logId: string) => {
            setError(null);
            const { error: supabaseError } = await supabase.from(tableName).delete().eq('id', logId);
            if (supabaseError) {
                console.error(`Error deleting ${reportType} log:`, supabaseError);
                setError(supabaseError.message ?? 'Failed to delete log.');
                return false;
            }
            setLogs(prev => prev.filter(log => log.id !== logId));
            return true;
        },
        [tableName, reportType],
    );

    return {
        logs,
        loading,
        error,
        addLog,
        deleteLog,
        refresh: loadLogs,
    };
}
