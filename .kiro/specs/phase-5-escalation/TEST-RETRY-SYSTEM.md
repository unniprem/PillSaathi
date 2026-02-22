# Testing the Retry Escalation System

Version: 1.0
Date: 2026-02-22

---

## Quick Test Guide

### Step 1: Create a Test Dose (Overdue)

You need to create a dose that's already overdue (in the past).

**Option A: Using Firestore Console**

1. Go to Firebase Console → Firestore
2. Navigate to `doses` collection
3. Click "Add Document"
4. Use this data:

```json
{
  "medicineId": "YOUR_MEDICINE_ID",
  "medicineName": "Test Medicine",
  "parentId": "YOUR_PARENT_UID",
  "scheduleId": "test_schedule",
  "dosageAmount": 100,
  "dosageUnit": "mg",
  "scheduledTime": [Timestamp: 10 minutes ago],
  "status": "scheduled",
  "missedCount": 0,
  "createdAt": [Timestamp: now],
  "updatedAt": [Timestamp: now]
}
```

**How to set "10 minutes ago"**:

- Click the timestamp field
- Select current date/time
- Subtract 10 minutes manually
- Or use: `new Date(Date.now() - 10 * 60 * 1000)`

**Option B: Using Test Script**

Create a test dose programmatically:

```javascript
// In your app or test script
import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

const firestore = getFirestore(getApp());

// Create dose 10 minutes in the past
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

await firestore.collection('doses').add({
  medicineId: 'test_med_123',
  medicineName: 'Test Medicine',
  parentId: 'YOUR_PARENT_UID', // Replace with actual parent UID
  scheduleId: 'test_schedule',
  dosageAmount: 100,
  dosageUnit: 'mg',
  scheduledTime: tenMinutesAgo,
  status: 'scheduled',
  missedCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log('Test dose created 10 minutes in the past');
```

---

### Step 2: Wait for Cloud Function

The Cloud Function runs **every 5 minutes**. After creating the overdue dose:

1. **Wait 0-5 minutes** for the next Cloud Function execution
2. **Check Cloud Function logs**:

   ```bash
   firebase functions:log --only scheduledDoseCheck --follow
   ```

3. **Look for these logs**:
   ```
   Starting scheduled dose check at [timestamp]
   Found X potentially overdue doses
   Dose [doseId]: 10 min overdue, missedCount: 0
   Retry 1 for dose [doseId] (10 min overdue)
   Updated 1 doses (1 retries, 0 escalations)
   ```

---

### Step 3: Verify Firestore Update

After the Cloud Function runs:

1. **Check Firestore** → `doses` collection → your test dose
2. **Verify fields updated**:
   ```json
   {
     "missedCount": 1,
     "lastRetryAt": [recent timestamp]
   }
   ```

---

### Step 4: Verify Retry Alarm

If your app is open and RetryAlarmService is running:

1. **Check app logs**:

   ```
   [RetryAlarmService] Dose changed: { doseId, missedCount: 1 }
   [RetryAlarmService] Triggering retry alarm
   [RetryAlarmService] Retry alarm triggered successfully
   ```

2. **Check notification**:
   - Should see alarm notification
   - Title: "⏰ Reminder: Test Medicine"
   - Body: "Retry 1 of 3 - Please take your medicine now"

---

### Step 5: Test Full Cycle

To test the complete retry cycle:

**Timeline**:

```
T+0:  Create dose (10 min overdue)
T+5:  Cloud Function runs → missedCount = 1
      Retry alarm #1 triggers

T+15: Cloud Function runs → missedCount = 2
      Retry alarm #2 triggers

T+25: Cloud Function runs → missedCount = 3, status = 'missed'
      Caregivers notified
```

**What to watch**:

1. Firestore `missedCount` field: 0 → 1 → 2 → 3
2. Firestore `status` field: 'scheduled' → 'missed'
3. Retry alarms: 2 alarms (at T+5 and T+15)
4. Caregiver notification: 1 notification (at T+25)

---

## Common Issues

### Issue: "Found 0 potentially overdue doses"

**Cause**: Dose not found by query

**Solutions**:

1. Verify dose `status` is `'scheduled'` (not 'pending')
2. Verify `scheduledTime` is in the past (at least 1 minute ago)
3. Check Cloud Function is deployed with the fix:
   ```bash
   firebase deploy --only functions:scheduledDoseCheck
   ```

---

### Issue: Retry alarm not triggering

**Cause**: RetryAlarmService not monitoring

