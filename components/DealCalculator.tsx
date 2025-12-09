import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { GlassButton } from './ui/glass-button';
import AppSelect from './AppSelect';

type SaleType = 'Retail' | 'Wholesale';
type PaymentFrequency = 'Weekly' | 'Bi-Weekly' | 'Semi-Monthly' | 'Monthly';
type CalculationMode = 'byTerm' | 'byPayment';

interface DealCalculatorProps {
    isOpen: boolean;
    onToggle: () => void;
}

const DealCalculator: React.FC<DealCalculatorProps> = ({ isOpen, onToggle }) => {
    // Header Section
    const [saleType, setSaleType] = useState<SaleType>('Retail');

    // Line Items
    const [salesPrice, setSalesPrice] = useState<number>(0);
    const [docNotaryFee, setDocNotaryFee] = useState<number>(299.00);
    const [titleLicenseFee, setTitleLicenseFee] = useState<number>(139.50);
    const [downPayment, setDownPayment] = useState<number>(0);

    // Financing Section
    const [apr, setApr] = useState<number>(19.99);
    const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('Monthly');
    const [calculationMode, setCalculationMode] = useState<CalculationMode>('byTerm');
    const [termMonths, setTermMonths] = useState<number>(60);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);

    // Calculated values
    const stateSalesTax = useMemo(() => {
        if (saleType === 'Wholesale') return 0;
        const tax = salesPrice * 0.07346; // 7.346%
        return Math.floor(tax * 100) / 100; // Truncate to 2 decimals
    }, [salesPrice, saleType]);

    const localSalesTax = useMemo(() => {
        if (saleType === 'Wholesale') return 0;
        return 44.00; // Placeholder as specified
    }, [saleType]);

    const businessTax = useMemo(() => {
        if (saleType === 'Wholesale') return 0;
        const tax = salesPrice * 0.003045; // 0.3045%
        return Math.floor(tax * 100) / 100; // Truncate to 2 decimals
    }, [salesPrice, saleType]);

    const totalPrice = useMemo(() => {
        return salesPrice +
            docNotaryFee +
            titleLicenseFee +
            stateSalesTax +
            localSalesTax +
            businessTax;
    }, [salesPrice, docNotaryFee, titleLicenseFee, stateSalesTax, localSalesTax, businessTax]);

    const amountFinanced = useMemo(() => {
        return totalPrice - downPayment;
    }, [totalPrice, downPayment]);

    // Get days per period based on frequency
    const getDaysPerPeriod = (frequency: PaymentFrequency): number => {
        switch (frequency) {
            case 'Weekly':
                return 7;
            case 'Bi-Weekly':
                return 14;
            case 'Semi-Monthly':
                return 365 / 24; // ~15.208 days
            case 'Monthly':
                return 365 / 12; // ~30.416 days
            default:
                return 30.416;
        }
    };

    // Calculate Finance Charge (total interest over loan term)
    const financeCharge = useMemo(() => {
        if (amountFinanced <= 0 || apr <= 0 || paymentAmount <= 0 || termMonths <= 0) return 0;

        const dailyRate = apr / 100 / 365;
        const daysPerPeriod = getDaysPerPeriod(paymentFrequency);
        const periodsPerYear = paymentFrequency === 'Weekly' ? 52 : paymentFrequency === 'Bi-Weekly' ? 26 : paymentFrequency === 'Semi-Monthly' ? 24 : 12;
        const totalPeriods = Math.ceil((termMonths / 12) * periodsPerYear);

        let balance = amountFinanced;
        let totalInterest = 0;
        let periods = 0;

        while (balance > 0.01 && periods < totalPeriods) {
            const interest = balance * dailyRate * daysPerPeriod;
            const interestRounded = Math.floor(interest * 100) / 100;
            totalInterest += interestRounded;
            const principalPaid = paymentAmount - interestRounded;
            balance = Math.floor((balance - principalPaid) * 100) / 100;
            periods++;
        }

        return Math.floor(totalInterest * 100) / 100;
    }, [amountFinanced, apr, paymentAmount, termMonths, paymentFrequency]);

    const balanceDue = useMemo(() => {
        return amountFinanced + financeCharge;
    }, [amountFinanced, financeCharge]);

    // Calculate payment amount from term (months)
    const calculatePaymentFromTerm = (principal: number, apr: number, months: number, frequency: PaymentFrequency): number => {
        if (principal <= 0 || apr <= 0 || months <= 0) return 0;

        const dailyRate = apr / 100 / 365;
        const daysPerPeriod = getDaysPerPeriod(frequency);
        const periodsPerYear = frequency === 'Weekly' ? 52 : frequency === 'Bi-Weekly' ? 26 : frequency === 'Semi-Monthly' ? 24 : 12;
        const totalPeriods = Math.ceil((months / 12) * periodsPerYear);

        // Binary search to find the payment amount
        let low = 0;
        let high = principal * 2; // Upper bound
        let bestPayment = 0;
        const tolerance = 0.01; // 1 cent tolerance
        const maxIterations = 100;

        for (let iter = 0; iter < maxIterations && (high - low) > tolerance; iter++) {
            const testPayment = (low + high) / 2;
            let balance = principal;
            let periods = 0;
            let paymentWorks = false;

            // Simulate payments
            while (balance > 0.01 && periods < totalPeriods) {
                const interest = balance * dailyRate * daysPerPeriod;
                const interestRounded = Math.floor(interest * 100) / 100;
                const principalPaid = testPayment - interestRounded;

                if (principalPaid <= 0) {
                    // Payment too low, can't cover interest
                    paymentWorks = false;
                    break;
                }

                balance = Math.floor((balance - principalPaid) * 100) / 100; // Truncate balance
                periods++;

                if (balance <= 0.01) {
                    // Found a payment that works
                    paymentWorks = true;
                    bestPayment = testPayment;
                    break;
                }
            }

            if (paymentWorks && balance <= 0.01) {
                // Payment works, try lower
                high = testPayment;
            } else {
                // Payment doesn't work, need higher
                low = testPayment;
            }
        }

        return Math.floor(bestPayment * 100) / 100;
    };

    // Calculate term (months) from payment amount
    const calculateTermFromPayment = (principal: number, apr: number, payment: number, frequency: PaymentFrequency): number => {
        if (principal <= 0 || apr <= 0 || payment <= 0) return 0;

        const dailyRate = apr / 100 / 365;
        const daysPerPeriod = getDaysPerPeriod(frequency);
        let balance = principal;
        let periods = 0;
        const maxPeriods = 1000; // Safety limit

        while (balance > 0.01 && periods < maxPeriods) {
            const interest = balance * dailyRate * daysPerPeriod;
            const interestRounded = Math.floor(interest * 100) / 100;
            const principalPaid = payment - interestRounded;

            if (principalPaid <= 0) {
                // Payment too low to cover interest
                return 0; // Error case
            }

            balance = Math.floor((balance - principalPaid) * 100) / 100; // Truncate balance
            periods++;
        }

        if (balance > 0.01) {
            return 0; // Couldn't pay off
        }

        // Convert periods to months
        const periodsPerYear = frequency === 'Weekly' ? 52 : frequency === 'Bi-Weekly' ? 26 : frequency === 'Semi-Monthly' ? 24 : 12;
        const months = (periods / periodsPerYear) * 12;
        return Math.ceil(months); // Round up to nearest month
    };

    // Calculate when values change
    useEffect(() => {
        if (calculationMode === 'byTerm' && amountFinanced > 0 && termMonths > 0) {
            const calculatedPayment = calculatePaymentFromTerm(amountFinanced, apr, termMonths, paymentFrequency);
            setPaymentAmount(calculatedPayment);
        }
    }, [amountFinanced, apr, termMonths, paymentFrequency, calculationMode]);

    useEffect(() => {
        if (calculationMode === 'byPayment' && amountFinanced > 0 && paymentAmount > 0) {
            const calculatedMonths = calculateTermFromPayment(amountFinanced, apr, paymentAmount, paymentFrequency);
            if (calculatedMonths > 0) {
                setTermMonths(calculatedMonths);
            }
        }
    }, [amountFinanced, apr, paymentAmount, paymentFrequency, calculationMode]);

    // State for formatted display values (for currency inputs)
    const [salesPriceDisplay, setSalesPriceDisplay] = useState<string>('');
    const [docNotaryFeeDisplay, setDocNotaryFeeDisplay] = useState<string>('$299.00');
    const [titleLicenseFeeDisplay, setTitleLicenseFeeDisplay] = useState<string>('$139.50');
    const [downPaymentDisplay, setDownPaymentDisplay] = useState<string>('');
    const [paymentAmountDisplay, setPaymentAmountDisplay] = useState<string>('');

    // Update display values when calculated values change (for read-only fields)
    useEffect(() => {
        if (calculationMode === 'byTerm' && paymentAmount > 0) {
            setPaymentAmountDisplay(formatCurrencyInput(paymentAmount));
        }
    }, [paymentAmount, calculationMode]);

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    // Parse currency string to number (removes $, commas, etc.)
    const parseCurrency = (value: string): number => {
        const cleaned = value.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Format number as currency string (for display in inputs)
    const formatCurrencyInput = (value: number): string => {
        if (value === 0) return '';
        return formatCurrency(value);
    };

    return (
        <>
            {/* Fixed Tab Button - Top right, below header (header is h-16 + mt-4 + mb-2 = ~88px from top) */}
            <button
                onClick={onToggle}
                className={`fixed right-4 top-24 z-50 transition-all duration-300 ${
                    isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
                aria-label="Toggle Deal Calculator"
            >
                <div className="glass-card-outline p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <CalculatorIcon className="h-5 w-5 text-cyan-400" />
                </div>
            </button>

            {/* Drawer */}
            <div
                className={`fixed right-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{ width: '420px' }}
            >
                <div className="h-full glass-card-outline flex flex-col bg-slate-900/95 backdrop-blur-lg border-l border-cyan-500/30">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white">Deal Calculator</h2>
                        <button
                            onClick={onToggle}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Close Calculator"
                        >
                            <XMarkIcon className="h-5 w-5 text-white" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 space-y-3">
                        {/* Sale Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Sale Type</label>
                            <AppSelect
                                value={saleType}
                                onChange={(value) => setSaleType(value as SaleType)}
                                options={[
                                    { value: 'Retail', label: 'Retail' },
                                    { value: 'Wholesale', label: 'Wholesale' },
                                ]}
                            />
                        </div>

                        {/* First Section - Horizontal Layout */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-300 w-32 flex-shrink-0">Sales Price</label>
                                <input
                                    type="text"
                                    value={salesPriceDisplay}
                                    onChange={(e) => {
                                        setSalesPriceDisplay(e.target.value);
                                        setSalesPrice(parseCurrency(e.target.value));
                                    }}
                                    onBlur={() => {
                                        setSalesPriceDisplay(formatCurrencyInput(salesPrice));
                                    }}
                                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-300 w-32 flex-shrink-0">Doc/Notary Fee</label>
                                <input
                                    type="text"
                                    value={docNotaryFeeDisplay}
                                    onChange={(e) => {
                                        setDocNotaryFeeDisplay(e.target.value);
                                        setDocNotaryFee(parseCurrency(e.target.value));
                                    }}
                                    onBlur={() => {
                                        setDocNotaryFeeDisplay(formatCurrencyInput(docNotaryFee));
                                    }}
                                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-300 w-32 flex-shrink-0">Title/License Fee</label>
                                <input
                                    type="text"
                                    value={titleLicenseFeeDisplay}
                                    onChange={(e) => {
                                        setTitleLicenseFeeDisplay(e.target.value);
                                        setTitleLicenseFee(parseCurrency(e.target.value));
                                    }}
                                    onBlur={() => {
                                        setTitleLicenseFeeDisplay(formatCurrencyInput(titleLicenseFee));
                                    }}
                                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-300 w-32 flex-shrink-0">State Sales Tax</label>
                                <div className="flex-1 bg-slate-800/30 border border-slate-600 rounded-lg px-3 py-2 text-slate-400">
                                    {formatCurrency(stateSalesTax)}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-300 w-32 flex-shrink-0">Local Sales Tax</label>
                                <div className="flex-1 bg-slate-800/30 border border-slate-600 rounded-lg px-3 py-2 text-slate-400">
                                    {formatCurrency(localSalesTax)}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-300 w-32 flex-shrink-0">Business Tax</label>
                                <div className="flex-1 bg-slate-800/30 border border-slate-600 rounded-lg px-3 py-2 text-slate-400">
                                    {formatCurrency(businessTax)}
                                </div>
                            </div>
                        </div>

                        {/* Total Price Section */}
                        <div className="border-t border-slate-700 pt-2">
                            <label className="block text-sm font-bold text-cyan-400 mb-1">TOTAL PRICE</label>
                            <div className="w-full bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-2 text-cyan-300 font-bold">
                                {formatCurrency(totalPrice)}
                            </div>
                        </div>

                        {/* Down Payment Section */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Down Payment</label>
                            <input
                                type="text"
                                value={downPaymentDisplay}
                                onChange={(e) => {
                                    setDownPaymentDisplay(e.target.value);
                                    setDownPayment(parseCurrency(e.target.value));
                                }}
                                onBlur={() => {
                                    setDownPaymentDisplay(formatCurrencyInput(downPayment));
                                }}
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Financing Section */}
                        <div className="border-t border-slate-700 pt-3 space-y-3">
                            <h3 className="text-lg font-semibold text-white mb-2">Financing</h3>

                            {/* APR and Payment Frequency side by side */}
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">APR %</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={apr || ''}
                                        onChange={(e) => setApr(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Payment Frequency</label>
                                    <AppSelect
                                        value={paymentFrequency}
                                        onChange={(value) => setPaymentFrequency(value as PaymentFrequency)}
                                        options={[
                                            { value: 'Weekly', label: 'Weekly' },
                                            { value: 'Bi-Weekly', label: 'Bi-Weekly' },
                                            { value: 'Semi-Monthly', label: 'Semi-Monthly' },
                                            { value: 'Monthly', label: 'Monthly' },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Calculation Mode</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="calcMode"
                                            value="byTerm"
                                            checked={calculationMode === 'byTerm'}
                                            onChange={(e) => setCalculationMode(e.target.value as CalculationMode)}
                                            className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                                        />
                                        <span className="text-sm text-slate-300">Calculate by Term</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="calcMode"
                                            value="byPayment"
                                            checked={calculationMode === 'byPayment'}
                                            onChange={(e) => setCalculationMode(e.target.value as CalculationMode)}
                                            className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                                        />
                                        <span className="text-sm text-slate-300">Calculate by Payment</span>
                                    </label>
                                </div>
                            </div>

                            {/* Term Months and Payment Amount side by side */}
                            <div className="flex gap-3">
                                {calculationMode === 'byTerm' ? (
                                    <>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Term (Months)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={termMonths || ''}
                                                onChange={(e) => setTermMonths(parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Payment Amount</label>
                                            <div className="w-full bg-slate-800/30 border border-slate-600 rounded-lg px-3 py-2 text-slate-400">
                                                {formatCurrency(paymentAmount)}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Term (Months)</label>
                                            <div className="w-full bg-slate-800/30 border border-slate-600 rounded-lg px-3 py-2 text-slate-400">
                                                {termMonths} months
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Payment Amount</label>
                                            <input
                                                type="text"
                                                value={paymentAmountDisplay}
                                                onChange={(e) => {
                                                    setPaymentAmountDisplay(e.target.value);
                                                    setPaymentAmount(parseCurrency(e.target.value));
                                                }}
                                                onBlur={() => {
                                                    setPaymentAmountDisplay(formatCurrencyInput(paymentAmount));
                                                }}
                                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Amount Financed Section */}
                        <div className="border-t border-slate-700 pt-3 space-y-2">
                            <div>
                                <label className="block text-sm font-bold text-cyan-400 mb-1">AMOUNT FINANCED</label>
                                <div className="w-full bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-2 text-cyan-300 font-bold">
                                    {formatCurrency(amountFinanced)}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Finance Charge</label>
                                <div className="w-full bg-slate-800/30 border border-slate-600 rounded-lg px-3 py-2 text-slate-400">
                                    {formatCurrency(financeCharge)}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-cyan-400 mb-1">BALANCE DUE</label>
                                <div className="w-full bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-2 text-cyan-300 font-bold">
                                    {formatCurrency(balanceDue)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}
        </>
    );
};

export default DealCalculator;

