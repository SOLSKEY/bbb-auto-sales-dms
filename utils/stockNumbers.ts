import type { Sale } from '../types';
import { filterAnalyticsSales, parseSaleDate } from './salesAnalytics';

export type StockPrefix = 'N' | 'O' | 'D' | 'F' | 'CH';

export const STOCK_PREFIXES: StockPrefix[] = ['N', 'O', 'D', 'F', 'CH'];

export const getStockPrefix = (make?: string): StockPrefix => {
    if (!make) return 'O';
    const normalized = make.toLowerCase();
    if (normalized.includes('nissan')) return 'N';
    if (normalized.includes('dodge')) return 'D';
    if (normalized.includes('ford')) return 'F';
    if (normalized.includes('chevrolet') || normalized.includes('chevy')) return 'CH';
    return 'O';
};

export const formatStockNumber = (prefix: StockPrefix, year: number, serial: number) => {
    const yearSuffix = String(year).slice(-2).padStart(2, '0');
    const serialString = String(serial).padStart(2, '0');
    return `${prefix}${yearSuffix}-${serialString}`;
};

const normalizeStockPrefixFromStockNumber = (rawPrefix: string): StockPrefix | null => {
    const upper = rawPrefix.toUpperCase();
    switch (upper) {
        case 'N':
            return 'N';
        case 'O':
            return 'O';
        case 'D':
            return 'D';
        case 'F':
            return 'F';
        case 'CH':
        case 'C':
            return 'CH';
        default:
            return null;
    }
};

interface StockAccumulator {
    year: number;
    serial: number;
    saleTime: number;
}

export interface NextStockNumberEntry {
    formatted: string;
    year: number;
    serial: number;
}

export interface NextStockNumbersResult {
    nextByPrefix: Record<StockPrefix, NextStockNumberEntry>;
    latestYear: number | null;
}

export const computeNextAccountNumber = (sales: Sale[]): number | null => {
    let highest = -Infinity;
    sales.forEach(sale => {
        const raw = sale.saleId ?? sale.accountNumber;
        if (!raw) return;
        const numeric = Number.parseInt(String(raw).replace(/\D/g, ''), 10);
        if (!Number.isNaN(numeric) && numeric > highest) {
            highest = numeric;
        }
    });
    return Number.isFinite(highest) ? highest + 1 : null;
};

export const computeNextStockNumbers = (sales: Sale[]): NextStockNumbersResult => {
    const analyticsSales = filterAnalyticsSales(sales);
    const sortedSales = analyticsSales
        .map(sale => {
            const date = parseSaleDate(sale.saleDate);
            return { sale, date, time: date ? date.getTime() : -Infinity };
        })
        .sort((a, b) => a.time - b.time);

    const fallbackCounts: Record<string, number> = {};
    const latestByPrefix: Partial<Record<StockPrefix, StockAccumulator>> = {};

    sortedSales.forEach(({ sale, date, time }) => {
        const expectedPrefix = getStockPrefix(sale.make);
        const saleYear = date ? date.getFullYear() : new Date().getFullYear();

        const stockNumberRaw = sale.stockNumber?.toString().trim();
        let prefixFromStock: StockPrefix | null = null;
        let stockYear: number | null = null;
        let stockSerial: number | null = null;

        if (stockNumberRaw) {
            const match = stockNumberRaw.toUpperCase().match(/^([A-Z]{1,2})(\d{2})-(\d+)$/);
            if (match) {
                const [, prefixPart, yearPart, serialPart] = match;
                const normalizedPrefix = normalizeStockPrefixFromStockNumber(prefixPart);
                if (normalizedPrefix) {
                    prefixFromStock = normalizedPrefix;
                    const yearParsed = Number.parseInt(yearPart, 10);
                    stockYear = yearParsed >= 0 ? 2000 + yearParsed : saleYear;
                    stockSerial = Number.parseInt(serialPart, 10);
                }
            }
        }

        const prefix = prefixFromStock ?? expectedPrefix;
        const effectiveYear = stockYear ?? saleYear;
        let serial = stockSerial;

        if (serial === null || Number.isNaN(serial)) {
            const fallbackKey = `${prefix}-${effectiveYear}`;
            fallbackCounts[fallbackKey] = (fallbackCounts[fallbackKey] || 0) + 1;
            serial = fallbackCounts[fallbackKey];
        }

        const current = latestByPrefix[prefix];
        const saleTime = time;
        if (
            !current ||
            effectiveYear > current.year ||
            (effectiveYear === current.year && saleTime > current.saleTime) ||
            (effectiveYear === current.year && saleTime === current.saleTime && serial > current.serial)
        ) {
            latestByPrefix[prefix] = { year: effectiveYear, serial, saleTime };
        }
    });

    const result: Record<StockPrefix, NextStockNumberEntry> = {} as Record<StockPrefix, NextStockNumberEntry>;
    const yearsForCard: number[] = [];
    const currentYear = new Date().getFullYear();

    STOCK_PREFIXES.forEach(prefix => {
        const latest = latestByPrefix[prefix];
        let baseYear = latest ? latest.year : currentYear;
        let nextSerial = latest ? latest.serial + 1 : 1;

        if (latest && latest.year < currentYear) {
            baseYear = currentYear;
            nextSerial = 1;
        }

        yearsForCard.push(baseYear);
        result[prefix] = {
            formatted: formatStockNumber(prefix, baseYear, nextSerial),
            year: baseYear,
            serial: nextSerial,
        };
    });

    const latestYear = yearsForCard.length ? Math.max(...yearsForCard) : null;

    return { nextByPrefix: result, latestYear };
};

export const getNextStockNumberForMake = (sales: Sale[], make?: string): NextStockNumberEntry | null => {
    const { nextByPrefix } = computeNextStockNumbers(sales);
    const prefix = getStockPrefix(make);
    return nextByPrefix[prefix] ?? null;
};
