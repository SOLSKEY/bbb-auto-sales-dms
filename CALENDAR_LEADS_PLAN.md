# Calendar/Leads Page - Implementation Plan

## Overview

A comprehensive appointment and lead management system for BBB Auto Sales DMS. This feature provides two primary functions:

1. **Calendar Tab**: Schedule and manage customer appointments for vehicle viewings/purchases
2. **Leads Tab**: Track potential customers who aren't ready for appointments but may convert later

---

## Design Direction: "Automotive Command Center"

**Aesthetic**: Industrial-luxury hybrid - think high-end car dashboard meets mission control. Dark theme with warm amber/gold accents (reminiscent of car instrument clusters), crisp typography, and subtle metallic textures.

**Typography**:
- Headers: **Archivo Black** or **Bebas Neue** - bold, automotive feel
- Body: **DM Sans** - clean, highly readable
- Numbers/Times: **JetBrains Mono** - monospace for appointment times

**Color Palette**:
```
Primary Background: #0a0a0a (deep black)
Card Background: rgba(20, 20, 22, 0.9)
Accent Gold: #d4a853 (warm amber - appointment highlights)
Accent Blue: #3b82f6 (leads/info)
User Colors (auto-assigned palette):
  - #f59e0b (amber)
  - #10b981 (emerald)
  - #8b5cf6 (violet)
  - #ec4899 (pink)
  - #06b6d4 (cyan)
  - #f97316 (orange)
Success: #22c55e
Warning: #eab308
Danger: #ef4444
```

---

## Database Schema

### Table: `calendar_appointments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to auth.users (creator/owner) |
| `title` | text | Appointment title (optional) |
| `customer_name` | text | Customer name |
| `customer_phone` | text | Customer phone number |
| `lead_source` | text | How the lead was acquired |
| `appointment_time` | timestamptz | Scheduled date/time (CST) |
| `down_payment_budget` | numeric | Customer's budget |
| `notes` | text | Additional notes |
| `status` | text | 'scheduled' | 'confirmed' | 'showed' | 'sold' | 'no_show' | 'cancelled' |
| `vehicle_ids` | uuid[] | Array of specific vehicle IDs from inventory |
| `model_interests` | text[] | Array of model names (e.g., ['Chrysler 300', 'Camaro']) |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

### Table: `calendar_leads`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to auth.users (creator/owner) |
| `customer_name` | text | Customer name |
| `customer_phone` | text | Customer phone number |
| `lead_source` | text | How the lead was acquired |
| `down_payment_budget` | numeric | Customer's budget |
| `notes` | text | Additional notes |
| `model_interests` | text[] | Array of model names interested in |
| `potential_date` | date | Rough timeframe when customer might be ready |
| `priority` | text | 'hot' | 'warm' | 'cold' (derived from recency/engagement) |
| `was_appointment` | boolean | True if archived from an appointment |
| `original_appointment_id` | uuid | FK to original appointment if archived |
| `original_appointment_date` | timestamptz | When the original appointment was |
| `follow_ups` | jsonb | Array of follow-up logs |
| `created_at` | timestamptz | When the lead was captured |
| `updated_at` | timestamptz | Last update timestamp |

### Table: `user_colors`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | FK to auth.users (primary key) |
| `color` | text | Hex color code |
| `assigned_by` | text | 'auto' | 'admin' |
| `updated_at` | timestamptz | Last update timestamp |

---

## Component Architecture

```
pages/
  CalendarLeads.tsx              # Main page with tab navigation

components/
  calendar-leads/
    # Calendar Tab Components
    CalendarView.tsx             # FullCalendar wrapper with custom styling
    AppointmentModal.tsx         # Create/edit appointment modal
    AppointmentCard.tsx          # Appointment display in calendar
    VehicleSearchDropdown.tsx    # Inventory search with multi-select
    ModelInterestInput.tsx       # Model tag input (when no specific vehicle)
    AppointmentStatusBadge.tsx   # Status indicator with color

    # Leads Tab Components
    LeadsListView.tsx            # Main leads list/grid view
    LeadCard.tsx                 # Individual lead card
    LeadModal.tsx                # Create/edit lead modal
    LeadFilters.tsx              # Search, filter, sort controls
    FollowUpLog.tsx              # Follow-up history component
    ArchiveBadge.tsx             # "Was Appointment" badge

    # Mobile Components
    MobileCalendarView.tsx       # Mobile-optimized calendar
    MobileLeadsList.tsx          # Mobile-optimized leads list
    MobileAppointmentSheet.tsx   # Bottom sheet for mobile appointment creation
    MobileLeadSheet.tsx          # Bottom sheet for mobile lead creation

    # Shared Components
    CustomerInfoFields.tsx       # Reusable customer input fields
    LeadSourceDropdown.tsx       # Custom lead source input
    UserColorDot.tsx             # Color indicator for user assignment
    DuplicateWarning.tsx         # Duplicate phone number warning

hooks/
  useCalendarLeads.ts            # Data fetching and mutations
  useVehicleSearch.ts            # Inventory search hook
  useUserColors.ts               # User color management
  useLeadFilters.ts              # Lead filtering logic
```

