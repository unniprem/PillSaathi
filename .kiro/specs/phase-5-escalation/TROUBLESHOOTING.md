# Troubleshooting - Retry Escalation System

Version: 1.0
Date: 2026-02-22

---

## Issue: Retry after 10 minutes never worked

### Root Cause

The Cloud Function was querying for doses with status `'pending'` or `'snoozed'`, but doses are created with status `'scheduled'`.

### Fix Applied

Updated `scheduledDoseCheck.js` to include `'scheduled'` in the query:

```javascript
// BEFORE (BROKEN)
.where('status', 'in', ['pending', 'snoozed'])

// AFTER (FIXED)
.where('status', 'in', ['scheduled', 'pending', 'snoozed'])
```

### How to Deploy Fix

```bash
cd functions
firebase deploy --only functions:scheduledDoseCheck
```

### How to Verify Fix

1. **Check Cloud Function logs**:

   ```bash
   firebase functions:log --only scheduledDoseCheck
   ```

2. **Look for**:

   ```
   Found X potentially overdue doses
   Dose abc123: 10 min overdue, missedCount: 0
   Retry 1 for dose abc123 (10 min overdue)
   Updated 1 doses (1 retries, 0 escalations)
   ```

3. **Check Firestore**:

   - Open Firebase Console → Firestore
   - Find a dose that's 10+ minutes overdue
   - Verify `missedCount` field = 1
   - Verify `lastRetryAt` timestamp is recent

4. **Check App**:
   - Open parent app
   - Should see retry alarm notification
   - Dose card should show "Retry 1/3" badge

---

## Common Issues

### 1. Cloud Function Not Running

**Symptoms**:

- No logs in Firebase Console
- Doses not updating after 10 minutes
- No retry alarms

**Causes**:

- Cloud Scheduler not enabled
- Function not deployed
- Billing not enabled (Blaze plan required)

**Solutions**:

```bash
# Check if function is deployed
firebase functions:list

# Check Cloud Scheduler
gcloud scheduler jobs list

# Deploy function
firebase deploy --only functions:scheduledDoseCheck

# Enable Cloud Scheduler
gcloud services enable cloudscheduler.googleapis.com
```

---

### 2. Doses Not Found by Query

**Symptoms**:

- Logs show "Found 0 potentially overdue doses"
- Doses exist in Firestore but not processed

**Causes**:

- Wrong status value
- Firestore index missing
- Timezone issues

**Solutions**:

**Check dose status**:

```javascript
// In Firestore Console, check dose document
{
  status: 'scheduled',  // ✅ Correct
  // NOT 'pending' or other value
}
```

**Deploy Firestore indexes**:

```bash
firebase deploy --only firestore:indexes
```

**Check timezone**:

```javascript
// Cloud Function uses UTC
// Verify scheduledTime is in UTC
const scheduledTime = dose.scheduledTime.toDate();
console.log('Scheduled (UTC):', scheduledTime.toISOString());
```

---

### 3. missedCount Not Updating

**Symptoms**:

- Logs show dose processed
- But missedCount stays 0 in Firestore

**Causes**:

- Batch commit failed
- Firestore rules blocking write
- Field name typo

**Solutions**:

**Check Firestore rules**:

```javascript
// In firestore.rules
match /doses/{doseId} {
  // Allow Cloud Functions to write
  allow write: if request.auth != null;
}
```

**Check batch commit**:

```javascript
// In Cloud Function logs, look for:
'Updated X doses (Y retries, Z escalations)';

// If missing, batch.commit() failed
```

**Verify field name**:

```javascript
// Correct spelling
batch.update(doseDoc.ref, {
  missedCount: 1, // ✅ Correct
  // NOT missCount or missed_count
});
```

---

### 4. Retry Alarm Not Triggering

**Symptoms**:

- missedCount updates in Firestore
- But no alarm notification on parent device

**Causes**:

- RetryAlarmService not started
- Firestore listener not active
- Notification permissions denied
- App in background/closed

**Solutions**:

**Check monitoring status**:

```javascript
// In ParentHomeScreen, check logs
console.log('[ParentHomeScreen] Starting retry alarm monitoring');

// Should see in console when screen loads
```

**Check listener**:

```javascript
// In RetryAlarmService logs
[RetryAlarmService] Starting monitoring for parent: abc123
[RetryAlarmService] Dose changed: { doseId, missedCount: 1 }
[RetryAlarmService] Triggering retry alarm
```

**Check permissions**:

```javascript
// In app, check notification permissions
const hasPermission = await notificationConfig.checkPermissions();
console.log('Has notification permission:', hasPermission);
```

**Bring app to foreground**:

- Retry alarms only trigger when app is open
- If app is closed, alarm won't trigger until app opens
- This is by design (Firestore listener pauses in background)

---

### 5. Wrong Retry Timing

**Symptoms**:

- Retry happens at wrong time (not 10, 20, 30 min)
- Multiple retries at once

