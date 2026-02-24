# Client-Side Implementation - Retry Escalation System

Version: 1.0
Date: 2026-02-22

---

## Overview

This document describes the client-side implementation of the retry escalation system that works with the Cloud Functions backend.

---

## Files Modified

### 1. AlarmSchedulerService.js

**Location**: `src/services/AlarmSchedulerService.js`

**Changes**:

- Added `timeoutAfter: 60000` to Android notification config
- Makes alarms ring for exactly 1 minute before auto-dismissing

**Code**:

```javascript
android: {
  // ... existing config
  timeoutAfter: 60000, // Ring for 60 seconds (1 minute)
}
```

---

### 2. RetryAlarmService.js (NEW)

**Location**: `src/services/RetryAlarmService.js`

**Purpose**: Monitors Firestore for `missedCount` changes and triggers retry alarms

**Key Methods**:

#### `startMonitoring(parentId)`

- Sets up Firestore listener for dose changes
- Monitors doses with status: scheduled, pending, or snoozed
- Automatically triggers retry alarms when missedCount increases

#### `triggerRetryAlarm(dose)`

- Creates immediate full-screen alarm notification
- Shows retry number (1/3 or 2/3)
- Rings for 1 minute with sound and vibration
- Includes "Mark as Taken" and "Snooze" actions

#### `cancelRetryAlarm(doseId)`

- Cancels all retry alarms for a specific dose
- Called when dose is marked as taken

**Usage**:

```javascript
import RetryAlarmService from './services/RetryAlarmService';

// Start monitoring (in ParentHomeScreen)
RetryAlarmService.startMonitoring(parentId);

// Stop monitoring (on unmount)
RetryAlarmService.stopMonitoring();
```

---

### 3. ParentHomeScreen.js

**Location**: `src/screens/parent/ParentHomeScreen.js`

**Changes**:

- Added `useEffect` hook to start/stop retry alarm monitoring
- Monitoring starts when component mounts
- Monitoring stops when component unmounts

**Code**:

```javascript
useEffect(() => {
  if (user?.uid) {
    RetryAlarmService.startMonitoring(user.uid);
  }

  return () => {
    RetryAlarmService.stopMonitoring();
  };
}, [user?.uid]);
```

---

### 4. DoseCard.js

**Location**: `src/components/DoseCard.js`

**Changes**:

- Added retry count badge display
- Shows "Retry X/3" when missedCount is 1 or 2
- Orange badge for visual distinction
- Added `missedCount` to PropTypes

**Visual**:

```
┌─────────────────────────────────┐
│ 2:00 PM          Aspirin        │
│ Retry 1/3        100mg          │
└─────────────────────────────────┘
```

**Styles**:

```javascript
retryBadge: {
  backgroundColor: '#FFA500', // Orange
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  marginTop: 4,
}
```

---

### 5. notificationHandler.js

**Location**: `src/services/notificationHandler.js`

**Changes**:

- Updated `handleMarkAsTaken()` to cancel retry alarms
- Ensures retry alarms are cleared when dose is taken
- Prevents duplicate notifications

**Code**:

```javascript
// Cancel any retry alarms for this dose
const RetryAlarmService = require('./RetryAlarmService').default;
await RetryAlarmService.cancelRetryAlarm(doseId);
```

---

## How It Works

### Flow Diagram

```
Parent misses dose at 2:00 PM
         ↓
Cloud Function detects at 2:01 PM
         ↓
Updates missedCount = 0 in Firestore
         ↓
(No retry alarm yet, waiting for 10 min)
         ↓
Cloud Function checks at 2:10 PM
         ↓
Updates missedCount = 1 in Firestore
         ↓
RetryAlarmService detects change
         ↓
Triggers retry alarm #1 (rings 1 min)
         ↓
Parent still doesn't take it
         ↓
Cloud Function checks at 2:20 PM
         ↓
Updates missedCount = 2 in Firestore
         ↓
RetryAlarmService detects change
         ↓
Triggers retry alarm #2 (rings 1 min)
         ↓
Parent still doesn't take it
         ↓
Cloud Function checks at 2:30 PM
         ↓
Updates missedCount = 3, status = 'missed'
         ↓
Caregivers notified via FCM
         ↓
(No more retry alarms)
```

---

## Firestore Listener

