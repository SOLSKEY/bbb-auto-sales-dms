# BBB Auto Sales - Dealership Management System (DMS)
## Product Requirements Document - React Native iOS Application

**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Prepared For:** React Native iOS Development

---

## 1. EXECUTIVE SUMMARY

### 1.1 Project Overview
BBB Auto Sales DMS is a comprehensive dealership management system designed specifically for Buy Here Pay Here (BHPH) auto dealerships. The application manages inventory, sales transactions, collections, commission calculations, reporting, and calendar scheduling. This PRD details the complete system architecture and requirements for rebuilding this web application as a native iOS application using React Native.

### 1.2 Target Users
- **Dealership Administrators**: Full system access for managing all operations
- **Sales Personnel**: Limited access for viewing sales data and managing appointments
- **Collections Agents**: Access to collections and payment tracking features

### 1.3 Core Value Proposition
- **Unified Platform**: Single application for all dealership operations
- **Real-time Data**: Immediate access to sales, inventory, and collections metrics
- **Commission Automation**: Automated commission calculations based on complex business rules
- **Mobile-First**: iOS native experience optimized for on-the-go dealership management

---

## 2. TECHNICAL ARCHITECTURE

### 2.1 Technology Stack

**Frontend (React Native iOS):**
- React Native (latest stable)
- TypeScript for type safety
- React Navigation for routing
- React Context API for state management
- AsyncStorage for local caching
- Date-fns or similar for date manipulation

**Backend & Database:**
- Supabase (PostgreSQL)
- Supabase Auth for authentication
- Supabase Realtime for live updates
- Row Level Security (RLS) policies

**External Services:**
- NHTSA VIN Decoder API (vehicle information)
- Supabase Edge Functions (PDF generation)
- Supabase Storage (vehicle images)

### 2.2 Database Schema

**Core Tables:**

1. **Inventory**
   - Primary Key: `id` (auto-increment) or `VIN` (unique)
   - Fields: Vehicle ID, Status, Arrival Date, VIN Last 4, Year, Make, Model, Trim, Exterior, Interior, Upholstery, Body Style, Drive Train, Mileage, Mileage Unit, Transmission, Fuel Type, Engine, Price, Down Payment, VIN, image_urls (array)
   - Status Values: "Available", "Available (Pending Title)", "Deposit", "Repairs", "Cash", "Sold"

2. **Sales**
   - Primary Key: `account_number` (sale ID)
   - Fields: Sale Date, account_number (unique identifier), Stock #, Type (Sale/Trade-in/Name Change/Cash Sale), Salesman, Salesperson Split (JSON array), True Down Payment, VIN Last 4, Year, Make, Model, Trim, Exterior, Interior, Upholstery, Mileage, Mileage Unit, Price, Down Payment, VIN
   - Relationships: Links to Inventory via VIN

3. **Payments** (Daily Collections Summary)
   - Primary Key: `Date` (unique constraint)
   - Fields: Date, Payments (decimal), Late Fees (decimal), BOA (Bank of America/Zelle payments)
   - Purpose: Daily payment aggregates for collections tracking

4. **Delinquency** (Daily Delinquency Summary)
   - Primary Key: `Date` (unique constraint)
   - Fields: Date, Overdue Accounts (integer), Open Accounts (integer)
   - Purpose: Daily snapshot of account status

5. **Users** (Dealership Personnel)
   - Fields: id, Name, Username, Password, Phone
   - Note: Not for authentication - used for salesperson dropdowns and assignment

6. **DailyClosingReportsLog**
   - Fields: id, type, loggedAt, reportDate, data (JSONB)
   - Purpose: Historical daily closing reports

7. **CommissionReportsLog**
   - Fields: id, type, loggedAt, reportDate, data (JSONB)
   - Purpose: Historical commission reports with full calculations

8. **auth.users** (Supabase Auth)
   - Authentication table with user_metadata containing:
     - role: 'admin' | 'user'
     - username: Display name
   - email and password handled by Supabase Auth

### 2.3 Data Model Types

```typescript
// Core Domain Types
type Role = 'admin' | 'user';

interface User {
  id: string;
  name: string;
  role: Role;
}

type AppSectionKey = 
  | 'Dashboard'
  | 'Inventory'
  | 'Sales'
  | 'Collections'
  | 'Reports'
  | 'Data'
  | 'Calendar'
  | 'Team Chat'
  | 'Settings';

interface UserAccessPolicy {
  userId: string;
  permissions: Record<AppSectionKey, {
    canView: boolean;
    canEdit: boolean;
  }>;
}

interface Vehicle {
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

interface Sale {
  id?: number;
  saleId: string; // account_number
  saleDate: string;
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
  
  // Vehicle details (copied from inventory at time of sale)
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

interface DailyCollectionSummary {
  date: string;
  day: string;
  payments: number;
  lateFees: number;
  total: number;
  boaZelle: number | null;
}

interface DailyDelinquencySummary {
  date: string;
  overdueAccounts: number;
  openAccounts: number;
  overdueRate: number;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  salesperson: string;
  customer: string;
  createdBy: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  isAI: boolean;
  message: string;
  timestamp: string;
}

// Report Types
interface Payment {
  id: number;
  amount: string;
  acc: string;
}

interface Check {
  id: number;
  amount: string;
  number: string;
}

interface Cost {
  id: number;
  description: string;
  amount: string;
}

type BillDenomination = '100' | '50' | '20' | '10' | '5' | '1';
type Bills = Record<BillDenomination, string>;

interface DailyClosingReportState {
  date: string;
  adimsTotal: string;
  lateFees: string;
  costs: Cost[];
  nashvillePayments: Payment[];
  smyrnaPayments: Payment[];
  checks: Check[];
  bills: Bills;
}

interface CommissionReportRowSnapshot {
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

interface CommissionSalespersonSnapshot {
  salesperson: string;
  rows: CommissionReportRowSnapshot[];
  totalAdjustedCommission: number;
  collectionsBonus?: number;
  weeklySalesCount?: number;
  weeklySalesCountOverThreshold?: number;
  weeklySalesBonus?: number;
}

interface CommissionReportSnapshot {
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
```

---

## 3. AUTHENTICATION & AUTHORIZATION

### 3.1 Authentication Flow

**Login Process:**
1. User enters email and password
2. Supabase Auth validates credentials
3. Session token stored securely (iOS Keychain via Supabase SDK)
4. User metadata retrieved (role, username)
5. Navigation to Dashboard upon success

**Session Management:**
- Automatic token refresh via Supabase SDK
- Persistent login across app restarts
- Logout clears all local session data

### 3.2 Role-Based Access Control

**Admin Role:**
- Full access to all features
- Can view and edit all sections
- Can create/delete users
- Can log reports
- Can modify inventory and mark vehicles as sold
- Can delete records

**User Role (Basic):**
- Can view: Dashboard, Inventory, Sales, Collections, Calendar, Team Chat
- Cannot view: Settings, Reports, Data management
- Cannot edit any data
- Cannot mark vehicles as sold
- Cannot delete records
- Read-only access to most features

**Permission Matrix:**

| Feature | Admin | User |
|---------|-------|------|
| Dashboard | View | View |
| Inventory List | View/Edit | View |
| Add Inventory | Yes | No |
| Edit Vehicle | Yes | No |
| Delete Vehicle | Yes | No |
| Mark as Sold | Yes | No |
| Sales Analytics | View | View |
| Collections View | View/Edit | View |
| Log Collections Data | Yes | No |
| Reports View | View/Edit | No Access |
| Log Reports | Yes | No Access |
| Data Management | View/Edit | No Access |
| Calendar | View/Edit Own | View/Edit Own |
| Team Chat | View/Send | View/Send |
| Settings | Full Access | No Access |
| User Management | Full Access | No Access |

### 3.3 Data Security

- Row Level Security (RLS) policies on all Supabase tables
- Client-side permission checks before rendering UI elements
- API calls validate user permissions server-side
- Sensitive operations require admin role verification

