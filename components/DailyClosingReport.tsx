import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { PlusCircleIcon, TrashIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { Payment, Check, Cost, Bills, BillDenomination, DailyClosingReportState } from '../types';
import { BILL_DENOMINATIONS } from '../types';
import { GlassButton } from '@/components/ui/glass-button';

type ViewMode = 'input' | 'output';

// --- HELPER & UI COMPONENTS ---

const safeParseFloat = (val: string) => parseFloat(val) || 0;

const ReportCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`glass-card p-4 flex flex-col ${className}`}>
        <h3 className="text-lg font-bold text-lava-warm mb-4 border-b border-border-low pb-2 tracking-tight-md">{title}</h3>
        <div className="space-y-3 flex-grow">{children}</div>
    </div>
);

const SummaryCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`glass-card-outline p-4 flex flex-col justify-between ${className}`}>
        <div>
            <h3 className="text-sm font-semibold text-muted tracking-wide uppercase">{title}</h3>
            {children}
        </div>
    </div>
);


const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors disabled:bg-glass-panel/50 disabled:text-muted"
    />
);

const DynamicListCard = <T extends { id: number } & Record<string, any>>(
    {
        title,
        items,
        columns,
        total,
        onUpdate,
        onAdd,
        onRemove,
        gridTemplateCols,
        viewMode
    }: {
        title: string;
        items: T[];
        columns: { key: keyof T; placeholder: string; type: string, className?: string }[];
        total: number;
        onUpdate: (id: number, prop: keyof T, value: any) => void;
        onAdd: () => void;
        onRemove: (id: number) => void;
        gridTemplateCols?: string;
        viewMode: ViewMode;
    }
) => {
    const gridStyle = gridTemplateCols
        ? { gridTemplateColumns: `${gridTemplateCols}${viewMode === 'input' ? ' auto' : ''}` }
        : { gridTemplateColumns: `repeat(${columns.length}, 1fr)${viewMode === 'input' ? ' auto' : ''}` };

    const visibleItems = viewMode === 'output' ? items.filter(item => Object.values(item).some(val => val !== '' && val !== 0 && val !== '0.00')) : items;
    const hasVisibleItems = visibleItems.length > 0;

    return (
        <ReportCard title={title}>
            <div className="pr-2 space-y-2">
                {(!hasVisibleItems && viewMode === 'output') && <p className="text-gray-500 text-sm">No entries.</p>}
                {visibleItems.map(item => (
                    <div key={item.id} className={`grid gap-2 items-center`} style={gridStyle}>
                        {columns.map(col => {
                            if (viewMode === 'input') {
                                if (col.type === 'textarea') {
                                    return (
                                        <textarea
                                            key={String(col.key)}
                                            placeholder={col.placeholder}
                                            value={item[col.key]}
                                            onChange={e => onUpdate(item.id, col.key, e.target.value)}
                                            rows={1}
                                            className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors resize-y"
                                        />
                                    );
                                }
                                return (
                                    <Input
                                        key={String(col.key)}
                                        type={col.type}
                                        placeholder={col.placeholder}
                                        value={item[col.key]}
                                        min={col.type === 'number' ? 0 : undefined}
                                        onChange={e => onUpdate(item.id, col.key, e.target.value)}
                                    />
                                );
                            } else {
                                const value = item[col.key];
                                const displayValue = col.type === 'number' && value ? `$${safeParseFloat(value).toFixed(2)}` : value;
                                return <p key={String(col.key)} className={`p-2 truncate text-sm text-secondary ${col.className}`}>{displayValue}</p>
                            }
                        })}
                        {viewMode === 'input' && <GlassButton size="icon" onClick={() => onRemove(item.id)}><TrashIcon className="h-5 w-5" /></GlassButton>}
                    </div>
                ))}
            </div>
            {viewMode === 'input' && <GlassButton size="sm" onClick={onAdd} contentClassName="flex items-center gap-2"><PlusCircleIcon className="h-5 w-5" /> Add Row</GlassButton>}
            <div className="flex justify-between items-center font-bold text-lg mt-auto pt-2 border-t border-border-low">
                <span className="text-primary">Total</span>
                <span className="font-orbitron text-primary">${total.toFixed(2)}</span>
            </div>
        </ReportCard>
    );
};

// FIX: Add explicit types to ensure column keys match the data types.
const DYNAMIC_LIST_COLUMNS: {
    costs: { key: keyof Cost; placeholder: string; type: string; className: string }[];
    checks: { key: keyof Check; placeholder: string; type: string; className: string }[];
    smyrnaPayments: { key: keyof Payment; placeholder: string; type: string; className: string }[];
    nashvillePayments: { key: keyof Payment; placeholder: string; type: string; className: string }[];
} = {
    costs: [{ key: 'amount', placeholder: 'Amount', type: 'number', className: 'text-left' }, { key: 'description', placeholder: 'Description', type: 'textarea', className: 'text-left' }],
    checks: [{ key: 'amount', placeholder: 'Amount', type: 'number', className: 'text-left' }, { key: 'number', placeholder: 'Check #', type: 'text', className: 'text-left' }],
    smyrnaPayments: [{ key: 'amount', placeholder: 'Amount', type: 'number', className: 'text-left' }, { key: 'acc', placeholder: 'account_number', type: 'text', className: 'text-left' }],
    nashvillePayments: [{ key: 'amount', placeholder: 'Amount', type: 'number', className: 'text-left' }, { key: 'acc', placeholder: 'account_number', type: 'text', className: 'text-left' }]
};

