import type { Sale } from '../types';

/**
 * Get today's date in America/Chicago timezone (Central Standard Time).
 * This ensures consistency across the application for date calculations.
 */
export const getTodayInChicago = (): Date => {
    const now = new Date();
    // Get the date string in Chicago timezone
    const chicagoDateStr = now.toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    // Parse it back to a Date object (this will be in local time, but represents Chicago date)
    const [month, day, year] = chicagoDateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

export const parseSaleDate = (rawDate?: string | null): Date | null => {
    if (!rawDate) return null;
    const trimmed = rawDate.trim();
    if (!trimmed) return null;

    const normalized = trimmed.split(/[T ]/)[0];
    let parsed: Date | null = null;

    const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        const [, yearRaw, monthRaw, dayRaw] = isoMatch;
        const year = Number(yearRaw);
        const month = Number(monthRaw) - 1;
        const day = Number(dayRaw);
        parsed = new Date(year, month, day);
    } else {
        parsed = new Date(normalized);
    }

    if (Number.isNaN(parsed.getTime())) {
        const dateMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
        if (dateMatch) {
            const [, monthRaw, dayRaw, yearRaw] = dateMatch;
            const month = Number(monthRaw) - 1;
            const day = Number(dayRaw);
            let year = Number(yearRaw);
            if (year < 100) year += 2000;
            parsed = new Date(year, month, day);
        }
    }

    if (Number.isNaN(parsed.getTime())) return null;

    // Convert to local midnight to match Supabase date semantics.
    parsed.setHours(0, 0, 0, 0);
    return parsed;
};

export const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const filterAnalyticsSales = (sales: Sale[]): Sale[] => {
    return sales.filter(sale => {
        const normalizedType = sale.saleType?.trim().toLowerCase();
        return !normalizedType || (normalizedType !== 'trade-in' && normalizedType !== 'name change');
    });
};

export interface ParsedSaleEntry {
    sale: Sale;
    date: Date;
}

export interface SalesAggregates {
    parsedSales: ParsedSaleEntry[];
    years: number[];
    totalsByYear: Record<number, number>;
    totalsByYearMonth: Record<number, Record<number, number>>;
    totalsByDate: Record<string, number>;
}

export const buildSalesAggregates = (sales: Sale[]): SalesAggregates => {
    const analyticsSales = filterAnalyticsSales(sales);
    const parsedSales: ParsedSaleEntry[] = [];
    const yearsSet = new Set<number>();
    const totalsByYear: Record<number, number> = {};
    const totalsByYearMonth: Record<number, Record<number, number>> = {};
    const totalsByDate: Record<string, number> = {};

    analyticsSales.forEach(sale => {
        const parsedDate = parseSaleDate(sale.saleDate);
        if (!parsedDate) return;

        parsedSales.push({ sale, date: parsedDate });

        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth() + 1;
        const monthKey = month;
        const dateKey = formatDateKey(parsedDate);

        yearsSet.add(year);

        totalsByYear[year] = (totalsByYear[year] || 0) + 1;

        if (!totalsByYearMonth[year]) {
            totalsByYearMonth[year] = {};
        }
        totalsByYearMonth[year][monthKey] = (totalsByYearMonth[year][monthKey] || 0) + 1;

        totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + 1;
    });

    const years = Array.from(yearsSet).sort((a, b) => a - b);

    return { parsedSales, years, totalsByYear, totalsByYearMonth, totalsByDate };
};

export const getYtdCountForYear = (
    parsedSales: ParsedSaleEntry[],
    year: number,
    referenceDate: Date = new Date()
): number => {
    const referenceMonth = referenceDate.getMonth();
    const referenceDay = referenceDate.getDate();

    return parsedSales.filter(({ date }) => {
        if (date.getFullYear() !== year) return false;
        const saleMonth = date.getMonth();
        const saleDay = date.getDate();
        return saleMonth < referenceMonth || (saleMonth === referenceMonth && saleDay <= referenceDay);
    }).length;
};
