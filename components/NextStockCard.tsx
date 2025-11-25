import React from 'react';
import { TagIcon } from '@heroicons/react/24/solid';
import { STOCK_PREFIXES, StockPrefix, NextStockNumberEntry } from '../utils/stockNumbers';

const prefixDisplayConfig: Record<
    StockPrefix,
    { label: string; color: string; description: string }
> = {
    N: { label: 'N', color: '#0ea5e9', description: 'Nissan' }, // Sky-500
    O: { label: 'O', color: '#eab308', description: 'Other' }, // Yellow-500
    D: { label: 'D', color: '#ec4899', description: 'Dodge' }, // Pink-500
    F: { label: 'F', color: '#f97316', description: 'Ford' }, // Orange-500
    CH: { label: 'CH', color: '#10b981', description: 'Chevrolet' }, // Emerald-500
};

interface NextStockCardProps {
    stockNumbers: Record<StockPrefix, NextStockNumberEntry>;
    year: number;
    className?: string;
}

const NextStockCard: React.FC<NextStockCardProps> = ({ stockNumbers, year, className }) => (
    <div className={`glass-card-outline p-4 h-full flex flex-col gap-4 ${className ?? ''}`}>
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg">
                <TagIcon className="h-6 w-6 icon-neon" />
            </div>
            <div>
                <h4 className="text-xs uppercase tracking-wide text-muted-contrast">Next Stock Numbers</h4>
                <p className="text-xl font-bold text-primary-contrast">For {year}</p>
            </div>
        </div>
        <div className="flex flex-row gap-3 w-full overflow-x-auto pb-2">
            {STOCK_PREFIXES.map(prefix => {
                const config = prefixDisplayConfig[prefix];
                const entry = stockNumbers[prefix];
                const value = entry?.formatted ?? '--';
                return (
                    <div
                        key={prefix}
                        className="glass-card-outline-colored p-3 flex flex-col justify-between min-w-[140px] flex-1 relative group"
                        style={{ '--outline-color': config.color } as React.CSSProperties}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-primary-contrast">{config.label}</span>
                            <span className="text-[10px] text-secondary-contrast uppercase tracking-wider opacity-80">{config.description}</span>
                        </div>
                        <p className="text-lg font-mono font-bold text-primary-contrast text-glow tracking-wide">{value}</p>
                    </div>
                );
            })}
        </div>
    </div>
);

export default NextStockCard;