const defaultState: DailyClosingReportState = {
    date: new Date().toISOString().split('T')[0],
    adimsTotal: '',
    lateFees: '',
    costs: [],
    nashvillePayments: [],
    smyrnaPayments: [],
    checks: [],
    bills: { '100': '', '50': '', '20': '', '10': '', '5': '', '1': '' },
};

interface DailyClosingReportProps {
    initialData?: DailyClosingReportState;
    isReadOnly?: boolean;
}

const DailyClosingReport = forwardRef<
    { getReportData: () => DailyClosingReportState; getReportContainer?: () => HTMLElement | null },
    DailyClosingReportProps
>(({ initialData, isReadOnly = false }, ref) => {

    const [inputs, setInputs] = useState<DailyClosingReportState>(initialData || defaultState);
    const [localViewMode, setLocalViewMode] = useState<ViewMode>('input');
    const reportContainerRef = React.useRef<HTMLDivElement>(null);

    const viewMode = isReadOnly ? 'output' : localViewMode;

    useImperativeHandle(ref, () => ({
        getReportData: () => inputs,
        getReportContainer: () => reportContainerRef.current,
    }));

    const calculations = useMemo(() => {
        const adimsInput = safeParseFloat(inputs.adimsTotal) + safeParseFloat(inputs.lateFees);
        const billTotals = Object.fromEntries(
            BILL_DENOMINATIONS.map(denom => [denom, safeParseFloat(inputs.bills[denom]) * parseInt(denom, 10)])
        ) as Record<BillDenomination, number>;
        const totalCashCount = Object.values(billTotals).reduce((sum, v) => sum + v, 0);
        const totalChecksListed = inputs.checks.reduce((sum, c) => sum + safeParseFloat(c.amount), 0);
        const totalDeposits = totalCashCount + totalChecksListed;
        const totalSmyrna = inputs.smyrnaPayments.reduce((sum, p) => sum + safeParseFloat(p.amount), 0);
        const totalCosts = inputs.costs.reduce((sum, c) => sum + safeParseFloat(c.amount), 0);
        const difference = adimsInput - totalSmyrna + totalCosts - totalDeposits;
        const totalNashville = inputs.nashvillePayments.reduce((sum, p) => sum + safeParseFloat(p.amount), 0);
        return { adimsInput, totalSmyrna, totalCosts, totalChecksListed, billTotals, totalCashCount, totalDeposits, difference, totalNashville };
    }, [inputs]);

    const handleInputChange = (field: keyof typeof inputs, value: any) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    const addRow = <T extends { id: number }>(field: keyof DailyClosingReportState, newItem: T) => {
        // FIX: Cast through unknown to resolve TypeScript error about type conversion.
        setInputs(prev => ({ ...prev, [field]: [...(prev[field] as unknown as T[]), newItem] }));
    };

    const removeRow = <T extends { id: number }>(field: keyof DailyClosingReportState, id: number) => {
        // FIX: Cast through unknown to resolve TypeScript error about type conversion.
        setInputs(prev => ({ ...prev, [field]: (prev[field] as unknown as T[]).filter(item => item.id !== id) }));
    };

    const updateRow = <T extends { id: number }, K extends keyof T>(field: keyof DailyClosingReportState, id: number, prop: K, value: any) => {
        setInputs(prev => ({
            ...prev,
            // FIX: Cast through unknown to resolve TypeScript error about type conversion.
            [field]: (prev[field] as unknown as T[]).map(item => item.id === id ? { ...item, [prop]: value } : item)
        }));
    };

    const getDynamicListHandlers = (field: keyof DailyClosingReportState) => {
        const columns = DYNAMIC_LIST_COLUMNS[field as keyof typeof DYNAMIC_LIST_COLUMNS] || [];
        return {
            onUpdate: (id: number, prop: any, value: any) => updateRow(field, id, prop, value),
            onAdd: () => addRow(field, { id: Date.now(), ...columns.reduce((acc, col) => ({ ...acc, [col.key as any]: '' }), {}) } as any),
            onRemove: (id: number) => removeRow(field, id)
        }
    }

    const formattedDate = new Date(inputs.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    return (
        <div ref={reportContainerRef} className="space-y-6 text-secondary">
            <div className="text-center glass-card py-4">
                <h2 className="text-4xl font-bold font-orbitron text-primary tracking-tight-lg">{formattedDate}</h2>
                {viewMode === 'input' &&
                    <input type="date" value={inputs.date} onChange={e => handleInputChange('date', e.target.value)}
                        className="pdf-hide bg-transparent text-muted border-0 text-center w-full focus:outline-none" />
                }
            </div>

            {!isReadOnly && (
                <div className="pdf-hide flex justify-end">
                    <div className="flex space-x-1 bg-glass-panel p-1 rounded-lg border border-border-low">
                        <GlassButton onClick={() => setLocalViewMode('input')} contentClassName="flex items-center gap-2">
                            <PencilIcon className="h-5 w-5" /> Input
                        </GlassButton>
                        <GlassButton onClick={() => setLocalViewMode('output')} contentClassName="flex items-center gap-2">
                            <EyeIcon className="h-5 w-5" /> Clean View
                        </GlassButton>
                    </div>
                </div>
            )}

            {/* --- SUMMARY PANEL --- */}
            <div className="sticky top-0 glass-panel backdrop-blur-glass z-10 p-4 rounded-lg border border-border-low">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1">
                        <SummaryCard title="Total Deposits">
                            <p className="text-4xl font-bold font-orbitron text-right text-primary tracking-tight-lg">${calculations.totalDeposits.toFixed(2)}</p>
                            <div className="text-right text-sm mt-2 text-muted">
                                <p>Cash: ${calculations.totalCashCount.toFixed(2)}</p>
                                <p>Checks: ${calculations.totalChecksListed.toFixed(2)}</p>
                            </div>
                        </SummaryCard>
                    </div>

                    <div className="lg:col-span-1 lg:col-start-4">
                        <SummaryCard title="Final Difference">
                            <div>
                                <p className={`text-4xl font-bold font-orbitron text-right tracking-tight-lg ${calculations.difference.toFixed(2) === '0.00' || calculations.difference.toFixed(2) === '-0.00' ? 'text-green-400' : 'text-lava-core'}`}>
                                    ${calculations.difference.toFixed(2)}
                                </p>
                            </div>
                            <hr className="border-border-low my-4" />
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-muted">ADIMS Input</h3>
                                    <p className="font-bold font-orbitron text-lg text-primary">${calculations.adimsInput.toFixed(2)}</p>
                                </div>
                                <div className="mt-2 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label className="text-xs text-white">Total ADIMS</label>
                                        <Input type="number" placeholder="0.00" value={inputs.adimsTotal} onChange={e => handleInputChange('adimsTotal', e.target.value)} className="text-right" disabled={isReadOnly} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label className="text-xs text-white">Late Fees</label>
                                        <Input type="number" placeholder="0.00" value={inputs.lateFees} onChange={e => handleInputChange('lateFees', e.target.value)} className="text-right" disabled={isReadOnly} />
                                    </div>
                                </div>
                            </div>
                        </SummaryCard>
                    </div>
                </div>
            </div>

            {/* --- DATA ENTRY SECTIONS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Column 1: Left */}
                <div className="space-y-6 lg:col-span-1">
                    <DynamicListCard title="Nashville Payments" items={inputs.nashvillePayments} total={calculations.totalNashville} columns={DYNAMIC_LIST_COLUMNS.nashvillePayments} {...getDynamicListHandlers('nashvillePayments')} viewMode={viewMode} />
                    <DynamicListCard title="Checks" items={inputs.checks} total={calculations.totalChecksListed} columns={DYNAMIC_LIST_COLUMNS.checks} {...getDynamicListHandlers('checks')} viewMode={viewMode} />
                </div>
                {/* Column 2: Middle */}
                <div className="space-y-6 lg:col-span-2">
                    <DynamicListCard title="Costs" items={inputs.costs} total={calculations.totalCosts} columns={DYNAMIC_LIST_COLUMNS.costs} {...getDynamicListHandlers('costs')} gridTemplateCols="1fr 7fr" viewMode={viewMode} />
                </div>
                {/* Column 3: Right */}
                <div className="space-y-6 lg:col-span-1">
                    <DynamicListCard title="Smyrna Payments" items={inputs.smyrnaPayments} total={calculations.totalSmyrna} columns={DYNAMIC_LIST_COLUMNS.smyrnaPayments} {...getDynamicListHandlers('smyrnaPayments')} viewMode={viewMode} />
                    <ReportCard title="Cash Breakdown">
                        {BILL_DENOMINATIONS.map((denom) => (
                            <div key={denom} className="grid grid-cols-3 items-center gap-2">
                                <span className="text-sm font-semibold text-secondary">${denom}</span>
                                {viewMode === 'input' ?
                                    <Input type="number" placeholder="0" min="0" value={inputs.bills[denom]} onChange={e => handleInputChange('bills', { ...inputs.bills, [denom]: e.target.value })} className="text-center" /> :
                                    <p className="text-center font-mono text-secondary">{inputs.bills[denom] || '0'}</p>
                                }
                                <p className="text-right font-mono pr-2 text-secondary">${calculations.billTotals[denom].toFixed(2)}</p>
                            </div>
                        ))}
                        <div className="flex justify-between items-center font-bold text-lg mt-auto pt-2 border-t border-border-low">
                            <span className="text-primary">Total Cash</span>
                            <span className="font-orbitron text-primary">${calculations.totalCashCount.toFixed(2)}</span>
                        </div>
                    </ReportCard>
                </div>
            </div>
        </div>
    );
});

export default DailyClosingReport;
