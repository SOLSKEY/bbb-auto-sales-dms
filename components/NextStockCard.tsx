import React from 'react';
import { TagIcon } from '@heroicons/react/24/solid';
import { STOCK_PREFIXES, StockPrefix, NextStockNumberEntry } from '../utils/stockNumbers';
import { LiquidContainer } from './ui/liquid-container';

const prefixDisplayConfig: Record<
    StockPrefix,
    { label: string; color: string; description: string; liquidVariant: 'cyan-blue' | 'yellow' | 'neon-pink' | 'neon-orange' | 'neon-green' }
> = {
    N: { label: 'N', color: '#0ea5e9', description: 'Nissan', liquidVariant: 'cyan-blue' }, // Sky-500
    O: { label: 'O', color: '#eab308', description: 'Other', liquidVariant: 'yellow' }, // Yellow-500
    D: { label: 'D', color: '#ec4899', description: 'Dodge', liquidVariant: 'neon-pink' }, // Pink-500
    F: { label: 'F', color: '#f97316', description: 'Ford', liquidVariant: 'neon-orange' }, // Orange-500
    CH: { label: 'CH', color: '#10b981', description: 'Chevrolet', liquidVariant: 'neon-green' }, // Emerald-500
};

interface NextStockCardProps {
    stockNumbers: Record<StockPrefix, NextStockNumberEntry>;
    year: number;
    className?: string;
}

const NextStockCard: React.FC<NextStockCardProps> = ({ stockNumbers, year, className }) => (
    <LiquidContainer variant="cyan-blue" className={`p-4 h-full flex flex-col gap-4 ${className ?? ''}`}>
        <div className="flex items-center gap-3 py-2">
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
                    <LiquidContainer
                        key={prefix}
                        variant={config.liquidVariant}
                        className="p-3 flex flex-col justify-between min-w-[140px] flex-1 relative group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-primary-contrast">{config.label}</span>
                            <span className="text-[10px] text-secondary-contrast uppercase tracking-wider opacity-80">{config.description}</span>
                        </div>
                        <p className="text-lg font-mono font-bold text-primary-contrast text-glow tracking-wide">{value}</p>
                    </LiquidContainer>
                );
            })}
        </div>
    </LiquidContainer>
);

export default NextStockCard;