**Causes**:

- Cloud Function runs every 5 minutes
- Timing is approximate, not exact
- Multiple function invocations

**Expected Behavior**:

```
Scheduled: 2:00 PM
First check: 2:01-2:05 PM (within 5 min window)
Retry 1: 2:10-2:15 PM (within 5 min window)
Retry 2: 2:20-2:25 PM (within 5 min window)
Escalate: 2:30-2:35 PM (within 5 min window)
```

**Not Exact**:

- Cloud Scheduler runs every 5 minutes
- Actual timing depends on when function executes
- ±5 minute variance is normal

---

### 6. Escalation Not Notifying Caregivers

**Symptoms**:

- Dose reaches missedCount = 3
- Status changes to 'missed'
- But caregivers don't receive notification

**Causes**:

- No caregivers linked
- No device tokens
- FCM send failed
- Notification handler error

**Solutions**:

**Check relationships**:

```javascript
// In Firestore, check relationships collection
{
  parentId: 'parent123',
  caregiverId: 'caregiver456',
  status: 'active'  // ✅ Must be active
}
```

**Check device tokens**:

```javascript
// In Firestore, check deviceTokens collection
{
  userId: 'caregiver456',
  token: 'fcm_token_here',
  enabled: true  // ✅ Must be enabled
}
```

**Check FCM logs**:

```bash
# In Cloud Function logs
firebase functions:log --only sendMissedDoseNotification

# Look for:
"Sending notification to X devices"
"Notification sent: Y succeeded, Z failed"
```

---

## Testing Checklist

### Before Testing

- [ ] Cloud Functions deployed
- [ ] Firestore indexes deployed
- [ ] Firestore rules allow writes
- [ ] Cloud Scheduler enabled
- [ ] Blaze plan enabled

### Test Scenario 1: Full Retry Cycle

1. [ ] Create dose scheduled 1 minute ago
2. [ ] Wait 5 minutes
3. [ ] Check Firestore: missedCount = 0
4. [ ] Wait 10 minutes (total 15 min)
5. [ ] Check Firestore: missedCount = 1
6. [ ] Check app: Retry alarm triggered
7. [ ] Wait 10 minutes (total 25 min)
8. [ ] Check Firestore: missedCount = 2
9. [ ] Check app: Retry alarm triggered
10. [ ] Wait 10 minutes (total 35 min)
11. [ ] Check Firestore: missedCount = 3, status = 'missed'
12. [ ] Check caregiver app: Notification received

### Test Scenario 2: Dose Taken During Retry

1. [ ] Create dose scheduled 1 minute ago
2. [ ] Wait 15 minutes
3. [ ] Check Firestore: missedCount = 1
4. [ ] Mark dose as taken in app
5. [ ] Check Firestore: status = 'taken'
6. [ ] Wait 10 minutes
7. [ ] Verify: No more retry alarms
8. [ ] Verify: missedCount stays 1 (not incremented)

### Test Scenario 3: Multiple Doses

1. [ ] Create 3 doses, all overdue
2. [ ] Wait for Cloud Function to run
3. [ ] Verify: All 3 doses processed independently
4. [ ] Verify: Each has correct missedCount
5. [ ] Verify: No interference between doses

---

## Monitoring Commands

### View Cloud Function Logs

```bash
# All logs
firebase functions:log

# Specific function
firebase functions:log --only scheduledDoseCheck

# Follow in real-time
firebase functions:log --only scheduledDoseCheck --follow

# Last 100 lines
firebase functions:log --only scheduledDoseCheck --lines 100
```

### Check Cloud Scheduler

```bash
# List all jobs
gcloud scheduler jobs list

# Describe specific job
gcloud scheduler jobs describe firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1

# View recent runs
gcloud scheduler jobs describe firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1 | grep lastAttemptTime
```

### Check Firestore

```bash
# Using Firebase CLI
firebase firestore:get doses --limit 10

# Or use Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT/firestore
```

---

## Quick Fixes

### Force Cloud Function to Run Now

```bash
# Trigger manually (for testing)
gcloud scheduler jobs run firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1
```

### Reset Dose for Testing

```javascript
// In Firestore Console, update dose document
{
  status: 'scheduled',
  missedCount: 0,
  scheduledTime: Timestamp (1 minute ago),
  lastRetryAt: null
}
```

### Clear Retry Alarms

```javascript
// In app, run this in console
import RetryAlarmService from './services/RetryAlarmService';
await RetryAlarmService.cancelRetryAlarm('dose_id_here');
```

---

## Support

If issues persist after trying these solutions:

1. **Check Cloud Function logs** for detailed error messages
2. **Verify Firestore data** matches expected schema
3. **Test with simple dose** (single dose, no complications)
4. **Enable verbose logging** in both Cloud Function and app
5. **Contact Firebase Support** if infrastructure issue

---

End of Troubleshooting Guide
