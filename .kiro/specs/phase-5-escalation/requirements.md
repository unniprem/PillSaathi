# Phase 5: Escalation - Requirements

Version: 2.0
Date: 2026-02-21
Status: Ready for Implementation
Approach: Cloud Functions + Cloud Scheduler

---

## Overview

Phase 5 implements a reliable, enterprise-grade escalation system using Cloud Functions and Cloud Scheduler. This ensures missed doses are detected within 5 minutes and caregivers are notified immediately via Firebase Cloud Messaging (FCM).

---

## Goals

1. Detect missed doses automatically (30 minutes after scheduled time)
2. Notify all caregivers when a dose is missed via FCM push notifications
3. Provide adherence visibility for caregivers
4. Ensure 99.95% uptime and < 5 minute detection latency

---

## Prerequisites

- Phase 4 completed (dose tracking working)
- FCM configured for all users
- Device tokens registered in deviceTokens collection
- Firebase Blaze plan enabled
- Cloud Functions and Cloud Scheduler APIs enabled

---

## Core Features

### 1. Missed Dose Detection (Cloud Function)

**Requirements:**

- Cloud Function runs every 5 minutes (triggered by Cloud Scheduler)
- Checks all doses with status "pending" or "snoozed"
- Marks dose as "missed" if 30+ minutes past scheduledTime
- Updates dose document with missedAt and escalatedAt timestamps
- Triggers FCM notifications to all caregivers

**Implementation:**

- Function: `scheduledDoseCheck`
- Trigger: Cloud Scheduler (cron: `*/5 * * * *`)
- Runtime: Node.js 18
- Region: us-central1

**Business Rules:**

- Grace period: 30 minutes after scheduledTime
- Only active medicines are checked
- Archived/deleted medicines are ignored
- Already taken/missed doses are skipped
- Processes all users in single execution

### 2. Caregiver Notifications (FCM)

**Requirements:**

- Push notifications sent to all caregivers linked to parent
- Notification includes: parent name, medicine name, scheduled time
- Notification opens app to dose history
- Retry logic for failed deliveries
- Logging of all notification attempts

**Implementation:**

- Function: `sendMissedDoseNotification`
- Called by: `scheduledDoseCheck`
- Delivery: FCM multicast
- Logging: escalationLogs collection

**Notification Content:**

```
Title: "Missed Dose Alert"
Body: "[Parent Name] missed [Medicine Name] at [Time]"
Data: {
  type: "missed_dose",
  doseId,
  parentId,
  medicineId,
  scheduledTime
}
```

### 3. Adherence Dashboard

**Requirements:**

- Caregiver can view adherence metrics per parent
- Show: taken %, missed %, snoozed %
- Time period filters: 7 days, 30 days, all time
- Per-medicine breakdown
- Visual indicators (charts/graphs)

**Metrics:**

- Total doses scheduled
- Doses taken on time (within 30 min)
- Doses taken late (after 30 min)
- Doses missed
- Adherence rate = (taken / total) \* 100

### 4. Missed Dose History

**Requirements:**

- Caregivers see list of all missed doses
- Filterable by parent, medicine, date range
- Shows: medicine name, scheduled time, missed time
- Sorted by most recent first
- Pagination for large lists

---

## Technical Implementation

### Cloud Function: scheduledDoseCheck

**File:** `functions/src/scheduledDoseCheck.js`

**Trigger:** Cloud Scheduler (every 5 minutes)

**Logic:**

```javascript
1. Query doses where:
   - status IN ['pending', 'snoozed']
   - scheduledTime < (now - 30 minutes)

2. For each overdue dose:
   a. Verify medicine is still active
   b. Update dose status to 'missed'
   c. Set missedAt and escalatedAt timestamps
   d. Call sendMissedDoseNotification

3. Return summary of processed doses
```

**Error Handling:**

- Continue processing if one dose fails
- Log all errors to Cloud Logging
- Return success/failure counts
- Alert on high failure rate

### Cloud Function: sendMissedDoseNotification

**File:** `functions/src/sendMissedDoseNotification.js`

**Trigger:** Called by scheduledDoseCheck

**Logic:**

```javascript
1. Get parent name from users collection
2. Get medicine name from medicines collection
3. Query relationships for caregivers
4. Get device tokens for caregivers
5. Build FCM notification payload
6. Send multicast notification
7. Log results to escalationLogs
8. Return success/failure counts
```

**Retry Logic:**

