import React from 'react';
import { TagIcon } from '@heroicons/react/24/solid';
import { STOCK_PREFIXES, StockPrefix, NextStockNumberEntry } from '../utils/stockNumbers';

const prefixDisplayConfig: Record<
    StockPrefix,
    { label: string; bg: string; text: string; border: string; description: string }
> = {
    N: { label: 'N', bg: 'bg-sky-500/20', text: 'text-sky-200', border: 'border-sky-500/30', description: 'Nissan' },
    O: { label: 'O', bg: 'bg-yellow-500/20', text: 'text-yellow-200', border: 'border-yellow-500/30', description: 'Other' },
    D: { label: 'D', bg: 'bg-pink-500/20', text: 'text-pink-200', border: 'border-pink-500/30', description: 'Dodge' },
    F: { label: 'F', bg: 'bg-orange-500/20', text: 'text-orange-200', border: 'border-orange-500/30', description: 'Ford' },
    CH: { label: 'CH', bg: 'bg-emerald-500/20', text: 'text-emerald-200', border: 'border-emerald-500/30', description: 'Chevrolet' },
};

interface NextStockCardProps {
    stockNumbers: Record<StockPrefix, NextStockNumberEntry>;
    year: number;
    className?: string;
}

const NextStockCard: React.FC<NextStockCardProps> = ({ stockNumbers, year, className }) => (
    <div className={`glass-card p-3.5 h-full flex flex-col gap-3 ${className ?? ''}`}>
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-glass-panel rounded-lg">
                <TagIcon className="h-5 w-5 text-lava-warm" />
            </div>
            <div>
                <h4 className="text-xs uppercase tracking-wide text-muted">Next Stock Numbers</h4>
                <p className="text-base font-semibold text-primary">For {year}</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full">
            {STOCK_PREFIXES.map(prefix => {
                const config = prefixDisplayConfig[prefix];
                const entry = stockNumbers[prefix];
                const value = entry?.formatted ?? '--';
                return (
                    <div
                        key={prefix}
                        className={`rounded-md border ${config.border} ${config.bg} px-3 py-2 flex flex-col gap-1 min-w-[120px] flex-1`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
                            <span className="text-[11px] text-secondary">{config.description}</span>
                        </div>
                        <p className="mt-1 text-sm font-mono text-primary">{value}</p>
                    </div>
                );
            })}
        </div>
    </div>
);

export default NextStockCard;
