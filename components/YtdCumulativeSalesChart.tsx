import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Sale } from '../types';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, defs, linearGradient, stop } from 'recharts';
import { FunnelIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { buildSalesAggregates } from '../utils/salesAnalytics';
import { GlassButton } from '@/components/ui/glass-button';

interface YtdCumulativeSalesChartProps {
    salesData: Sale[];
    compactHeight?: boolean;
}

const YtdCumulativeSalesChart: React.FC<YtdCumulativeSalesChartProps> = ({ salesData, compactHeight = false }) => {
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

    // Neon gradient color schemes for each year - vibrant, dynamic colors that fade across the line
    const yearGradients = useMemo(() => {
        const gradients: Record<string, { from: string; to: string; stroke: string }> = {};
        
        // Assign colors based on year with gradient transitions
        years.forEach(year => {
            const key = String(year);
            if (year === 2020) {
                gradients[key] = {
                    from: '#cc0000', // Deeper red (left)
                    to: '#ff3333', // Bright red (right)
                    stroke: '#ff3333',
                };
            } else if (year === 2021) {
                gradients[key] = {
                    from: '#ff4500', // Deeper orange (left)
                    to: '#ff6b35', // Bright orange (right)
                    stroke: '#ff6b35',
                };
            } else if (year === 2022) {
                gradients[key] = {
                    from: '#ffaa00', // Deeper yellow/gold (left)
                    to: '#ffd700', // Bright yellow (right)
                    stroke: '#ffd700',
                };
            } else if (year === 2023) {
                gradients[key] = {
                    from: '#00cc66', // Deeper green (left)
                    to: '#00ff88', // Bright neon green (right)
                    stroke: '#00ff88',
                };
            } else if (year === 2024) {
                gradients[key] = {
                    from: '#ff00a8', // Deeper pink (left)
                    to: '#ff00d4', // Bright pink/magenta (right)
                    stroke: '#ff00d4',
                };
            } else if (year === 2025) {
                gradients[key] = {
                    from: '#0891b2', // Deeper blue (left)
                    to: '#22d3ee', // Bright neon cyan (right)
                    stroke: '#22d3ee',
                };
            } else {
                // Fallback for other years - use rotating neon colors
                const fallbackColors = [
                    { from: '#00f0ff', to: '#00d4ff', stroke: '#00f0ff' }, // Cyan
                    { from: '#ff00d4', to: '#ff00a8', stroke: '#ff00d4' }, // Pink
                    { from: '#00ffcc', to: '#00ffaa', stroke: '#00ffcc' }, // Teal
                ];
                const index = years.indexOf(year) % fallbackColors.length;
                gradients[key] = fallbackColors[index];
            }
        });

        // 5-Year Avg gets white color (solid, no gradient)
        gradients['5-Year Avg'] = {
            from: '#ffffff', // White (left)
            to: '#ffffff', // White (right)
            stroke: '#ffffff',
        };

        return gradients;
    }, [years]);

    const lineColors = useMemo(() => {
        const map: Record<string, string> = {};
        
        years.forEach(year => {
            const key = String(year);
            map[key] = yearGradients[key]?.stroke || '#8884d8';
        });

        map['5-Year Avg'] = yearGradients['5-Year Avg']?.stroke || '#ffffff';
        return map;
    }, [years, yearGradients]);

    // Prepare legend payload with gradients for custom legend
    const legendPayload = useMemo(() => {
        return lineKeys.map(key => {
            const gradient = yearGradients[key];
            return {
                value: key,
                color: gradient?.stroke || lineColors[key] || '#8884d8',
                gradient: gradient,
            };
        });
    }, [lineKeys, yearGradients, lineColors]);

    const chartHeight = compactHeight ? 360 : 420;
    const containerPadding = compactHeight ? 'p-5' : 'p-6';

    // Custom legend renderer with clickable items
    const renderLegend = () => (
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4">
            {legendPayload.map(entry => (
                <GlassButton
                    key={entry.value}
                    type="button"
                    size="sm"
                    onClick={() => handleToggleLine(entry.value)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${visibleLines[entry.value] ? 'opacity-100' : 'opacity-50'
                        }`}
                >
                    <span
                        className="inline-block w-3 h-3 rounded-full border border-white/20"
                        style={{
                            background: entry.gradient
                                ? `linear-gradient(135deg, ${entry.gradient.from} 0%, ${entry.gradient.to} 100%)`
                                : entry.color,
                            boxShadow: `0 0 6px ${entry.color}40`,
                        }}
                    />
                    <span className="text-sm font-medium text-primary-contrast">{entry.value}</span>
                </GlassButton>
            ))}
        </div>
    );

    return (
        <div className={`glass-card-outline ${containerPadding} h-full flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-primary tracking-tight-md">YTD Cumulative Sales</h3>
                <div className="relative" ref={filterRef}>
                    <button
                        type="button"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="glass-select text-xs cursor-pointer pr-8"
                    >
                        Filter Years
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon className={`h-4 w-4 text-muted transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </div>
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
                                    <div 
                                        className="w-3 h-3 rounded-full border border-white/20" 
                                        style={{ 
                                            background: yearGradients[key] 
                                                ? `linear-gradient(135deg, ${yearGradients[key].from} 0%, ${yearGradients[key].to} 100%)`
                                                : lineColors[key],
                                            boxShadow: `0 0 6px ${lineColors[key]}40`,
                                        }}
                                    ></div>
                                    <span className="ml-2">{key}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                        {lineKeys.map(key => {
                            const gradient = yearGradients[key];
                            if (!gradient) {
                                // Ensure 5-Year Avg gradient always exists
                                if (key === '5-Year Avg') {
                                    return (
                                        <linearGradient key={`gradient-${key}`} id={`lineGradient-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#00d4ff" />
                                            <stop offset="100%" stopColor="#00ffff" />
                                        </linearGradient>
                                    );
                                }
                                return null;
                            }
                            // Horizontal gradient for the line stroke (left to right) - darker on left, brighter on right
                            return (
                                <linearGradient key={`gradient-${key}`} id={`lineGradient-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={gradient.from} />
                                    <stop offset="100%" stopColor={gradient.to} />
                                </linearGradient>
                            );
                        }).filter(Boolean)}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af" 
                        tick={{ fontSize: 12 }} 
                        interval={Math.floor(chartData.length / 12)} 
                        angle={-20} 
                        textAnchor="end" 
                        height={50} 
                    />
                    <YAxis 
                        stroke="#9ca3af" 
                        tick={{ fontSize: 12 }} 
                        allowDecimals={false} 
                    />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: 'rgba(26, 29, 33, 0.95)', 
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)',
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        itemSorter={(item) => -parseInt(String(item.name).split(' ')[0] || '0')}
                    />
                    <Legend 
                        verticalAlign="bottom" 
                        content={renderLegend}
                    />
                    {lineKeys.map(key => {
                        const gradient = yearGradients[key];
                        // Ensure 5-Year Avg is visible by default
                        const defaultVisible = key === '5-Year Avg' || key === String(maxYear);
                        const isVisible = visibleLines[key] !== undefined ? visibleLines[key] : defaultVisible;
                        const isHighlighted = key === String(maxYear) || key === '5-Year Avg';
                        const isAvg = key === '5-Year Avg';
                        
                        // Don't render if hidden
                        if (!isVisible) return null;
                        
                        // For 5-Year Avg, use solid bright color - more reliable rendering
                        // For other years, use gradient if available
                        let strokeColor: string;
                        if (isAvg) {
                            // Use solid white for 5-Year Avg
                            strokeColor = '#ffffff';
                        } else if (gradient) {
                            strokeColor = `url(#lineGradient-${key})`;
                        } else {
                            strokeColor = lineColors[key] || '#8884d8';
                        }
                        
                        // Use Area with no fill to create a line with gradient stroke (for non-Avg lines)
                        // Use Area for consistency but with solid white color for 5-Year Avg
                        return (
                            <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                name={key}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth={isHighlighted ? 3.5 : 2.5}
                                dot={false}
                                activeDot={{ 
                                    r: 7, 
                                    fill: isAvg ? '#ffffff' : (gradient?.stroke || lineColors[key] || '#8884d8'),
                                    stroke: isAvg ? '#000000' : '#fff',
                                    strokeWidth: 2,
                                }}
                            />
                        );
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default YtdCumulativeSalesChart;