### What It Watches

```javascript
firestore
  .collection('doses')
  .where('parentId', '==', parentId)
  .where('status', 'in', ['scheduled', 'pending', 'snoozed'])
  .onSnapshot(...)
```

### What It Detects

- Document modifications (not additions or deletions)
- Changes to `missedCount` field
- Only triggers for missedCount = 1 or 2

### Why Real-Time?

- Instant retry alarms (no polling delay)
- Works even if app is in background
- Syncs across multiple devices
- Minimal battery impact (Firestore optimized)

---

## Notification Behavior

### Initial Alarm (Scheduled)

- Triggered by AlarmSchedulerService at scheduled time
- Rings for 1 minute
- Full-screen with actions

### Retry Alarm #1 (10 min)

- Triggered by RetryAlarmService when missedCount = 1
- Same behavior as initial alarm
- Shows "Retry 1 of 3" in body
- Orange badge

### Retry Alarm #2 (20 min)

- Triggered by RetryAlarmService when missedCount = 2
- Same behavior as initial alarm
- Shows "Retry 2 of 3" in body
- Red badge (more urgent)

### No Alarm at 30 min

- missedCount = 3 means escalated
- Only caregivers notified
- No more parent alarms

---

## User Experience

### Parent View

**Upcoming Doses Screen**:

```
┌─────────────────────────────────┐
│ 2:00 PM          Aspirin        │
│                  100mg      ›   │
└─────────────────────────────────┘

After 10 min (first retry):
┌─────────────────────────────────┐
│ 2:00 PM          Aspirin        │
│ Retry 1/3        100mg      ›   │
└─────────────────────────────────┘

After 20 min (second retry):
┌─────────────────────────────────┐
│ 2:00 PM          Aspirin        │
│ Retry 2/3        100mg      ›   │
└─────────────────────────────────┘

After 30 min (escalated):
┌─────────────────────────────────┐
│ 2:00 PM          Aspirin        │
│ MISSED           100mg      ›   │
└─────────────────────────────────┘
```

### Notification Experience

**Initial Alarm**:

```
⏰ Time to take Aspirin
100mg

[Mark as Taken] [Snooze 10 min]
```

**Retry Alarm #1**:

```
⏰ Reminder: Aspirin
Retry 1 of 3 - Please take your medicine now
100mg

[Mark as Taken] [Snooze 10 min]
```

**Retry Alarm #2**:

```
⏰ Reminder: Aspirin
Retry 2 of 3 - Please take your medicine now
100mg

[Mark as Taken] [Snooze 10 min]
```

---

## Testing Checklist

### Unit Tests

- [ ] RetryAlarmService starts/stops monitoring correctly
- [ ] Retry alarms trigger for missedCount 1 and 2
- [ ] No retry alarm for missedCount 3
- [ ] Retry alarms cancelled when dose taken
- [ ] Multiple doses handled independently

### Integration Tests

- [ ] Firestore listener detects missedCount changes
- [ ] Retry alarm notification displays correctly
- [ ] Alarm rings for full 1 minute
- [ ] "Mark as Taken" cancels retry alarms
- [ ] Retry badge shows in DoseCard
- [ ] Monitoring survives app backgrounding

### Manual Tests

- [ ] Create dose, wait 10 min, verify retry alarm #1
- [ ] Wait another 10 min, verify retry alarm #2
- [ ] Mark dose as taken, verify retry alarms cancelled
- [ ] Check badge shows correct retry count
- [ ] Verify alarm sound/vibration works
- [ ] Test with app in background
- [ ] Test with app closed (should still work via FCM)

---

## Edge Cases Handled

### 1. App Closed

- Firestore listener reconnects on app open
- Missed retry alarms won't trigger retroactively
- Cloud Function still updates missedCount
- Next alarm will trigger when app opens

### 2. Multiple Doses

- Each dose monitored independently
- Separate retry alarms per dose
- No interference between doses

### 3. Dose Taken During Retry

- Retry alarms immediately cancelled
- Firestore listener detects status change
- No more retry alarms triggered

### 4. Medicine Deleted

- Cloud Function skips inactive medicines
- No retry alarms for deleted medicines
- Existing retry alarms remain until dismissed

### 5. Network Issues

