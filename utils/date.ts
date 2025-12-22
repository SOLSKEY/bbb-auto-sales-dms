const ISO_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const MDY_DATE_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;

const createLocalDate = (year: number, monthIndex: number, day: number): Date | null => {
    const date = new Date(year, monthIndex, day);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

export const parseDateStringToUtc = (
    value: string | null | undefined,
): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const primarySection = trimmed.split(/[T ]/)[0];

    const isoMatch = primarySection.match(ISO_DATE_PATTERN);
    if (isoMatch) {
        const [, yearStr, monthStr, dayStr] = isoMatch;
        const year = Number(yearStr);
        const month = Number(monthStr) - 1;
        const day = Number(dayStr);
        return createLocalDate(year, month, day);
    }

    const mdYMatch = primarySection.match(MDY_DATE_PATTERN);
    if (mdYMatch) {
        const [, monthStr, dayStr, yearStr] = mdYMatch;
        let year = Number(yearStr);
        if (yearStr.length === 2) {
            year += year >= 70 ? 1900 : 2000;
        }
        const month = Number(monthStr) - 1;
        const day = Number(dayStr);
        return createLocalDate(year, month, day);
    }

    const parsed = new Date(primarySection);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
};

export const toUtcMidnight = (date: Date): Date => {
    const result = new Date(date.getTime());
    result.setHours(0, 0, 0, 0);
    return result;
};

export const getWeekStartUtc = (date: Date): Date => {
    const result = toUtcMidnight(date);
    const day = result.getDay();
    const diff = (day + 6) % 7;
    result.setDate(result.getDate() - diff);
    return result;
};

export const getWeekRangeForDate = (date: Date) => {
    const start = getWeekStartUtc(date);
    const end = addUtcDays(start, 6);
    return { start, end };
};

export const addUtcDays = (date: Date, days: number): Date => {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
};

const pad = (value: number) => value.toString().padStart(2, '0');

export const formatDateKey = (date: Date): string => {
    const normalized = toUtcMidnight(date);
    const year = normalized.getFullYear();
    const month = pad(normalized.getMonth() + 1);
    const day = pad(normalized.getDate());
    return `${year}-${month}-${day}`;
};
