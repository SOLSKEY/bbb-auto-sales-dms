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
}

const formatPercent = (value: number) =>
    `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const CollectionsWeeklyPaymentMix: React.FC<CollectionsWeeklyPaymentMixProps> = ({ data, total }) => {
    const gradients = data.map((entry, index) => {
        const isCash = entry.label.toLowerCase() === 'cash';
        return {
            id: `payment-mix-${index}`,
            from: isCash ? '#4ade80' : '#fca5a5',
            to: isCash ? '#15803d' : '#b91c1c',
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
        <div className="glass-card p-6 w-full h-full flex flex-col">
            <h3 className="text-lg font-semibold text-primary mb-3 tracking-tight-md">
                Week-to-Date Payment Mix
            </h3>
            <p className="text-xs uppercase tracking-wide text-muted mb-4">
                Cash vs BOA (virtual transfers)
            </p>
            <div className="flex-1 min-h-[220px] sm:min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {gradients.map(gradient => (
                                <linearGradient key={gradient.id} id={gradient.id} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="5%" stopColor={gradient.from} />
                                    <stop offset="95%" stopColor={gradient.to} />
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
                            stroke="#0f172a"
                            strokeWidth={2}
                            isAnimationActive
                        >
                            {data.map((entry, index) => (
                                <Cell key={entry.label} fill={`url(#${gradients[index].id})`} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number, name: string) => [
                                `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                name,
                            ]}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={60}
                            formatter={(value, entry, index) => {
                                const record = data[index];
                                return `${value} • ${formatPercent(record.percentage)}`;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="pt-4 text-sm text-secondary text-center">
                Week total: ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>
    );
};

export default CollectionsWeeklyPaymentMix;