---

## Feature Specifications

### 1. Calendar Tab (Default View)

#### Desktop View
- Full month calendar using FullCalendar
- Click any day to open appointment modal (date pre-filled)
- Click existing appointment to view/edit
- Appointments color-coded by user
- Drag-and-drop to reschedule
- Status badges on appointments (Scheduled, Confirmed, Showed, Sold, No-Show)

#### Mobile View
- Week view by default (swipe for next/prev week)
- Day agenda list below week strip
- Tap day to see that day's appointments
- Floating "+" button to add appointment
- Bottom sheet for appointment creation/editing

#### Appointment Modal Fields
1. **Title** - Optional text input
2. **Customer Name** - Text input
3. **Phone Number** - Phone input with formatting
4. **Source of Lead** - Custom text input with autocomplete from previous entries
5. **Date & Time** - DateTime picker (CST timezone)
6. **Down Payment Budget** - Currency input
7. **Vehicle of Interest** - Multi-select search dropdown
   - Search by: Year, Make, Model, VIN, Stock#, Color, Price
   - Shows vehicle thumbnail, year/make/model, price, status
   - Multiple selection allowed
8. **Model Interest** - Tag input (alternative to specific vehicle)
   - For when customer wants a model we don't have
   - Examples: "Chrysler 300", "Camaro", "Equinox"
   - Can use both vehicle + model interest together
9. **Notes** - Textarea
10. **Status** - Dropdown (Scheduled, Confirmed, Showed, Sold, No-Show, Cancelled)

#### Quick Actions
- **Archive to Leads** - Move appointment to leads tab (no-show or vehicle sold out)
- **Mark Showed** - Quick status update
- **Mark Sold** - Quick status update

---

### 2. Leads Tab

#### Desktop View
- Card grid/list view with sorting options
- Search bar (searches name, phone, notes, model interests)
- Filter by:
  - Model interest
  - Date range (created date)
  - Potential date range
  - Was appointment (yes/no/all)
  - User (who created)
- Sort by:
  - Most recent first (default)
  - Oldest first
  - Potential date
  - Alphabetical

#### Mobile View
- Scrollable card list
- Sticky search bar at top
- Filter sheet (bottom sheet)
- Pull to refresh

#### Lead Card Display
- Customer name (large)
- Phone number (tappable to call)
- Model interests as tags
- Down payment budget
- "Was Appointment" badge (if applicable)
  - Shows original appointment date
  - Different styling (gold border/accent)
- Days since created
- Potential timeframe
- Last follow-up date (if any)
- User color dot (who owns this lead)

#### Lead Modal Fields
1. **Customer Name** - Text input
2. **Phone Number** - Phone input
3. **Source of Lead** - Custom text input with autocomplete
4. **Down Payment Budget** - Currency input
5. **Model Interest** - Tag input
6. **Potential Date/Timeframe** - Date picker (approximate when they might be ready)
7. **Notes** - Textarea

#### Follow-Up Logging
- Add follow-up button on lead card
- Log entry fields:
  - Date (auto-fills today)
  - Method (Call, Text, Email, In-Person)
  - Outcome (No Answer, Spoke - Not Ready, Spoke - Interested, Scheduled Appointment)
  - Notes
- Follow-up history displayed on lead detail view

---

### 3. Notification System Updates

#### New Reminder Schedule
1. **Day Before at 6:30 PM CST** - "Reminder: Appointment tomorrow with [Customer] at [Time]"
2. **Day Of at 8:00 AM CST** - "You have an appointment today with [Customer] at [Time]"
3. **1 Hour Before** - "Appointment with [Customer] in 1 hour"

#### Notification Types
- `appointment_day_before` - 6:30 PM CST day before
- `appointment_day_of` - 8:00 AM CST same day
- `appointment_one_hour` - 1 hour before

#### Notification Bell Icon
- Add to Header.tsx (desktop) and MobileLayout.tsx (mobile)
- Bell icon with unread count badge
- Dropdown on click showing:
  - Unread notifications (highlighted)
  - All recent notifications (last 50)
  - "Mark all as read" action
  - Click notification to navigate to calendar/appointment

---

### 4. User Color System