---

## 4. CORE FEATURES & FUNCTIONALITY

### 4.1 Dashboard

**Purpose:** Executive overview of dealership operations with key performance indicators.

**Key Metrics Displayed:**

1. **Sales Metrics:**
   - Sales Today (count)
   - Sales This Week (count)
   - Year-to-Date Sales (count)
   - Next Account Number (auto-generated)

2. **Inventory Metrics:**
   - Total Inventory Count
   - BHPH (Buy Here Pay Here) Units
   - Cash Units
   - Next Stock Numbers (by manufacturer prefix: N, O, D, F, CH)

3. **Collections Metrics:**
   - Open Accounts (current count)
   - Week-to-Date Payments ($)
   - Today's Overdue Accounts
   - Delinquency Rate (%)

**Visualizations:**

1. **YTD Sales Comparison Chart**
   - Compares current year vs. previous year
   - Bar chart showing monthly progress
   - Percentage difference indicators

2. **YTD Cumulative Sales Chart**
   - Line chart showing running total of sales
   - Overlays current year and prior year
   - Shows trajectory toward year-end goals

3. **Year-over-Year Comparison Table**
   - Tabular view of yearly sales totals
   - Percentage growth/decline indicators
   - Historical trends analysis

4. **Monthly Sales Comparison Chart**
   - Multi-year line chart comparing months
   - Shows seasonal patterns
   - Identifies best/worst performing months

5. **Collections Weekly Forecast**
   - Predicts expected weekly payments
   - Based on historical per-account averages
   - Shows week-to-date progress vs. forecast

6. **Collections Delinquency Chart**
   - Tracks overdue accounts over time
   - Delinquency rate percentage
   - Identifies trends in collections performance

**Business Logic:**

- **Next Account Number Calculation:** 
  - Scans all sales records
  - Extracts numeric portion of account numbers
  - Returns highest + 1

- **Next Stock Number Calculation:**
  - Stock numbers format: `{PREFIX}{YY}-{SERIAL}`
  - Prefixes by make:
    - N = Nissan
    - O = Other (default)
    - D = Dodge
    - F = Ford
    - CH = Chevrolet/Chevy
  - Serial increments within year/prefix combination
  - Resets to 01 on new year

- **Inventory Counts:**
  - Excludes vehicles with status "Sold"
  - BHPH includes: Available, Available (Pending Title), Deposit
  - Cash includes only: Cash status
  - Repairs status excluded from both counts

**Data Refresh:**
- Dashboard loads data on mount
- Collections metrics refresh every time dashboard is visited
- Real-time updates via Supabase subscriptions (optional enhancement)

---

### 4.2 Inventory Management

**Purpose:** Comprehensive vehicle inventory tracking and management.

**Features:**

1. **Inventory List View:**
   - Card-based grid layout (responsive)
   - Each card displays:
     - Primary image (with carousel for multiple images)
     - Year, Make, Model
     - Trim
     - Mileage
     - Exterior color
     - Drivetrain
     - Price (large, prominent)
     - Down payment
     - Status badge (color-coded)
   - Status badge colors:
     - Available: Green
     - Available (Pending Title): Blue
     - Deposit: Amber/Orange
     - Repairs: Orange
     - Cash: Purple
     - Sold: Gray (dimmed, hidden from main list)

2. **Search & Filters:**
   - Search bar: Make, Model, Year, VIN
   - Filter by Make (dropdown)
   - Filter by Model (dependent on selected Make)
   - Filter by Body Style
   - Filter by Down Payment ranges:
     - Up to $2,000
     - $2,001 - $2,500
     - $2,501 - $3,100
     - $3,101 - $3,500
     - $3,501 - $4,000
     - Over $4,000
   - Reset filters button

3. **Inventory Summary Card:**
   - Total count
   - BHPH count
   - Cash count
   - Visually prominent display

4. **Add Vehicle:**
   - Accessible via "Add Inventory" button
   - Opens full-screen modal form
   - VIN entry triggers auto-decode via NHTSA API
   - Auto-populates: Year, Make, Model, Trim, Body Style, Drive Train, Engine, Fuel Type, Transmission
   - Manual entry required for:
     - Status (dropdown)
     - Arrival Date (date picker)
     - Exterior Color (text)
     - Interior Color (text)
     - Upholstery (dropdown: Cloth, Leather, Other)
     - Mileage (numeric)
     - Price (currency)
     - Down Payment (currency)
     - Images (upload/URL entry)
   - VIN Last 4 auto-extracted
   - Vehicle ID auto-generated: `{YY}{Model}{VINLast4}`

5. **Edit Vehicle:**
   - Accessible via Edit button on vehicle card
   - Opens modal with pre-populated data
   - All fields editable
   - Save updates Supabase and local state
   - Image management:
     - Add new image URLs
     - Remove existing images
     - Reorder images (first becomes primary)

6. **View Vehicle Details:**
   - Click on vehicle card title or image
   - Opens full-screen modal with:
     - Large image carousel
     - Complete vehicle details
     - Pricing information
     - VIN information
   - Read-only view

7. **Mark as Sold:**
   - Accessible via "Sold" button (admin only)
   - Opens Mark Sold modal with fields:
     - Primary Salesperson (dropdown from Users table)
     - Salesperson Split (optional):
       - Add multiple salespeople
       - Each with name and percentage share
       - Must total 100%
     - True Down Payment (currency - actual cash received)
     - Sale Type (dropdown):
       - Sale (default)
       - Trade-in
       - Name Change
       - Cash Sale
     - Stock Number (auto-suggested based on make)
     - Account Number (auto-suggested, sequential)
   - On confirm:
     - Updates vehicle status to "Sold"
     - Creates new Sale record
     - Copies all vehicle data to Sale record
     - Vehicle disappears from main inventory view

8. **Delete Vehicle:**
   - Accessible via trash icon (admin only)
   - Confirmation modal required
   - Permanently removes from database
   - Cannot delete sold vehicles (must revert sale first)

**Validation Rules:**
- VIN: Must be exactly 17 characters
- Year: Must be 4-digit number, reasonable range (1980-current+2)
- Mileage: Positive integer only
- Price/Down Payment: Positive numbers, formatted as currency
- Required fields: VIN, Make, Model, Year, Status

**Image Handling:**
- Images stored as array of URLs in database
- Support for Supabase Storage URLs
- First image in array is primary (displayed in card)
- Carousel navigation for multiple images
- Image counter (e.g., "2 / 5")

---

### 4.3 Sales Analytics

**Purpose:** Comprehensive sales performance tracking and visualization.

**Features:**

1. **Top-Level Summary Cards:**
   - Next Account Number (large, prominent)
   - Next Stock Numbers (by prefix: N, O, D, F, CH)
   - Current Year's Total Sales
   - Today's Sales
   - This Week's Sales
   - Days Into Current Year
   - Record Sales on One Day
   - Most Sales in One Month

2. **Year-to-Date Sales Comparison:**
   - Side-by-side comparison of current vs. prior year
   - Month-by-month breakdown
   - Cumulative totals
   - Percentage change indicators
   - Visual color coding (green=up, red=down)

3. **YTD Cumulative Sales Chart:**
   - Line chart showing running total
   - Overlays multiple years for comparison
   - X-axis: Days of year
   - Y-axis: Cumulative sales count
   - Tooltips show exact counts

4. **Year-over-Year Comparison:**
   - Table format showing all years on record
   - Total sales per year
   - Year-over-year growth percentages
   - Sortable columns

5. **Monthly Sales Comparison Chart:**
   - Multi-year line chart
   - X-axis: Months (Jan-Dec)
   - Y-axis: Sales count
   - Different colored lines for each year
   - Legend showing year colors
   - Highlights current month

**Data Calculations:**

