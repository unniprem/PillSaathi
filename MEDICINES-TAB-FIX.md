# Medicines Tab Fix

## Issue

The "Medicines" tab was showing doses (scheduled times) instead of the actual medicine list. It was also not displaying medicines properly and should list ALL medicines for the patient (both active and inactive).

## Root Cause

`ParentUpcomingScreen.js` was using:

- `useTodayDoses()` hook - which returns doses (scheduled times)
- `DoseCard` component - designed for showing individual dose times
- This was meant for a "Today's Schedule" view, not a medicine list

## Solution

Completely rewrote `ParentUpcomingScreen.js` to:

1. Display ALL medicines (active and inactive) for the parent
2. Show medicine cards with full details
3. Use proper medicine service instead of dose service

### Key Changes

**Data Source:**

```javascript
// Before: Showing doses
const { doses, loading, error, refetch } = useTodayDoses();

// After: Showing medicines
const medicinesList = await medicineService.getMedicinesForParent(user.uid);
```

**Service Function:**

- `getMedicinesForParent(parentId)` - Returns ALL medicines (no status filter)
- Filters only by `parentId` (not by status)
- Returns both active and inactive medicines

**Display:**

- Medicine cards instead of dose cards
- Shows:
  - Medicine name
  - Status badge (Active/Inactive)
  - Dosage
  - Schedule times
  - Instructions
  - "View Details" link
- Active medicines: Full color, green badge
- Inactive medicines: Slightly faded, gray badge

**Navigation:**

- Clicking any medicine navigates to full medicine list view
- Uses proper nested navigation to `HomeTab > ParentMedicineView`

## Features

### Medicine Card Layout

```
┌─────────────────────────────────────┐
│ Medicine Name          [Active]     │
├─────────────────────────────────────┤
│ Dosage: 100mg                       │
│ Schedule: 8:00 AM, 2:00 PM, 8:00 PM │
│ Instructions: Take with food        │
├─────────────────────────────────────┤
│                    View Details ›   │
└─────────────────────────────────────┘
```

### Status Indicators

**Active Medicines:**

- Green badge (#34C759)
- Full opacity
- White background

**Inactive Medicines:**

- Gray badge (#8E8E93)
- 70% opacity
- Light gray background (#F9F9F9)

### Pull-to-Refresh

- Swipe down to refresh medicine list
- Reloads medicines and schedules
- Shows loading indicator during refresh

## Technical Details

### Medicine Query

```javascript
// Firestore query
.collection('medicines')
.where('parentId', '==', parentId)
.get()

// No status filter - returns ALL medicines
```

### Schedule Loading

```javascript
// Load schedules for each medicine
await Promise.all(
  medicinesList.map(async medicine => {
    const schedule = await scheduleService.getScheduleForMedicine(medicine.id);
    schedulesMap[medicine.id] = schedule;
  }),
);
```

### Time Formatting

```javascript
// Converts 24-hour to 12-hour format
"14:30" → "2:30 PM"
"08:00" → "8:00 AM"

// Multiple times joined with commas
["08:00", "14:00", "20:00"] → "8:00 AM, 2:00 PM, 8:00 PM"
```

## Comparison: Before vs After

### Before (Incorrect)

- **Data:** Today's doses (scheduled times)
- **Display:** Dose cards with time and "Taken" button
- **Filter:** Only today's schedule
- **Purpose:** Daily schedule view

### After (Correct)

- **Data:** All medicines for parent
- **Display:** Medicine cards with full details
- **Filter:** All medicines (active + inactive)
- **Purpose:** Complete medicine list

## Files Modified

**Changed:**

- `src/screens/parent/ParentUpcomingScreen.js` - Complete rewrite

**Services Used:**

- `medicineService.getMedicinesForParent()` - Get all medicines
- `scheduleService.getScheduleForMedicine()` - Get schedule for each medicine

## Testing Checklist

- [x] Shows all medicines (active and inactive)
- [x] Active medicines have green badge
- [x] Inactive medicines have gray badge and faded appearance
- [x] Displays dosage correctly
- [x] Shows schedule times in 12-hour format
- [x] Shows instructions when available
- [x] Pull-to-refresh works
- [x] Navigation to medicine view works
- [x] Empty state displays correctly
- [x] Loading state displays correctly
- [x] Error state displays correctly

## User Experience

### For Parents:

**Medicines Tab Now Shows:**

1. Complete list of all their medicines
2. Clear status indicators (Active/Inactive)
3. Quick overview of dosage and schedule
4. Easy navigation to detailed view
5. Pull-to-refresh for latest data

**Benefits:**

- See all medicines at a glance
- Understand which medicines are active
- Quick access to schedule information
- No confusion with dose times vs medicines

## Expected Behavior

1. **On Load:**

   - Fetches all medicines for parent
   - Loads schedule for each medicine
   - Displays in list format

2. **Active Medicines:**

   - Green "Active" badge
   - Full color display
   - Normal opacity

3. **Inactive Medicines:**

   - Gray "Inactive" badge
   - Slightly faded (70% opacity)
   - Light gray background

4. **On Tap:**

   - Navigates to full medicine list view
   - Shows detailed information

5. **Pull Down:**
   - Refreshes medicine list
   - Updates schedules
   - Shows loading indicator

## Notes

- Removed "Clean Up Old Doses" button (not relevant for medicine list)
- Removed dose-specific functionality (mark as taken, etc.)
- Focus is now on medicine management, not daily schedule
- Daily schedule with "Taken" buttons is in Home tab (4-hour window)
