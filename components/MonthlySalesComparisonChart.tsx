import React, { useEffect, useMemo, useState } from 'react';
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

interface MonthlySalesComparisonChartProps {
    data: Array<Record<string, string | number | undefined>>;
    years: number[];
    currentYear: number;
    height?: number;
    className?: string;
}

const monthlyColors = ['#ffc658', '#ff4500', '#8884d8', '#ff7300', '#00C49F', '#82ca9d'];
const currentYearColor = '#32CD32';

const MonthlySalesComparisonChart: React.FC<MonthlySalesComparisonChartProps> = ({
    data,
    years,
    currentYear,
    height = 360,
    className,
}) => {
    const [visibleYears, setVisibleYears] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const initialVisibility: Record<string, boolean> = {};
        years.forEach(year => {
            initialVisibility[String(year)] = true;
        });
        setVisibleYears(initialVisibility);
    }, [years]);

    const legendPayload = useMemo(
        () =>
            years.map((year, index) => ({
                value: String(year),
                color: year === currentYear ? currentYearColor : monthlyColors[index % monthlyColors.length],
            })),
        [years],
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
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${
                        visibleYears[entry.value] ? 'opacity-100' : 'opacity-50'
                    }`}
                >
                    <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-medium text-gray-300">{entry.value}</span>
                </GlassButton>
            ))}
        </div>
    );

    return (
        <div className={`glass-card p-6 h-full flex flex-col ${className ?? ''}`}>
            <h3 className="text-xl font-semibold text-primary mb-4 tracking-tight-md">Monthly Sales Comparison</h3>
            <div className="flex-1" style={{ minHeight: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorCurrentYear" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={currentYearColor} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={currentYearColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c2f33" />
                        <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1d21', border: '1px solid #2c2f33' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" content={renderLegend} />
                        {years.map((year, index) => {
                            if (!visibleYears[String(year)]) return null;
                            if (year === currentYear) {
                                return (
                                    <Area
                                        key={year}
                                        type="step"
                                        dataKey={String(year)}
                                        name={String(year)}
                                        fill="url(#colorCurrentYear)"
                                        stroke={currentYearColor}
                                        strokeWidth={3}
                                    >
                                        <LabelList
                                            dataKey={String(year)}
                                            position="top"
                                            offset={5}
                                            fill={currentYearColor}
                                            fontWeight="bold"
                                            formatter={(value: number) =>
                                                value !== undefined && value !== null ? value : ''
                                            }
                                        />
                                    </Area>
                                );
                            }

                            return (
                                <Bar
                                    key={year}
                                    dataKey={String(year)}
                                    name={String(year)}
                                    fill={monthlyColors[index % monthlyColors.length]}
                                />
                            );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlySalesComparisonChart;