- **Week Calculation:** Monday to Sunday
- **Today:** Based on UTC midnight normalization
- **YTD:** January 1 to current date
- **Day of Year:** Calculated from January 1
- **Record Detection:** Scans all historical data for max values

**Business Logic:**

- All dates normalized to UTC midnight for consistent comparison
- Sales without dates excluded from calculations
- Historical data includes all years present in database
- Current year shows partial data (up to today)
- Future months not displayed for current year

---

### 4.4 Collections Management

**Purpose:** Track daily payments, manage delinquency, and forecast collections.

**Features:**

1. **Top-Level Metrics:**
   - Today's Open Accounts
   - Today's Overdue Accounts
   - Today's Delinquency Rate (%)
   - Today's Total Payments ($)
   - Week-to-Date Payments ($)
   - Expected Weekly Total ($, forecasted)
   - Record Daily Payments ($ with date)
   - Record Weekly Payments ($ with date range)

2. **Weekly Payment Mix Chart:**
   - Pie chart showing Cash vs. BOA (Zelle)
   - Current week only
   - Percentages and dollar amounts
   - Color-coded: Cash (green), BOA (red)

3. **Weekly Payments Chart:**
   - Bar chart showing daily payments
   - Last 12 weeks
   - Stacked bars: Payments + Late Fees
   - Color-coded sections
   - Tooltips with exact amounts

4. **Weekly Forecast:**
   - Line chart with historical and projected data
   - Calculation:
     - Historical per-account average = Total payments / Avg open accounts
     - Forecast = Historical avg * Lag(2) open accounts
   - Shows week-to-date progress
   - Indicates if on track to meet forecast

5. **Delinquency Trend Chart:**
   - Line chart showing overdue accounts over time
   - Secondary line for open accounts (context)
   - Last 12 weeks
   - Identifies improving/worsening trends

6. **Log Daily Collections Data (Admin Only):**
   - Modal form with fields:
     - Date (date picker, defaults to today)
     - Payments (currency)
     - Late Fees (currency)
     - BOA (currency - Zelle/bank transfers)
     - Overdue Accounts (integer)
     - Open Accounts (integer)
   - Upserts into Payments and Delinquency tables
   - Refreshes all collections visualizations

7. **Export Collections Report:**
   - Generates PDF report via Edge Function
   - Includes all visible charts and metrics
   - Formatted for printing/sharing
   - Fallback to client-side HTML-to-PDF if server unavailable

**Data Sources:**
- Payments table: Daily payment aggregates
- Delinquency table: Daily account status snapshots
- Both keyed by Date (primary key, unique constraint)

**Business Logic:**

- **Week Definition:** Monday (day 1) to Sunday (day 7), starting at UTC midnight
- **Per-Account Average:** 
  - Sum of all historical weekly payments / Sum of average weekly open accounts
  - Used for forecasting future weeks
- **Lag(2) Open Accounts:** 
  - Uses open account average from 2 weeks prior
  - Accounts for timing delay in collections cycle
- **Delinquency Rate:** Overdue Accounts / Open Accounts * 100
- **Total Payments:** Payments + Late Fees

**Data Validation:**
- All currency fields must be >= 0
- All account counts must be integers >= 0
- Date cannot be in the future
- Upsert prevents duplicate date entries

---

### 4.5 Reports

**Purpose:** Generate, log, and view various dealership reports.

**Report Types:**

1. **Daily Closing Report**
2. **Commission Report** (most complex)
3. **Inventory Age Report** (placeholder)
4. **Sales Performance Report** (placeholder)

**Features:**

1. **Report Type Selector:**
   - Sidebar with list of available reports
   - Click to switch report type

2. **View Toggle:**
   - Live Report: Current data, editable
   - Archived Logs: Historical snapshots, read-only

3. **Log Report (Admin Only):**
   - Captures current report state
   - Saves as immutable snapshot to database
   - Includes timestamp and report date
   - Cannot be edited after logging

4. **Export Report:**
   - Generates PDF version
   - Uses client-side HTML-to-Canvas-to-PDF library
   - Downloads to device
   - Works for both Live and Archived reports

**4.5.1 Daily Closing Report**

**Purpose:** End-of-day cash reconciliation and payment tracking.

**Fields:**

1. **Report Date:** Date picker
2. **Adims Total:** Currency (sum from system)
3. **Late Fees:** Currency
4. **Costs:** Dynamic array
   - Each entry: Description, Amount
   - Add/Remove rows
5. **Nashville Payments:** Dynamic array
   - Each entry: Account #, Amount
   - Add/Remove rows
6. **Smyrna Payments:** Dynamic array
   - Each entry: Account #, Amount
   - Add/Remove rows
7. **Checks:** Dynamic array
   - Each entry: Check #, Amount
   - Add/Remove rows
8. **Cash on Hand (Bills):**
   - $100 bills: Count x $100
   - $50 bills: Count x $50
   - $20 bills: Count x $20
   - $10 bills: Count x $10
   - $5 bills: Count x $5
   - $1 bills: Count x $1
   - Auto-calculates total

**Calculations:**
- Total Cash: Sum of all bill denominations
- Total Payments: Sum of Nashville + Smyrna + Checks
- Grand Total: Adims + Late Fees - Costs + Payments + Cash

**Export Format:**
- PDF with professional layout
- Breakdown of all sections
- Summary totals
- Date and timestamp
- BBB Auto Sales branding

**4.5.2 Commission Report**

**Purpose:** Calculate and track salesperson commissions with complex business rules.

**Features:**

1. **Date Range Selector:**
   - Friday-to-Thursday commission weeks
   - Dropdown shows last 10 weeks
   - Can manually select custom week
   - Auto-loads sales for selected period

2. **Commission Calculation Per Sale:**
   - **Base Commission Logic:**
     ```
     if trueDownPayment <= 0: $0
     if trueDownPayment <= $3,000: $100 flat
     if trueDownPayment > $3,000: trueDownPayment * 5%
     ```
   
   - **Overrides (parsed from sale notes):**
     - **Ratio Split:** "50/50 split" → calculates percentage share
     - **Percentage:** "pay 60%" → applies percentage to base
     - **Fixed Amount:** "override $150" → replaces base with fixed amount
     - Priority: Fixed Amount > Ratio Split > Percentage

3. **Commission Report Table:**
   - Columns:
     - Sequence # (row counter)
     - Sale Date
     - Account Number
     - Salesperson
     - Vehicle (Year Make Model)
     - VIN Last 4
     - True Down Payment ($)
     - Base Commission ($)
     - Adjusted Commission ($)
     - Override Applied (Yes/No)
     - Override Details
     - Sale Type
   - Grouped by Salesperson
   - Sub-totals per salesperson
   - Grand totals at bottom

4. **Bonuses:**
   
   **Collections Bonus (for salesperson "Key" only):**
   - Manual entry by admin
   - Locked once selected
   - Must be locked before logging report
   - Common values: $200-$500 range
   
   **Weekly Sales Bonus:**
   - $50 per sale (within commission week)
   - Additional $50 for 6th+ sale in same week
   - Calculation:
     ```
     bonusSales = count of sales in week
     bonusAmount = (bonusSales * $50) + (max(0, bonusSales - 5) * $50)
     ```

5. **Report Totals:**
   - Total Base Commission
   - Total Adjusted Commission
   - Total Collections Bonus
   - Total Weekly Sales Bonus
   - Grand Total Payout

6. **Report Actions:**
   - **Log Report:** Saves complete snapshot with all calculations
   - **Export PDF:** Downloads formatted PDF with all details

**Business Rules:**

- Commission week: Friday 00:00 to Thursday 23:59
- True Down Payment = saleDownPayment field (not vehicle.downPayment)
- Sales without True Down Payment excluded from commission
- Salesperson must be assigned to receive commission
- Split salespeople share commission based on defined percentages
- Override parsing is case-insensitive
- Trade-ins and name changes may have $0 commission (by design)

