import React, {
    useState,
    useMemo,
    useEffect,
    forwardRef,
    useImperativeHandle,
} from 'react';
import type {
    Sale,
    CommissionReportSnapshot,
    CommissionReportRowSnapshot,
    CommissionSalespersonSnapshot,
} from '../types';
import { parseDateStringToUtc, formatDateKey } from '../utils/date';
import {
    calculateBaseCommission,
    applyCommissionOverride,
    formatCommissionWeekLabel,
    buildWeekKey,
    getCommissionWeekRange,
    getCommissionWeekStart,
} from '../utils/commission';
import AppSelect from './AppSelect';
import { GlassButton } from '@/components/ui/glass-button';
import { PencilSquareIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const BONUS_THRESHOLD = 5;
const BONUS_PER_SALE = 50;
const COLLECTIONS_STORAGE_PREFIX = 'commission-collections-bonus';
const MANUAL_OVERRIDE_STORAGE_PREFIX = 'commission-manual-overrides';

const buildCollectionsStorageKey = (weekKey: string) =>
    `${COLLECTIONS_STORAGE_PREFIX}:${weekKey}`;

const loadCollectionsState = (weekKey: string) => {
    if (typeof window === 'undefined') {
        return { value: undefined as number | undefined, locked: false };
    }
    try {
        const raw = window.localStorage.getItem(buildCollectionsStorageKey(weekKey));
        if (!raw) {
            return { value: undefined, locked: false };
        }
        const parsed = JSON.parse(raw);
        return {
            value: typeof parsed.value === 'number' ? parsed.value : undefined,
            locked: Boolean(parsed.locked),
        };
    } catch (error) {
        console.warn('[CommissionReport] Failed to parse collections storage', error);
        return { value: undefined, locked: false };
    }
};

const persistCollectionsState = (weekKey: string, value: number, locked: boolean) => {
    if (typeof window === 'undefined') return;
    try {
        const payload = JSON.stringify({
            value,
            locked,
            savedAt: new Date().toISOString(),
        });
        window.localStorage.setItem(buildCollectionsStorageKey(weekKey), payload);
    } catch (error) {
        console.warn('[CommissionReport] Failed to persist collections storage', error);
    }
};

const clearCollectionsState = (weekKey: string) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(buildCollectionsStorageKey(weekKey));
    } catch (error) {
        console.warn('[CommissionReport] Failed to clear collections storage', error);
    }
};

const buildManualOverrideStorageKey = (weekKey: string) =>
    `${MANUAL_OVERRIDE_STORAGE_PREFIX}:${weekKey}`;

const sanitizeManualOverrideMap = (overrides: Record<string, string>) => {
    const sanitized: Record<string, string> = {};
    Object.entries(overrides).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const cleaned = value.replace(/[^0-9.]/g, '');
        if (cleaned) {
            sanitized[key] = cleaned;
        }
    });
    return sanitized;
};

const loadManualOverrideState = (weekKey: string): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(buildManualOverrideStorageKey(weekKey));
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        return sanitizeManualOverrideMap(parsed as Record<string, string>);
    } catch (error) {
        console.warn('[CommissionReport] Failed to load manual commission overrides', error);
        return {};
    }
};

const persistManualOverrideState = (weekKey: string, overrides: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    try {
        const sanitized = sanitizeManualOverrideMap(overrides);
        const storageKey = buildManualOverrideStorageKey(weekKey);
        if (Object.keys(sanitized).length === 0) {
            window.localStorage.removeItem(storageKey);
            return;
        }
        window.localStorage.setItem(storageKey, JSON.stringify(sanitized));
    } catch (error) {
        console.warn('[CommissionReport] Failed to persist manual commission overrides', error);
    }
};

const normalizeName = (value: string | undefined | null) =>
    value?.trim() && value.trim().length > 0 ? value.trim() : 'Unassigned';

const normalizeSaleType = (value: string | undefined | null) =>
    value?.toLowerCase().replace(/\s+/g, '') ?? '';

type SaleTypeCategory = 'sale' | 'cash' | 'trade' | 'namechange' | 'other';

const SALE_TYPE_BADGES: Record<SaleTypeCategory, { label: string; className: string }> = {
    sale: {
        label: 'Sale',
        className: 'border border-emerald-400/60 text-emerald-200 bg-emerald-500/15',
    },
    cash: {
        label: 'Cash Sale',
        className: 'border border-purple-400/60 text-purple-100 bg-purple-500/20',
    },
    trade: {
        label: 'Trade-In',
        className: 'border border-amber-400/70 text-amber-100 bg-amber-400/25',
    },
    namechange: {
        label: 'Name Change',
        className: 'border border-cyan-400/70 text-cyan-100 bg-cyan-400/20',
    },
    other: {
        label: 'Other',
        className: 'border border-slate-500/70 text-slate-200 bg-slate-600/20',
    },
};

const getSaleTypeCategory = (value: string | undefined | null): SaleTypeCategory => {
    const normalized = normalizeSaleType(value);
    if (normalized === 'cashsale' || normalized === 'cash') return 'cash';
    if (normalized === 'trade' || normalized === 'tradein' || normalized === 'trade-in') return 'trade';
    if (normalized === 'namechange' || normalized === 'name-change') return 'namechange';
    if (normalized === 'sale' || normalized === '') return 'sale';
    return 'other';
};

const MANUAL_COMMISSION_TYPES = new Set<SaleTypeCategory>(['cash', 'trade', 'namechange']);

const getBonusRangeForCommission = (commissionStart: Date) => {
    const monday = new Date(commissionStart);
    monday.setDate(monday.getDate() - 4); // Friday → previous Monday
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
};

interface WeeklyBonusStats {
    deals: Set<string>;
    count: number;
    over: number;
    bonus: number;
}

