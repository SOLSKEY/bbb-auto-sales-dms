import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Sale } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FunnelIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { buildSalesAggregates } from '../utils/salesAnalytics';

interface YtdCumulativeSalesChartProps {
    salesData: Sale[];
}

const YtdCumulativeSalesChart: React.FC<YtdCumulativeSalesChartProps> = ({ salesData }) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const { chartData, years, lineKeys, maxYear } = useMemo(() => {
        const { parsedSales, years } = buildSalesAggregates(salesData);

        if (parsedSales.length === 0) return { chartData: [], years: [], lineKeys: [], maxYear: new Date().getFullYear() };

        const today = new Date();
        const endMonth = today.getMonth();
        const endDay = today.getDate();
        const latestYearInData = Math.max(...parsedSales.map(entry => entry.date.getFullYear()));

        const startDate = new Date(2024, 0, 1); // Use a leap year to ensure Feb 29 is included
        const endDate = new Date(2024, endMonth, endDay);
        
        const dateRange: Date[] = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dateRange.push(new Date(d));
        }

        const yearsToProcess = years.slice(); // already sorted ascending
        
        const salesByDayAndYear: Record<string, Record<string, number>> = {};
        
        yearsToProcess.forEach(year => { salesByDayAndYear[year] = {}; });

        parsedSales.forEach(({ date }) => {
            const year = date.getFullYear();
            if (!yearsToProcess.includes(year)) return;
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const key = `${month}-${day}`;
            salesByDayAndYear[year][key] = (salesByDayAndYear[year][key] || 0) + 1;
        });

        const cumulativeData: Record<string, any>[] = [];
        const cumulativeCounters: Record<string, number> = {};
        yearsToProcess.forEach(year => { cumulativeCounters[year] = 0; });

        dateRange.forEach(date => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const key = `${month}-${day}`;
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const dailyEntry: Record<string, any> = { name: formattedDate };

            yearsToProcess.forEach(year => {
                cumulativeCounters[year] += salesByDayAndYear[year][key] || 0;
                dailyEntry[year] = cumulativeCounters[year];
            });
            cumulativeData.push(dailyEntry);
        });

        const prev5Years = yearsToProcess.filter(y => y < latestYearInData).slice(-5);
        cumulativeData.forEach(day => {
            const sum = prev5Years.reduce((acc, year) => acc + (day[year] || 0), 0);
            day['5-Year Avg'] = prev5Years.length > 0 ? parseFloat((sum / prev5Years.length).toFixed(1)) : 0;
        });

        return {
            chartData: cumulativeData,
            years: yearsToProcess,
            lineKeys: [...yearsToProcess.map(String), '5-Year Avg'],
            maxYear: latestYearInData
        };
    }, [salesData]);
    
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({});
    
    useEffect(() => {
        if (lineKeys.length === 0) return;
        setVisibleLines(prev => {
            const next: Record<string, boolean> = {};
            lineKeys.forEach(key => {
                if (key === '5-Year Avg') {
                    next[key] = true;
                } else if (key === String(maxYear)) {
                    next[key] = true;
                } else {
                    next[key] = false;
                }
            });
            return next;
        });
    }, [lineKeys, maxYear]);
    
    const handleToggleLine = (key: string) => {
        setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const lineColors = useMemo(() => {
        const colors = ['#ff4500', '#8884d8', '#82ca9d', '#ffc658', '#00C49F', '#FFBB28', '#00BFFF', '#FF69B4'];
        const map: Record<string, string> = {};
        let colorIndex = 0;

        years.forEach(year => {
            const key = String(year);
            if (year === maxYear) {
                map[key] = '#ff4500';
            } else {
                map[key] = colors[colorIndex % colors.length];
                colorIndex += 1;
            }
        });

        map['5-Year Avg'] = '#FFFFFF';
        return map;
    }, [years, maxYear]);

    return (
        <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-primary tracking-tight-md">YTD Cumulative Sales</h3>
                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 bg-glass-panel hover:bg-glass-panel/80 text-primary font-bold py-2 px-4 rounded-lg transition-colors border border-border-low"
                    >
                        <FunnelIcon className="h-5 w-5" />
                        Filter Years
                        <ChevronDownIcon className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-glass-panel border border-border-high rounded-lg shadow-xl z-20 p-2 backdrop-blur-glass">
                            {lineKeys.map(key => (
                                <label key={key} className="flex items-center w-full px-3 py-2 text-sm text-secondary rounded-md hover:bg-glass-panel cursor-pointer">
                                    <div className="w-5 h-5 flex-shrink-0 mr-3 border-2 border-border-low rounded flex items-center justify-center">
                                       {visibleLines[key] && <CheckIcon className="h-4 w-4 text-lava-core" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={visibleLines[key]}
                                        onChange={() => handleToggleLine(key)}
                                        className="hidden"
                                    />
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lineColors[key] }}></div>
                                    <span className="ml-2">{key}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2c2f33" />
                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} interval={Math.floor(chartData.length / 12)} angle={-20} textAnchor="end" height={50}/>
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a1d21', border: '1px solid #2c2f33' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        // FIX: item.name can be a number, so it must be converted to a string before calling .split().
                        itemSorter={(item) => -parseInt(String(item.name).split(' ')[0] || '0')}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                    {lineKeys.map(key => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={key}
                            stroke={lineColors[key] || '#8884d8'}
                            strokeWidth={key === String(maxYear) || key === '5-Year Avg' ? 3 : 2}
                            dot={false}
                            activeDot={{ r: 6 }}
                            hide={!visibleLines[key]}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default YtdCumulativeSalesChart;