**Data Integrity:**
- Logged reports are immutable snapshots
- All calculations frozen at log time
- Original sales data changes don't affect logged reports
- Report date = end date of commission period (Thursday)

---

### 4.6 Data Management

**Purpose:** Direct database table access for advanced data management (admin only).

**Features:**

1. **Tab Navigation:**
   - Inventory
   - Sales
   - Payments
   - Delinquency
   - Auction (placeholder, not implemented)

2. **Data Grid (per tab):**
   - Spreadsheet-like interface
   - All columns visible and scrollable
   - Inline editing (double-click cell)
   - Sort by column (click header)
   - Search/filter (above grid)

3. **Inline Editing:**
   - Double-click cell to edit
   - Enter to save, Escape to cancel
   - Validates data type before saving
   - Updates Supabase in real-time
   - Shows save status (success/error)

4. **Delete Row:**
   - Trash icon at end of each row
   - Confirmation modal required
   - Permanently deletes from database
   - **Sales:** Delete triggers revert (marks vehicle as Available)

5. **Add Row:**
   - "Add New" button above grid
   - Opens modal with empty form
   - All fields available for entry
   - Validates before saving
   - Inserts into Supabase

6. **Export Data:**
   - Download CSV button
   - Exports visible tab data
   - Includes all columns
   - Opens in Excel/Numbers

**Data Tables:**

**Inventory Tab:**
- All vehicle fields editable
- Cannot delete sold vehicles (must revert sale first)
- Changes reflect immediately in Inventory page

**Sales Tab:**
- All sale fields editable
- Delete = Revert Sale (vehicle returns to inventory)
- Historical sales from all years
- Sorted by Sale Date descending (newest first)

**Payments Tab:**
- Date, Payments, Late Fees, BOA
- Date is primary key (unique)
- Updates reflect in Collections page

**Delinquency Tab:**
- Date, Overdue Accounts, Open Accounts
- Date is primary key (unique)
- Updates reflect in Collections page

**Auction Tab:**
- Not implemented in database yet
- Placeholder for future feature

**Permissions:**
- **Admin:** Full CRUD access
- **User:** No access (Settings section hidden)

**Data Validation:**
- Dates: Valid date format, not future
- Currencies: Positive numbers, max 2 decimals
- Integers: Whole numbers only
- Enums: Must match predefined values
- VIN: 17 characters exactly

---

### 4.7 Calendar

**Purpose:** Schedule and manage customer appointments and events.

**Features:**

1. **Full Calendar View:**
   - Month, Week, Day, List views
   - Navigation: Previous, Next, Today
   - Color-coded events
   - Drag-and-drop to reschedule (own events only)

2. **Create Event:**
   - Click on any date/time slot
   - Modal with fields:
     - Title (required)
     - Customer name
     - Salesperson (defaults to current user)
     - Date & Time (datetime picker)
   - Save creates event
   - Event ownership assigned to creator

3. **Edit Event:**
   - Click on existing event
   - Opens modal with pre-filled data
   - Can modify all fields
   - Save updates event
   - **Restriction:** Can only edit own events (or admin can edit all)

4. **Delete Event:**
   - Delete button in edit modal
   - Confirmation required
   - Permanently removes event
   - **Restriction:** Can only delete own events (or admin can delete all)

5. **Drag-and-Drop Reschedule:**
   - Drag event to new date/time
   - Updates automatically
   - **Restriction:** Can only move own events

**Event Ownership:**
- Each event has `createdBy` field (user ID)
- Users can only modify their own events
- Admins can modify any event
- Prevents accidental changes to others' appointments

**Calendar Integration:**
- FullCalendar library for React Native (or equivalent)
- Supports touch gestures (pinch to zoom, swipe to navigate)
- Responsive layout for iPhone screens

**Data Storage:**
- Events stored in Supabase (future enhancement)
- Currently uses local state (not persistent)
- Recommended: Create CalendarEvents table in Supabase

---

### 4.8 Team Chat

**Purpose:** Internal communication tool for dealership staff.

**Current Status:** PLACEHOLDER FEATURE

**Intended Features:**
- Real-time messaging between team members
- Group chats and direct messages
- Message history
- Typing indicators
- Read receipts

**Implementation Notes:**
- Not currently connected to backend
- UI shows placeholder/demo messages
- Recommended: Use Supabase Realtime for chat functionality
- Consider separate table: Messages (id, sender_id, receiver_id, message, timestamp, read)

**Recommended for React Native:**
- Use React Native Gifted Chat library
- WebSocket connection for real-time updates
- Push notifications for new messages
- Image/file sharing support

---

### 4.9 Settings

**Purpose:** System configuration and user management (admin only).

**Sub-Sections:**

1. **Account Settings:**
   - Accessible to all users
   - Change username
   - Change password
   - View email (read-only)
   - Logout button

2. **User Management (Admin):**
   - List all users (from auth.users)
   - Shows: Username, Email, Role
   - Create New User button
   - Edit User (changes role/permissions)
   - Delete User (with confirmation)

3. **Create User Form:**
   - Email (required)
   - Password (required, min 8 characters)
   - Confirm Password
   - Role (dropdown: Admin, User)
   - Username (optional, defaults to email)
   - Creates user via Supabase Admin API
   - Sets user_metadata.role

4. **Edit User Permissions:**
   - Navigate from User Management
   - Shows user details
   - Role selector (Admin/User)
   - Save updates user_metadata
   - Changes take effect on next login

5. **System Preferences (Future):**
   - Dealership name/logo
   - Commission rules configuration
   - Tax rates
   - Default values for forms
   - Backup/Restore

---

## 5. BUSINESS LOGIC & CALCULATIONS

### 5.1 Stock Number Generation

**Format:** `{PREFIX}{YY}-{SERIAL}`

**Prefixes by Make:**
- N = Nissan
- O = Other (default for unknown makes)
- D = Dodge
- F = Ford
- CH = Chevrolet / Chevy
- All other makes default to "O"

**Serial Number Logic:**
1. Parse all existing sales with stock numbers
2. Extract prefix, year, and serial from each
3. Group by prefix + year combination
4. Find highest serial for each group
5. Next stock number = highest serial + 1
6. If new year, reset serial to 01

**Example Sequence:**
- N25-01 (First Nissan in 2025)
- N25-02 (Second Nissan in 2025)
- D25-01 (First Dodge in 2025)
- N26-01 (First Nissan in 2026 - serial resets)

**Edge Cases:**
- Missing or malformed stock numbers: Use fallback counter per prefix/year
- Stock number format variations: Normalize to standard format
- Salesassigned to wrong prefix: Use actual prefix from stock number if available

### 5.2 Account Number Generation

**Format:** Numeric only (e.g., 10001, 10002, 10003)

**Logic:**
1. Scan all sales records (both `saleId` and `accountNumber` fields)
2. Extract numeric portion from each (remove non-digits)
3. Find highest numeric value
4. Next account number = highest + 1

**Starting Point:**
- If no sales exist, start at 10001
- If sales exist but no account numbers, start at 10001

**Validation:**
- Must be positive integer
- Must be unique
- Recommended to enforce uniqueness at database level

### 5.3 Commission Calculation

**Base Commission Formula:**

```typescript
function calculateBaseCommission(trueDownPayment: number): number {
  if (trueDownPayment <= 0) return 0;
  if (trueDownPayment <= 3000) return 100;
  return trueDownPayment * 0.05; // 5%
}
```

**Override Logic (parsed from sale notes):**

Priority order (highest to lowest):
1. Fixed Amount Override
2. Ratio Split
3. Percentage Override

**1. Fixed Amount Override:**
- Trigger keywords: "override", "payout"
- Pattern: `override $150` or `payout 175`
- Extracts dollar amount
- Replaces base commission entirely
- Example: "Override $250" → Commission = $250

**2. Ratio Split:**
- Pattern: `{number}/{number}` (e.g., "50/50 split", "60/40")
- Calculates percentage share
- Applies to base commission
- Example: 
  - Base: $200
  - Note: "50/50 split"
  - Commission: $200 * (50/(50+50)) = $100

