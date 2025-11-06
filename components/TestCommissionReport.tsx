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
} from '../utils/commission';
import AppSelect from './AppSelect';

const BONUS_THRESHOLD = 5;
const BONUS_PER_SALE = 50;
const COLLECTIONS_STORAGE_PREFIX = 'commission-collections-bonus';

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

const normalizeName = (value: string | undefined | null) =>
    value?.trim() && value.trim().length > 0 ? value.trim() : 'Unassigned';

const normalizeSaleType = (value: string | undefined | null) =>
    value?.toLowerCase().replace(/\s+/g, '') ?? '';

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
            !(saleType === 'sale' || saleType === 'trade' || saleType === 'trade-in' || saleType === 'tradein')
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
}) => {
    const {
        salesperson,
        rows,
        totalAdjustedCommission,
        collectionsBonus,
        weeklySalesCount,
        weeklySalesCountOverThreshold,
        weeklySalesBonus,
    } = snapshot;

    const normalizedName = normalizeName(salesperson);
    const selectionNumber =
        typeof collectionsSelection === 'number'
            ? collectionsSelection
            : typeof collectionsBonus === 'number'
            ? collectionsBonus
            : 0;
    const collectionSelectionIsNumber = typeof collectionsSelection === 'number';
    const selectionValue = collectionSelectionIsNumber
        ? String(collectionsSelection)
        : '';
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
        <section
            className="mb-6 p-4 rounded-xl backdrop-blur-md relative overflow-hidden"
            style={{
                background: 'rgba(26, 29, 33, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: `
                    0 8px 32px 0 rgba(0, 0, 0, 0.37),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.2)
                `
            }}
        >
            {/* Top edge highlight */}
            <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15) 50%, transparent)'
                }}
            />
            {/* Bottom edge highlight */}
            <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.3) 50%, transparent)'
                }}
            />
            <header className="flex flex-col gap-4 pb-4 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-3xl font-bold text-white tracking-wide">
                        {salesperson || 'Unassigned'}
                    </h3>
                    <div className="bg-gradient-to-r from-accent-orange/30 via-accent-red/30 to-accent-orange/30 border border-accent-red/40 rounded-lg px-4 py-3 text-white shadow-lg min-w-[220px]">
                        <p className="text-xs uppercase tracking-wide text-white/70">Total Commission Payout</p>
                        <p className="text-2xl sm:text-3xl font-bold font-orbitron">
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
                {isKey && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-200">
                        <div className="bg-gunmetal-light/40 border border-gunmetal-light/60 rounded-md p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Collections Bonus</p>
                            <p className="text-lg font-semibold text-white">{formatCurrency(effectiveCollectionsBonus)}</p>
                            {editable && (
                                <div className="pdf-hide">
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
                                    />
                                    {isCollectionsMissing && (
                                        <p className="text-[11px] text-accent-orange mt-1">Required before export/log</p>
                                    )}
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onCollectionsBonusLockToggle?.(
                                                    normalizedName,
                                                    !collectionsLocked
                                                )
                                            }
                                            disabled={lockDisabled}
                                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                                !lockDisabled
                                                    ? collectionsLocked
                                                        ? 'bg-gunmetal border border-white/20 text-white hover:bg-gunmetal-light'
                                                        : 'bg-accent-red hover:bg-accent-orange text-white'
                                                    : 'bg-gunmetal border border-gunmetal-light text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {lockButtonLabel}
                                        </button>
                                        <span className="text-[11px] text-gray-300 ml-auto">
                                            {collectionsStatusLabel}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-gunmetal-light/10 border border-gunmetal-light/40 rounded-md p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Weekly Sales</p>
                            <div className="flex items-center justify-between text-sm">
                                <span>Total</span>
                                <span className="font-semibold text-white">{weeklySalesCount ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span>Over 5</span>
                                <span className="font-semibold text-white">{weeklySalesCountOverThreshold ?? 0}</span>
                            </div>
                        </div>
                        <div className="bg-gunmetal-light/10 border border-gunmetal-light/40 rounded-md p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Weekly Bonus</p>
                            <p className="text-lg font-semibold text-accent-orange">{formatCurrency(effectiveWeeklyBonus)}</p>
                        </div>
                    </div>
                )}
            </header>
            <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm text-left">
                    <thead className="text-xs uppercase tracking-wide text-gray-400 border-b border-gunmetal-light">
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
                    <tbody className="divide-y divide-gunmetal-light">
                        {rows.map(row => {
                            const currentNotes =
                                editable && notesMap
                                    ? notesMap[row.key] ?? row.notes ?? ''
                                    : row.notes ?? '';
                            const highlightClasses = row.overrideApplied
                                ? 'text-accent-orange font-semibold'
                                : 'text-gray-200';
                            const noteCellClasses = row.overrideApplied
                                ? 'border border-accent-orange/60 bg-accent-orange/10 text-accent-orange font-semibold rounded-md'
                                : 'text-gray-200';

                            return (
                                <tr key={row.key} className="hover:bg-gunmetal-dark transition-colors">
                                    <td className="py-2 pr-3 text-gray-400">{row.sequence}</td>
                                    <td className="py-2 pr-3 text-gray-200">{row.saleDateDisplay}</td>
                                    <td className="py-2 pr-3 text-gray-200">{row.accountNumber || '--'}</td>
                                    <td className="py-2 pr-3 text-gray-200">{row.vehicle || '--'}</td>
                                    <td className="py-2 pr-3 text-gray-200">{row.vinLast4 || '--'}</td>
                                    <td className="py-2 pr-3 text-gray-200 text-right">
                                        {formatDownPayment(row.trueDownPayment)}
                                    </td>
                                    <td className={`py-2 pr-3 text-right ${highlightClasses}`}>
                                        {formatCurrency(row.adjustedCommission)}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {editable ? (
                                            <textarea
                                                value={currentNotes}
                                                onChange={event =>
                                                    onNotesChange?.(row.key, event.target.value)
                                                }
                                                rows={2}
                                                className={`w-full bg-gunmetal-light border ${
                                                    row.overrideApplied
                                                        ? 'border-accent-orange text-accent-orange font-semibold bg-accent-orange/10'
                                                        : 'border-gunmetal-light text-white'
                                                } rounded-md p-2 focus:outline-none focus:border-accent-red transition-colors resize-y`}
                                                placeholder="Add notes or overrides"
                                            />
                                        ) : (
                                            <div className={`p-2 whitespace-pre-wrap ${noteCellClasses}`}>
                                                {currentNotes && currentNotes.trim() !== ''
                                                    ? currentNotes
                                                    : '—'}
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
}

export interface TestCommissionReportHandle {
    getSnapshot: () => CommissionReportSnapshot | null;
    getWeekLabel: () => string | null;
    getReportContainer: () => HTMLElement | null;
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
    } = {},
): CommissionReportSnapshot => {
    const rowsBySalesperson = new Map<string, CommissionReportRowSnapshot[]>();
    const collectionsSelections = options.collectionsSelections ?? {};
    const normalizedCollections = new Map<string, number | ''>();
    Object.entries(collectionsSelections).forEach(([name, value]) => {
        normalizedCollections.set(normalizeName(name), value);
    });

    const collectionsLocks = options.collectionsLocks ?? {};
    const normalizedCollectionsLocks = new Map<string, boolean>();
    Object.entries(collectionsLocks).forEach(([name, value]) => {
        normalizedCollectionsLocks.set(normalizeName(name), Boolean(value));
    });

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
        const vinLast4 =
            sale.vinLast4 || (sale.vin && sale.vin.length >= 4 ? sale.vin.slice(-4) : '');

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
                adjustedCommission: overrideResult.amount,
                overrideApplied: overrideResult.overrideApplied || normalizedSplits.length > 1,
                overrideDetails:
                    normalizedSplits.length > 1
                        ? `Split share ${split.share.toFixed(2)}%`
                        : overrideResult.details,
                notes,
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
            const collectionsSelection = normalizedCollections.get(normalizedName);
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

export const TestCommissionReportLive = forwardRef<TestCommissionReportHandle, CommissionReportLiveProps>(
    ({ sales }, ref) => {
        const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
        const [notesMap, setNotesMap] = useState<Record<string, string>>({});
        const [collectionsSelections, setCollectionsSelections] = useState<Record<string, number | ''>>({});
        const [collectionsLocks, setCollectionsLocks] = useState<Record<string, boolean>>({});
        const reportContainerRef = React.useRef<HTMLDivElement>(null);

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

            return Array.from(buckets.values())
                .map(bucket => ({
                    ...bucket,
                    sales: bucket.sales,
                }))
                .sort((a, b) => b.start.getTime() - a.start.getTime());
        }, [sales]);

        useEffect(() => {
            if (!selectedWeekKey && weekBuckets.length > 0) {
                setSelectedWeekKey(weekBuckets[0].key);
            }
        }, [selectedWeekKey, weekBuckets]);

        const currentWeek = useMemo(() => {
            if (!selectedWeekKey) return weekBuckets[0] ?? null;
            return weekBuckets.find(bucket => bucket.key === selectedWeekKey) ?? null;
        }, [weekBuckets, selectedWeekKey]);

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
            });
        }, [currentWeek, notesMap, collectionsSelections, collectionsLocks, sales]);

        useImperativeHandle(
            ref,
            () => ({
                getSnapshot: () => snapshot,
                getWeekLabel: () =>
                    currentWeek ? formatCommissionWeekLabel(currentWeek.start, currentWeek.end) : null,
                getReportContainer: () => reportContainerRef.current,
            }),
            [snapshot, currentWeek],
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
                <div className="bg-gunmetal rounded-lg p-6 text-center text-gray-400">
                    <p>No sales data available to generate a commission report.</p>
                </div>
            );
        }

        const bonusRange = currentWeek ? getBonusRangeForCommission(currentWeek.start) : null;

        return (
            <div
                ref={reportContainerRef}
                className="space-y-6 relative p-6 rounded-2xl"
                style={{
                    background: `
                        radial-gradient(circle at 20% 30%, rgba(255, 69, 0, 0.08) 0%, transparent 40%),
                        radial-gradient(circle at 80% 70%, rgba(255, 99, 71, 0.06) 0%, transparent 40%),
                        radial-gradient(circle at 40% 80%, rgba(150, 150, 150, 0.04) 0%, transparent 30%),
                        #1a1d21
                    `
                }}
            >
                <div
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 rounded-xl backdrop-blur-sm relative overflow-hidden"
                    style={{
                        background: 'rgba(26, 29, 33, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: `
                            0 8px 32px 0 rgba(0, 0, 0, 0.37),
                            inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                        `
                    }}
                >
                    <div
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15) 50%, transparent)'
                        }}
                    />
                    <div className="space-y-2">
                        <h3 className="text-xs uppercase tracking-wide text-gray-400">
                            Reporting Window (Fri → Thu)
                        </h3>
                        <p className="text-lg font-semibold text-white">
                            {currentWeek ? formatCommissionWeekLabel(currentWeek.start, currentWeek.end) : '—'}
                        </p>
                        {bonusRange && (
                            <div className="text-sm text-gray-300">
                                <p className="text-xs uppercase tracking-wide text-gray-400">Bonus Week (Mon → Sun)</p>
                                <p>{formatCommissionWeekLabel(bonusRange.start, bonusRange.end)}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 pdf-hide">
                        <label className="text-xs uppercase tracking-wide text-gray-400">Select Week</label>
                        <div className="w-56">
                            <AppSelect
                                value={selectedWeekKey ?? ''}
                                onChange={value => setSelectedWeekKey(value || null)}
                                options={weekBuckets.map(bucket => ({
                                    value: bucket.key,
                                    label: bucket.label,
                                }))}
                            />
                        </div>
                    </div>
                </div>

                {snapshot && !snapshot.totals.collectionsComplete && (
                    <p className="text-xs text-accent-orange font-semibold">
                        Select and lock a collections bonus for Key before logging or exporting the commission report.
                    </p>
                )}

                {snapshot && snapshot.salespeople.length > 0 ? (
                    snapshot.salespeople.map(block => {
                        const normalized = normalizeName(block.salesperson);
                        const isKey = normalized.toLowerCase() === 'key';
                        const selection = isKey ? collectionsSelections[normalized] ?? '' : '';
                        const locked = isKey ? collectionsLocks[normalized] ?? false : false;
                        return (
                            <CommissionSalespersonBlock
                                key={block.salesperson}
                                snapshot={block}
                                editable={true}
                                notesMap={notesMap}
                                onNotesChange={handleNotesChange}
                                collectionsSelection={selection}
                                onCollectionsBonusChange={isKey ? handleCollectionsBonusChange : undefined}
                                onCollectionsBonusLockToggle={isKey ? handleCollectionsBonusLockToggle : undefined}
                                collectionsOptions={[0, 50, 100]}
                                isKey={isKey}
                                collectionsLocked={locked}
                            />
                        );
                    })
                ) : (
                    <div className="bg-gunmetal rounded-lg p-6 text-center text-gray-400">
                        <p>No sales recorded for this reporting window.</p>
                    </div>
                )}
            </div>
        );
    },
);

TestCommissionReportLive.displayName = 'TestCommissionReportLive';

interface CommissionReportViewerProps {
    snapshot: CommissionReportSnapshot;
}

export const TestCommissionReportViewer: React.FC<CommissionReportViewerProps> = ({ snapshot }) => {
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
        <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 bg-gradient-to-r from-accent-orange via-accent-red to-accent-orange rounded-xl border border-white/10 shadow-2xl px-6 py-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))]"></div>
                    <div className="relative z-10 space-y-3">
                        <span className="text-xs uppercase tracking-[0.35em] text-white/70">Total Commission Payout</span>
                        <p className="text-4xl sm:text-5xl font-bold font-orbitron drop-shadow-xl">
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
                <div className="bg-gunmetal p-4 rounded-xl border border-gunmetal-light space-y-3">
                    <div>
                        <h3 className="text-xs uppercase tracking-wide text-gray-400">
                            Reporting Window (Fri → Thu)
                        </h3>
                        <p className="text-lg font-semibold text-white">{label}</p>
                    </div>
                    <div>
                        <h4 className="text-xs uppercase tracking-wide text-gray-400">Bonus Week (Mon → Sun)</h4>
                        <p className="text-sm text-gray-200">
                            {formatCommissionWeekLabel(bonusRange.start, bonusRange.end)}
                        </p>
                    </div>
                    <p className="text-xs text-gray-500">
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
                <div className="bg-gunmetal rounded-lg p-6 text-center text-gray-400">
                    <p>No sales recorded in this archived report.</p>
                </div>
            )}
        </div>
    );
};

export default TestCommissionReportLive;