const computeWeeklyBonusBreakdown = (sales: Sale[], bonusStart: Date, bonusEnd: Date) => {
    const perSalesperson = new Map<string, WeeklyBonusStats>();
    const globalDeals = new Set<string>();
    const bonusStartTime = bonusStart.getTime();
    const bonusEndTime = bonusEnd.getTime();

    sales.forEach(sale => {
        const saleDate = parseDateStringToUtc(sale.saleDate);
        if (!saleDate) return;
        const time = saleDate.getTime();
        if (time < bonusStartTime || time > bonusEndTime) return;

        const saleType = normalizeSaleType(sale.saleType);
        if (saleType === 'namechange' || saleType === 'name-change') {
            return;
        }
        if (
            saleType &&
            !(
                saleType === 'sale' ||
                saleType === 'trade' ||
                saleType === 'trade-in' ||
                saleType === 'tradein' ||
                saleType === 'cashsale' ||
                saleType === 'cash'
            )
        ) {
            return;
        }

        const dealId =
            sale.saleId ||
            sale.accountNumber ||
            sale.stockNumber ||
            sale.vin ||
            `${time}-${sale.saleId ?? ''}`;
        globalDeals.add(dealId);

        const participants = (sale.salespersonSplit && sale.salespersonSplit.length > 0)
            ? sale.salespersonSplit.map(split => normalizeName(split.name))
            : [normalizeName(sale.salesperson)];

        const uniqueParticipants = new Set(participants);

        uniqueParticipants.forEach(name => {
            if (!perSalesperson.has(name)) {
                perSalesperson.set(name, { deals: new Set<string>(), count: 0, over: 0, bonus: 0 });
            }
            const entry = perSalesperson.get(name)!;
            entry.deals.add(dealId);
        });
    });

    perSalesperson.forEach(entry => {
        entry.count = entry.deals.size;
        entry.over = Math.max(entry.count - BONUS_THRESHOLD, 0);
        entry.bonus = entry.over * BONUS_PER_SALE;
    });

    const globalStats: WeeklyBonusStats = {
        deals: globalDeals,
        count: globalDeals.size,
        over: Math.max(globalDeals.size - BONUS_THRESHOLD, 0),
        bonus: Math.max(globalDeals.size - BONUS_THRESHOLD, 0) * BONUS_PER_SALE,
    };

    return { perSalesperson, global: globalStats };
};

const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const sanitizeCurrencyString = (value: string) => value.replace(/[^0-9.-]/g, '');

