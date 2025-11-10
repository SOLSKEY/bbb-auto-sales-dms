
export type Role = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export type AppSectionKey =
  | 'Dashboard'
  | 'Inventory'
  | 'Sales'
  | 'Collections'
  | 'Reports'
  | 'Data'
  | 'Calendar'
  | 'Team Chat'
  | 'Settings';

export interface UserAccessPolicy {
  userId: string;
  permissions: Record<
    AppSectionKey,
    {
      canView: boolean;
      canEdit: boolean;
    }
  >;
}

export interface Vehicle {
  id?: number;
  vehicleId?: string;
  status: string;
  arrivalDate: string;
  vinLast4: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  exterior: string;
  interior: string;
  upholstery: string;
  bodyStyle: string;
  driveTrain: string;
  mileage: number;
  mileageUnit: string;
  transmission: string;
  fuelType: string;
  engine: string;
  price: number;
  downPayment: number;
  vin: string;
  images: string[];
}


export interface Sale {
  id?: number;
  saleId: string;
  saleDate: string;

  // Fields available for 2025+ sales
  salesperson?: string;
  salespersonSplit?: Array<{
    name: string;
    share: number;
  }>;
  salePrice?: number;
  saleDownPayment?: number;
  saleType?: 'Sale' | 'Trade-in' | 'Name Change' | 'Cash Sale';
  stockNumber?: string;
  accountNumber?: string;
  
  // Vehicle details, also optional for historical records
  arrivalDate?: string;
  vinLast4?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  exterior?: string;
  interior?: string;
  upholstery?: string;
  bodyStyle?: string;
  driveTrain?: string;
  mileage?: number;
  mileageUnit?: string;
  transmission?: string;
  fuelType?: string;
  engine?: string;
  price?: number; 
  downPayment?: number;
  vin?: string;
  images?: string[];
}


export interface CollectionAccount {
    id: number;
    customerName: string;
    vehicleName: string;
    totalAmount: number;
    amountPaid: number;
    dueDate: string;
    status: 'Paid' | 'Current' | 'Overdue';
    paymentType: 'Cash' | 'Zelle' | 'Card' | 'Financed';
}

export interface UserAccount {
    id: number;
    name: string;
    username: string;
    password: string;
    phone: string;
}

// FIX: Renamed from CollectionRecord to DailyCollectionSummary and property boa to boaZelle to match usage in other files.
export interface DailyCollectionSummary {
    date: string;
    day: string;
    payments: number;
    lateFees: number;
    total: number;
    boaZelle: number | null;
}

// FIX: Renamed from DelinquencyRecord to DailyDelinquencySummary to match usage in other files.
export interface DailyDelinquencySummary {
    date: string;
    overdueAccounts: number;
    openAccounts: number;
    overdueRate: number;
}


export interface CalendarEvent {
    id: number;
    title: string;
    date: Date;
    salesperson: string;
    customer: string;
    createdBy: string;
}

export interface ChatMessage {
    id: string;
    sender: string;
    senderId?: string;
    isAI: boolean;
    message: string;
    timestamp: string;
}

// --- Report Specific Types ---

export interface Payment { id: number; amount: string; acc: string };
export interface Check { id: number; amount: string; number: string };
export interface Cost { id: number; description: string; amount: string };

export const BILL_DENOMINATIONS = ['100', '50', '20', '10', '5', '1'] as const;
export type BillDenomination = typeof BILL_DENOMINATIONS[number];
export type Bills = Record<BillDenomination, string>;

export interface DailyClosingReportState {
    date: string;
    adimsTotal: string;
    lateFees: string;
    costs: Cost[];
    nashvillePayments: Payment[];
    smyrnaPayments: Payment[];
    checks: Check[];
    bills: Bills;
}

export interface CommissionReportRowSnapshot {
    key: string;
    sequence: number;
    saleId: string;
    saleDate: string;
    saleDateDisplay: string;
    accountNumber: string;
    salesperson: string;
    vehicle: string;
    vinLast4: string;
    trueDownPayment: number;
    baseCommission: number;
    adjustedCommission: number;
    overrideApplied: boolean;
    overrideDetails: string | null;
    notes: string;
    saleType?: string;
}

export interface CommissionSalespersonSnapshot {
    salesperson: string;
    rows: CommissionReportRowSnapshot[];
    totalAdjustedCommission: number;
    collectionsBonus?: number;
    weeklySalesCount?: number;
    weeklySalesCountOverThreshold?: number;
    weeklySalesBonus?: number;
}

export interface CommissionReportSnapshot {
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
    salespeople: CommissionSalespersonSnapshot[];
    totals: {
        totalCommission: number;
        collectionsBonus?: number;
        bonusWeeklySalesCount?: number;
        bonusWeeklySalesOver5?: number;
        bonusWeeklySalesDollars?: number;
        collectionsComplete?: boolean;
    };
}

export interface LoggedReport<T = any> {
    id: string;
    type: string;
    loggedAt: string;
    reportDate: string;
    data: T;
}
