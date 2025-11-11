import React, { useState, useEffect, useMemo } from 'react';
import type { Vehicle, UserAccount } from '../types';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { USERS } from '../constants';
import AppSelect from './AppSelect';
import { GlassButton } from '@/components/ui/glass-button';

interface MarkSoldModalProps {
    vehicle: Vehicle;
    onClose: () => void;
    onConfirm: (details: {
        primarySalesperson: string;
        salespersonSplit: Array<{ name: string; share: number }>;
        downPayment: number;
        saleType: 'Sale' | 'Trade-in' | 'Name Change' | 'Cash Sale';
        stockNumber: string;
        accountNumber: string;
    }) => void;
    defaultStockNumber?: string;
    defaultAccountNumber?: string;
    salespeople: UserAccount[];
    title?: string;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    showStockNumberInput?: boolean;
    showAccountNumberInput?: boolean;
    requireStockNumber?: boolean;
    requireAccountNumber?: boolean;
    initialValues?: {
        stockNumber?: string;
        accountNumber?: string;
        saleType?: 'Sale' | 'Trade-in' | 'Name Change' | 'Cash Sale';
        downPayment?: number;
        salespersonSplit?: Array<{ name: string; share: number }>;
    };
}

const MarkSoldModal: React.FC<MarkSoldModalProps> = ({
    vehicle,
    onClose,
    onConfirm,
    defaultStockNumber,
    defaultAccountNumber,
    salespeople,
    title = 'Mark as Sold',
    confirmLabel = 'Confirm Sale',
    confirmDisabled = false,
    showStockNumberInput = true,
    showAccountNumberInput = true,
    requireStockNumber = true,
    requireAccountNumber = true,
    initialValues,
}) => {
    const resolvedSalespeople = useMemo(() => {
        if (salespeople && salespeople.length > 0) {
            return salespeople;
        }
        return USERS.map(user => ({
            id: user.id,
            name: user.name,
            username: user.name.toLowerCase().replace(/\s+/g, ''),
            password: '',
            phone: '',
        }));
    }, [salespeople]);

    const defaultSelection = useMemo(() => {
        if (initialValues?.salespersonSplit && initialValues.salespersonSplit.length > 0) {
            return initialValues.salespersonSplit
                .map(item => item.name)
                .filter(Boolean)
                .slice(0, 2);
        }
        if (resolvedSalespeople[0]?.name) {
            return [resolvedSalespeople[0].name];
        }
        return [];
    }, [initialValues?.salespersonSplit, resolvedSalespeople]);

    const [selectedSalespeople, setSelectedSalespeople] = useState<string[]>(defaultSelection);
    const [splitPercentage, setSplitPercentage] = useState<number>(
        initialValues?.salespersonSplit && initialValues.salespersonSplit.length > 1
            ? initialValues.salespersonSplit[0].share ?? 50
            : 50
    );
    const [downPayment, setDownPayment] = useState<string>(
        String(initialValues?.downPayment ?? vehicle.downPayment ?? '')
    );
    const [saleType, setSaleType] = useState<'Sale' | 'Trade-in' | 'Name Change' | 'Cash Sale'>(
        initialValues?.saleType ?? 'Sale'
    );
    const [stockNumber, setStockNumber] = useState(
        initialValues?.stockNumber ?? defaultStockNumber ?? ''
    );
    const [accountNumber, setAccountNumber] = useState(
        initialValues?.accountNumber ?? defaultAccountNumber ?? ''
    );

    useEffect(() => {
        setSelectedSalespeople(defaultSelection);
    }, [defaultSelection]);

    useEffect(() => {
        setStockNumber(initialValues?.stockNumber ?? defaultStockNumber ?? '');
        setAccountNumber(initialValues?.accountNumber ?? defaultAccountNumber ?? '');
        setDownPayment(String(initialValues?.downPayment ?? vehicle.downPayment ?? ''));
        setSaleType(initialValues?.saleType ?? 'Sale');
        if (initialValues?.salespersonSplit && initialValues.salespersonSplit.length > 1) {
            setSplitPercentage(initialValues.salespersonSplit[0].share ?? 50);
        } else if (defaultSelection.length <= 1) {
            setSplitPercentage(100);
        }
    }, [defaultStockNumber, defaultAccountNumber, vehicle.vin, initialValues, defaultSelection]);

    useEffect(() => {
        if (selectedSalespeople.length <= 1) {
            setSplitPercentage(100);
        }
    }, [selectedSalespeople.length]);

    const toggleSalesperson = (name: string) => {
        setSelectedSalespeople(prev => {
            if (prev.includes(name)) {
                return prev.filter(s => s !== name);
            }
            if (prev.length >= 2) {
                alert('Commission splits currently support a maximum of two salespeople.');
                return prev;
            }
            return [...prev, name];
        });
    };

    const salespersonSplit = useMemo(() => {
        if (selectedSalespeople.length === 0) return [];
        if (selectedSalespeople.length === 1) {
            return [{ name: selectedSalespeople[0], share: 100 }];
        }
        const [first, second] = selectedSalespeople;
        const firstShare = Math.min(100, Math.max(0, splitPercentage));
        const secondShare = Math.max(0, 100 - firstShare);
        return [
            { name: first, share: Number(firstShare.toFixed(2)) },
            { name: second, share: Number(secondShare.toFixed(2)) },
        ];
    }, [selectedSalespeople, splitPercentage]);

    const handleConfirm = () => {
        const downPaymentNumber = parseFloat(downPayment);
        if (!salespersonSplit.length || isNaN(downPaymentNumber)) {
            alert('Please fill out all fields correctly.');
            return;
        }

        const resolvedStockNumber =
            stockNumber.trim() ||
            initialValues?.stockNumber?.trim() ||
            defaultStockNumber?.trim() ||
            '';

        const resolvedAccountNumber =
            accountNumber.trim() ||
            initialValues?.accountNumber?.trim() ||
            defaultAccountNumber?.trim() ||
            '';

        if (requireStockNumber && !resolvedStockNumber) {
            alert('Please provide a stock number.');
            return;
        }

        if (requireAccountNumber && !resolvedAccountNumber) {
            alert('Please fill out all fields correctly.');
            return;
        }
        onConfirm({
            primarySalesperson: salespersonSplit[0].name,
            salespersonSplit,
            downPayment: downPaymentNumber,
            saleType,
            stockNumber: resolvedStockNumber,
            accountNumber: resolvedAccountNumber,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-[#14171b] border border-border-low rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-5 border-b border-border-low">
                     <h3 className="text-2xl font-bold text-primary font-orbitron tracking-tight-lg">{title}</h3>
                     <GlassButton size="icon" onClick={onClose}><XMarkIcon className="h-6 w-6" /></GlassButton>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto text-primary">
                    <p className="text-gray-300">Confirming sale for: <span className="font-bold text-white">{vehicle.year} {vehicle.make} {vehicle.model}</span></p>

                    {showStockNumberInput ? (
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">Stock Number</label>
                            <input 
                                type="text"
                                value={stockNumber}
                                onChange={(e) => setStockNumber(e.target.value)}
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">Stock Number</label>
                            <div className="w-full bg-glass-panel border border-border-low text-secondary rounded-md p-2">
                                {stockNumber || '—'}
                            </div>
                        </div>
                    )}

                    {showAccountNumberInput ? (
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">Account Number</label>
                            <input 
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">Account Number</label>
                            <div className="w-full bg-glass-panel border border-border-low text-secondary rounded-md p-2">
                                {accountNumber || '—'}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-muted mb-2 uppercase tracking-wide">Salespeople</label>
                        <div className="space-y-2">
                            {resolvedSalespeople.map(user => (
                                <label key={user.id} className="flex items-center gap-2 text-sm text-secondary">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox text-lava-core"
                                        checked={selectedSalespeople.includes(user.name)}
                                        onChange={() => toggleSalesperson(user.name)}
                                    />
                                    {user.name}
                                </label>
                            ))}
                        </div>
                        {selectedSalespeople.length > 1 && (
                            <div className="mt-4 bg-glass-panel border border-border-low rounded-md p-3">
                                <div className="flex justify-between text-xs uppercase tracking-wide text-muted mb-2">
                                    <span>{selectedSalespeople[0]}</span>
                                    <span>{selectedSalespeople[1]}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={splitPercentage}
                                    onChange={event => setSplitPercentage(Number(event.target.value))}
                                    className="w-full accent-lava-core"
                                />
                                <div className="flex justify-between text-sm text-secondary mt-2">
                                    <span>{splitPercentage.toFixed(0)}%</span>
                                    <span>{(100 - splitPercentage).toFixed(0)}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">Sale Type</label>
                        <AppSelect
                            value={saleType}
                            onChange={next => setSaleType(next as typeof saleType)}
                            options={[
                                { value: 'Sale', label: 'Sale' },
                                { value: 'Trade-in', label: 'Trade-in' },
                                { value: 'Name Change', label: 'Name Change' },
                                { value: 'Cash Sale', label: 'Cash Sale' },
                            ]}
                        />
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">Actual Down Payment</label>
                        <input 
                            type="number"
                            value={downPayment}
                            onChange={(e) => setDownPayment(e.target.value)}
                            className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                        />
                    </div>

                </div>
                <div className="p-5 flex justify-end space-x-4 border-t border-border-low bg-[#111318] rounded-b-2xl">
                    <GlassButton onClick={onClose}>Cancel</GlassButton>
                    <GlassButton
                        onClick={handleConfirm}
                        disabled={confirmDisabled || salespersonSplit.length === 0}
                    >
                        {confirmLabel}
                    </GlassButton>
                </div>
            </div>
        </div>
    );
};

export default MarkSoldModal;
