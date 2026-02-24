# Retry & Escalation System

Version: 2.0
Date: 2026-02-22

---

## Overview

The new escalation system implements a 3-retry approach before notifying caregivers, giving parents multiple chances to take their medication before escalation.

---

## How It Works

### Timeline

```
Scheduled Time: 2:00 PM
├─ 2:00 PM: Alarm rings for 1 minute
├─ 2:01 PM: First check (missedCount = 0)
│   └─ If not taken: Wait for retry
│
├─ 2:10 PM: Retry 1 (missedCount = 1)
│   └─ Alarm rings again for 1 minute
│   └─ If not taken: Wait for retry
│
├─ 2:20 PM: Retry 2 (missedCount = 2)
│   └─ Alarm rings again for 1 minute
│   └─ If not taken: Wait for escalation
│
└─ 2:30 PM: Escalation (missedCount = 3)
    └─ Mark as 'missed'
    └─ Notify ALL caregivers via FCM
```

### Key Points

1. **Alarm Duration**: Each alarm rings for 1 full minute
2. **Retry Intervals**: 10 minutes between each retry
3. **Total Grace Period**: 30 minutes before caregiver notification
4. **Retry Count**: Tracked in `missedCount` field (0-3)

---

## Database Schema Changes

### Doses Collection

New/Updated fields:

```javascript
{
  // Existing fields...
  status: 'scheduled' | 'taken' | 'missed' | 'snoozed',

  // NEW FIELDS
  missedCount: 0,        // Integer: 0-3 (retry attempts)
  lastRetryAt: Timestamp, // When last retry/check occurred

  // Updated when escalated
  missedAt: Timestamp,    // When marked as missed (after 3 attempts)
  escalatedAt: Timestamp, // When caregivers were notified
}
```

### Field Meanings

- `missedCount = 0`: First check (1 min overdue)
- `missedCount = 1`: First retry (10 min overdue)
- `missedCount = 2`: Second retry (20 min overdue)
- `missedCount = 3`: Escalated to caregivers (30 min overdue)

---

## Cloud Function Logic

### scheduledDoseCheck (runs every 5 minutes)

```javascript
For each overdue dose:
  Calculate minutes overdue
  Get current missedCount

  If 30+ min overdue AND missedCount >= 2:
    → Set status = 'missed'
    → Set missedCount = 3
    → Notify caregivers

  Else if 20+ min overdue AND missedCount === 1:
    → Set missedCount = 2
    → Trigger retry alarm (client-side)

  Else if 10+ min overdue AND missedCount === 0:
    → Set missedCount = 1
    → Trigger retry alarm (client-side)

  Else if 1+ min overdue AND missedCount === 0:
    → Keep missedCount = 0
    → Wait for next check
```

---

## Client-Side Changes Needed

### 1. Alarm Ringing Duration

Update `AlarmSchedulerService.js` to make alarms ring for 1 minute:

```javascript
android: {
  // ... existing config
  loopSound: true,
  timeoutAfter: 60000, // Ring for 60 seconds (1 minute)
}
```

### 2. Retry Alarm Triggering

Add a Firestore listener to watch for `missedCount` changes:

```javascript
// In AlarmSchedulerService or new RetryAlarmService
subscribeToMissedCountChanges(parentId) {
  return firestore
    .collection('doses')
    .where('parentId', '==', parentId)
    .where('status', '==', 'scheduled')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const dose = change.doc.data();

          // If missedCount increased, trigger retry alarm
          if (dose.missedCount > 0 && dose.missedCount < 3) {
            this.triggerRetryAlarm(dose);
          }
        }
      });
    });
}

triggerRetryAlarm(dose) {
  // Create immediate alarm notification
  notifee.displayNotification({
    title: `⏰ Reminder: ${dose.medicineName}`,
    body: `Retry ${dose.missedCount} of 3 - Please take your medicine`,
    // ... full alarm config with sound, vibration, etc.
  });
}
```

### 3. Update Dose Status Display

Show retry count in UI:

```javascript
// In dose list/card components
{
  dose.missedCount > 0 && dose.missedCount < 3 && (
    <Text style={styles.retryBadge}>Retry {dose.missedCount}/3</Text>
  );
}
```

---

## Caregiver Notification

### Notification Content

```
Title: 🚨 Missed Dose Alert
Body: John missed Aspirin at 2:00 PM (3 missed attempts)

Data:
{
  type: 'missed_dose',
  doseId: 'abc123',
  parentId: 'parent_uid',
  medicineId: 'med_xyz',
  scheduledTime: '1708617000000',
  missedCount: '3'
}
```

