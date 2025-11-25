import React, { useEffect, useMemo, useState } from 'react';
import type { Sale } from '../types';
import { buildSalesAggregates } from '../utils/salesAnalytics';
import AppSelect from './AppSelect';

interface YearOverYearComparisonProps {
    salesData: Sale[];
    compact?: boolean;
}

const YearOverYearComparison: React.FC<YearOverYearComparisonProps> = ({ salesData, compact = false }) => {
    const currentYear = useMemo(() => new Date().getFullYear(), []);
    const aggregates = useMemo(() => buildSalesAggregates(salesData), [salesData]);
    const { totalsByYearMonth, years } = aggregates;

    const availableYears = useMemo(() => {
        return years.filter(year => year < currentYear).sort((a, b) => b - a);
    }, [years, currentYear]);

    const [comparisonYear, setComparisonYear] = useState<number>(availableYears[0] || currentYear - 1);

    useEffect(() => {
        if (availableYears.length === 0) return;
        if (!availableYears.includes(comparisonYear)) {
            setComparisonYear(availableYears[0]);
        }
    }, [availableYears, comparisonYear]);

    const comparisonData = useMemo(() => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const monthlyData = monthNames.map(month => ({
            month,
            [comparisonYear]: 0,
            [currentYear]: 0,
        }));

        const comparisonYearTotals = totalsByYearMonth[comparisonYear] || {};
        const currentYearTotals = totalsByYearMonth[currentYear] || {};

        monthlyData.forEach((row, idx) => {
            const monthIndex = idx + 1;
            row[comparisonYear] = comparisonYearTotals[monthIndex] || 0;
            row[currentYear] = currentYearTotals[monthIndex] || 0;
        });

        const totals = {
            month: 'TOTAL',
            [comparisonYear]: monthlyData.reduce((acc, curr) => acc + curr[comparisonYear], 0),
            [currentYear]: monthlyData.reduce((acc, curr) => acc + curr[currentYear], 0),
        };

        return [...monthlyData, totals];

    }, [totalsByYearMonth, comparisonYear, currentYear]);


    return (
        <div className={`glass-card-outline ${compact ? 'p-4' : 'p-6'} h-full flex flex-col`}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                <h3 className="text-xl font-semibold text-primary tracking-tight-md">Year-over-Year</h3>
                <div className="w-36 sm:w-44">
                    <AppSelect
                        value={String(comparisonYear)}
                        onChange={value => setComparisonYear(Number(value))}
                        options={availableYears.map(year => ({
                            value: String(year),
                            label: String(year),
                        }))}
                    />
                </div>
            </div>
            <div className={`overflow-x-auto ${compact ? 'flex-1 overflow-y-auto' : ''}`}>
                <table className="min-w-full text-xs">
                    <thead className="bg-glass-panel border-b border-border-low">
                        <tr>
                            <th className="p-2 text-left font-semibold text-secondary tracking-wider">Month</th>
                            <th className="p-2 text-right font-semibold text-secondary tracking-wider">{comparisonYear}</th>
                            <th className="p-2 text-right font-semibold text-secondary tracking-wider">{currentYear}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-low">
                        {comparisonData.map((row, index) => (
                            <tr
                                key={row.month}
                                className={`
                                    ${index === comparisonData.length - 1 ? 'bg-glass-panel font-bold' : 'hover:bg-glass-panel'}
                                    transition-colors
                                `}
                            >
                                <td className="p-2 whitespace-nowrap text-primary">{row.month}</td>
                                <td className="p-2 whitespace-nowrap text-right font-mono text-secondary">{row[comparisonYear]}</td>
                                <td className="p-2 whitespace-nowrap text-right font-mono text-secondary">{row[currentYear]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default YearOverYearComparison;
