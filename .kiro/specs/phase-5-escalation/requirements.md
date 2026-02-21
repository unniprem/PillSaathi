# Phase 5: Escalation - Requirements

Version: 1.0
Date: 2026-02-21
Status: Planning

---

## Overview

Phase 5 implements the escalation system that detects missed doses and alerts caregivers when parents don't take their medicine on time. This is implemented entirely client-side using Firestore real-time listeners and local background tasks.

---

## Goals

1. Detect missed doses automatically (30 minutes after scheduled time)
2. Notify all caregivers when a dose is missed via Firestore updates
3. Provide adherence visibility for caregivers
4. Ensure reliable and timely escalation without Cloud Functions

---

## Prerequisites

- Phase 4 completed (dose tracking working)
- FCM configured for all users
- Dose collection properly structured
- Background task handling configured (React Native background tasks)

---

## Core Features

### 1. Missed Dose Detection

**Requirements:**

- Parent app checks doses periodically using background tasks
- Checks all doses with status "pending" or "snoozed"
- Marks dose as "missed" if 30+ minutes past scheduledTime
- Updates dose document with missedAt timestamp
- Firestore update triggers real-time notifications to caregivers

**Implementation Approach:**

- Use React Native background fetch/headless tasks
- Schedule periodic checks (every 5-15 minutes)
- Query local doses and check against current time
- Update Firestore when dose becomes overdue
- Caregivers listen to dose changes via Firestore snapshots

**Business Rules:**

- Grace period: 30 minutes after scheduledTime
- Only active medicines are checked
- Archived/deleted medicines are ignored
- Already taken/missed doses are skipped
- Works even when parent app is in background

### 2. Caregiver Notifications

**Requirements:**

- Caregivers listen to dose status changes via Firestore
- When dose status changes to "missed", trigger local notification
- Notification includes: parent name, medicine name, scheduled time
- Notification opens app to dose history
- Works via Firestore real-time listeners + local notifications

**Implementation:**

- Caregiver app has Firestore listener on doses collection
- Filter: doses for their parents with status changes
- When status becomes "missed", show local notification
- Use Notifee for local notifications (same as alarms)
- Store notification in local state to prevent duplicates

**Notification Content:**

```
Title: "Missed Dose Alert"
Body: "[Parent Name] missed [Medicine Name] at [Time]"
Data: { type: "missed_dose", doseId, parentId, medicineId }
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

### Parent App: Background Dose Checker

**Location:** src/services/missedDoseChecker.js

**Trigger:** Background task (every 10-15 minutes)

**Setup:**

- Use react-native-background-fetch or similar
- Register background task on app start
- Task runs even when app is closed/background
- Android: Use WorkManager
- iOS: Use Background Fetch

**Logic:**

```javascript
1. Query local doses where:
   - status IN ['pending', 'snoozed']
   - scheduledTime < (now - 30 minutes)
   - medicine.isActive = true

2. For each missed dose:
   a. Update Firestore dose status to 'missed'
   b. Set missedAt = serverTimestamp()
   c. Log escalation event locally

3. Firestore update triggers caregiver listeners
```

**Error Handling:**

- Catch and log errors
- Don't crash background task
- Retry on next scheduled run
- Store failed updates for retry

### Caregiver App: Dose Status Listener

**Location:** src/services/doseStatusListener.js

**Trigger:** Firestore real-time listener

**Setup:**

- Start listener when caregiver app opens
- Listen to doses for all linked parents
- Filter for status changes to 'missed'
- Keep listener active in background (if possible)

**Logic:**

```javascript
1. Subscribe to doses collection:
   - where parentId IN [linked parent IDs]
   - where status == 'missed'
   - orderBy missedAt desc

2. On snapshot change:
   a. Check if dose is newly missed (not seen before)
   b. Get parent and medicine details
   c. Show local notification via Notifee
   d. Mark dose as notified locally (prevent duplicates)
   e. Update badge count

3. Handle notification tap:
   - Navigate to dose history or adherence dashboard
   - Clear notification
```

**Notification Deduplication:**

- Store notified dose IDs in AsyncStorage
- Check before showing notification
- Clear old entries periodically (> 7 days)

### Firestore Queries

**Parent app - Get overdue doses (background task):**

```javascript
// Get current user's doses that are overdue
const userId = auth().currentUser.uid;
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

db.collection('doses')
  .where('parentId', '==', userId)
  .where('status', 'in', ['pending', 'snoozed'])
  .where('scheduledTime', '<', thirtyMinutesAgo)
  .get();
```

**Caregiver app - Listen to missed doses:**

```javascript
// Real-time listener for missed doses
const parentIds = ['parent1Id', 'parent2Id']; // From relationships

db.collection('doses')
  .where('parentId', 'in', parentIds)
  .where('status', '==', 'missed')
  .orderBy('missedAt', 'desc')
  .limit(50)
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added' || change.type === 'modified') {
        // Show notification for newly missed dose
      }
    });
  });
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

**Location:** New screen accessible from caregiver home

**Components:**

- Parent selector (if multiple parents)
- Time period selector (7d, 30d, all)
- Adherence percentage (large display)
- Status breakdown (taken/missed/snoozed counts)
- Per-medicine adherence list
- Trend chart (optional)

### 2. MissedDosesList (Caregiver)

**Location:** Accessible from adherence dashboard

**Components:**

- Filter controls (parent, medicine, date range)
- List of missed doses
- Each item shows: medicine, scheduled time, how long ago
- Tap to see dose details
- Empty state if no missed doses

### 3. Notification Handler

**Location:** src/services/notificationHandler.js

**Behavior:**