#### Auto-Assignment
- When a user first creates an appointment/lead, check if they have a color
- If not, assign next available color from palette
- Store in `user_colors` table

#### Admin Configuration
- Settings page section for "User Colors"
- Shows all users with their current color
- Color picker to override
- "Reset to Auto" option

#### Color Palette (6 distinct colors)
```javascript
const USER_COLOR_PALETTE = [
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Orange', hex: '#f97316' },
];
```

---

### 5. Duplicate Detection

When adding appointment or lead:
1. Check if phone number exists in `calendar_appointments` or `calendar_leads`
2. If found, show warning: "A customer with this phone number already exists"
3. Display existing record summary
4. Allow user to:
   - View existing record
   - Continue anyway (create duplicate)
   - Cancel

---

### 6. Archive Flow (Appointment → Lead)

When archiving an appointment:
1. Click "Archive to Leads" button on appointment
2. Confirmation modal:
   - "This will move the appointment to your leads list"
   - "Reason" dropdown: No-Show, Customer Postponed, Vehicle Sold, Other
3. On confirm:
   - Create new lead record with:
     - All customer info copied
     - `was_appointment = true`
     - `original_appointment_id` = appointment ID
     - `original_appointment_date` = appointment datetime
   - Update appointment status to appropriate value
   - Show success toast with link to new lead

---

## Mobile-Specific Features

### Calendar Tab Mobile
- **Week Strip View**: Horizontal scrollable week with day numbers
- **Day Agenda**: Vertical list of appointments for selected day
- **Swipe Gestures**: Swipe left/right to change weeks
- **Quick Add FAB**: Floating action button to add appointment
- **Bottom Sheet Modal**: Appointment form in bottom sheet

### Leads Tab Mobile
- **Search Always Visible**: Sticky search bar
- **Pull to Refresh**: Refresh leads list
- **Swipe Actions**: Swipe left on lead card for quick actions (call, archive)
- **Filter Bottom Sheet**: Tap filter icon to open filter options
- **Infinite Scroll**: Load more leads as user scrolls

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## Implementation Phases

### Phase 1: Database & Core Infrastructure
1. Create Supabase migrations for new tables
2. Set up RLS policies
3. Create TypeScript interfaces
4. Build data hooks (useCalendarLeads, useUserColors)

### Phase 2: Calendar Tab
1. Build CalendarView with FullCalendar
2. Create AppointmentModal with all fields
3. Implement VehicleSearchDropdown
4. Add appointment status management
5. User color integration

### Phase 3: Leads Tab
1. Build LeadsListView with filtering/sorting
2. Create LeadModal
3. Implement follow-up logging
4. Archive flow from appointments
5. Duplicate detection

### Phase 4: Notifications
1. Update notification hook with new timing
2. Add notification bell to headers
3. Create notification dropdown component
4. Test CST timezone handling

### Phase 5: Mobile Optimization
1. Build mobile calendar view
2. Build mobile leads list
3. Create bottom sheet modals
4. Test on PWA

### Phase 6: Polish & Integration
1. Admin user color configuration
2. Route setup and navigation
3. Permission integration
4. Final styling and animations

---

## Route Structure

```
/calendar-leads           → CalendarLeads page (Calendar tab default)
/calendar-leads/leads     → CalendarLeads page (Leads tab active)
```

Add to `App.tsx` routing and `PATH_TITLE_MAP`.

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| CRM vs Leads Tab | Separate system - Leads tab is specifically for calendar-related prospects |
| Notification Timing | Day before 6:30 PM, Day of 8 AM, 1 hour before |
| User Color Assignment | Auto-assign by default, admin can override |
| Lead Sources | Custom text input with autocomplete |
| Archived Lead Distinction | Badge/tag showing "Was Appointment" |
| Mobile Importance | VERY important - full mobile optimization |
| Follow-up Tracking | Yes - log follow-up attempts |
| Lead Temperature | No explicit hot/warm/cold (use timestamp instead) |
| Sales Conversion | Not needed |
| Vehicle Search Fields | All fields searchable |
| Quick Add | Yes - click day to pre-fill date |
| Appointment Status | Yes - Scheduled/Confirmed/Showed/Sold/No-Show/Cancelled |
| SMS Integration | Not now (but architected for future) |
| Model Demand Dashboard | Not now |
| Duplicate Detection | Yes |

---

## Estimated File Count

- **New Files**: ~20-25 files
- **Modified Files**: ~5-8 files (App.tsx, types.ts, Header.tsx, MobileLayout.tsx, etc.)

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Database schema creation
3. Proceed through phases sequentially
4. Test thoroughly on both desktop and mobile

---

*Plan created: December 17, 2024*
