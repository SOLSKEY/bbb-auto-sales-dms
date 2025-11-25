import React from 'react';
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
        <div className={`glass-card-outline ${compact ? 'p-4' : 'p-6'} w-full h-full flex flex-col`}>
            <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-primary mb-2 tracking-tight-md`}>
                Week-to-Date Payment Mix
            </h3>
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} uppercase tracking-wide text-muted mb-3`}>
                Cash vs BOA (virtual transfers)
            </p>
            <div className={`flex-1 ${compact ? 'min-h-[170px]' : 'min-h-[220px] sm:min-h-[240px]'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
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
                            innerRadius={0}
                            outerRadius={88}
                            paddingAngle={2}
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth={1}
                            isAnimationActive
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
                        <Legend
                            verticalAlign="bottom"
                            height={60}
                            wrapperStyle={{ color: '#d1d5db' }}
                            iconType="circle"
                            formatter={(value, entry: any, index) => {
                                const record = data[index];
                                return `${value} • ${formatPercent(record.percentage)}`;
                            }}
                            payload={data.map((entry, index) => {
                                const gradient = gradients[index];
                                return {
                                    value: entry.label,
                                    type: 'circle',
                                    id: entry.label,
                                    color: gradient.base,
                                };
                            })}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="pt-3 text-sm text-secondary text-center">
                Week total: ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>
    );
};

export default CollectionsWeeklyPaymentMix;
