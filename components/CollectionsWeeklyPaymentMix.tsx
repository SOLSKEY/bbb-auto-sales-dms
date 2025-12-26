import React from 'react';
import { usePrintView } from '../hooks/usePrintView';
import { LiquidContainer } from '@/components/ui/liquid-container';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from 'recharts';

interface CollectionsWeeklyPaymentMixProps {
    data: {
        label: string;
        value: number;
        percentage: number;
        color: string;
    }[];
    total: number;
    compact?: boolean;
}

const formatPercent = (value: number) =>
    `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const CollectionsWeeklyPaymentMix: React.FC<CollectionsWeeklyPaymentMixProps> = ({ data, total, compact = false }) => {
    const { isPrintView } = usePrintView();
    // Cyan blue gradient for Cash, Hot pink gradient for BOA
    const gradients = data.map((entry, index) => {
        const isCash = entry.label.toLowerCase() === 'cash';
        return {
            id: `payment-mix-${index}`,
            from: isCash ? '#22d3ee' : '#ec4899', // Light cyan or hot pink
            to: isCash ? '#06b6d4' : '#db2777',   // Cyan or darker pink
            base: isCash ? '#06b6d4' : '#ec4899', // Base color for legend
        };
    });

    if (!total || total <= 0) {
        return (
            <div className="glass-card p-6 w-full h-full flex flex-col justify-center items-center text-center">
                <h3 className="text-lg font-semibold text-primary mb-2 tracking-tight-md">
                    Week-to-Date Payment Mix
                </h3>
                <p className="text-sm text-muted">No payments recorded yet this week.</p>
            </div>
        );
    }

    return (
        <LiquidContainer variant="cyan-blue" className={`${compact ? 'p-4' : 'p-6'} w-full h-full flex flex-col justify-center`} disableBackdropFilter>
            <div className="flex flex-col items-center justify-center flex-1">
                <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-primary mb-2 tracking-tight-md text-center`}>
                    Week-to-Date Payment Mix
                </h3>
                <p className={`${compact ? 'text-[10px]' : 'text-xs'} uppercase tracking-wide text-muted mb-4 text-center`}>
                    Cash vs BOA (virtual transfers)
                </p>
                {/* Pie Chart Container - Centered */}
                <div className="w-full flex items-center justify-center mb-6" style={{ height: compact ? '200px' : '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                                {gradients.map(gradient => (
                                    <linearGradient key={gradient.id} id={gradient.id} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={gradient.from} stopOpacity={0.8} />
                                        <stop offset="50%" stopColor={gradient.to} stopOpacity={0.7} />
                                        <stop offset="100%" stopColor={gradient.to} stopOpacity={0.6} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius={compact ? 70 : 85}
                                paddingAngle={2}
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth={1}
                                isAnimationActive={false}
                            >
                                {data.map((entry, index) => {
                                    const gradient = gradients[index];
                                    return (
                                        <Cell 
                                            key={entry.label} 
                                            fill={`url(#${gradient.id})`}
                                            stroke={gradient.from}
                                            strokeWidth={1.5}
                                        />
                                    );
                                })}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    backdropFilter: 'blur(8px)',
                                }}
                                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                formatter={(value: number, name: string) => [
                                    `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                    name,
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend - Below Pie Chart */}
                <div className="w-full flex justify-center mb-4">
                    <ul className="flex items-center justify-center gap-6 list-none p-0 m-0">
                        {data.map((entry, index) => {
                            const gradient = gradients[index];
                            return (
                                <li key={entry.label} className="flex items-center gap-2" style={{ color: '#d1d5db' }}>
                                    <span 
                                        className="inline-block w-3 h-3 rounded-full"
                                        style={{ 
                                            backgroundColor: gradient.base,
                                            boxShadow: `0 0 4px ${gradient.base}80`
                                        }}
                                    />
                                    <span className="text-sm">
                                        {entry.label} • {formatPercent(entry.percentage)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                {/* Week Total - Below Legend */}
                <div className="text-sm text-secondary text-center">
                    Week total: ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
        </LiquidContainer>
    );
};

export default CollectionsWeeklyPaymentMix;