### When Caregiver Taps

- Opens app to Dose History screen
- Pre-filtered to show missed doses
- Highlights the specific missed dose
- Shows "3 attempts" badge

---

## Benefits

### For Parents

- ✅ Multiple chances to take medication
- ✅ Reduces false alarms to caregivers
- ✅ More privacy (30 min grace period)
- ✅ Clear retry indicators

### For Caregivers

- ✅ Only notified after genuine misses
- ✅ Reduced notification fatigue
- ✅ Clear context (3 attempts made)
- ✅ More actionable alerts

### For System

- ✅ Fewer unnecessary notifications
- ✅ Better adherence tracking
- ✅ Clear audit trail (missedCount)
- ✅ Reduced FCM costs

---

## Testing Checklist

### Cloud Function Testing

- [ ] Dose 1 min overdue → missedCount stays 0
- [ ] Dose 10 min overdue → missedCount becomes 1
- [ ] Dose 20 min overdue → missedCount becomes 2
- [ ] Dose 30 min overdue → missedCount becomes 3, status = 'missed'
- [ ] Caregivers receive notification at 30 min
- [ ] Notification includes "3 missed attempts"

### Client-Side Testing

- [ ] Alarm rings for full 1 minute
- [ ] Retry alarm triggers at 10 min
- [ ] Retry alarm triggers at 20 min
- [ ] UI shows retry count (1/3, 2/3)
- [ ] Taking dose stops retry cycle
- [ ] Snoozing resets retry count

### Edge Cases

- [ ] Parent takes dose during retry cycle
- [ ] Medicine deleted during retry cycle
- [ ] Medicine deactivated during retry cycle
- [ ] Multiple doses overdue simultaneously
- [ ] App closed during retry cycle
- [ ] Phone off during retry cycle

---

## Migration Plan

### Phase 1: Deploy Cloud Function (Backend)

1. Update `scheduledDoseCheck.js` ✅
2. Update `sendMissedDoseNotification.js` ✅
3. Deploy functions: `firebase deploy --only functions`
4. Test with existing doses (will work with missedCount = 0)

### Phase 2: Update Dose Generation (Data)

1. Update `doseGenerationService.js` ✅
2. Add `missedCount: 0` to new doses
3. Existing doses will get missedCount via Cloud Function

### Phase 3: Client-Side Retry Alarms (App)

1. Update `AlarmSchedulerService.js` for 1-min duration
2. Add Firestore listener for missedCount changes
3. Implement retry alarm triggering
4. Update UI to show retry count
5. Test thoroughly

### Phase 4: Monitoring & Refinement

1. Monitor escalation logs
2. Check retry effectiveness
3. Gather user feedback
4. Adjust timing if needed

---

## Deployment Commands

```bash
# Deploy Cloud Functions
cd functions
firebase deploy --only functions

# Check function logs
firebase functions:log --only scheduledDoseCheck

# Monitor in real-time
firebase functions:log --only scheduledDoseCheck --follow
```

---

## Monitoring Metrics

### Key Metrics to Track

1. **Retry Success Rate**: % of doses taken after retry
2. **Escalation Rate**: % of doses reaching missedCount = 3
3. **Average Retry Count**: When doses are typically taken
4. **False Positive Rate**: Doses marked missed incorrectly

### Expected Outcomes

- 50-70% of doses taken after first retry (10 min)
- 20-30% taken after second retry (20 min)
- Only 10-20% escalate to caregivers (30 min)
- Overall adherence improvement of 15-25%

---

## Future Enhancements

### Possible Improvements

1. **Configurable Timing**: Let parents set retry intervals
2. **Smart Scheduling**: Learn optimal retry times per user
3. **Escalation Levels**: Notify different caregivers at different times
4. **Snooze Integration**: Reset retry count when snoozed
5. **Voice Reminders**: Use TTS for retry alarms

---

## Support & Troubleshooting

### Common Issues

**Issue**: Retry alarms not triggering

- Check Firestore listener is active
- Verify missedCount is updating
- Check notification permissions

**Issue**: Caregivers notified too early

- Check Cloud Function logs
- Verify time calculations
- Check timezone handling

**Issue**: Doses stuck in retry loop

- Check dose status updates
- Verify Cloud Function execution
- Check for Firestore write errors

---

End of Retry & Escalation System Documentation
