import React, { useMemo } from 'react';
import type { Sale } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { buildSalesAggregates, getYtdCountForYear } from '../utils/salesAnalytics';

interface YtdSalesComparisonProps {
    salesData: Sale[];
    compact?: boolean;
}

type ComparisonRow = {
    label: string;
    count: number;
    change: number;
    status: 'Ahead' | 'Behind';
    meta?: string;
};

const YtdSalesComparison: React.FC<YtdSalesComparisonProps> = ({ salesData, compact = false }) => {
    const comparisonData = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const aggregates = buildSalesAggregates(salesData);
        const { parsedSales, years } = aggregates;

        if (parsedSales.length === 0) {
            return {
                currentYtdSales: 0,
                results: [],
                today,
            };
        }

        const currentYtdSales = getYtdCountForYear(parsedSales, currentYear, today);

        const comparisonYears = years.filter(year => year !== currentYear);
        const results: ComparisonRow[] = comparisonYears.map(year => {
            const count = getYtdCountForYear(parsedSales, year, today);
            const change = count > 0 ? ((currentYtdSales - count) / count) * 100 : (currentYtdSales > 0 ? Infinity : 0);
            return {
                label: String(year),
                count,
                change,
                status: currentYtdSales >= count ? 'Ahead' : 'Behind'
            };
        }).sort((a, b) => Number(a.label) - Number(b.label));

        const recentYears = comparisonYears
            .filter(year => year < currentYear)
            .sort((a, b) => b - a)
            .slice(0, 5);

        const fiveYearTotal = recentYears.reduce((sum, year) => sum + getYtdCountForYear(parsedSales, year, today), 0);
        const fiveYearAverage = recentYears.length > 0 ? fiveYearTotal / recentYears.length : 0;

        if (recentYears.length > 0) {
            const avgChange = fiveYearAverage > 0 ? ((currentYtdSales - fiveYearAverage) / fiveYearAverage) * 100 : (currentYtdSales > 0 ? Infinity : 0);
            results.push({
                label: '5-Year Avg',
                meta: `${recentYears[recentYears.length - 1]} - ${recentYears[0]}`,
                count: parseFloat(fiveYearAverage.toFixed(1)),
                change: avgChange,
                status: currentYtdSales >= fiveYearAverage ? 'Ahead' : 'Behind'
            });
        }

        return { currentYtdSales, results, today };
    }, [salesData]);

    const { currentYtdSales, results, today } = comparisonData;

    const containerClasses = compact
        ? 'glass-card-outline p-4 h-full flex flex-col'
        : 'glass-card-outline p-6';

    const getPercentClass = (percent: number) => {
        if (percent > 0) return 'text-dynamic-green';
        if (percent < 0) return 'text-dynamic-red';
        return 'text-dynamic-yellow';
    };

    return (
        <div className={containerClasses}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between mb-4">
                <h3 className="text-xl font-semibold text-primary tracking-tight-md">YTD Sales Pace Comparison</h3>
                <p className="text-sm text-muted">
                    Current YTD Sales:{' '}
                    <span 
                        className="font-bold text-3xl font-orbitron tracking-tight-lg inline-block"
                        style={{
                            background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #3b82f6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        {currentYtdSales}
                    </span>
                </p>
            </div>
            <div className={`${compact ? 'flex-1 overflow-y-auto' : ''}`}>
                <table className="w-full table-auto text-sm">
                    <thead className="bg-glass-panel border-b border-border-low">
                        <tr>
                            <th className="p-4 text-left font-semibold text-secondary tracking-wider">Year Label</th>
                            <th className="p-4 text-right font-semibold text-secondary tracking-wider">Sales Count</th>
                            <th className="p-4 text-right font-semibold text-secondary tracking-wider">Percent Change</th>
                            <th className="p-4 text-center font-semibold text-secondary tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-low">
                        {results.map(item => {
                            const isAhead = item.status === 'Ahead';
                            const changeText = isFinite(item.change)
                                ? `${item.change > 0 ? '+' : ''}${item.change.toFixed(1)}%`
                                : 'N/A';
                            return (
                                <tr key={`${item.label}-${item.meta ?? ''}`} className="hover:bg-glass-panel transition-colors">
                                    <td className="p-4 font-bold text-primary align-middle">
                                        <div className="flex flex-col leading-tight">
                                            <span>{item.label}</span>
                                            {item.meta && <span className="text-xs font-medium text-muted">{item.meta}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono text-secondary">{item.count}</td>
                                    <td className={`p-4 text-right font-mono font-bold ${getPercentClass(item.change)}`}>
                                        {changeText}
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-center">
                                        <span className={`flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${isAhead ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {isAhead ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default YtdSalesComparison;