- FCM handles retries automatically
- Log failed deliveries
- Continue with other caregivers if one fails

### Firestore Queries

**Get overdue doses:**

```javascript
db.collection('doses')
  .where('status', 'in', ['pending', 'snoozed'])
  .where('scheduledTime', '<', thirtyMinutesAgo)
  .get();
```

**Get caregivers for parent:**

```javascript
db.collection('relationships')
  .where('parentId', '==', parentId)
  .where('status', '==', 'active')
  .get();
```

**Get device tokens:**

```javascript
db.collection('deviceTokens')
  .where('userId', '==', caregiverId)
  .where('enabled', '==', true)
  .get();
```

**Get adherence stats:**

```javascript
db.collection('doses')
  .where('parentId', '==', parentId)
  .where('scheduledTime', '>=', startDate)
  .where('scheduledTime', '<=', endDate)
  .get();
```

---

## UI Components

### 1. AdherenceDashboard (Caregiver)

**Location:** src/screens/caregiver/AdherenceDashboardScreen.js

**Components:**

- Parent selector (if multiple parents)
- Time period selector (7d, 30d, all)
- Adherence percentage (large display)
- Status breakdown (taken/missed/snoozed counts)
- Per-medicine adherence list
- Trend chart (optional)

### 2. MissedDosesList (Caregiver)

**Location:** src/screens/caregiver/MissedDosesListScreen.js

**Components:**

- Filter controls (parent, medicine, date range)
- List of missed doses
- Each item shows: medicine, scheduled time, how long ago
- Tap to see dose details
- Empty state if no missed doses

### 3. FCM Notification Handler

**Location:** App.js (existing FCM handler)

**Behavior:**

- Listen for FCM messages
- Handle "missed_dose" notification type
- Navigate to dose history or adherence dashboard
- Show in-app alert if app is open
- Badge count for unread alerts
- Clear notification when viewed

---

## Data Model Updates

### doses collection

**New fields:**

```javascript
{
  missedAt: timestamp | null,  // When dose was marked missed
  escalatedAt: timestamp | null,  // When caregivers were notified
}
```

### New collection: escalationLogs

**Purpose:** Track all escalation events for debugging and analytics

**Schema:**

```javascript
{
  id: string,
  doseId: string,
  parentId: string,
  medicineId: string,
  caregiverIds: string[],
  scheduledTime: timestamp,
  missedAt: timestamp,
  notificationsSent: number,
  notificationsFailed: number,
  error: string | null,
  createdAt: timestamp,
}
```

---

## Security Rules Updates

### doses collection

```javascript
// Caregivers can read doses for their parents
match /doses/{doseId} {
  allow read: if isParentOfDose(doseId) || isCaregiverOfDoseParent(doseId);
  allow update: if isParentOfDose(doseId) &&
                   request.resource.data.diff(resource.data).affectedKeys()
                   .hasOnly(['status', 'takenAt', 'snoozedUntil']);
}
```

### escalationLogs collection

```javascript
// Only caregivers can read logs for their parents
match /escalationLogs/{logId} {
  allow read: if isAuthenticated() &&
                 isCaregiverOfParent(resource.data.parentId);
  // Only Cloud Functions can write
  allow write: if false;
}
```

---

## Testing Requirements

### Unit Tests

- [ ] scheduledDoseCheck identifies overdue doses correctly
- [ ] 30-minute grace period calculated accurately
- [ ] Notification payload built correctly
- [ ] Adherence calculations are accurate
- [ ] Edge cases: timezone changes, deleted medicines

### Integration Tests

- [ ] Cloud Function triggers on schedule
- [ ] Dose status updates in Firestore
- [ ] FCM notifications delivered to caregivers
- [ ] Multiple caregivers all receive notifications
- [ ] Notification opens correct screen in app
- [ ] escalationLogs populated correctly

### Manual Tests

- [ ] Create dose, wait 30 minutes, verify escalation
- [ ] Verify Cloud Function marks dose missed
- [ ] Verify caregiver receives FCM notification
- [ ] Tap notification, verify navigation
- [ ] Check adherence dashboard shows correct data
- [ ] Test with multiple parents and caregivers
- [ ] Test with app closed, in background, in foreground
- [ ] Test with no internet (notifications queued)
- [ ] Test with invalid device tokens

### Performance Tests

- [ ] Function handles 100+ overdue doses
- [ ] Notification delivery < 2 minutes
- [ ] Adherence queries complete < 1 second
- [ ] No excessive Firestore reads
- [ ] Function execution time < 30 seconds

