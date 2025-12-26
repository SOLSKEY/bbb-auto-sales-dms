import type { Vehicle, Sale, CollectionAccount, CalendarEvent, ChatMessage, DailyCollectionSummary, DailyDelinquencySummary, User } from './types';

// Helper functions that might be used elsewhere, retaining them.
const parseCurrency = (s: string) => parseFloat(s.replace(/[^0-9.-]+/g,""));
const parseMileage = (s: string) => parseInt(s.replace(/,/g, ''), 10);

// Data constants are initialized as empty arrays to prevent app from crashing due to missing data.
// The original data file provided was incomplete.
export const INVENTORY_DATA: Vehicle[] = [];

export const SALES_DATA: Sale[] = [];

export const COLLECTIONS_DATA: CollectionAccount[] = [];

export const DAILY_COLLECTION_SUMMARIES: DailyCollectionSummary[] = [];

export const DAILY_DELINQUENCY_SUMMARIES: DailyDelinquencySummary[] = [];

export const CALENDAR_EVENTS: CalendarEvent[] = [];

export const CHAT_MESSAGES: ChatMessage[] = [];

// USERS has some default data to prevent UI components like dropdowns from breaking.
export const USERS: User[] = [
    { id: 'seed-admin', name: 'Admin User', role: 'admin' },
    { id: 'seed-sales', name: 'Sales Person A', role: 'sales' },
    { id: 'seed-collections', name: 'Collections Agent', role: 'collections' },
];

// Reconstructed from component usage.
export const REPORT_TYPES: string[] = ['Daily Closing', 'Commission', 'Inventory Age', 'Sales Performance'];

export const DATA_TABS: string[] = ['Inventory', 'Sales', 'Payments', 'Delinquency', 'Collections Bonus', 'Auction'];

export const INVENTORY_STATUS_VALUES = [
    'Available',
    'Available (Pending Title)',
    'Deposit',
    'Repairs',
    'Cash',
];
