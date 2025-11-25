# BBB Auto Sales DMS - Quick Reference Guide

## 🎯 Project Overview
**Purpose:** Dealership Management System for Buy Here Pay Here (BHPH) auto dealers  
**Current Stack:** React + TypeScript + Vite + Supabase  
**Target Stack:** React Native iOS + TypeScript + Supabase

---

## 📱 Core Features Summary

### 1. Dashboard
- Real-time KPIs (sales, inventory, collections)
- Multiple charts and visualizations
- Next account/stock number tracking

### 2. Inventory Management
- Add/Edit/Delete vehicles
- VIN auto-decode (NHTSA API)
- Image galleries
- Advanced search and filters
- Mark as sold workflow

### 3. Sales Analytics
- YTD comparisons
- Cumulative sales charts
- Monthly breakdowns
- Record tracking

### 4. Collections Management
- Daily payment logging
- Delinquency tracking
- Weekly forecasting
- Payment mix analysis

### 5. Commission Reports
- Complex calculation rules
- Weekly bonuses
- Collections bonuses
- Override parsing from notes
- PDF export

### 6. Reports
- Daily Closing Report
- Commission Report
- Report logging/archiving
- PDF generation

### 7. Data Management
- Direct table access
- Inline editing
- Bulk operations
- Export to CSV

### 8. Calendar
- Event scheduling
- Ownership tracking
- Drag-and-drop

---

## 🔐 Authentication & Roles

### Admin Role
✅ Full access to everything  
✅ Can create/delete users  
✅ Can mark vehicles as sold  
✅ Can log reports  
✅ Can edit all data

### User Role  
✅ View Dashboard, Inventory, Sales, Collections, Calendar, Team Chat  
❌ No access to Settings, Reports, Data  
❌ Cannot edit data  
❌ Cannot mark vehicles sold

---

## 💾 Data Model (Key Tables)

### Inventory
- Primary Key: `id` or `VIN`
- Status values: Available, Available (Pending Title), Deposit, Repairs, Cash, Sold
- Images stored as URL array

### Sales
- Primary Key: `account_number` (numeric, auto-increment)
- Includes full vehicle data snapshot
- Salesperson split support (JSON)

### Payments (Collections)
- Primary Key: `Date` (unique)
- Fields: Payments, Late Fees, BOA (Zelle)

### Delinquency
- Primary Key: `Date` (unique)
- Fields: Overdue Accounts, Open Accounts

---

## 🧮 Critical Business Logic

### Stock Numbers
Format: `{PREFIX}{YY}-{SERIAL}`
- N = Nissan
- D = Dodge  
- F = Ford
- CH = Chevrolet
- O = Other

### Commission Calculation
```typescript
if (downPayment <= 0) return $0
if (downPayment <= $3,000) return $100
if (downPayment > $3,000) return downPayment × 5%
```

**Overrides (from notes):**
1. Fixed amount: "override $250"
2. Ratio split: "50/50 split"
3. Percentage: "pay 60%"

### Weekly Sales Bonus
```typescript
bonus = (salesCount × $50) + (max(0, salesCount - 5) × $50)
```
Examples:
- 3 sales = $150
- 5 sales = $250
- 6 sales = $350
- 8 sales = $550

### Collections Forecast
```typescript
historicalAvg = totalPayments / totalOpenAccounts
forecast = historicalAvg × lag(2_weeks_ago).openAccounts
```

---

## 🎨 Design System

### Colors
- Background: `#0a0e14` (near black)
- Primary Text: `#e5e7eb` (light gray)
- Accent (Lava Core): `#ff6b35` (orange-red)
- Success: `#34d399` (green)
- Error: `#f87171` (red)

### Glass Morphism
- Semi-transparent backgrounds
- Subtle blur
- Low-opacity borders
- Hover effects

---

## 🔌 API Endpoints

### Supabase Tables
- Inventory
- Sales
- Payments
- Delinquency
- Users (dealership personnel)
- DailyClosingReportsLog
- CommissionReportsLog

### External APIs
- **NHTSA VIN Decoder:** `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{VIN}?format=json`

---

## ⚠️ Critical Edge Cases

1. **Date Handling:** All dates must be normalized to UTC midnight
2. **Field Mapping:** Supabase uses "Column Names" with spaces, app uses camelCase
3. **Commission Week:** Friday to Thursday (not Monday to Sunday)
4. **Collections Week:** Monday to Sunday
5. **Pagination:** Sales table can have 10,000+ records (load in chunks of 1,000)
6. **Image Storage:** URLs stored in database, files in Supabase Storage
7. **Atomic Operations:** Mark sold and revert sale must be atomic (both or neither)

---

## 📊 Data Flow Patterns

### Mark Vehicle as Sold
1. Update vehicle status → "Sold"
2. Create sale record with vehicle data
3. Auto-suggest account number (highest + 1)
4. Auto-suggest stock number (by make prefix)

### Revert Sale
1. Delete sale record
2. Update vehicle status → "Available"
3. Vehicle reappears in inventory

### Log Collections Data
1. Upsert into Payments table (by Date)
2. Upsert into Delinquency table (by Date)
3. Refresh all charts and metrics

---

## 🚀 Implementation Priority

### Phase 1: Core Foundation (Week 1-2)
1. Authentication flow
2. Navigation structure
3. Data loading from Supabase
4. Basic dashboard

### Phase 2: Inventory & Sales (Week 3-4)
1. Inventory list with filters
2. Add/edit vehicle
3. VIN decoder integration
4. Mark as sold workflow
5. Sales analytics

### Phase 3: Collections & Reports (Week 5-6)
1. Collections metrics
2. Daily data logging
3. Commission calculations
4. Report generation

### Phase 4: Polish & Testing (Week 7-8)
1. Calendar implementation
2. Data management
3. Settings/admin features
4. Bug fixes and optimization

---

## 🔧 Technical Stack Recommendations

### React Native
- **Navigation:** React Navigation (Tab + Stack navigators)
- **State:** React Context + AsyncStorage
- **UI:** React Native Paper or custom components
- **Charts:** Victory Native or react-native-chart-kit
- **Date Handling:** date-fns
- **Forms:** React Hook Form
- **Images:** react-native-fast-image

### Development Tools
- **Linting:** ESLint + TypeScript
- **Testing:** Jest + React Native Testing Library
- **Debugging:** React Native Debugger
- **State Inspection:** Reactotron

---

## 📝 Key Formulas & Calculations

### Next Account Number
```typescript
highest = max(all numeric account numbers)
next = highest + 1
```

### Next Stock Number (per prefix)
```typescript
latest = max(serial for prefix + year)
next = latest + 1
// Reset to 01 on new year
```

### Delinquency Rate
```typescript
rate = (overdueAccounts / openAccounts) × 100
```

### Total Commission
```typescript
total = sum(adjustedCommissions) 
      + collectionsBonus 
      + sum(weeklySalesBonuses)
```

---

## 🎯 Success Metrics

### Performance Targets
- Dashboard load: < 2 seconds
- Inventory load: < 3 seconds
- Smooth scrolling: 60fps
- Chart rendering: < 500ms

### Data Accuracy
- Commission calculations must match exactly
- Stock/account numbers must never duplicate
- Date calculations must be timezone-safe
- All CRUD operations must be atomic

---

## 📚 Additional Resources

- Full PRD: `PRODUCT_REQUIREMENTS_DOCUMENT.md`
- Supabase Docs: https://supabase.com/docs
- React Native Docs: https://reactnative.dev/docs
- NHTSA API: https://vpic.nhtsa.dot.gov/api/

---

**Last Updated:** November 12, 2025  
**Version:** 1.0

