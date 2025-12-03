import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
    Area,
    LabelList,
} from 'recharts';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidContainer } from './ui/liquid-container';

interface MonthlySalesComparisonChartProps {
    data: Array<Record<string, string | number | undefined>>;
    years: number[];
    currentYear: number;
    height?: number;
    className?: string;
}

// Bright neon color palette - vibrant, distinct colors that pop
const yearGradients = [
    { from: '#00f0ff', to: '#00d4ff', base: '#00d4ff' }, // Bright Cyan
    { from: '#ff00d4', to: '#ff00a8', base: '#ff00a8' }, // Bright Pink/Magenta
    { from: '#00ff88', to: '#00ff70', base: '#00ff70' }, // Bright Green
    { from: '#ffff00', to: '#ffd700', base: '#ffd700' }, // Bright Yellow/Gold
    { from: '#ff3333', to: '#ff0000', base: '#ff0000' }, // Bright Red
    { from: '#cc00ff', to: '#aa00ff', base: '#aa00ff' }, // Bright Purple
    { from: '#0088ff', to: '#0066ff', base: '#0066ff' }, // Bright Blue
    { from: '#00ffcc', to: '#00ffaa', base: '#00ffaa' }, // Bright Teal
    { from: '#ff00ff', to: '#dd00ff', base: '#dd00ff' }, // Bright Magenta
    { from: '#ffaa00', to: '#ff8800', base: '#ff8800' }, // Bright Orange
];

const currentYearColor = { from: '#00ff88', to: '#00ff66', base: '#00ff66' }; // Bright neon green for current year