- Listen for local notification taps (Notifee)
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
  missedAt: timestamp | null,  // When dose was marked missed by parent app
  checkedAt: timestamp | null,  // Last time background task checked this dose
}
```

### Local Storage: notifiedDoses

**Purpose:** Track which missed doses have been notified to prevent duplicates

**Storage:** AsyncStorage (caregiver app only)

**Schema:**

```javascript
{
  [doseId]: {
    notifiedAt: timestamp,
    doseId: string,
    parentId: string,
    medicineId: string,
  }
}
```

**Cleanup:** Remove entries older than 7 days

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

// No escalationLogs collection needed - using local storage

---

## Testing Requirements

### Unit Tests

- [ ] Background task identifies overdue doses correctly
- [ ] 30-minute grace period calculated accurately
- [ ] Notification deduplication works
- [ ] Adherence calculations are accurate
- [ ] Edge cases: timezone changes, deleted medicines

### Integration Tests

- [ ] Background task runs on schedule
- [ ] Dose status updates in Firestore
- [ ] Caregiver listener receives updates
- [ ] Local notifications shown to caregivers
- [ ] Multiple caregivers all receive notifications
- [ ] Notification opens correct screen in app

### Manual Tests

- [ ] Create dose, wait 30 minutes, verify escalation
- [ ] Verify parent background task marks dose missed
- [ ] Verify caregiver receives notification
- [ ] Tap notification, verify navigation
- [ ] Check adherence dashboard shows correct data
- [ ] Test with multiple parents and caregivers
- [ ] Test with parent app closed, in background, in foreground
- [ ] Test with caregiver app closed (notification on next open)
- [ ] Test with no internet (updates sync when online)
- [ ] Test notification deduplication

### Performance Tests

- [ ] Background task handles 10+ overdue doses
- [ ] Firestore listener updates < 2 seconds
- [ ] Adherence queries complete < 1 second
- [ ] No excessive Firestore reads
- [ ] Background task doesn't drain battery

---

## Acceptance Criteria

### Must Have

- [ ] Doses automatically marked missed after 30 minutes
- [ ] Parent background task runs reliably
- [ ] All caregivers receive notifications via Firestore listener
- [ ] Notifications include parent and medicine names
- [ ] Adherence dashboard shows accurate percentages
- [ ] Missed dose list displays all missed doses
- [ ] No false positives (taken doses not escalated)
- [ ] No duplicate notifications

### Should Have

- [ ] Background task retry on failure
- [ ] Local logging for debugging
- [ ] Per-medicine adherence breakdown
- [ ] Time period filtering (7d, 30d)
- [ ] Visual adherence trends
- [ ] Works when caregiver app is closed (notification on next open)

### Nice to Have

- [ ] In-app notification history
- [ ] Caregiver acknowledgment of alerts
- [ ] Configurable grace period per medicine
- [ ] Weekly adherence summary
- [ ] Background task diagnostics screen

---

## Dependencies

### External Services

- React Native Background Fetch (for periodic checks)
- Notifee (for local notifications)
- Firestore (for real-time sync)

### Internal Dependencies

- Phase 4 dose tracking must be working
- Relationships must be established
- Notifee already configured (from Phase 4)

---

## Risks & Mitigations

### Risk: Background task doesn't run reliably

**Impact:** High - No escalations happen
**Mitigation:**

- Use platform-specific best practices (WorkManager, Background Fetch)
- Request battery optimization exemption
- Test on various devices/OS versions
- Add diagnostics to monitor task execution
- Fallback: Check on app foreground as well

### Risk: Caregiver app closed when dose missed

**Impact:** Medium - Delayed notification
**Mitigation:**

- Show notification when app next opens
- Use Firestore listener to catch up on missed events
- Store notification state locally
- Consider periodic background checks for caregivers too

### Risk: False positives

**Impact:** Medium - Caregiver alert fatigue
**Mitigation:**

- Thorough testing of grace period logic
- Verify timezone handling
- Check for race conditions

### Risk: High Firestore costs

**Impact:** Medium - Budget overrun
**Mitigation:**

- Optimize queries (use indexes)
- Limit query results
- Cache adherence calculations
- Use local caching to reduce reads
- Unsubscribe listeners when not needed
- Monitor usage

### Risk: Duplicate notifications

**Impact:** Low - User annoyance
**Mitigation:**

- Implement deduplication with AsyncStorage
- Track notified dose IDs
- Clear old entries periodically

---

## Rollout Plan

### Phase 5.1: Background Task Setup (Week 1)

- Implement parent background dose checker
- Configure background fetch/WorkManager
- Test task execution reliability
- Monitor for 48 hours

### Phase 5.2: Caregiver Listener (Week 1-2)

- Implement Firestore listener for missed doses
- Add notification deduplication
- Show local notifications via Notifee
- Test on real devices

### Phase 5.3: Dashboard (Week 2-3)

- Build adherence dashboard UI
- Implement missed dose list
- Add filtering and sorting
- User testing

### Phase 5.4: Polish (Week 3)

- Fix bugs from testing
- Optimize performance
- Add diagnostics and logging
- Documentation

---

## Success Metrics

### Technical Metrics

- Escalation latency < 15 minutes (from missed to notification)
- Background task success rate > 95%
- Notification delivery rate > 90% (when caregiver app opens)
- False positive rate < 1%
- No duplicate notifications

### Product Metrics

- < 25% of doses escalate (from PRD)
- Caregivers respond to alerts within 1 hour
- Adherence rate improves over time
- User satisfaction with alert system

---

## Next Steps

1. Review and approve requirements
2. Install react-native-background-fetch
3. Implement parent background dose checker
4. Implement caregiver Firestore listener
5. Test escalation flow end-to-end
6. Build adherence dashboard UI
7. Conduct user testing
8. Deploy to production

---

End of Requirements