**3. Percentage Override:**
- Pattern: `{number}%` (e.g., "pay 60%", "75%")
- Extracts percentage
- Applies to base commission
- Example:
  - Base: $200
  - Note: "pay 60%"
  - Commission: $200 * 0.60 = $120

**Parsing Rules:**
- Case-insensitive matching
- Extracts first occurrence of pattern
- Falls back to base commission if no pattern matches
- Multiple patterns: First matching pattern wins
- Invalid numbers ignored (e.g., "pay %abc" → no override)

**Commission Week Definition:**
- Start: Friday 00:00:00
- End: Thursday 23:59:59
- Based on sale date, not entry date
- Uses UTC midnight for date normalization

**Salesperson Split:**
- If `salespersonSplit` array exists:
  - Split commission according to defined shares
  - Each salesperson's share = commission * (share / 100)
  - Total shares should equal 100% (validation recommended)
- If only `salesperson` field:
  - Full commission to that salesperson

**Collections Bonus:**
- Applies only to salesperson named "Key"
- Admin manually enters amount
- Must be locked before report can be logged
- Typical range: $200-$500
- Appears as separate line item in report
- Not affected by sale-specific overrides

**Weekly Sales Bonus:**
- $50 per sale within commission week
- Additional $50 for 6th sale and beyond
- Formula:
  ```typescript
  const bonusSales = salesCountInWeek;
  const bonus = (bonusSales * 50) + (Math.max(0, bonusSales - 5) * 50);
  ```
- Example:
  - 3 sales in week: 3 * $50 = $150
  - 5 sales in week: 5 * $50 = $250
  - 6 sales in week: (6 * $50) + (1 * $50) = $350
  - 8 sales in week: (8 * $50) + (3 * $50) = $550

**Commission Report Totals:**
```typescript
totalCommission = sum of all adjustedCommissions
totalCollectionsBonus = Key's bonus amount
totalWeeklySalesBonus = sum of all weekly sales bonuses
grandTotal = totalCommission + totalCollectionsBonus + totalWeeklySalesBonus
```

### 5.4 Collections Forecasting

**Weekly Forecast Calculation:**

```typescript
// 1. Calculate historical per-account weekly average
const historicalAverage = totalHistoricalPayments / totalHistoricalOpenAccounts;

// 2. Get lag(2) open accounts (from 2 weeks prior)
const currentWeekStart = getWeekStart(today);
const twoWeeksAgo = subtractWeeks(currentWeekStart, 2);
const lagOpenAccounts = getAverageOpenAccountsForWeek(twoWeeksAgo);

// 3. Forecast expected payments
const expectedWeeklyPayments = historicalAverage * lagOpenAccounts;
```

**Week Definition:**
- Start: Monday 00:00:00
- End: Sunday 23:59:59
- Based on ISO week definition

**Historical Average:**
- Includes all weeks with both payment and delinquency data
- Weekly payments = sum of daily (Payments + Late Fees)
- Average open accounts = average of daily open account values for that week
- Per-account average = sum(weekly payments) / sum(avg weekly open accounts)

**Lag Logic:**
- Uses open account average from 2 weeks prior to forecast current week
- Accounts for typical 2-week cycle in collections
- If lag week data unavailable, falls back to current week's open accounts

**Delinquency Rate:**
```typescript
delinquencyRate = (overdueAccounts / openAccounts) * 100
```

### 5.5 Date Handling

**Critical Requirements:**
- All dates stored in UTC
- All date comparisons at midnight (00:00:00)
- All date displays in local timezone
- Consistent date parsing across application

**Date Normalization Function:**
```typescript
function toUtcMidnight(date: Date): Date {
  const utc = new Date(date);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}
```

**Week Start Calculation:**
```typescript
function getWeekStartUtc(date: Date): Date {
  const normalized = toUtcMidnight(date);
  const dayOfWeek = normalized.getUTCDay(); // 0 = Sunday
  const diff = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek); // Monday = start
  normalized.setUTCDate(normalized.getUTCDate() + diff);
  return normalized;
}
```

**Commission Week Start:**
```typescript
function getCommissionWeekStart(date: Date): Date {
  const normalized = toUtcMidnight(date);
  const dayOfWeek = normalized.getUTCDay(); // 0 = Sunday
  const diff = (dayOfWeek - 5 + 7) % 7; // 5 = Friday
  normalized.setUTCDate(normalized.getUTCDate() - diff);
  return normalized;
}
```

**Date Formatting:**
- Storage: ISO 8601 format (YYYY-MM-DD)
- Display: Localized (MM/DD/YYYY for US)
- Sorting: Always use ISO format for consistency

---

## 6. DATA FLOWS & STATE MANAGEMENT

### 6.1 Authentication Flow

```
1. App Launch
   ↓
2. Check Supabase Session
   ↓
3a. Session Valid → Load User Metadata → Navigate to Dashboard
3b. No Session → Navigate to Login
   ↓
4. User Enters Credentials
   ↓
5. Supabase Auth validates
   ↓
6a. Success → Store Session → Load Metadata → Dashboard
6b. Failure → Show Error → Remain on Login
```

### 6.2 Data Loading Flow

```
App Context Initialization:
1. Session validated
   ↓
2. Load Inventory (from Supabase)
   ↓
3. Load Sales (paginated, 1000 per page)
   ↓
4. Load Users (for dropdowns)
   ↓
5. Load Permissions (from user_metadata.role)
   ↓
6. Set Loading = false
   ↓
7. Render App
```

### 6.3 State Management Strategy

**Global State (React Context):**
- User authentication state
- User role and permissions
- Inventory array
- Sales array
- Users array (dealership personnel)

**Context Providers:**
```typescript
<UserContext.Provider value={{ user, setUser }}>
  <DataContext.Provider value={{ 
    inventory, setInventory,
    sales, setSales,
    users, setUsers,
    revertSale
  }}>
    <App />
  </DataContext.Provider>
</UserContext.Provider>
```

**Local State (Component-Level):**
- Form inputs
- Modal open/close states
- Filter/search values
- Loading indicators
- Error messages
- Selected items (for edit/delete)

**Persistent State (AsyncStorage):**
- User session token (managed by Supabase SDK)
- Last viewed page (for deep linking)
- User preferences (future)

**Data Refresh Strategy:**
- Pull-to-refresh on list views
- Automatic refresh after mutations
- Manual refresh button on dashboard
- Real-time subscriptions (future enhancement)

### 6.4 CRUD Operations Flow

**Create (Add New Record):**
```
1. User clicks "Add" button
   ↓
2. Modal opens with empty form
   ↓
3. User fills fields
   ↓
4. Validate input
   ↓
5. Call Supabase insert()
   ↓
6. On success:
   - Add to local state array
   - Close modal
   - Show success message
7. On error:
   - Show error message
   - Keep modal open
```

**Read (Load Data):**
```
1. Component mounts or user navigates
   ↓
2. Check if data already loaded
   ↓
3. If not loaded, call Supabase select()
   ↓
4. Transform data (mapping Supabase columns to app fields)
   ↓
5. Update local state
   ↓
6. Render UI
```

**Update (Edit Existing Record):**
```
1. User clicks "Edit" on item
   ↓
2. Modal opens with pre-filled form
   ↓
3. User modifies fields
   ↓
4. Validate input
   ↓
5. Call Supabase update()
   ↓
6. On success:
   - Update item in local state array
   - Close modal
   - Show success message
7. On error:
   - Show error message
   - Keep modal open
```

**Delete (Remove Record):**
```
1. User clicks "Delete" on item
   ↓
2. Confirmation modal appears
   ↓
3. User confirms
   ↓
4. Call Supabase delete()
   ↓
5. On success:
   - Remove item from local state array
   - Close modal
   - Show success message
6. On error:
   - Show error message
   - Keep modal open
```