const MonthlySalesComparisonChart: React.FC<MonthlySalesComparisonChartProps> = ({
    data,
    years,
    currentYear,
    height = 360,
    className,
}) => {
    const [visibleYears, setVisibleYears] = useState<Record<string, boolean>>({});
    const [chartHeight, setChartHeight] = useState(height);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // Ensure years are always sorted chronologically
    const sortedYears = useMemo(() => {
        return [...years].sort((a, b) => a - b);
    }, [years]);

    useEffect(() => {
        const initialVisibility: Record<string, boolean> = {};
        sortedYears.forEach(year => {
            initialVisibility[String(year)] = true;
        });
        setVisibleYears(initialVisibility);
    }, [sortedYears]);

    // Measure container height once after mount
    useEffect(() => {
        const measureOnce = () => {
            if (chartContainerRef.current) {
                const rect = chartContainerRef.current.getBoundingClientRect();
                const newHeight = Math.floor(rect.height);
                if (newHeight > 100 && newHeight !== chartHeight) {
                    setChartHeight(newHeight);
                } else if (newHeight <= 0) {
                    // Fallback: calculate from parent
                    const parent = chartContainerRef.current.parentElement;
                    if (parent) {
                        const parentRect = parent.getBoundingClientRect();
                        const headerHeight = 60;
                        const padding = 32;
                        const calculatedHeight = Math.floor(parentRect.height - headerHeight - padding);
                        if (calculatedHeight > 100) {
                            setChartHeight(calculatedHeight);
                        }
                    }
                }
            }
        };

        // Measure after a delay to ensure layout is complete
        const timeoutId = setTimeout(measureOnce, 200);
        return () => clearTimeout(timeoutId);
    }, []); // Only run once on mount

    // Generate gradient definitions for each year (using sorted years to maintain color consistency)
    const gradientDefs = useMemo(() => {
        return sortedYears.map((year, index) => {
            const colorScheme = year === currentYear 
                ? currentYearColor 
                : yearGradients[index % yearGradients.length];
            
            return {
                year,
                id: `gradient-${year}`,
                ...colorScheme,
            };
        });
    }, [sortedYears, currentYear]);

    const legendPayload = useMemo(
        () =>
            sortedYears.map((year, index) => {
                const gradient = gradientDefs.find(g => g.year === year);
                return {
                    value: String(year),
                    color: gradient?.base || '#06b6d4',
                    gradient: gradient,
                };
            }),
        [sortedYears, gradientDefs],
    );

    const toggleYear = (year: string) => {
        setVisibleYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const renderLegend = () => (
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4">
            {legendPayload.map(entry => (
                <GlassButton
                    key={entry.value}
                    type="button"
                    size="sm"
                    onClick={() => toggleYear(entry.value)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${visibleYears[entry.value] ? 'opacity-100' : 'opacity-50'
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
        <LiquidContainer variant="cyan-blue" disableBackdropFilter className={`p-4 h-full flex flex-col ${className ?? ''}`} style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-primary tracking-tight-md">Monthly Sales Comparison</h3>
                <div className="relative">
                    <select
                        className="glass-select text-xs"
                        onChange={(e) => {
                            if (e.target.value === 'all') {
                                const allVisible: Record<string, boolean> = {};
                                years.forEach(y => allVisible[String(y)] = true);
                                setVisibleYears(allVisible);
                            } else {
                                toggleYear(e.target.value);
                            }
                        }}
                        value="filter"
                    >
                        <option value="filter" disabled>Filter Years</option>
                        <option value="all">Show All</option>
                        {years.map(year => (
                            <option key={year} value={String(year)}>
                                {visibleYears[String(year)] ? 'Hide' : 'Show'} {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div ref={chartContainerRef} className="flex-1 min-h-0 w-full" style={{ minHeight: `${height}px` }}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <ComposedChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                            {gradientDefs.map(gradient => {
                                if (gradient.year === currentYear) {
                                    // Current year: gradient for area chart (bright neon green)
                                    return (
                                        <linearGradient
                                            key={`area-${gradient.id}`}
                                            id={`area-${gradient.id}`}
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop offset="5%" stopColor={gradient.from} stopOpacity={0.6} />
                                            <stop offset="50%" stopColor={gradient.to} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={gradient.to} stopOpacity={0} />
                                        </linearGradient>
                                    );
                                }
                                // Regular years: gradient for bars - radiant fill with transparency (like glass cards)
                                return (
                                    <linearGradient
                                        key={gradient.id}
                                        id={gradient.id}
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop offset="0%" stopColor={gradient.from} stopOpacity={0.7} />
                                        <stop offset="30%" stopColor={gradient.to} stopOpacity={0.6} />
                                        <stop offset="70%" stopColor={gradient.to} stopOpacity={0.5} />
                                        <stop offset="100%" stopColor={gradient.to} stopOpacity={0.4} />
                                    </linearGradient>
                                );
                            })}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid rgba(6, 182, 212, 0.3)',
                                borderRadius: '8px',
                                backdropFilter: 'blur(8px)',
                            }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Legend verticalAlign="bottom" content={renderLegend} />
                        {sortedYears.map((year) => {
                            const gradient = gradientDefs.find(g => g.year === year);
                            const isVisible = visibleYears[String(year)] !== false;
                            
                            if (year === currentYear && gradient) {
                                return (
                                    <Area
                                        key={`area-${year}`}
                                        type="step"
                                        dataKey={String(year)}
                                        name={String(year)}
                                        fill={`url(#area-${gradient.id})`}
                                        stroke={gradient.from}
                                        strokeWidth={2.5}
                                        hide={!isVisible}
                                    >
                                        <LabelList
                                            dataKey={String(year)}
                                            position="top"
                                            offset={5}
                                            fill="#00ff88"
                                            fontWeight="bold"
                                            fontSize={16}
                                            style={{ 
                                                fill: '#00ff88',
                                                stroke: 'rgba(0, 0, 0, 0.8)',
                                                strokeWidth: 2,
                                                paintOrder: 'stroke fill',
                                                filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.5))',
                                            }}
                                            formatter={(value: number) =>
                                                value !== undefined && value !== null ? value : ''
                                            }
                                        />
                                    </Area>
                                );
                            }

                            if (gradient) {
                                // Bright stroke color with thin outline (matching site's container outlines)
                                return (
                                    <Bar
                                        key={`bar-${year}`}
                                        dataKey={String(year)}
                                        name={String(year)}
                                        fill={`url(#${gradient.id})`}
                                        radius={[6, 6, 0, 0]}
                                        stroke={gradient.from}
                                        strokeWidth={1}
                                        hide={!isVisible}
                                    />
                                );
                            }
                            
                            return null;
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </LiquidContainer>
    );
};

export default MonthlySalesComparisonChart;
