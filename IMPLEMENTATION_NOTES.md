# BBB Auto Sales DMS - Implementation Notes

## ⚠️ Critical Implementation Details & Gotchas

This document highlights the tricky parts, edge cases, and important implementation details that aren't obvious from the PRD alone.

---

## 🗄️ Database Field Mapping (VERY IMPORTANT!)

### The Problem
Supabase tables use mixed-case column names with spaces (e.g., `"Sale Date"`, `"Vin Last 4"`), but the app uses camelCase (e.g., `saleDate`, `vinLast4`).

### The Solution
Always use the mapping functions from `supabaseMapping.ts`:

```typescript
// Reading from Supabase
const { data } = await supabase.from('Inventory').select('*')
const mapped = fromSupabaseArray(data, VEHICLE_FIELD_MAP)

// Writing to Supabase
const vehicleForSupabase = toSupabase(vehicle, VEHICLE_FIELD_MAP)
await supabase.from('Inventory').insert([vehicleForSupabase])
```

### Column Name Quoting
Some columns need quotes in queries:

```typescript
// Wrong
.order('Sale Date', { ascending: false })

// Correct
.order('"Sale Date"', { ascending: false })
```

Use the `quoteSupabaseColumn()` helper when building dynamic queries.

---

## 📅 Date Handling (CRITICAL!)

### The Golden Rule
**ALL dates must be normalized to UTC midnight** before comparison or storage.

### Why This Matters
```typescript
// BAD - will cause off-by-one errors
const today = new Date()
const isToday = saleDate.getTime() === today.getTime() // Almost never true!

// GOOD - normalize first
const today = toUtcMidnight(new Date())
const saleDate = toUtcMidnight(parseDateStringToUtc(sale.saleDate))
const isToday = saleDate.getTime() === today.getTime() // Works!
```

### Date Utilities Needed
```typescript
function toUtcMidnight(date: Date): Date {
  const utc = new Date(date)
  utc.setUTCHours(0, 0, 0, 0)
  return utc
}

function parseDateStringToUtc(dateString: string): Date | null {
  if (!dateString) return null
  const parsed = new Date(dateString)
  return isNaN(parsed.getTime()) ? null : toUtcMidnight(parsed)
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

### Week Calculations

**Collections Week (Monday start):**
```typescript
function getWeekStartUtc(date: Date): Date {
  const normalized = toUtcMidnight(date)
  const dayOfWeek = normalized.getUTCDay() // 0 = Sunday
  const diff = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) // Monday = start
  normalized.setUTCDate(normalized.getUTCDate() + diff)
  return normalized
}
```

**Commission Week (Friday start):**
```typescript
function getCommissionWeekStart(date: Date): Date {
  const normalized = toUtcMidnight(date)
  const dayOfWeek = normalized.getUTCDay() // 0 = Sunday
  const diff = (dayOfWeek - 5 + 7) % 7 // 5 = Friday
  normalized.setUTCDate(normalized.getUTCDate() - diff)
  return normalized
}
```

---

## 🔢 Commission Calculation Details

### Override Parsing Logic

The commission override parsing happens in this priority order:

1. **Fixed Amount** (highest priority)
2. **Ratio Split**
3. **Percentage**
4. **No Override** (use base commission)

### Regex Patterns
```typescript
// Fixed amount: "override $150", "payout 200"
if (notes.includes('override') || notes.includes('payout')) {
  const match = notes.match(/\$?\s*(\d+(?:\.\d+)?)/)
  if (match) return parseFloat(match[1])
}

// Ratio split: "50/50", "60/40 split"
const ratioMatch = notes.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)
if (ratioMatch) {
  const first = parseFloat(ratioMatch[1])
  const second = parseFloat(ratioMatch[2])
  const share = first / (first + second)
  return baseCommission * share
}