### 6.5 Mark Vehicle as Sold Flow

```
1. Admin clicks "Sold" on vehicle
   ↓
2. Mark Sold modal opens with:
   - Auto-suggested account number
   - Auto-suggested stock number
   - Empty salesperson field
   ↓
3. Admin fills required fields:
   - Salesperson
   - True down payment
   - Sale type
   - (Optional) Salesperson split
   ↓
4. Validate all required fields
   ↓
5. Execute two database operations:
   a. Update vehicle status to "Sold"
   b. Insert new sale record with vehicle data
   ↓
6. On success:
   - Update vehicle in local inventory state
   - Add sale to local sales state
   - Close modal
   - Vehicle disappears from inventory list
7. On error:
   - Show error message
   - Keep modal open
   - Do not update local state
```

### 6.6 Revert Sale Flow

```
1. Admin navigates to Data → Sales
   ↓
2. Admin clicks delete on sale row
   ↓
3. Confirmation modal appears
   ↓
4. Admin confirms revert
   ↓
5. Execute two database operations:
   a. Delete sale record
   b. Update vehicle status to "Available"
   ↓
6. On success:
   - Remove sale from local sales state
   - Update vehicle in local inventory state
   - Close modal
   - Vehicle reappears in inventory list
7. On error:
   - Show error message
   - Keep modal open
```

---

## 7. UI/UX DESIGN GUIDELINES

### 7.1 Design System

**Color Palette:**

Primary Colors:
- Primary Text: `#e5e7eb` (light gray)
- Secondary Text: `#9ca3af` (medium gray)
- Muted Text: `#6b7280` (darker gray)
- Background: `#0a0e14` (near black)
- Glass Panel: `#1b1f26` (dark gray with opacity)

Accent Colors:
- Lava Core (Primary Brand): `#ff6b35` (bright orange-red)
- Lava Warm: `#ff8c42` (lighter orange)
- Lava Cool: `#d95d39` (darker red-orange)

Status Colors:
- Success/Available: `#34d399` (green)
- Warning/Deposit: `#fbbf24` (amber)
- Error/Overdue: `#f87171` (red)
- Info/Pending: `#60a5fa` (blue)
- Purple/Cash: `#a78bfa` (purple)
- Gray/Sold: `#9ca3af` (gray)

Border Colors:
- Border Low: `rgba(255, 255, 255, 0.1)`
- Border High: `rgba(255, 255, 255, 0.2)`

**Typography:**

Font Families:
- Primary: System default (San Francisco on iOS)
- Display/Headers: "Orbitron" or similar tech/modern font
- Monospace: System monospace (for numbers)

Font Sizes:
- XS: 11px (labels, captions)
- SM: 13px (body text, buttons)
- Base: 15px (standard text)
- LG: 18px (section headers)
- XL: 22px (page titles)
- 2XL: 28px (dashboard metrics)
- 3XL: 36px (large metrics)

Font Weights:
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

**Spacing System:**
- Base unit: 4px
- Common values: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px

**Border Radius:**
- SM: 4px (inputs, small buttons)
- Base: 8px (cards, buttons)
- LG: 12px (modals, panels)
- XL: 16px (large cards)
- 2XL: 24px (hero sections)
- Full: 9999px (pills, avatars)

### 7.2 Component Patterns

**Glass Morphism Cards:**
- Semi-transparent background
- Subtle backdrop blur
- Border with low opacity
- Slight box shadow
- Hover effect: Increased border opacity, subtle scale

**Buttons:**
- Primary: Gradient background (lava-core to lava-warm)
- Secondary: Glass card style with border
- Icon-only: Small, circular, glass style
- Disabled: Reduced opacity (40%)

**Inputs:**
- Dark glass background
- Border on focus (lava-core)
- Placeholder in muted color
- Error state: Red border and message
- Success state: Green border

**Modals:**
- Full-screen overlay with blur
- Centered modal panel
- Close button (top-right X)
- Action buttons at bottom (Cancel left, Confirm right)
- Smooth slide-up animation

**Data Tables/Grids:**
- Alternating row backgrounds (subtle)
- Hover row highlight
- Sticky header on scroll
- Sortable columns (tap header)
- Loading skeleton on data fetch

**Status Badges:**
- Rounded pill shape
- Background with 20% opacity
- Border with 40% opacity
- Text in full brightness
- Color-coded by status

**Charts:**
- Dark theme compatible
- Lava-core as primary color
- Gradient fills where appropriate
- Tooltips on touch/hover
- Responsive sizing

### 7.3 Navigation Patterns

**Main Navigation (Sidebar):**
- Left side drawer (swipe from left edge to open)
- Icons + labels for each section
- Active section highlighted
- Admin-only sections shown/hidden based on role
- Logout button at bottom

**Sub-Navigation (Tabs):**
- Horizontal tab bar below header
- Active tab underline (lava-core)
- Swipe between tabs on mobile
- Icon + label on larger screens, icon-only on small

**Header:**
- Page title (left-aligned)
- Action buttons (right-aligned)
- User avatar/menu (far right)
- Background: Glass panel

### 7.4 iOS-Specific Considerations

**Safe Areas:**
- Respect iPhone notch and home indicator
- Use SafeAreaView component
- Extra padding at top and bottom

**Gestures:**
- Swipe back to previous screen
- Pull-to-refresh on lists
- Swipe to delete on rows
- Pinch to zoom on images

**Native Components:**
- Use iOS date/time pickers
- iOS-style alerts and action sheets
- Native keyboard handling
- iOS haptic feedback on actions

**Performance:**
- Lazy load images
- Virtualize long lists
- Debounce search inputs
- Cache static data
- Optimize chart rendering

---

## 8. API INTEGRATION

### 8.1 Supabase Configuration

**Environment Variables:**
```
SUPABASE_URL=https://jhymejbyuvavjsywnwjw.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

**Client Initialization:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
```

### 8.2 Authentication API

**Login:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
})
```

**Logout:**
```typescript
await supabase.auth.signOut()
```

**Get Session:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
```

**Get User Metadata:**
```typescript
const { data: { user } } = await supabase.auth.getUser()
const role = user.user_metadata?.role ?? 'user'
const username = user.user_metadata?.username ?? user.email
```

### 8.3 Database Operations

**Field Mapping:**
- Supabase uses mixed case column names with spaces
- App uses camelCase field names
- Mapping functions translate between formats

**Example Mapping:**
```typescript
const VEHICLE_FIELD_MAP = {
  id: 'id',
  status: 'Status',
  arrivalDate: 'Arrival Date',
  vinLast4: 'Vin Last 4',
  year: 'Year',
  make: 'Make',
  model: 'Model',
  // ... etc
}
```

**Select with Mapping:**
```typescript
const { data, error } = await supabase
  .from('Inventory')
  .select('*')

const mapped = data.map(row => fromSupabase(row, VEHICLE_FIELD_MAP))
```

**Insert with Mapping:**
```typescript
const vehicleForSupabase = toSupabase(newVehicle, VEHICLE_FIELD_MAP)

const { data, error } = await supabase
  .from('Inventory')
  .insert([vehicleForSupabase])
  .select()
```

**Update with Mapping:**
```typescript
const updates = toSupabase(changedFields, VEHICLE_FIELD_MAP)

const { error } = await supabase
  .from('Inventory')
  .update(updates)
  .eq('id', vehicleId)
```

**Delete:**
```typescript
const { error } = await supabase
  .from('Inventory')
  .delete()
  .eq('id', vehicleId)
```

**Complex Queries:**
```typescript
// Paginated sales load
const pageSize = 1000
let page = 0
let allSales = []

while (true) {
  const from = page * pageSize
  const to = from + pageSize - 1
  
  const { data, error } = await supabase
    .from('Sales')
    .select('*')
    .order('"Sale Date"', { ascending: false })
    .range(from, to)
  
  if (!data || data.length === 0) break
  
  allSales.push(...data)
  
  if (data.length < pageSize) break
  page++
}
```