- Firestore listener reconnects automatically
- Retry alarms may be delayed
- Eventually consistent when network restored

---

## Performance Considerations

### Battery Impact

- Firestore listener: Minimal (optimized by Firebase)
- Retry alarms: Only 2 per missed dose
- No polling or background tasks

### Network Usage

- Firestore listener: ~1-2 KB per change
- Efficient delta updates only
- Offline support with local cache

### Memory Usage

- Single listener per parent
- Cleaned up on unmount
- No memory leaks

---

## Debugging

### Enable Logging

```javascript
// In RetryAlarmService.js
console.log('[RetryAlarmService] ...');
```

### Check Firestore Listener

```javascript
// Get monitoring status
const status = RetryAlarmService.getStatus();
console.log('Monitoring:', status);
// { isMonitoring: true, parentId: 'abc123' }
```

### Verify Retry Alarms

```javascript
// Check scheduled notifications
const notifications = await notifee.getTriggerNotifications();
console.log('Scheduled:', notifications);

// Check displayed notifications
const displayed = await notifee.getDisplayedNotifications();
console.log('Displayed:', displayed);
```

### Test Manually

```javascript
// Manually trigger retry alarm
const testDose = {
  id: 'test123',
  medicineId: 'med456',
  medicineName: 'Test Medicine',
  dosageAmount: 100,
  dosageUnit: 'mg',
  missedCount: 1,
};

await RetryAlarmService.triggerRetryAlarm(testDose);
```

---

## Deployment Steps

1. **Deploy Cloud Functions** (backend first):

   ```bash
   cd functions
   firebase deploy --only functions
   ```

2. **Update App Code** (client-side):

   - All files already updated ✅
   - No additional changes needed

3. **Test in Development**:

   - Run app: `npm run android` or `npm run ios`
   - Create test dose
   - Wait for retry alarms
   - Verify behavior

4. **Deploy to Production**:
   - Build release: `npm run build:android` or `npm run build:ios`
   - Test with production Firebase project
   - Monitor logs for errors

---

## Monitoring

### Key Metrics

1. **Retry Alarm Success Rate**

   - % of retry alarms that trigger successfully
   - Target: >95%

2. **Dose Taken After Retry**

   - % of doses taken after retry 1 or 2
   - Target: 50-70% after retry 1, 20-30% after retry 2

3. **Escalation Rate**

   - % of doses reaching missedCount = 3
   - Target: <20%

4. **False Positives**
   - Doses marked missed incorrectly
   - Target: <1%

### Logging

```javascript
// RetryAlarmService logs
[RetryAlarmService] Starting monitoring for parent: abc123
[RetryAlarmService] Dose changed: { doseId, missedCount, ... }
[RetryAlarmService] Triggering retry alarm: { doseId, retryNumber }
[RetryAlarmService] Retry alarm triggered successfully
```

---

## Future Enhancements

1. **Configurable Timing**

   - Let parents set retry intervals
   - Store in user preferences

2. **Smart Retry**

   - Learn optimal retry times per user
   - Adjust based on historical data

3. **Escalation Levels**

   - Notify different caregivers at different times
   - Primary caregiver at 30 min, secondary at 45 min

4. **Voice Reminders**

   - Use TTS for retry alarms
   - "Please take your Aspirin"

5. **Snooze Integration**
   - Reset retry count when snoozed
   - Adjust retry timing based on snooze

---

## Troubleshooting

### Issue: Retry alarms not triggering

**Possible Causes**:

- Firestore listener not started
- App doesn't have notification permissions
- missedCount not updating in Firestore

**Solutions**:

1. Check ParentHomeScreen mounted
2. Verify notification permissions granted
3. Check Cloud Function logs
4. Verify Firestore rules allow reads

### Issue: Multiple retry alarms for same dose

**Possible Causes**:

- Listener triggered multiple times
- Notification not cancelled properly

**Solutions**:

1. Check notification IDs are unique
2. Verify cancellation logic
3. Add debouncing to listener

### Issue: Retry alarms after dose taken

**Possible Causes**:

- Retry alarms not cancelled
- Race condition in status update

**Solutions**:

1. Verify `cancelRetryAlarm()` called
2. Check Firestore write succeeded
3. Add retry alarm cancellation to all "mark taken" paths

---

End of Client-Side Implementation Documentation
