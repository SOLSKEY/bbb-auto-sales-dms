
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
  | 'Sale Prep'
  | 'Collections'
  | 'Reports'
  | 'Data'
  | 'Calendar'
  | 'Appointments & Leads'
  | 'Team Chat'
  | 'CRM'
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
  binNumber?: number | null;
  gps?: string;
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

// --- Appointments & Leads Types ---

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'showed' | 'sold' | 'no_show' | 'cancelled';

export interface CalendarAppointment {
    id: string;
    user_id: string;
    title: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    lead_source: string | null;
    appointment_time: string; // ISO timestamp
    down_payment_budget: number | null;
    notes: string | null;
    status: AppointmentStatus;
    vehicle_ids: string[] | null; // UUIDs of inventory items
    model_interests: string[] | null; // e.g., ['Chrysler 300', 'Camaro']
    created_at: string;
    updated_at: string;
}

export type FollowUpMethod = 'call' | 'text' | 'email' | 'in_person';
export type FollowUpOutcome = 'no_answer' | 'spoke_not_ready' | 'spoke_interested' | 'scheduled_appointment' | 'not_interested';

export interface FollowUpLog {
    date: string; // ISO date
    method: FollowUpMethod;
    outcome: FollowUpOutcome;
    notes: string;
}

export type ArchiveReason = 'no_show' | 'cancelled' | 'vehicle_sold' | 'not_ready';

export interface CalendarLead {
    id: string;
    user_id: string;
    customer_name: string | null;
    customer_phone: string | null;
    lead_source: string | null;
    down_payment_budget: number | null;
    notes: string | null;
    model_interests: string[] | null;
    potential_date: string | null; // ISO date
    was_appointment: boolean;
    original_appointment_id: string | null;
    original_appointment_date: string | null; // ISO timestamp
    archive_reason: ArchiveReason | null;
    follow_ups: FollowUpLog[];
    created_at: string;
    updated_at: string;
}

export interface UserColor {
    user_id: string;
    color: string; // Hex color code
    assigned_by: 'auto' | 'admin';
    updated_at: string;
}

// User color palette for auto-assignment
export const USER_COLOR_PALETTE = [
    { name: 'Amber', hex: '#f59e0b', r: 245, g: 158, b: 11 },
    { name: 'Emerald', hex: '#10b981', r: 16, g: 185, b: 129 },
    { name: 'Violet', hex: '#8b5cf6', r: 139, g: 92, b: 246 },
    { name: 'Pink', hex: '#ec4899', r: 236, g: 72, b: 153 },
    { name: 'Cyan', hex: '#06b6d4', r: 6, g: 182, b: 212 },
    { name: 'Orange', hex: '#f97316', r: 249, g: 115, b: 22 },
] as const;

// Appointment notification types
export type AppointmentReminderType = 'day_before' | 'day_of' | 'one_hour_before';

export interface AppointmentNotification {
    id: string;
    appointmentId: string;
    appointmentTitle: string;
    customer: string;
    appointmentTime: string;
    reminderType: AppointmentReminderType;
    createdAt: string;
    read: boolean;
}