const formatDownPayment = (value: number) =>
    `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const getSaleKey = (sale: Sale) => {
    return [
        sale.saleDate ?? '',
        sale.accountNumber ?? '',
        sale.saleId ?? '',
        sale.vin ?? '',
        sale.vinLast4 ?? '',
    ]
        .filter(Boolean)
        .join('|');
};

interface CommissionSalespersonBlockProps {
    snapshot: CommissionSalespersonSnapshot;
    editable: boolean;
    notesMap?: Record<string, string>;
    onNotesChange?: (key: string, value: string) => void;
    collectionsSelection?: number | '';
    onCollectionsBonusChange?: (salesperson: string, value: number | '') => void;
    onCollectionsBonusLockToggle?: (salesperson: string, locked: boolean) => void;
    collectionsOptions?: number[];
    isKey: boolean;
    collectionsLocked?: boolean;
    manualOverrides?: Record<string, string>;
    onManualOverrideChange?: (rowKey: string, value: string) => void;
    bonusRange?: { start: Date; end: Date } | null;
}

const CommissionSalespersonBlock: React.FC<CommissionSalespersonBlockProps> = ({
    snapshot,
    editable,
    notesMap,
    onNotesChange,
    collectionsSelection = '',
    onCollectionsBonusChange,
    onCollectionsBonusLockToggle,
    collectionsOptions = [0, 50, 100],
    isKey,
    collectionsLocked = false,
    manualOverrides = {},
    onManualOverrideChange,
    bonusRange = null,
}) => {
    const [commissionDrafts, setCommissionDrafts] = useState<Record<string, string>>({});
    const {
        salesperson,
        rows,
        totalAdjustedCommission,
        collectionsBonus,
        weeklySalesCount,
        weeklySalesCountOverThreshold,
        weeklySalesBonus,
    } = snapshot;

    const [activeCommissionEditKey, setActiveCommissionEditKey] = useState<string | null>(null);
    const [activeNoteEditKey, setActiveNoteEditKey] = useState<string | null>(null);

    useEffect(() => {
        if (activeCommissionEditKey && !rows.some(row => row.key === activeCommissionEditKey)) {
            setActiveCommissionEditKey(null);
        }
        if (activeNoteEditKey && !rows.some(row => row.key === activeNoteEditKey)) {
            setActiveNoteEditKey(null);
        }
    }, [rows, activeCommissionEditKey, activeNoteEditKey]);

    useEffect(() => {
        setCommissionDrafts(prev => {
            const allowed = new Set(rows.map(row => row.key));
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([key, value]) => {
                if (allowed.has(key)) {
                    next[key] = value;
                }
            });
            return next;
        });
    }, [rows]);

    const normalizedName = normalizeName(salesperson);
    // When locked, prioritize collectionsSelection prop (which loads from storage if needed),
    // then fall back to snapshot's collectionsBonus. This ensures export shows correct locked value.
    // When not locked, use collectionsSelection prop, then snapshot's collectionsBonus
    const selectionNumber = isKey && collectionsLocked
        ? (typeof collectionsSelection === 'number'
            ? collectionsSelection
            : (typeof collectionsBonus === 'number'
                ? collectionsBonus
                : 0))
        : (typeof collectionsSelection === 'number'
            ? collectionsSelection
            : (typeof collectionsBonus === 'number'
                ? collectionsBonus
                : 0));
    const collectionSelectionIsNumber = typeof collectionsSelection === 'number';
    // Use collectionsSelection if it's a number, otherwise fall back to snapshot's collectionsBonus for display
    // When locked, collectionsSelection prop should have the value (loaded from storage if needed)
    const selectionValue = typeof collectionsSelection === 'number'
        ? String(collectionsSelection)
        : (typeof collectionsBonus === 'number' ? String(collectionsBonus) : '');
    const effectiveCollectionsBonus = isKey ? selectionNumber : 0;
    const effectiveWeeklyBonus = isKey ? weeklySalesBonus ?? 0 : 0;
    const baseCommissionValue = totalAdjustedCommission;
    const totalPayout = isKey
        ? baseCommissionValue + effectiveCollectionsBonus + effectiveWeeklyBonus
        : baseCommissionValue;
    const isCollectionsMissing = isKey && editable && !collectionSelectionIsNumber;
    const lockButtonLabel = collectionsLocked ? 'Unlock' : 'Lock';
    const lockDisabled =
        !isKey || !editable || (!collectionsLocked && !collectionSelectionIsNumber);
    const collectionsStatusLabel = collectionsLocked
        ? 'Locked for this period'
        : collectionSelectionIsNumber
            ? 'Unlocked'
            : 'No bonus selected';

    return (
        <section className="mb-6 glass-card-outline p-4 border border-border-low overflow-visible">
            <header className="flex flex-col gap-3 pb-3 border-b border-border-low">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div className="flex-1">
                        <h3 
                            className="text-3xl font-bold tracking-tight-lg"
                            style={
                                salesperson?.toLowerCase() === 'key'
                                    ? {
                                        background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #3b82f6 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        color: 'transparent',
                                    }
                                    : salesperson?.toLowerCase() === 'timo' || salesperson?.toLowerCase() === 'temo'
                                    ? {
                                        background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        color: 'transparent',
                                    }
                                    : {}
                            }
                        >
                            {salesperson || 'Unassigned'}
                        </h3>
                        {isKey && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-secondary mt-3">
                                <div className="bg-glass-panel/40 border border-border-low rounded-md p-2.5">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-xs uppercase tracking-wide text-muted">Collections Bonus</p>
                                        <p className="text-base font-semibold text-primary">{formatCurrency(effectiveCollectionsBonus)}</p>
                                    </div>
                                    {editable && (
                                        <div className="pdf-hide space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <AppSelect
                                                    value={selectionValue}
                                                    onChange={selected =>
                                                        onCollectionsBonusChange?.(
                                                            normalizedName,
                                                            selected === '' ? '' : Number(selected)
                                                        )
                                                    }
                                                    disabled={collectionsLocked}
                                                    options={[
                                                        { value: '', label: 'Select bonus' },
                                                        ...collectionsOptions.map(option => ({
                                                            value: String(option),
                                                            label: formatCurrency(option),
                                                        })),
                                                    ]}
                                                    className="flex-1"
                                                />
                                                <GlassButton
                                                    type="button"
                                                    size="sm"
                                                    onClick={() =>
                                                        onCollectionsBonusLockToggle?.(
                                                            normalizedName,
                                                            !collectionsLocked
                                                        )
                                                    }
                                                    disabled={lockDisabled}
                                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${!lockDisabled
                                                            ? collectionsLocked
                                                                ? 'bg-glass-panel border border-white/20 text-white hover:bg-glass-panel/80'
                                                                : ''
                                                            : 'bg-glass-panel border border-border-low text-muted cursor-not-allowed'
                                                        }`}
                                                >
                                                    {lockButtonLabel}
                                                </GlassButton>
                                            </div>
                                            {isCollectionsMissing && (
                                                <p className="text-[10px] text-lava-warm leading-tight">Required before export/log</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-glass-panel/10 border border-border-low rounded-md p-2.5">
                                    <p className="text-xs uppercase tracking-wide text-muted mb-1.5">Weekly Sales</p>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-secondary">Total</span>
                                        <span className="font-semibold text-primary">{weeklySalesCount ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="text-secondary">Over 5</span>
                                        <span className="font-semibold text-primary">{weeklySalesCountOverThreshold ?? 0}</span>
                                    </div>
                                </div>
                                <div className="bg-glass-panel/10 border border-border-low rounded-md p-2.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-wide text-muted">Weekly Bonus</p>
                                        <p className="text-base font-semibold text-lava-warm">{formatCurrency(effectiveWeeklyBonus)}</p>
                                    </div>
                                    {bonusRange && (
                                        <p className="text-xs text-secondary mt-1.5">
                                            {formatCommissionWeekLabel(bonusRange.start, bonusRange.end)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="bg-gradient-to-r from-lava-warm/30 via-lava-core/30 to-lava-warm/30 border border-lava-core/40 rounded-lg px-4 py-3 text-white shadow-lg min-w-[220px]">
                        <p className="text-xs uppercase tracking-wide text-white/70">Total Commission Payout</p>
                        <p className="text-2xl sm:text-3xl font-bold font-orbitron tracking-tight-lg">
                            {formatCurrency(totalPayout)}
                        </p>
                        {isKey ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-white/80">
                                <div>
                                    <p className="uppercase tracking-wide">Base Commission</p>
                                    <p className="text-sm font-semibold text-white">{formatCurrency(baseCommissionValue)}</p>
                                </div>
                                <div>
                                    <p className="uppercase tracking-wide">Collections Bonus</p>
                                    <p className="text-sm font-semibold text-white">{formatCurrency(effectiveCollectionsBonus)}</p>
                                </div>
                                <div>
                                    <p className="uppercase tracking-wide">Sales Bonus</p>
                                    <p className="text-sm font-semibold text-white">{formatCurrency(effectiveWeeklyBonus)}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>
            <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm text-left">
                    <thead className="text-xs uppercase tracking-wide text-muted border-b border-border-low">
                        <tr>
                            <th className="py-2 pr-3">#</th>
                            <th className="py-2 pr-3">Date</th>
                            <th className="py-2 pr-3">Account</th>
                            <th className="py-2 pr-3">Vehicle</th>
                            <th className="py-2 pr-3">VIN</th>
                            <th className="py-2 pr-3 text-right">Down Payment</th>
                            <th className="py-2 pr-3 text-right">Commission</th>
                            <th className="py-2 pr-3">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-low">
                        {rows.map(row => {
                            const currentNotes =
                                editable && notesMap
                                    ? notesMap[row.key] ?? row.notes ?? ''
                                    : row.notes ?? '';
                            const highlightClasses = row.overrideApplied
                                ? 'text-lava-warm font-semibold'
                                : 'text-secondary';
                            const saleTypeCategory = getSaleTypeCategory(row.saleType);
                            const saleBadge = SALE_TYPE_BADGES[saleTypeCategory];
                            const canManuallyOverrideCommission = MANUAL_COMMISSION_TYPES.has(
                                saleTypeCategory,
                            );
                            const existingManualValue = manualOverrides[row.key];
                            const draftValue = commissionDrafts[row.key];
                            const isCommissionEditing =
                                editable && canManuallyOverrideCommission && activeCommissionEditKey === row.key;
                            const isNotesEditing = editable && activeNoteEditKey === row.key;
                            const noteDisplayClasses = row.overrideApplied
                                ? 'border border-lava-warm/60 bg-lava-warm/10 text-lava-warm font-semibold'
                                : 'border border-border-low bg-glass-panel text-primary';
                            const displayNotes =
                                currentNotes && currentNotes.trim() !== '' ? currentNotes : '—';

                            const startCommissionEdit = () => {
                                if (!editable || !canManuallyOverrideCommission) return;
                                const initial = draftValue ?? existingManualValue ??
                                    (Number.isFinite(row.adjustedCommission)
                                        ? String(row.adjustedCommission)
                                        : '');
                                const sanitizedInitial = sanitizeCurrencyString(initial ?? '');
                                setCommissionDrafts(prev => ({ ...prev, [row.key]: sanitizedInitial }));
                                setActiveCommissionEditKey(row.key);
                            };

                            const cancelCommissionEdit = () => {
                                setCommissionDrafts(prev => {
                                    const next = { ...prev };
                                    delete next[row.key];
                                    return next;
                                });
                                setActiveCommissionEditKey(null);
                            };

                            const handleDraftChange = (nextValue: string) => {
                                const sanitized = sanitizeCurrencyString(nextValue);
                                setCommissionDrafts(prev => ({ ...prev, [row.key]: sanitized }));
                            };

                            const draftInputValue = (draftValue ?? existingManualValue ??
                                (canManuallyOverrideCommission && Number.isFinite(row.adjustedCommission)
                                    ? String(row.adjustedCommission)
                                    : '')) ?? '';
                            const sanitizedDraftValue = sanitizeCurrencyString(draftInputValue ?? '');
                            const canSaveDraft = Boolean(
                                sanitizedDraftValue && Number.isFinite(Number(sanitizedDraftValue)),
                            );

                            const saveCommissionDraft = () => {
                                if (!onManualOverrideChange || !canSaveDraft) return;
                                onManualOverrideChange(row.key, sanitizedDraftValue);
                                setCommissionDrafts(prev => {
                                    const next = { ...prev };
                                    delete next[row.key];
                                    return next;
                                });
                                setActiveCommissionEditKey(null);
                            };

                            return (
                                <tr key={row.key} className="hover:bg-glass-panel transition-colors">
                                    <td className="py-2 pr-3 text-muted">{row.sequence}</td>
                                    <td className="py-2 pr-3 text-secondary">{row.saleDateDisplay}</td>
                                    <td className="py-2 pr-3 text-secondary">{row.accountNumber || '--'}</td>
                                    <td className="py-2 pr-3 text-secondary">{row.vehicle || '--'}</td>
                                    <td className="py-2 pr-3 text-secondary">
                                        {row.vinLast4 
                                            ? String(row.vinLast4).padStart(4, '0').slice(-4)
                                            : '--'}
                                    </td>
                                    <td className="py-2 pr-3 text-secondary">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-right flex-1">
                                                {formatDownPayment(row.trueDownPayment)}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${saleBadge.className}`}
                                            >
                                                {saleBadge.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        {isCommissionEditing ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={draftInputValue}
                                                    onChange={event => handleDraftChange(event.target.value)}
                                                    onKeyDown={event => {
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            saveCommissionDraft();
                                                        }
                                                        if (event.key === 'Escape') {
                                                            event.preventDefault();
                                                            cancelCommissionEdit();
                                                        }
                                                    }}
                                                    autoFocus
                                                    className="w-32 bg-[#111418] border border-border-low text-primary rounded-md px-2 py-1 text-right focus:border-lava-core focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={saveCommissionDraft}
                                                    disabled={!canSaveDraft}
                                                    className="text-lava-core disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={highlightClasses}>
                                                    {formatCurrency(row.adjustedCommission)}
                                                </span>
                                                {editable && canManuallyOverrideCommission && (
                                                    <button
                                                        type="button"
                                                        onClick={startCommissionEdit}
                                                        className="text-muted hover:text-primary transition"
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td
                                        className="py-2 pr-3"
                                        onDoubleClick={() => {
                                            if (!editable) return;
                                            setActiveNoteEditKey(row.key);
                                        }}
                                    >
                                        {editable ? (
                                            isNotesEditing ? (
                                                <textarea
                                                    value={currentNotes}
                                                    autoFocus
                                                    onBlur={() => setActiveNoteEditKey(null)}
                                                    onChange={event =>
                                                        onNotesChange?.(row.key, event.target.value)
                                                    }
                                                    className={`w-full rounded-md p-2 focus:outline-none focus:border-lava-core transition-colors resize-y bg-glass-panel border ${row.overrideApplied
                                                            ? 'border-lava-warm text-lava-warm font-semibold bg-lava-warm/10'
                                                            : 'border-border-low text-primary'
                                                        }`}
                                                    placeholder="Add notes or overrides"
                                                />
                                            ) : (
                                                <div
                                                    className={`min-h-[48px] rounded-md px-2 py-2 whitespace-pre-wrap cursor-text ${noteDisplayClasses}`}
                                                >
                                                    {displayNotes}
                                                </div>
                                            )
                                        ) : (
                                            <div className={`p-2 whitespace-pre-wrap rounded-md ${noteDisplayClasses}`}>
                                                {displayNotes}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

interface WeekBucket {
    key: string;
    start: Date;
    end: Date;
    label: string;
    sales: Sale[];
}

interface CommissionReportLiveProps {
    sales: Sale[];
    selectedWeekKey?: string | null;
    onWeekChange?: (weekKey: string | null) => void;
}

export interface CommissionReportHandle {
    getSnapshot: () => CommissionReportSnapshot | null;
    getWeekLabel: () => string | null;
    getReportContainer: () => HTMLElement | null;
    getWeekBuckets: () => Array<{ key: string; label: string }>;
}

const buildSnapshot = (
    sales: Sale[],
    notesMap: Record<string, string>,
    start: Date,
    end: Date,
    options: {
        collectionsSelections?: Record<string, number | ''>;
        collectionsLocks?: Record<string, boolean>;
        allSales?: Sale[];
        manualCommissionOverrides?: Record<string, number>;
        weekKey?: string; // Add weekKey to load persisted state if needed
    } = {},
): CommissionReportSnapshot => {
    const rowsBySalesperson = new Map<string, CommissionReportRowSnapshot[]>();
    const collectionsSelections = options.collectionsSelections ?? {};
    const normalizedCollections = new Map<string, number | ''>();
    Object.entries(collectionsSelections).forEach(([name, value]) => {
        normalizedCollections.set(normalizeName(name), value);
    });

    const collectionsLocks = options.collectionsLocks ?? {};
    const manualOverrideValues = options.manualCommissionOverrides ?? {};
    const normalizedCollectionsLocks = new Map<string, boolean>();
    Object.entries(collectionsLocks).forEach(([name, value]) => {
        normalizedCollectionsLocks.set(normalizeName(name), Boolean(value));
    });
    
    // If locked but state doesn't have value, load from persisted storage
    // Check multiple possible key variations for "Key" salesperson
    if (options.weekKey) {
        const possibleKeys = ['Key', 'key', 'KEY'];
        let foundLocked = false;
        let foundKey = '';
        let foundValue: number | '' = '';
        
        // Check if any variation is locked (check both raw locks and normalized locks)
        for (const key of possibleKeys) {
            const normalizedKey = normalizeName(key);
            const isLocked = normalizedCollectionsLocks.get(normalizedKey) ?? 
                            normalizedCollectionsLocks.get(key) ??
                            collectionsLocks[normalizedKey] ?? 
                            collectionsLocks[key] ?? 
                            false;
            const stateValue = normalizedCollections.get(normalizedKey) ?? normalizedCollections.get(key);
            
            if (isLocked) {
                foundLocked = true;
                foundKey = normalizedKey;
                foundValue = stateValue;
                break;
            }
        }
        
        // If locked but state doesn't have value, load from storage
        if (foundLocked && typeof foundValue !== 'number') {
            const storage = loadCollectionsState(options.weekKey);
            if (typeof storage.value === 'number') {
                // Set for all possible key variations to ensure lookup works
                for (const key of possibleKeys) {
                    normalizedCollections.set(normalizeName(key), storage.value);
                }
            }
        }
    }

    const bonusRange = getBonusRangeForCommission(start);
    const bonusSource = options.allSales ?? sales;
    const weeklyBonusData = computeWeeklyBonusBreakdown(bonusSource, bonusRange.start, bonusRange.end);

    const sortedSales = [...sales].sort((a, b) => {
        const accountA = a.accountNumber ?? '';
        const accountB = b.accountNumber ?? '';
        if (accountA !== accountB) {
            const numA = Number.parseInt(accountA, 10);
            const numB = Number.parseInt(accountB, 10);
            if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
                return numA - numB;
            }
            if (!Number.isNaN(numA) && Number.isNaN(numB)) return -1;
            if (Number.isNaN(numA) && !Number.isNaN(numB)) return 1;
            if (accountA !== accountB) {
                return accountA.localeCompare(accountB);
            }
        }

        const aDate = parseDateStringToUtc(a.saleDate)?.getTime() ?? 0;
        const bDate = parseDateStringToUtc(b.saleDate)?.getTime() ?? 0;
        return aDate - bDate;
    });

    sortedSales.forEach(sale => {
        const parsedSaleDate = parseDateStringToUtc(sale.saleDate);
        if (!parsedSaleDate) return;

        const trueDownPayment = Number(
            sale.saleDownPayment ?? sale.downPayment ?? sale.salePrice ?? 0
        );

        const splitSource = sale.salespersonSplit && sale.salespersonSplit.length
            ? sale.salespersonSplit
            : [{ name: sale.salesperson?.trim() || 'Unassigned', share: 100 }];

        const totalShare = splitSource.reduce((sum, item) => sum + (item.share ?? 0), 0) || 0;
        const normalizedSplits = splitSource.map(item => {
            const share = totalShare > 0 ? (item.share ?? 0) / totalShare * 100 : 0;
            return {
                name: item.name?.trim() || sale.salesperson?.trim() || 'Unassigned',
                share: Number(share.toFixed(4)),
            };
        });

        const vehicle = [sale.year, sale.make, sale.model].filter(Boolean).join(' ');
        // Extract VIN last 4 and ensure it's a string with leading zeros preserved
        const vinLast4Raw = sale.vinLast4 
            ? String(sale.vinLast4)
            : (sale.vin && sale.vin.length >= 4 
                ? sale.vin.slice(-4)
                : '');
        // Pad to 4 digits with leading zeros and ensure exactly 4 characters
        const vinLast4 = vinLast4Raw ? String(vinLast4Raw).padStart(4, '0').slice(-4) : '';

        const displayDate = parsedSaleDate.toLocaleDateString(undefined, {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });

        const splitSummary = normalizedSplits
            .map(item => `${item.name} ${item.share.toFixed(0)}%`)
            .join(' | ');

        normalizedSplits.forEach(split => {
            const rowKey = `${getSaleKey(sale)}|${split.name}`;
            const manualNote = notesMap[rowKey] ?? '';
            const baseCommission = calculateBaseCommission(trueDownPayment);
            const shareFraction = Math.max(0, split.share) / 100;
            const commissionBeforeOverride = baseCommission * shareFraction;
            const overrideResult = applyCommissionOverride(
                commissionBeforeOverride,
                manualNote || undefined,
            );

            const defaultNotes =
                normalizedSplits.length > 1
                    ? `Commission split: ${splitSummary}`
                    : '';
            const notes =
                manualNote && manualNote.trim().length > 0
                    ? manualNote
                    : defaultNotes;

            const saleTypeCategory = getSaleTypeCategory(sale.saleType);
            const manualOverrideValue = manualOverrideValues[rowKey];
            const usesManualCommission = MANUAL_COMMISSION_TYPES.has(saleTypeCategory);
            const adjustedCommission = usesManualCommission
                ? (typeof manualOverrideValue === 'number' && Number.isFinite(manualOverrideValue)
                    ? manualOverrideValue
                    : 0)
                : overrideResult.amount;
            const overrideAppliedFlag =
                usesManualCommission || overrideResult.overrideApplied || normalizedSplits.length > 1;
            const overrideDetails = usesManualCommission
                ? `${SALE_TYPE_BADGES[saleTypeCategory].label} manual entry`
                : normalizedSplits.length > 1
                    ? `Split share ${split.share.toFixed(2)}%`
                    : overrideResult.details;

            const row: CommissionReportRowSnapshot = {
                key: rowKey,
                sequence: 0,
                saleId: sale.saleId || rowKey,
                saleDate: formatDateKey(parsedSaleDate),
                saleDateDisplay: displayDate,
                accountNumber: sale.accountNumber || sale.saleId || '',
                salesperson: split.name,
                vehicle,
                vinLast4: vinLast4 || '',
                trueDownPayment,
                baseCommission: commissionBeforeOverride,
                adjustedCommission,
                overrideApplied: overrideAppliedFlag,
                overrideDetails,
                notes,
                saleType: sale.saleType ?? '',
            };

            if (!rowsBySalesperson.has(split.name)) {
                rowsBySalesperson.set(split.name, []);
            }
            rowsBySalesperson.get(split.name)!.push(row);
        });
    });

    const salespeople: CommissionSalespersonSnapshot[] = Array.from(rowsBySalesperson.entries())
        .map(([salesperson, rows]) => {
            const sortedRows = [...rows].sort((rowA, rowB) => {
                const accA = rowA.accountNumber || '';
                const accB = rowB.accountNumber || '';
                if (accA !== accB) {
                    const numA = Number.parseInt(accA, 10);
                    const numB = Number.parseInt(accB, 10);
                    if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
                        return numA - numB;
                    }
                    if (!Number.isNaN(numA) && Number.isNaN(numB)) return -1;
                    if (Number.isNaN(numA) && !Number.isNaN(numB)) return 1;
                    return accA.localeCompare(accB);
                }
                return rowA.saleDate.localeCompare(rowB.saleDate);
            });

            const enumeratedRows = sortedRows.map((row, index) => ({
                ...row,
                sequence: index + 1,
            }));
            const totalAdjustedCommission = enumeratedRows.reduce(
                (sum, row) => sum + row.adjustedCommission,
                0
            );
            const normalizedName = salesperson;
            const isKey = normalizedName.toLowerCase() === 'key';
            // Check multiple possible keys to find collections bonus value
            let collectionsSelection: number | '' | undefined = normalizedCollections.get(normalizedName);
            if (isKey && typeof collectionsSelection !== 'number') {
                // Try alternative key variations
                collectionsSelection = normalizedCollections.get('Key') ?? 
                                      normalizedCollections.get('key') ?? 
                                      normalizedCollections.get('KEY') ??
                                      collectionsSelection;
            }
            
            // If still no value but locked, load from storage
            if (isKey && typeof collectionsSelection !== 'number' && options.weekKey) {
                const normalizedKey = normalizeName(normalizedName);
                const isLocked = normalizedCollectionsLocks.get(normalizedKey) ?? 
                                normalizedCollectionsLocks.get('Key') ?? 
                                normalizedCollectionsLocks.get('key') ?? 
                                false;
                if (isLocked) {
                    const storage = loadCollectionsState(options.weekKey);
                    if (typeof storage.value === 'number') {
                        collectionsSelection = storage.value;
                        // Store it in the map for future lookups
                        normalizedCollections.set(normalizedName, storage.value);
                        normalizedCollections.set('Key', storage.value);
                        normalizedCollections.set('key', storage.value);
                    }
                }
            }
            
            const weeklyStats = isKey
                ? weeklyBonusData.global
                : weeklyBonusData.perSalesperson.get(normalizedName) ?? {
                    deals: new Set<string>(),
                    count: 0,
                    over: 0,
                    bonus: 0,
                };
            return {
                salesperson: normalizedName,
                rows: enumeratedRows,
                totalAdjustedCommission,
                collectionsBonus: isKey && typeof collectionsSelection === 'number' ? collectionsSelection : undefined,
                weeklySalesCount: isKey ? weeklyStats.count : undefined,
                weeklySalesCountOverThreshold: isKey ? weeklyStats.over : undefined,
                weeklySalesBonus: isKey ? weeklyStats.bonus : undefined,
            };
        })
        .sort((a, b) => {
            const aKey = a.salesperson.toLowerCase() === 'key';
            const bKey = b.salesperson.toLowerCase() === 'key';
            if (aKey && !bKey) return -1;
            if (!aKey && bKey) return 1;
            return a.salesperson.localeCompare(b.salesperson);
        });

    const keyEntry = salespeople.find(person => person.salesperson.toLowerCase() === 'key');
    const keySelectionRaw = normalizedCollections.get('Key') ?? normalizedCollections.get('key');
    const keyLockedFlag = normalizedCollectionsLocks.get('Key') ?? normalizedCollectionsLocks.get('key') ?? false;
    const totals = {
        totalCommission: keyEntry?.totalAdjustedCommission ?? 0,
        collectionsBonus: typeof keySelectionRaw === 'number' ? keySelectionRaw : 0,
        bonusWeeklySalesCount: keyEntry?.weeklySalesCount ?? 0,
        bonusWeeklySalesOver5: keyEntry?.weeklySalesCountOverThreshold ?? 0,
        bonusWeeklySalesDollars: keyEntry?.weeklySalesBonus ?? 0,
        collectionsComplete: typeof keySelectionRaw === 'number' && keyLockedFlag,
    };

    return {
        periodStart: formatDateKey(start),
        periodEnd: formatDateKey(end),
        generatedAt: new Date().toISOString(),
        salespeople,
        totals,
    };
};

export const CommissionReportLive = forwardRef<CommissionReportHandle, CommissionReportLiveProps>(
    ({ sales, selectedWeekKey: externalSelectedWeekKey, onWeekChange }, ref) => {
        const [internalSelectedWeekKey, setInternalSelectedWeekKey] = useState<string | null>(null);
        const selectedWeekKey = externalSelectedWeekKey !== undefined ? externalSelectedWeekKey : internalSelectedWeekKey;
        const setSelectedWeekKey = (value: string | null) => {
            if (onWeekChange) {
                onWeekChange(value);
            } else {
                setInternalSelectedWeekKey(value);
            }
        };
        const [notesMap, setNotesMap] = useState<Record<string, string>>({});
        const [collectionsSelections, setCollectionsSelections] = useState<Record<string, number | ''>>({});
        const [collectionsLocks, setCollectionsLocks] = useState<Record<string, boolean>>({});
        const [manualCommissionOverrides, setManualCommissionOverrides] = useState<Record<string, string>>({});
        const reportContainerRef = React.useRef<HTMLDivElement>(null);
        const latestWeekKeyRef = React.useRef<string | null>(null);
        // Get today's date in America/Chicago timezone for consistent week calculations
        const getTodayInChicago = () => {
            const now = new Date();
            const chicagoDateStr = now.toLocaleDateString('en-US', {
                timeZone: 'America/Chicago',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            const [month, day, year] = chicagoDateStr.split('/');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        };
        
        const [activeWeekStartMs, setActiveWeekStartMs] = useState(() =>
            getCommissionWeekStart(getTodayInChicago()).getTime()
        );

        useEffect(() => {
            if (typeof window === 'undefined') return;
            const updateActiveWeek = () => {
                const next = getCommissionWeekStart(getTodayInChicago()).getTime();
                setActiveWeekStartMs(prev => (prev === next ? prev : next));
            };
            const intervalId = window.setInterval(updateActiveWeek, 60 * 1000);
            return () => window.clearInterval(intervalId);
        }, []);

        const weekBuckets: WeekBucket[] = useMemo(() => {
            const buckets = new Map<string, WeekBucket>();

            sales.forEach(sale => {
                const parsedDate = parseDateStringToUtc(sale.saleDate);
                if (!parsedDate) return;
                const { start, end } = getCommissionWeekRange(parsedDate);
                const key = buildWeekKey(parsedDate);
                if (!buckets.has(key)) {
                    buckets.set(key, {
                        key,
                        start,
                        end,
                        label: formatCommissionWeekLabel(start, end),
                        sales: [],
                    });
                }
                buckets.get(key)!.sales.push(sale);
            });

            const activeWeekAnchor = new Date(activeWeekStartMs);
            if (!Number.isNaN(activeWeekAnchor.getTime())) {
                const { start: anchorStart, end: anchorEnd } = getCommissionWeekRange(activeWeekAnchor);
                const anchorKey = buildWeekKey(activeWeekAnchor);
                if (!buckets.has(anchorKey)) {
                    buckets.set(anchorKey, {
                        key: anchorKey,
                        start: anchorStart,
                        end: anchorEnd,
                        label: formatCommissionWeekLabel(anchorStart, anchorEnd),
                        sales: [],
                    });
                }
            }

            return Array.from(buckets.values())
                .map(bucket => ({
                    ...bucket,
                    sales: bucket.sales,
                }))
                .sort((a, b) => b.start.getTime() - a.start.getTime());
        }, [sales, activeWeekStartMs]);

        const currentWeek = useMemo(() => {
            if (!selectedWeekKey) return weekBuckets[0] ?? null;
            return weekBuckets.find(bucket => bucket.key === selectedWeekKey) ?? null;
        }, [weekBuckets, selectedWeekKey]);

        useEffect(() => {
            if (!currentWeek) {
                setManualCommissionOverrides({});
                return;
            }
            setManualCommissionOverrides(loadManualOverrideState(currentWeek.key));
        }, [currentWeek?.key]);

        const numericManualOverrides = useMemo(() => {
            const next: Record<string, number> = {};
            Object.entries(manualCommissionOverrides).forEach(([key, value]) => {
                if (value === undefined) return;
                const numeric = Number(sanitizeCurrencyString(value));
                if (Number.isFinite(numeric)) {
                    next[key] = numeric;
                }
            });
            return next;
        }, [manualCommissionOverrides]);

        useEffect(() => {
            if (!currentWeek) return;
            persistManualOverrideState(currentWeek.key, manualCommissionOverrides);
        }, [manualCommissionOverrides, currentWeek?.key]);

        useEffect(() => {
            if (weekBuckets.length === 0) {
                latestWeekKeyRef.current = null;
                if (selectedWeekKey !== null) {
                    setSelectedWeekKey(null);
                }
                return;
            }

            const latest = weekBuckets[0];
            const prevLatest = latestWeekKeyRef.current;
            const isNewWindow = Boolean(prevLatest && prevLatest !== latest.key);

            if (!selectedWeekKey) {
                latestWeekKeyRef.current = latest.key;
                setSelectedWeekKey(latest.key);
                return;
            }

            const selectionExists = weekBuckets.some(bucket => bucket.key === selectedWeekKey);
            if (!selectionExists) {
                latestWeekKeyRef.current = latest.key;
                setSelectedWeekKey(latest.key);
                return;
            }

            if (isNewWindow && currentWeek && currentWeek.key === prevLatest) {
                latestWeekKeyRef.current = latest.key;
                setSelectedWeekKey(latest.key);
                return;
            }

            latestWeekKeyRef.current = latest.key;
        }, [weekBuckets, selectedWeekKey, currentWeek]);

        useEffect(() => {
            if (!currentWeek) {
                setCollectionsSelections({});
                setCollectionsLocks({});
                return;
            }

            const storage = loadCollectionsState(currentWeek.key);
            const normalizedKey = normalizeName('Key');
            const hasValue = typeof storage.value === 'number';

            setCollectionsSelections(() =>
                hasValue ? { [normalizedKey]: storage.value as number } : {}
            );
            setCollectionsLocks(() =>
                storage.locked ? { [normalizedKey]: true } : {}
            );
        }, [currentWeek]);

        const snapshot: CommissionReportSnapshot | null = useMemo(() => {
            if (!currentWeek) return null;
            return buildSnapshot(currentWeek.sales, notesMap, currentWeek.start, currentWeek.end, {
                collectionsSelections,
                collectionsLocks,
                allSales: sales,
                manualCommissionOverrides: numericManualOverrides,
                weekKey: currentWeek.key, // Pass weekKey to allow loading persisted state
            });
        }, [currentWeek, notesMap, collectionsSelections, collectionsLocks, sales, numericManualOverrides]);

        useImperativeHandle(
            ref,
            () => ({
                getSnapshot: () => snapshot,
                getWeekLabel: () =>
                    currentWeek ? formatCommissionWeekLabel(currentWeek.start, currentWeek.end) : null,
                getReportContainer: () => reportContainerRef.current,
                getWeekBuckets: () => weekBuckets.map(bucket => ({ key: bucket.key, label: bucket.label })),
            }),
            [snapshot, currentWeek, weekBuckets],
        );

        const handleNotesChange = (key: string, value: string) => {
            setNotesMap(prev => ({ ...prev, [key]: value }));
        };

        const handleCollectionsBonusChange = (salesperson: string, value: number | '') => {
            const normalized = normalizeName(salesperson);
            if (collectionsLocks[normalized]) return;
            setCollectionsSelections(prev => {
                const next = { ...prev };
                if (value === '') {
                    delete next[normalized];
                } else {
                    next[normalized] = value;
                }
                return next;
            });
            if (normalized.toLowerCase() === 'key' && currentWeek) {
                if (typeof value === 'number') {
                    persistCollectionsState(currentWeek.key, value, Boolean(collectionsLocks[normalized]));
                } else {
                    clearCollectionsState(currentWeek.key);
                    setCollectionsLocks(prev => {
                        const next = { ...prev };
                        delete next[normalized];
                        return next;
                    });
                }
            }
        };

        const handleManualCommissionChange = (rowKey: string, value: string) => {
            setManualCommissionOverrides(prev => {
                const next = { ...prev };
                const sanitized = value.replace(/[^0-9.]/g, '');
                if (!sanitized) {
                    delete next[rowKey];
                } else {
                    next[rowKey] = sanitized;
                }
                return next;
            });
        };

        const handleCollectionsBonusLockToggle = (salesperson: string, locked: boolean) => {
            if (!currentWeek) return;
            const normalized = normalizeName(salesperson);
            const selection = collectionsSelections[normalized];

            if (locked) {
                if (typeof selection !== 'number') {
                    window.alert('Select a collections bonus before locking.');
                    return;
                }
            }

            setCollectionsLocks(prev => ({ ...prev, [normalized]: locked }));

            if (typeof selection === 'number') {
                persistCollectionsState(currentWeek.key, selection, locked);
            } else if (!locked) {
                clearCollectionsState(currentWeek.key);
            }
        };

        if (weekBuckets.length === 0) {
            return (
                <div className="glass-card p-6 text-center text-muted">
                    <p>No sales data available to generate a commission report.</p>
                </div>
            );
        }

        const bonusRange = currentWeek ? getBonusRangeForCommission(currentWeek.start) : null;

        return (
            <div id="commission-report-content" ref={reportContainerRef} className="space-y-6 p-12">
                {/* Header: Title on left, Reporting Window on right */}
                <div className="glass-card-accent flex justify-between items-center print:mb-6 mb-6 p-4">
                    <h1 
                        className="font-bold font-orbitron tracking-tight-lg text-white"
                        style={{
                            fontSize: '38px',
                        }}
                    >
                        COMMISSION REPORT
                    </h1>
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-muted">
                            Reporting Window (Fri → Thu)
                        </p>
                        <p className="text-lg font-semibold text-secondary">
                            {currentWeek ? formatCommissionWeekLabel(currentWeek.start, currentWeek.end) : '—'}
                        </p>
                    </div>
                </div>

                {snapshot && !snapshot.totals.collectionsComplete && (
                    <p className="text-xs text-lava-warm font-semibold">
                        Select and lock a collections bonus for Key before logging or exporting the commission report.
                    </p>
                )}

                {snapshot && snapshot.salespeople.length > 0 ? (
                    snapshot.salespeople.map(block => {
                        const normalized = normalizeName(block.salesperson);
                        const isKey = normalized.toLowerCase() === 'key';
                        const locked = isKey ? collectionsLocks[normalized] ?? false : false;
                        // If locked, ALWAYS use snapshot value to ensure export shows correct value
                        // Otherwise, use state if it's a valid number, then fall back to snapshot
                        const stateSelection = isKey ? collectionsSelections[normalized] : undefined;
                        const snapshotSelection = isKey && typeof block.collectionsBonus === 'number' ? block.collectionsBonus : undefined;
                        
                        // When locked, prioritize snapshot value, but if snapshot doesn't have it, load from storage
                        let finalSelection: number | '' = '';
                        if (isKey && locked) {
                            if (typeof snapshotSelection === 'number') {
                                finalSelection = snapshotSelection;
                            } else if (typeof stateSelection === 'number') {
                                finalSelection = stateSelection;
                            } else if (currentWeek) {
                                // Last resort: load from storage if snapshot and state both don't have it
                                const storage = loadCollectionsState(currentWeek.key);
                                if (typeof storage.value === 'number') {
                                    finalSelection = storage.value;
                                }
                            }
                        } else if (isKey) {
                            // Not locked: use state if available, otherwise snapshot
                            finalSelection = typeof stateSelection === 'number' 
                                ? stateSelection 
                                : (snapshotSelection ?? '');
                        }
                        
                        return (
                            <CommissionSalespersonBlock
                                key={block.salesperson}
                                snapshot={block}
                                editable={true}
                                notesMap={notesMap}
                                onNotesChange={handleNotesChange}
                                collectionsSelection={finalSelection}
                                onCollectionsBonusChange={isKey ? handleCollectionsBonusChange : undefined}
                                onCollectionsBonusLockToggle={isKey ? handleCollectionsBonusLockToggle : undefined}
                                collectionsOptions={[0, 50, 100]}
                                isKey={isKey}
                                collectionsLocked={locked}
                                manualOverrides={manualCommissionOverrides}
                                onManualOverrideChange={handleManualCommissionChange}
                                bonusRange={bonusRange}
                            />
                        );
                    })
                ) : (
                    <div className="glass-card p-6 text-center text-muted">
                        <p>No sales recorded for this reporting window.</p>
                    </div>
                )}
            </div>
        );
    },
);

CommissionReportLive.displayName = 'CommissionReportLive';

interface CommissionReportViewerProps {
    snapshot: CommissionReportSnapshot;
}

export const CommissionReportViewer: React.FC<CommissionReportViewerProps> = ({ snapshot }) => {
    const periodStart = new Date(snapshot.periodStart + 'T00:00:00');
    const periodEnd = new Date(snapshot.periodEnd + 'T00:00:00');
    const label = formatCommissionWeekLabel(periodStart, periodEnd);
    const bonusRange = getBonusRangeForCommission(periodStart);
    const totals = snapshot.totals;
    const totalCommissionValue = totals.totalCommission;
    const totalCollectionsBonus = totals.collectionsBonus ?? 0;
    const totalWeeklyBonus = totals.bonusWeeklySalesDollars ?? 0;
    const combinedPayout = totalCommissionValue + totalCollectionsBonus + totalWeeklyBonus;

    return (
        <div id="commission-report-content" className="space-y-6 p-12">
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 bg-gradient-to-r from-lava-warm via-lava-core to-lava-warm rounded-xl border border-white/10 shadow-2xl px-6 py-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))]"></div>
                    <div className="relative z-10 space-y-3">
                        <span className="text-xs uppercase tracking-[0.35em] text-white/70">Total Commission Payout</span>
                        <p className="text-4xl sm:text-5xl font-bold font-orbitron drop-shadow-xl tracking-tight-lg">
                            {formatCurrency(combinedPayout)}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="bg-black/25 border border-white/20 rounded-md px-4 py-3">
                                <p className="text-white/70 text-xs uppercase tracking-wide">Base Commission</p>
                                <p className="text-lg font-semibold text-white">{formatCurrency(totalCommissionValue)}</p>
                            </div>
                            <div className="bg-black/25 border border-white/20 rounded-md px-4 py-3">
                                <p className="text-white/70 text-xs uppercase tracking-wide">Collections Bonus</p>
                                <p className="text-lg font-semibold text-white">{formatCurrency(totalCollectionsBonus)}</p>
                            </div>
                            <div className="bg-black/25 border border-white/20 rounded-md px-4 py-3">
                                <p className="text-white/70 text-xs uppercase tracking-wide">Sales Bonus</p>
                                <p className="text-lg font-semibold text-white">{formatCurrency(totalWeeklyBonus)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4 border border-border-low space-y-3">
                    <div>
                        <h3 className="text-xs uppercase tracking-wide text-muted">
                            Reporting Window (Fri → Thu)
                        </h3>
                        <p className="text-lg font-semibold text-primary">{label}</p>
                    </div>
                    <div>
                        <h4 className="text-xs uppercase tracking-wide text-muted">Bonus Week (Mon → Sun)</h4>
                        <p className="text-sm text-secondary">
                            {formatCommissionWeekLabel(bonusRange.start, bonusRange.end)}
                        </p>
                    </div>
                    <p className="text-xs text-muted">
                        Logged on {new Date(snapshot.generatedAt).toLocaleString()}
                    </p>
                </div>
            </div>

            {snapshot.salespeople.length > 0 ? (
                snapshot.salespeople.map(block => {
                    const normalized = normalizeName(block.salesperson);
                    const isKey = normalized.toLowerCase() === 'key';
                    return (
                        <CommissionSalespersonBlock
                            key={block.salesperson}
                            snapshot={block}
                            editable={false}
                            collectionsSelection={isKey ? block.collectionsBonus ?? '' : ''}
                            collectionsOptions={[0, 50, 100]}
                            isKey={isKey}
                            collectionsLocked={false}
                        />
                    );
                })
            ) : (
                <div className="glass-card p-6 text-center text-muted">
                    <p>No sales recorded in this archived report.</p>
                </div>
            )}
        </div>
    );
};

export default CommissionReportLive;