---

## Acceptance Criteria

### Must Have

- [ ] Doses automatically marked missed after 30 minutes
- [ ] Cloud Function runs reliably every 5 minutes
- [ ] All caregivers receive FCM push notifications
- [ ] Notifications include parent and medicine names
- [ ] Adherence dashboard shows accurate percentages
- [ ] Missed dose list displays all missed doses
- [ ] No false positives (taken doses not escalated)
- [ ] escalationLogs track all events

### Should Have

- [ ] Notification retry on failure
- [ ] Escalation logging for debugging
- [ ] Per-medicine adherence breakdown
- [ ] Time period filtering (7d, 30d)
- [ ] Visual adherence trends
- [ ] Cloud Function monitoring and alerts

### Nice to Have

- [ ] In-app notification history
- [ ] Caregiver acknowledgment of alerts
- [ ] Configurable grace period per medicine
- [ ] Weekly adherence summary
- [ ] Admin dashboard for escalation metrics

---

## Dependencies

### External Services

- Cloud Scheduler (for scheduled function)
- Firebase Cloud Messaging (for notifications)
- Cloud Functions (for backend logic)
- Cloud Logging (for monitoring)

### Internal Dependencies

- Phase 4 dose tracking must be working
- Device tokens must be registered
- Relationships must be established
- FCM configured in app

---

## Risks & Mitigations

### Risk: Cloud Function doesn't run

**Impact:** High - No escalations happen
**Mitigation:**

- Monitor function execution logs
- Set up alerting for missed runs
- Test scheduler configuration thoroughly
- Use Cloud Monitoring dashboards

### Risk: Notifications not delivered

**Impact:** High - Caregivers not alerted
**Mitigation:**

- FCM has built-in retry logic
- Log all attempts to escalationLogs
- Monitor delivery rates
- Test on various devices/OS versions
- Handle invalid tokens gracefully

### Risk: False positives

**Impact:** Medium - Caregiver alert fatigue
**Mitigation:**

- Thorough testing of grace period logic
- Verify timezone handling
- Check for race conditions
- Verify medicine is active before escalating

### Risk: High Firestore costs

**Impact:** Medium - Budget overrun
**Mitigation:**

- Optimize queries (use indexes)
- Limit query results
- Cache adherence calculations
- Monitor usage with budget alerts
- Use composite indexes

### Risk: Function timeout

**Impact:** Medium - Some doses not processed
**Mitigation:**

- Batch process doses efficiently
- Set appropriate timeout (60 seconds)
- Log processing time
- Optimize queries

---

## Rollout Plan

### Phase 5.1: Cloud Functions Setup (Week 1)

- Enable Blaze plan and APIs
- Deploy Cloud Functions
- Configure Cloud Scheduler
- Test with sample data
- Monitor for 48 hours

### Phase 5.2: FCM Integration (Week 1-2)

- Update app FCM handler
- Test notification delivery
- Add notification navigation
- Test on real devices

### Phase 5.3: Dashboard UI (Week 2-3)

- Build adherence dashboard
- Implement missed dose list
- Add filtering and sorting
- User testing

### Phase 5.4: Production Deployment (Week 3)

- Deploy to production
- Monitor metrics
- Fix bugs
- Documentation

---

## Success Metrics

### Technical Metrics

- Escalation latency < 5 minutes (from missed to notification)
- Notification delivery rate > 95%
- Cloud Function success rate > 99%
- False positive rate < 1%
- Function execution time < 30 seconds

### Product Metrics

- < 25% of doses escalate (from PRD)
- Caregivers respond to alerts within 1 hour
- Adherence rate improves over time
- User satisfaction with alert system

---

## Cost Estimates

### Development

- Cloud Scheduler: $0 (free tier)
- Cloud Functions: $0 (free tier)
- Firestore: ~$1-2/month
- **Total: ~$1-2/month**

### Production (1,000 users)

- Cloud Scheduler: $0 (free tier)
- Cloud Functions: ~$0.50/month
- Firestore: ~$10-15/month
- **Total: ~$10-15/month**

---

## Next Steps

1. Review and approve requirements
2. Enable Firebase Blaze plan
3. Follow cloud-functions-setup.md guide
4. Deploy Cloud Functions to dev
5. Test escalation flow end-to-end
6. Build adherence dashboard UI
7. Deploy to production
8. Monitor and optimize

---

End of Requirements