// Percentage: "pay 60%", "75%"
const percentMatch = notes.match(/(\d+(?:\.\d+)?)\s*%/)
if (percentMatch) {
  const percent = parseFloat(percentMatch[1])
  return baseCommission * (percent / 100)
}
```

### Collections Bonus Special Case
```typescript
// ONLY applies to salesperson named "Key"
if (salesperson === 'Key') {
  // Admin manually enters this value
  // Must be locked before report can be logged
  totalPayout += collectionsBonus
}
```

### Weekly Sales Bonus
```typescript
// Count sales within commission week (Friday-Thursday)
const salesInWeek = sales.filter(sale => {
  const saleDate = parseDateStringToUtc(sale.saleDate)
  const weekStart = getCommissionWeekStart(periodStart)
  const weekEnd = addDays(weekStart, 6)
  return saleDate >= weekStart && saleDate <= weekEnd
}).length

// Calculate bonus
const baseBonus = salesInWeek * 50
const extraBonus = Math.max(0, salesInWeek - 5) * 50
const totalBonus = baseBonus + extraBonus
```

---

## 🚗 Stock Number Generation

### Prefix Determination
```typescript
function getStockPrefix(make: string): string {
  const normalized = make.toLowerCase()
  if (normalized.includes('nissan')) return 'N'
  if (normalized.includes('dodge')) return 'D'
  if (normalized.includes('ford')) return 'F'
  if (normalized.includes('chevrolet') || normalized.includes('chevy')) return 'CH'
  return 'O' // Other
}
```

### Serial Number Logic
The tricky part: You need to scan ALL sales, group by prefix+year, find highest serial:

```typescript
function computeNextStockNumbers(sales: Sale[]) {
  const latestByPrefix: Record<string, { year: number, serial: number }> = {}
  
  // Sort sales by date
  const sorted = sales
    .map(s => ({ sale: s, date: parseDateStringToUtc(s.saleDate) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  
  sorted.forEach(({ sale, date }) => {
    const prefix = getStockPrefix(sale.make)
    const year = date.getFullYear()
    
    // Parse stock number if exists
    let serial = 1
    if (sale.stockNumber) {
      const match = sale.stockNumber.match(/^[A-Z]{1,2}(\d{2})-?(\d+)$/)
      if (match) {
        serial = parseInt(match[2], 10)
      }
    }
    
    // Update latest if this is higher
    const key = `${prefix}-${year}`
    if (!latestByPrefix[key] || serial > latestByPrefix[key].serial) {
      latestByPrefix[key] = { year, serial }
    }
  })
  
  // Generate next numbers
  const currentYear = new Date().getFullYear()
  const result = {}
  
  ['N', 'O', 'D', 'F', 'CH'].forEach(prefix => {
    const key = `${prefix}-${currentYear}`
    const latest = latestByPrefix[key]
    
    if (!latest || latest.year < currentYear) {
      // New year, start at 01
      result[prefix] = formatStockNumber(prefix, currentYear, 1)
    } else {
      // Increment from latest
      result[prefix] = formatStockNumber(prefix, currentYear, latest.serial + 1)
    }
  })
  
  return result
}

function formatStockNumber(prefix: string, year: number, serial: number): string {
  const yearSuffix = String(year).slice(-2).padStart(2, '0')
  const serialString = String(serial).padStart(2, '0')
  return `${prefix}${yearSuffix}-${serialString}`
}
```

---

## 🎯 Mark Vehicle as Sold (Atomic Operation)

This is the most critical operation - it MUST be atomic. If either operation fails, both should be rolled back.

```typescript
async function markVehicleAsSold(vehicle, saleDetails) {
  try {
    // Step 1: Update vehicle status
    const { error: vehicleError } = await supabase
      .from('Inventory')
      .update({ Status: 'Sold' })
      .eq('VIN', vehicle.vin)
    
    if (vehicleError) {
      throw new Error('Failed to update vehicle status')
    }
    
    // Step 2: Create sale record
    const saleRecord = {
      ...vehicle, // Copy ALL vehicle data
      saleDate: new Date().toISOString().split('T')[0],
      saleId: saleDetails.accountNumber,
      salesperson: saleDetails.salesperson,
      salespersonSplit: saleDetails.salespersonSplit,
      saleDownPayment: saleDetails.trueDownPayment,
      saleType: saleDetails.saleType,
      stockNumber: saleDetails.stockNumber,
      accountNumber: saleDetails.accountNumber,
    }
    
    const saleForSupabase = toSupabase(saleRecord, SALE_FIELD_MAP)
    
    const { error: saleError } = await supabase
      .from('Sales')
      .insert([saleForSupabase])
    
    if (saleError) {
      // Rollback vehicle status
      await supabase
        .from('Inventory')
        .update({ Status: vehicle.status })
        .eq('VIN', vehicle.vin)
      
      throw new Error('Failed to create sale record')
    }
    
    // Success - update local state
    updateLocalState(vehicle, saleRecord)
    
  } catch (error) {
    console.error('Mark as sold failed:', error)
    throw error
  }
}
```

---

## 🔄 Revert Sale (Also Atomic)

```typescript
async function revertSale(sale) {
  try {
    // Step 1: Delete sale record
    const { error: deleteError } = await supabase
      .from('Sales')
      .delete()
      .eq('account_number', sale.accountNumber)
    
    if (deleteError) {
      throw new Error('Failed to delete sale')
    }
    
    // Step 2: Update vehicle status
    if (sale.vin) {
      const { error: updateError } = await supabase
        .from('Inventory')
        .update({ Status: 'Available' })
        .eq('VIN', sale.vin)
      
      if (updateError) {
        // Try to restore sale record
        const saleForSupabase = toSupabase(sale, SALE_FIELD_MAP)
        await supabase.from('Sales').insert([saleForSupabase])
        
        throw new Error('Failed to update vehicle status')
      }
    }
    
    // Success - update local state
    updateLocalStateAfterRevert(sale)
    
  } catch (error) {
    console.error('Revert sale failed:', error)
    throw error
  }
}
```

---

## 📊 Collections Forecasting Edge Cases

### Missing Data Handling

```typescript
function calculateWeeklyForecast(paymentsData, delinquencyData) {
  // Build weekly summaries
  const weeklySummaries = buildWeeklySummaries(paymentsData, delinquencyData)
  
  // Calculate historical average
  let totalPayments = 0
  let totalOpenAccounts = 0
  
  weeklySummaries.forEach(week => {
    totalPayments += week.totalPayments
    totalOpenAccounts += week.avgOpenAccounts
  })
  
  const perAccountAverage = totalOpenAccounts > 0 
    ? totalPayments / totalOpenAccounts 
    : 0
  
  // Get lag(2) open accounts
  const currentWeekStart = getWeekStartUtc(new Date())
  const twoWeeksAgo = addDays(currentWeekStart, -14)
  
  const lagWeek = weeklySummaries.find(w => 
    formatDateKey(w.weekStart) === formatDateKey(twoWeeksAgo)
  )
  
  // Fallback to current week if lag week not found
  const lagOpenAccounts = lagWeek 
    ? lagWeek.avgOpenAccounts 
    : (weeklySummaries[weeklySummaries.length - 1]?.avgOpenAccounts || 0)
  
  // Calculate forecast
  const expectedWeeklyTotal = perAccountAverage * lagOpenAccounts
  
  return expectedWeeklyTotal
}
```

### Week Coverage Warning
```typescript
// Warn if delinquency data doesn't cover full week (should have 7 days)
function buildWeeklySummaries(paymentsData, delinquencyData) {
  const openAccountsByWeek = new Map()
  
  delinquencyData.forEach(entry => {
    const weekStart = formatDateKey(getWeekStartUtc(entry.date))
    const bucket = openAccountsByWeek.get(weekStart) || { sum: 0, count: 0 }
    bucket.sum += entry.openAccounts
    bucket.count += 1
    openAccountsByWeek.set(weekStart, bucket)
  })
  
  // Check for incomplete weeks
  openAccountsByWeek.forEach((bucket, weekStart) => {
    if (bucket.count < 7) {
      console.warn(`Week ${weekStart} has only ${bucket.count} days of delinquency data`)
    }
  })
  
  // ... rest of calculation
}
```

---

## 🖼️ Image Handling

### Upload to Supabase Storage
```typescript
async function uploadVehicleImage(vehicleId, imageFile) {
  // Generate unique filename
  const ext = imageFile.name.split('.').pop()
  const filename = `${vehicleId}/${Date.now()}.${ext}`
  
  // Upload to bucket
  const { data, error } = await supabase.storage
    .from('vehicle-images')
    .upload(filename, imageFile, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(filename)
  
  return publicUrl
}
```

### Add URL to Vehicle
```typescript
async function addImageToVehicle(vehicleId, imageUrl) {
  // Get current images
  const { data: vehicle } = await supabase
    .from('Inventory')
    .select('image_urls')
    .eq('id', vehicleId)
    .single()
  
  const currentImages = vehicle?.image_urls || []
  const newImages = [...currentImages, imageUrl]
  
  // Update
  await supabase
    .from('Inventory')
    .update({ image_urls: newImages })
    .eq('id', vehicleId)
}
```

### Delete Image from Storage
```typescript
async function deleteVehicleImage(imageUrl) {
  // Extract path from URL
  const url = new URL(imageUrl)
  const path = url.pathname.split('/storage/v1/object/public/vehicle-images/')[1]
  
  if (!path) return
  
  await supabase.storage
    .from('vehicle-images')
    .remove([path])
}
```

---

## 🔐 Permission Checks

### Client-Side Guards
```typescript
function canUserAccessPage(user, page) {
  if (user.role === 'admin') return true
  
  // User role restrictions
  const forbiddenPages = ['Settings', 'Reports', 'Data']
  return !forbiddenPages.includes(page)
}

function canUserEditData(user) {
  return user.role === 'admin'
}

function canUserMarkAsSold(user) {
  return user.role === 'admin'
}
```

### Hide UI Elements
```tsx
{canUserEditData(user) && (
  <button onClick={handleEdit}>Edit</button>
)}

{canUserMarkAsSold(user) && (
  <button onClick={handleMarkSold}>Mark as Sold</button>
)}
```

### Row Level Security (Supabase)
```sql
-- Example RLS policy for Inventory table
CREATE POLICY "Users can view inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata' ->> 'role') = 'admin'
  );
```

---

## 📱 React Native Specific Considerations

### AsyncStorage for Session
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

// Store session
await AsyncStorage.setItem('session', JSON.stringify(session))

// Retrieve session
const sessionJson = await AsyncStorage.getItem('session')
const session = sessionJson ? JSON.parse(sessionJson) : null
```

### Image Picker
```typescript
import * as ImagePicker from 'expo-image-picker'

async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  })
  
  if (!result.canceled) {
    return result.assets[0].uri
  }
  
  return null
}
```

### Date Picker
```typescript
import DateTimePicker from '@react-native-community/datetimepicker'

<DateTimePicker
  value={date}
  mode="date"
  display="default"
  onChange={(event, selectedDate) => {
    setDate(selectedDate || date)
  }}
/>
```

---

## ⚡ Performance Optimization

### Virtualized Lists
```typescript
import { FlatList } from 'react-native'

<FlatList
  data={inventory}
  renderItem={({ item }) => <VehicleCard vehicle={item} />}
  keyExtractor={item => item.id.toString()}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
/>
```

### Memoization
```typescript
import { useMemo } from 'react'

const filteredInventory = useMemo(() => {
  return inventory.filter(v => {
    if (v.status === 'Sold') return false
    if (searchTerm && !v.make.includes(searchTerm)) return false
    return true
  })
}, [inventory, searchTerm])
```

### Debounced Search
```typescript
import { useCallback } from 'react'
import debounce from 'lodash/debounce'

const debouncedSearch = useCallback(
  debounce((term) => {
    performSearch(term)
  }, 300),
  []
)
```

---

## 🐛 Common Pitfalls to Avoid

1. **❌ Don't compare dates directly**
   ```typescript
   // BAD
   if (saleDate === todayDate) // Will almost never work
   
   // GOOD
   if (toUtcMidnight(saleDate).getTime() === toUtcMidnight(todayDate).getTime())
   ```

2. **❌ Don't forget field mapping**
   ```typescript
   // BAD
   await supabase.from('Inventory').insert({ make: 'Ford' })
   
   // GOOD
   const mapped = toSupabase({ make: 'Ford' }, VEHICLE_FIELD_MAP)
   await supabase.from('Inventory').insert(mapped)
   ```

3. **❌ Don't hardcode commission rules**
   ```typescript
   // BAD
   const commission = downPayment < 3000 ? 100 : downPayment * 0.05
   
   // GOOD
   const commission = calculateBaseCommission(downPayment)
   ```

4. **❌ Don't forget to handle null/undefined**
   ```typescript
   // BAD
   const images = vehicle.images.map(url => ...)
   
   // GOOD
   const images = (vehicle.images || []).map(url => ...)
   ```

5. **❌ Don't update UI before database confirms**
   ```typescript
   // BAD
   setInventory(prev => [...prev, newVehicle])
   await supabase.from('Inventory').insert(...)
   
   // GOOD
   const { data, error } = await supabase.from('Inventory').insert(...)
   if (!error) {
     setInventory(prev => [...prev, data[0]])
   }
   ```

6. **❌ Don't mix commission and collections weeks**
   ```typescript
   // Commission week: Friday to Thursday
   const commissionWeekStart = getCommissionWeekStart(date)
   
   // Collections week: Monday to Sunday
   const collectionsWeekStart = getWeekStartUtc(date)
   ```

---

## 📝 Testing Checklist

### Critical Scenarios to Test

- [ ] Login with admin account → full access
- [ ] Login with user account → restricted access
- [ ] Add vehicle with VIN decode → fields auto-populate
- [ ] Mark vehicle as sold → creates sale, updates status
- [ ] Revert sale → deletes sale, restores vehicle
- [ ] Commission calculation with various down payments
- [ ] Commission override parsing (all 3 types)
- [ ] Weekly sales bonus calculation
- [ ] Collections bonus (Key only)
- [ ] Stock number generation (all prefixes)
- [ ] Account number auto-increment
- [ ] Date comparisons across timezone boundaries
- [ ] Large dataset pagination (sales > 1000 records)
- [ ] Image upload and display
- [ ] Report PDF generation
- [ ] Report logging and archiving
- [ ] Calendar event CRUD with ownership
- [ ] Search and filter performance

---

## 🚨 Known Issues & Workarounds

### Issue: Salesperson Split Column Missing
Some Supabase installations may not have the `"Salesperson Split"` column in the Sales table.

**Workaround:**
```typescript
try {
  await supabase.from('Sales').insert(saleData)
} catch (error) {
  if (error.message.includes('Salesperson Split')) {
    // Remove split column and retry
    const { salespersonSplit, ...fallbackData } = saleData
    await supabase.from('Sales').insert(fallbackData)
    console.warn('Salesperson Split column not available')
  }
}
```

### Issue: Date String Format Variations
Sales data may have inconsistent date formats.

**Workaround:**
```typescript
function parseDateStringToUtc(dateStr) {
  if (!dateStr) return null
  
  // Try ISO format first
  let parsed = new Date(dateStr)
  
  // Try MM/DD/YYYY format
  if (isNaN(parsed.getTime())) {
    const [month, day, year] = dateStr.split('/')
    parsed = new Date(`${year}-${month}-${day}`)
  }
  
  // Try YYYY/MM/DD format
  if (isNaN(parsed.getTime())) {
    const [year, month, day] = dateStr.split('/')
    parsed = new Date(`${year}-${month}-${day}`)
  }
  
  return isNaN(parsed.getTime()) ? null : toUtcMidnight(parsed)
}
```

---

**Last Updated:** November 12, 2025  
**Version:** 1.0