### 8.4 NHTSA VIN Decoder API

**Endpoint:**
```
GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{VIN}?format=json
```

**Usage:**
```typescript
async function decodeVin(vin: string) {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
  
  const response = await fetch(url)
  const data = await response.json()
  
  // Check for errors
  const errorCode = data.Results.find(r => r.Variable === 'Error Code')
  if (errorCode?.Value !== '0') {
    const errorText = data.Results.find(r => r.Variable === 'Error Text')
    throw new Error(errorText?.Value || 'Invalid VIN')
  }
  
  // Extract vehicle data
  const vehicleData = {}
  data.Results.forEach(item => {
    if (VARIABLE_MAP[item.Variable] && item.Value && item.Value !== 'Not Applicable') {
      vehicleData[VARIABLE_MAP[item.Variable]] = item.Value
    }
  })
  
  return vehicleData
}
```

**Mapped Fields:**
- Model Year → year
- Make → make
- Model → model
- Trim → trim
- Body Class → bodyStyle
- Drive Type → driveTrain
- Engine Number of Cylinders → engine
- Fuel Type - Primary → fuelType
- Transmission Style → transmission

### 8.5 Image Storage

**Supabase Storage:**
- Bucket: `vehicle-images`
- Public access
- Upload process:
  1. Generate unique filename
  2. Upload to Supabase Storage
  3. Get public URL
  4. Store URL in vehicle.images array

**Upload Example:**
```typescript
const file = ... // image file from picker
const filename = `${vehicleId}/${Date.now()}.jpg`

const { data, error } = await supabase.storage
  .from('vehicle-images')
  .upload(filename, file, {
    cacheControl: '3600',
    upsert: false
  })

const { data: { publicUrl } } = supabase.storage
  .from('vehicle-images')
  .getPublicUrl(filename)

// Add publicUrl to vehicle.images array
```

---

## 9. ERROR HANDLING & EDGE CASES

### 9.1 Network Errors

**Scenarios:**
- No internet connection
- Supabase service down
- Slow network/timeout

**Handling:**
- Show user-friendly error messages
- Retry button on failures
- Cache data locally when possible
- Offline mode indicator
- Queue mutations for later sync (future enhancement)

### 9.2 Data Validation Errors

**Client-Side Validation:**
- Required fields checked before submission
- Format validation (VIN length, email format, etc.)
- Range validation (year, price, etc.)
- Cross-field validation (password confirmation, percentage sums)

**Server-Side Validation:**
- Database constraints enforce data integrity
- Unique constraints on VIN, account_number, etc.
- Foreign key constraints for relationships
- Check constraints for valid ranges

**User Feedback:**
- Inline error messages below fields
- Field border turns red on error
- Error summary at top of form
- Success confirmation on save

### 9.3 Permission Errors

**Scenarios:**
- User tries to access forbidden page
- User tries to perform unauthorized action
- Role changed while logged in

**Handling:**
- Hide UI elements user can't access
- Redirect to dashboard if accessing forbidden page
- Show "Access Denied" message
- Log user out if session invalid

### 9.4 Data Inconsistency

**Scenarios:**
- Vehicle sold but no sale record
- Sale exists but vehicle not marked sold
- Account number duplicates
- Stock number gaps

**Handling:**
- Revert sale operation should be atomic (both or neither)
- Mark sold operation should be atomic
- Unique constraints at database level
- Manual data repair tools in Data section (admin)

### 9.5 Edge Cases

**Empty States:**
- No inventory: Show "Add your first vehicle" message
- No sales: Show "No sales yet" message
- No collections data: Show "Log your first daily data" message
- No calendar events: Show empty calendar with instructions

**Large Datasets:**
- Paginate sales loading (1000 per page)
- Virtualize long lists (react-window or similar)
- Limit dashboard queries to recent data (last 365 days)
- Lazy load images in galleries

**Concurrent Edits:**
- Optimistic updates for better UX
- Refresh data after save to get latest
- Show warning if data changed while editing (future enhancement)

**Malformed Data:**
- Handle missing required fields gracefully
- Show "N/A" for null/undefined values
- Validate and sanitize all inputs
- Prevent XSS with proper escaping

---

## 10. TESTING REQUIREMENTS

### 10.1 Unit Tests

**Critical Functions:**
- `calculateBaseCommission()` - All scenarios
- `applyCommissionOverride()` - All pattern types
- `computeNextAccountNumber()` - Edge cases
- `computeNextStockNumbers()` - All prefixes
- `toSupabase()` / `fromSupabase()` - Field mapping
- Date normalization functions
- Commission week calculations

### 10.2 Integration Tests

**Authentication Flow:**
- Login success
- Login failure
- Session persistence
- Logout

**CRUD Operations:**
- Add vehicle → appears in inventory
- Edit vehicle → updates in place
- Delete vehicle → removed from list
- Mark sold → creates sale, updates vehicle

**Data Flows:**
- Add vehicle → VIN decode → populate fields
- Mark sold → auto-suggest account/stock numbers
- Revert sale → vehicle returns to inventory
- Log collections → updates charts

### 10.3 UI/UX Tests

**Responsive Design:**
- iPhone SE (small screen)
- iPhone 14 Pro (medium screen)
- iPhone 14 Pro Max (large screen)
- iPad (tablet, future)

**Navigation:**
- All sidebar links work
- Tab navigation switches views
- Back button works
- Deep linking works

**Forms:**
- All required fields validated
- Error messages display correctly
- Success messages display
- Cancel button discards changes

**Permissions:**
- Admin sees all features
- User sees limited features
- Forbidden pages redirect
- Edit buttons hidden for users

### 10.4 Performance Tests

**Load Times:**
- Dashboard loads < 2 seconds
- Inventory list loads < 3 seconds
- Sales data loads < 5 seconds (large dataset)

**Responsiveness:**
- UI remains responsive during data load
- Scroll is smooth (60fps)
- Charts render without lag
- Image loading doesn't block UI

### 10.5 Manual Test Scenarios

1. **End-to-End Sale:**
   - Add vehicle
   - View in inventory
   - Mark as sold
   - Verify sale record created
   - Check dashboard metrics updated

2. **Commission Report:**
   - Select date range
   - Verify sales loaded
   - Check calculations correct
   - Lock collections bonus
   - Export PDF
   - Log report
   - View archived report

3. **Collections Workflow:**
   - Log daily data
   - View updated metrics
   - Check charts updated
   - Export report PDF

4. **User Management:**
   - Create new user
   - Login as new user
   - Verify permissions
   - Change user role
   - Delete user

---

## 11. DEPLOYMENT & INFRASTRUCTURE

### 11.1 Supabase Project Setup

**Database Tables:**
- Inventory
- Sales
- Payments
- Delinquency
- Users (dealership personnel)
- DailyClosingReportsLog
- CommissionReportsLog
- CalendarEvents (recommended addition)
- Messages (recommended addition for chat)

**Row Level Security Policies:**
```sql
-- Inventory: All authenticated users can read, only admins can write
CREATE POLICY "Users can view inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin');

-- Sales: Similar policies
-- Repeat for all tables
```

**Storage Buckets:**
```sql
-- vehicle-images bucket
CREATE BUCKET IF NOT EXISTS vehicle-images
  PUBLIC true
  FILE_SIZE_LIMIT 5242880; -- 5MB
```

### 11.2 Environment Variables

**Required:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

**Optional:**
```
API_URL=https://your-api-server.com (for admin API, if separate)
GEMINI_API_KEY=your_key (if using AI chat feature)
```

### 11.3 iOS App Store Requirements

**App Information:**
- App Name: BBB Auto Sales DMS
- Category: Business
- Keywords: dealership, inventory, sales, BHPH, automotive
- Description: Comprehensive dealership management system for BHPH auto dealers
- Screenshots: Required for all supported iPhone sizes
- Privacy Policy: URL required

