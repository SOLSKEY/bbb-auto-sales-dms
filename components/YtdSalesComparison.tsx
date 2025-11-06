import React, { useMemo } from 'react';
import type { Sale } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { buildSalesAggregates, getYtdCountForYear } from '../utils/salesAnalytics';

interface YtdSalesComparisonProps {
    salesData: Sale[];
}

const YtdSalesComparison: React.FC<YtdSalesComparisonProps> = ({ salesData }) => {
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
        const results = comparisonYears.map(year => {
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
                label: `5-Year Avg (${recentYears[recentYears.length - 1]}-${recentYears[0]})`,
                count: parseFloat(fiveYearAverage.toFixed(1)),
                change: avgChange,
                status: currentYtdSales >= fiveYearAverage ? 'Ahead' : 'Behind'
            });
        }

        return { currentYtdSales, results, today };
    }, [salesData]);

    const { currentYtdSales, results, today } = comparisonData;

    return (
        <div className="glass-card p-6">
            <div className="flex justify-between items-baseline mb-4">
                 <h3 className="text-xl font-semibold text-primary tracking-tight-md">YTD Sales Pace Comparison</h3>
                 <p className="text-sm text-muted">
                    Current YTD Sales: <span className="font-bold text-2xl text-lava-core font-orbitron tracking-tight-lg">{currentYtdSales}</span>
                    <span className="ml-2">(as of {today.toLocaleDateString()})</span>
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-glass-panel border-b border-border-low">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-secondary tracking-wider">Year Label</th>
                            <th className="p-4 text-right text-sm font-semibold text-secondary tracking-wider">Sales Count</th>
                            <th className="p-4 text-right text-sm font-semibold text-secondary tracking-wider">% Change from Current YTD</th>
                            <th className="p-4 text-center text-sm font-semibold text-secondary tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-low">
                        {results.map(item => {
                             const isAhead = item.status === 'Ahead';
                             const changeText = isFinite(item.change)
                                ? `${item.change > 0 ? '+' : ''}${item.change.toFixed(1)}%`
                                : 'N/A';
                            return (
                                <tr key={item.label} className="hover:bg-glass-panel transition-colors">
                                    <td className="p-4 whitespace-nowrap font-bold text-primary">{item.label}</td>
                                    <td className="p-4 whitespace-nowrap text-right font-mono text-secondary">{item.count}</td>
                                    <td className={`p-4 whitespace-nowrap text-right font-mono font-bold ${isAhead ? 'text-green-400' : 'text-red-400'}`}>
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