**Solutions**:

1. Verify ParentHomeScreen is mounted
2. Check app logs for:
   ```
   [ParentHomeScreen] Starting retry alarm monitoring
   ```
3. Bring app to foreground (listener pauses in background)

---

### Issue: Alarm scheduled for future date

**Cause**: Creating dose with future `scheduledTime`

**Solution**:

- Use past timestamp (at least 1 minute ago)
- Example: `new Date(Date.now() - 10 * 60 * 1000)`

---

## Manual Testing Script

Here's a complete test script you can run:

```javascript
// test-retry-system.js
import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';

async function testRetrySystem() {
  const firestore = getFirestore(getApp());
  const auth = getAuth(getApp());
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('User not authenticated');
    return;
  }

  console.log('Creating test dose...');

  // Create dose 10 minutes in the past
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const doseRef = await firestore.collection('doses').add({
    medicineId: 'test_med_' + Date.now(),
    medicineName: 'Test Retry Medicine',
    parentId: currentUser.uid,
    scheduleId: 'test_schedule',
    dosageAmount: 100,
    dosageUnit: 'mg',
    scheduledTime: tenMinutesAgo,
    status: 'scheduled',
    missedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✓ Test dose created:', doseRef.id);
  console.log('  Scheduled time:', tenMinutesAgo.toISOString());
  console.log('  Status: scheduled');
  console.log('  missedCount: 0');
  console.log('');
  console.log('Now wait 5 minutes for Cloud Function to run...');
  console.log('Then check Firestore for missedCount = 1');

  // Set up listener to watch for updates
  const unsubscribe = doseRef.onSnapshot(doc => {
    const data = doc.data();
    console.log('');
    console.log('=== DOSE UPDATED ===');
    console.log('  missedCount:', data.missedCount);
    console.log('  status:', data.status);
    console.log('  lastRetryAt:', data.lastRetryAt?.toDate?.().toISOString());

    if (data.missedCount === 3) {
      console.log('');
      console.log('✓ ESCALATION COMPLETE!');
      console.log('  Caregivers should have been notified');
      unsubscribe();
    }
  });

  return doseRef.id;
}

// Run test
testRetrySystem()
  .then(doseId => console.log('Test started. Dose ID:', doseId))
  .catch(error => console.error('Test failed:', error));
```

---

## Expected Timeline

For a dose created **10 minutes overdue**:

```
00:00 - Create dose (10 min overdue)
        status: 'scheduled', missedCount: 0

00:00-05:00 - Wait for Cloud Function
              (runs every 5 minutes)

~05:00 - Cloud Function runs
         ✓ Finds dose (10 min overdue)
         ✓ Updates: missedCount = 1
         ✓ RetryAlarmService detects change
         ✓ Retry alarm #1 triggers

10:00-15:00 - Wait for next Cloud Function run
              (dose now 20 min overdue)

~15:00 - Cloud Function runs
         ✓ Finds dose (20 min overdue, missedCount = 1)
         ✓ Updates: missedCount = 2
         ✓ RetryAlarmService detects change
         ✓ Retry alarm #2 triggers

20:00-25:00 - Wait for next Cloud Function run
              (dose now 30 min overdue)

~25:00 - Cloud Function runs
         ✓ Finds dose (30 min overdue, missedCount = 2)
         ✓ Updates: missedCount = 3, status = 'missed'
         ✓ Sends FCM notification to caregivers
         ✓ No more retry alarms
```

**Total time**: ~25 minutes from dose creation to caregiver notification

---

## Verification Checklist

After running the test:

- [ ] Cloud Function logs show dose found
- [ ] Cloud Function logs show "Retry 1 for dose"
- [ ] Firestore shows missedCount = 1
- [ ] Retry alarm #1 triggered in app
- [ ] After 10 more minutes: missedCount = 2
- [ ] Retry alarm #2 triggered in app
- [ ] After 10 more minutes: missedCount = 3, status = 'missed'
- [ ] Caregiver received FCM notification
- [ ] Caregiver app shows "Escalated (3 attempts)"

---

## Quick Debug Commands

```bash
# Watch Cloud Function logs in real-time
firebase functions:log --only scheduledDoseCheck --follow

# Manually trigger Cloud Function (for testing)
gcloud scheduler jobs run firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1

# Check Firestore for test doses
firebase firestore:get doses --limit 10

# Check if Cloud Scheduler is running
gcloud scheduler jobs list
```

---

End of Test Guide