**App Capabilities:**
- Internet access (network requests)
- Camera (for photos, if implemented)
- Photo library access (for vehicle images)
- Push notifications (for chat, future)

**Version Management:**
- Semantic versioning (1.0.0, 1.0.1, 1.1.0, etc.)
- Build numbers increment with each submission
- TestFlight for beta testing

### 11.4 CI/CD Pipeline (Recommended)

**GitHub Actions or similar:**
1. Run tests on PR
2. Build app on merge to main
3. Deploy to TestFlight (beta)
4. Manual approval for production
5. Deploy to App Store

---

## 12. FUTURE ENHANCEMENTS

### 12.1 Short-Term (3-6 months)

1. **Push Notifications:**
   - New calendar appointments
   - Daily collections reminders
   - Commission report ready alerts

2. **Offline Mode:**
   - Cache data locally
   - Queue mutations while offline
   - Sync when connection restored

3. **Advanced Search:**
   - Full-text search across all vehicles
   - Saved searches
   - Search history

4. **Bulk Operations:**
   - Bulk import vehicles (CSV)
   - Bulk export data
   - Bulk status updates

5. **Improved Chat:**
   - Real-time messaging via Supabase
   - File/image sharing
   - Message notifications
   - Read receipts

### 12.2 Medium-Term (6-12 months)

1. **Customer Portal:**
   - Customers can view account
   - Make payments online
   - Schedule appointments
   - View purchase history

2. **Payment Processing:**
   - Integrate payment gateway (Stripe, Square)
   - Record payments in app
   - Generate receipts
   - Track payment history

3. **Document Management:**
   - Upload/store title documents
   - Upload/store customer contracts
   - E-signature integration
   - Document templates

4. **Advanced Analytics:**
   - Custom date ranges
   - Export to Excel
   - Trend analysis
   - Forecasting models

5. **Multi-Location:**
   - Support for multiple dealership locations
   - Location-based inventory
   - Location-based reporting
   - Cross-location transfers

### 12.3 Long-Term (12+ months)

1. **AI Features:**
   - Price suggestions based on market data
   - Lead scoring
   - Chatbot for customer inquiries
   - Predictive analytics

2. **Integration with DMS Systems:**
   - Export to QuickBooks
   - Sync with state DMV
   - Integration with CarFax
   - Integration with AutoTrader

3. **Advanced Permissions:**
   - Custom roles beyond admin/user
   - Granular permission system
   - Department-based access
   - Time-based restrictions

4. **Mobile App for Customers:**
   - Companion app for customers
   - Make payments
   - View account status
   - Schedule service

---

## 13. GLOSSARY

**BHPH:** Buy Here Pay Here - dealership that finances vehicle purchases directly

**Account Number:** Unique identifier for each sale transaction, numeric only

**Stock Number:** Unique identifier for each vehicle, format PREFIX+YEAR+SERIAL

**VIN:** Vehicle Identification Number, 17-character alphanumeric code

**True Down Payment:** Actual cash received from customer (may differ from listed down payment)

**Commission Week:** Friday to Thursday period for commission calculations

**Collections Week:** Monday to Sunday period for collections reporting

**Delinquency Rate:** Percentage of accounts that are overdue on payments

**Mark as Sold:** Action to transition vehicle from inventory to sales

**Revert Sale:** Action to undo a sale and return vehicle to inventory

**Glass Morphism:** UI design pattern with semi-transparent, blurred backgrounds

**RLS:** Row Level Security - database-level access control in Supabase

---

## 14. APPENDICES

### 14.1 Complete Status Values Reference

**Vehicle Status:**
- "Available" - Ready for sale
- "Available (Pending Title)" - Awaiting title paperwork
- "Deposit" - Customer has paid deposit
- "Repairs" - Vehicle being repaired (excluded from inventory count)
- "Cash" - Cash sale (not BHPH)
- "Sold" - Sold and removed from active inventory

**Sale Type:**
- "Sale" - Standard BHPH sale
- "Trade-in" - Customer traded in vehicle
- "Name Change" - Title transfer only
- "Cash Sale" - Full payment upfront

### 14.2 Make Prefixes for Stock Numbers

| Make | Prefix |
|------|--------|
| Nissan | N |
| Dodge | D |
| Ford | F |
| Chevrolet | CH |
| Chevy | CH |
| All Others | O |

### 14.3 Commission Calculation Examples

**Example 1: Standard Commission**
- True Down Payment: $4,000
- Base Commission: $4,000 × 5% = $200
- No override: Final = $200

**Example 2: Flat Rate**
- True Down Payment: $2,500
- Base Commission: $100 (under $3,000 threshold)
- No override: Final = $100

**Example 3: Percentage Override**
- True Down Payment: $5,000
- Base Commission: $5,000 × 5% = $250
- Note: "pay 60%"
- Final Commission: $250 × 60% = $150

**Example 4: Ratio Split**
- True Down Payment: $6,000
- Base Commission: $6,000 × 5% = $300
- Note: "50/50 split"
- Final Commission: $300 × (50/100) = $150

**Example 5: Fixed Override**
- True Down Payment: $10,000
- Base Commission: $10,000 × 5% = $500
- Note: "override $350"
- Final Commission: $350

**Example 6: Weekly Sales Bonus**
- Sales in week: 7
- Bonus: (7 × $50) + (2 × $50) = $450
  - First 5 sales: 5 × $50 = $250
  - Sales 6-7: 2 × $50 = $100
  - Total: $350 base + $100 extra = $450

### 14.4 Database Column Name Reference

**Inventory Table:**
```
id (integer, auto-increment)
"Vehicle ID" (text)
"Status" (text)
"Arrival Date" (date)
"Vin Last 4" (text)
"Year" (integer)
"Make" (text)
"Model" (text)
"Trim" (text)
"Exterior" (text)
"Interior" (text)
"Upholstery" (text)
"Body Style" (text)
"Drive Train" (text)
"Mileage" (integer)
"Mileage Unit" (text)
"Transmission" (text)
"Fuel Type" (text)
"Engine" (text)
"Price" (numeric)
"Down Payment" (numeric)
"VIN" (text, unique)
"image_urls" (text[])
```

**Sales Table:**
```
id (integer, auto-increment)
"Sale Date" (date)
"account_number" (text, primary key)
"Stock #" (text)
"Type" (text)
"Salesman" (text)
"Salesperson Split" (jsonb)
"True Down Payment" (numeric)
"Vin Last 4" (text)
"Year" (integer)
"Make" (text)
"Model" (text)
"Trim" (text)
"Exterior" (text)
"Interior" (text)
"Upholstery" (text)
"Mileage" (integer)
"Mileage Unit" (text)
"Price" (numeric)
"Down Payment" (numeric)
"VIN" (text)
```

---

## 15. ACCEPTANCE CRITERIA

**The React Native iOS application is considered complete when:**

1. ✅ All core features implemented and functional
2. ✅ Authentication working with role-based access
3. ✅ All CRUD operations working for inventory, sales, collections
4. ✅ Dashboard displays all metrics correctly
5. ✅ Commission calculations match business rules exactly
6. ✅ Reports can be generated, logged, and exported
7. ✅ Calendar events can be created and managed
8. ✅ UI matches design system and is responsive
9. ✅ Data persists correctly in Supabase
10. ✅ App works offline for read-only features (future)
11. ✅ Performance meets load time targets
12. ✅ All user roles tested and working
13. ✅ Error handling covers all scenarios
14. ✅ App passes TestFlight beta testing
15. ✅ App submitted and approved in App Store

---

## DOCUMENT REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-12 | AI Analysis | Initial comprehensive PRD |

---

**END OF PRODUCT REQUIREMENTS DOCUMENT**

This PRD provides complete specifications for rebuilding the BBB Auto Sales DMS as a React Native iOS application. All business logic, data models, user flows, and technical requirements have been extracted from the existing web application and documented in detail.

