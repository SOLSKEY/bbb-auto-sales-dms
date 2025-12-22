import { addUtcDays, formatDateKey } from './date';

export interface CommissionOverrideResult {
    amount: number;
    overrideApplied: boolean;
    details: string | null;
}

export const getCommissionWeekStart = (input: Date): Date => {
    const date = new Date(input.getTime());
    date.setHours(0, 0, 0, 0);
    const day = date.getDay(); // 0 Sun … 6 Sat
    const diff = (day - 5 + 7) % 7; // 5 = Friday
    date.setDate(date.getDate() - diff);
    return date;
};

export const getCommissionWeekRange = (date: Date) => {
    const start = getCommissionWeekStart(date);
    const end = addUtcDays(start, 6);
    return { start, end };
};

export const calculateBaseCommission = (trueDownPayment: number): number => {
    if (trueDownPayment <= 0) return 0;
    if (trueDownPayment <= 3000) return 100;
    return trueDownPayment * 0.05;
};

const clampCurrency = (value: number) =>
    Number.isFinite(value) ? Math.max(0, Number.parseFloat(value.toFixed(2))) : 0;

export const applyCommissionOverride = (
    baseCommission: number,
    notes: string | undefined | null
): CommissionOverrideResult => {
    if (!notes) {
        return { amount: clampCurrency(baseCommission), overrideApplied: false, details: null };
    }

    const normalized = notes.toLowerCase();

    // Ratio pattern e.g. "50/50 split"
    const ratioMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (ratioMatch) {
        const first = Number.parseFloat(ratioMatch[1]);
        const second = Number.parseFloat(ratioMatch[2]);
        if (Number.isFinite(first) && Number.isFinite(second) && first >= 0 && second > 0) {
            const share = first / (first + second);
            const amount = clampCurrency(baseCommission * share);
            return {
                amount,
                overrideApplied: true,
                details: `Applied ${share * 100}% from ratio ${ratioMatch[1]}/${ratioMatch[2]}`,
            };
        }
    }

    // Percentage pattern e.g. "pay 60%"
    const percentMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
        const percent = Number.parseFloat(percentMatch[1]);
        if (Number.isFinite(percent)) {
            const share = percent / 100;
            const amount = clampCurrency(baseCommission * share);
            return {
                amount,
                overrideApplied: true,
                details: `Applied ${percent}% override`,
            };
        }
    }

    // Fixed amount pattern when note includes "override" or "payout" keyword.
    if (normalized.includes('override') || normalized.includes('payout')) {
        const amountMatch = normalized.match(/\$?\s*(\d+(?:\.\d+)?)/);
        if (amountMatch) {
            const overrideValue = Number.parseFloat(amountMatch[1]);
            if (Number.isFinite(overrideValue)) {
                return {
                    amount: clampCurrency(overrideValue),
                    overrideApplied: true,
                    details: `Override amount ${overrideValue}`,
                };
            }
        }
    }

    return { amount: clampCurrency(baseCommission), overrideApplied: false, details: null };
};

export const formatCommissionWeekLabel = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString(undefined, options)} → ${end.toLocaleDateString(undefined, options)}`;
};

export const buildWeekKey = (date: Date) => formatDateKey(getCommissionWeekStart(date));
