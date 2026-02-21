# Phase 5: Escalation - Tasks

Version: 1.0
Date: 2026-02-21
Status: Not Started

---

## Task Breakdown

### 5.1: Background Task Setup

**Estimated Time:** 3-4 days

#### Task 5.1.1: Install and configure background task library

- [ ] Install react-native-background-fetch
- [ ] Link native modules (if needed)
- [ ] Configure Android WorkManager settings
- [ ] Configure iOS Background Fetch settings
- [ ] Request battery optimization exemption (Android)
- [ ] Test basic background task execution

#### Task 5.1.2: Implement parent background dose checker

- [ ] Create src/services/missedDoseChecker.js
- [ ] Register background task on app start
- [ ] Query overdue doses (status pending/snoozed, >30 min old)
- [ ] Filter out inactive medicines
- [ ] Update dose status to 'missed' in Firestore
- [ ] Add missedAt timestamp
- [ ] Add error handling and logging
- [ ] Store failed updates for retry

#### Task 5.1.3: Add foreground fallback

- [ ] Check for missed doses when app comes to foreground
- [ ] Run check on app start
- [ ] Ensure no duplicate processing
- [ ] Log all checks for diagnostics

#### Task 5.1.4: Test background task reliability

- [ ] Test with app in background
- [ ] Test with app closed
- [ ] Test after device restart
- [ ] Test with low battery
- [ ] Monitor for 24-48 hours
- [ ] Check logs for execution frequency

**Acceptance:**

- Background task runs every 10-15 minutes
- Overdue doses are detected correctly
- Dose status updates in Firestore
- Works reliably across app states

---

### 5.2: Data Model Updates

**Estimated Time:** 1 day

#### Task 5.2.1: Update doses schema

- [ ] Add missedAt field (timestamp | null)
- [ ] Add checkedAt field (timestamp | null)
- [ ] Document schema changes
- [ ] No migration needed (fields added on update)

#### Task 5.2.2: Create local storage schema for notifiedDoses

- [ ] Define AsyncStorage schema in documentation
- [ ] Create utility functions for reading/writing
- [ ] Add cleanup function for old entries (>7 days)
- [ ] Test storage operations

#### Task 5.2.3: Update security rules

- [ ] Allow caregivers to read doses for their parents
- [ ] Restrict dose updates to status/takenAt/snoozedUntil/missedAt
- [ ] Test rules with Firebase emulator
- [ ] Deploy rules to dev
- [ ] Deploy rules to prod

**Acceptance:**

- Schema updated in Firestore
- Security rules prevent unauthorized access
- Local storage utilities work correctly

---

### 5.3: Caregiver Dose Listener & Notifications

**Estimated Time:** 3-4 days

#### Task 5.3.1: Implement Firestore listener for missed doses

- [ ] Create src/services/doseStatusListener.js
- [ ] Start listener when caregiver app opens
- [ ] Query doses for all linked parents
- [ ] Filter for status == 'missed'
- [ ] Listen to snapshot changes (added/modified)
- [ ] Get parent and medicine details for each change
- [ ] Handle listener errors gracefully

#### Task 5.3.2: Implement notification deduplication

- [ ] Create src/utils/notificationDeduplication.js
- [ ] Store notified dose IDs in AsyncStorage
- [ ] Check if dose already notified before showing
- [ ] Add cleanup function for old entries
- [ ] Test deduplication logic

#### Task 5.3.3: Show local notifications

- [ ] Use Notifee to display notifications
- [ ] Build notification payload (title, body, data)
- [ ] Set notification category/channel
- [ ] Add notification sound/vibration
- [ ] Update badge count
- [ ] Test notification display

#### Task 5.3.4: Handle notification taps

- [ ] Listen for notification press events
- [ ] Extract doseId, parentId, medicineId from data
- [ ] Navigate to dose history or adherence dashboard
- [ ] Clear notification when tapped
- [ ] Handle deep linking

#### Task 5.3.5: Test notification delivery

- [ ] Test with caregiver app in foreground
- [ ] Test with app in background
- [ ] Test with app closed (notification on next open)
- [ ] Test with multiple caregivers
- [ ] Test with multiple missed doses
- [ ] Verify no duplicate notifications

**Acceptance:**

- Caregivers receive notifications when doses missed
- Notifications show correct information
- Tapping notification navigates correctly
- No duplicate notifications shown
- Works in all app states

---

### 5.4: Adherence Dashboard UI

**Estimated Time:** 4-5 days

#### Task 5.4.1: Create AdherenceDashboard screen

- [ ] Create src/screens/caregiver/AdherenceDashboardScreen.js
- [ ] Add to caregiver navigation stack
- [ ] Add navigation from caregiver home
- [ ] Basic layout with header

#### Task 5.4.2: Implement parent selector

- [ ] Dropdown/picker for multiple parents
- [ ] Default to first parent
- [ ] Update data when parent changes
- [ ] Show parent name and photo

#### Task 5.4.3: Implement time period selector

- [ ] Segmented control: 7 days, 30 days, All time
- [ ] Calculate date range based on selection
- [ ] Update data when period changes
- [ ] Default to 7 days

#### Task 5.4.4: Build adherence summary card

- [ ] Large percentage display (e.g., "85%")
- [ ] Color coding (green >80%, yellow 60-80%, red <60%)
- [ ] Breakdown: X taken, Y missed, Z snoozed
- [ ] Total doses scheduled
- [ ] Visual progress bar or ring

#### Task 5.4.5: Build per-medicine adherence list

- [ ] List of medicines with adherence %
- [ ] Sort by lowest adherence first
- [ ] Show medicine name and icon
- [ ] Show taken/total count
- [ ] Tap to see medicine details

#### Task 5.4.6: Add loading and error states

- [ ] Loading spinner while fetching data
- [ ] Error message if query fails
- [ ] Empty state if no doses in period
- [ ] Retry button on error

**Acceptance:**

- Dashboard shows accurate adherence data
- Filtering by parent and time period works
- UI is clear and easy to understand
- Performance is good (< 1 second load)

---

### 5.5: Missed Doses List UI

**Estimated Time:** 2-3 days

#### Task 5.5.1: Create MissedDosesList screen

- [ ] Create src/screens/caregiver/MissedDosesListScreen.js
- [ ] Add to caregiver navigation stack
- [ ] Add navigation from adherence dashboard
- [ ] Basic layout with header

#### Task 5.5.2: Implement filters

- [ ] Parent filter (if multiple parents)
- [ ] Medicine filter (dropdown of all medicines)
- [ ] Date range picker
- [ ] Clear filters button
- [ ] Apply filters to query

#### Task 5.5.3: Build missed doses list

- [ ] FlatList of missed doses
- [ ] Each item shows: medicine name, scheduled time, missed time
- [ ] Show "X hours ago" relative time
- [ ] Sort by most recent first
- [ ] Pagination (load more on scroll)
- [ ] Pull to refresh

#### Task 5.5.4: Add empty state

- [ ] Show when no missed doses
- [ ] Positive message ("Great adherence!")
- [ ] Illustration or icon

#### Task 5.5.5: Add dose detail navigation

- [ ] Tap dose to see full details
- [ ] Show medicine info, schedule, history
- [ ] Back button to return to list

**Acceptance:**

- List shows all missed doses
- Filters work correctly
- Performance is good with large lists
- Empty state is encouraging

---

### 5.6: Adherence Calculations

**Estimated Time:** 2 days

#### Task 5.6.1: Create adherence utility functions

- [ ] Create src/utils/adherenceCalculations.js
- [ ] Function: calculateAdherence(doses)
- [ ] Function: getAdherenceByMedicine(doses)
- [ ] Function: getAdherenceTrend(doses, period)
- [ ] Handle edge cases (no doses, all missed, etc.)
- [ ] Add unit tests

#### Task 5.6.2: Create useAdherence hook

- [ ] Create src/hooks/useAdherence.js
- [ ] Query doses for parent and date range
- [ ] Calculate adherence metrics
- [ ] Return: percentage, taken, missed, snoozed, total
- [ ] Handle loading and error states
- [ ] Memoize calculations

#### Task 5.6.3: Create useMissedDoses hook

- [ ] Create src/hooks/useMissedDoses.js
- [ ] Query doses with status 'missed'
- [ ] Apply filters (parent, medicine, date range)
- [ ] Sort by most recent
- [ ] Implement pagination
- [ ] Return doses and loading state

**Acceptance:**

- Calculations are accurate
- Hooks are performant
- Unit tests pass
- Works with real Firestore data

---

### 5.7: Testing & QA

**Estimated Time:** 3-4 days

#### Task 5.7.1: Unit tests

- [ ] Test background task dose detection logic
- [ ] Test adherence calculations
- [ ] Test notification deduplication
- [ ] Test grace period calculation
- [ ] Test edge cases

#### Task 5.7.2: Integration tests

- [ ] Test background task with Firestore
- [ ] Test Firestore listener updates
- [ ] Test notification display
- [ ] Test security rules

#### Task 5.7.3: Manual testing - Backend

- [ ] Create test doses in dev Firebase
- [ ] Wait 30 minutes, verify background task runs
- [ ] Check dose status updated to 'missed'
- [ ] Verify caregiver listener receives update
- [ ] Check notifications shown
- [ ] Test with multiple caregivers

#### Task 5.7.4: Manual testing - UI

- [ ] Test adherence dashboard with various data
- [ ] Test parent and time period filters
- [ ] Test missed doses list
- [ ] Test notification tap navigation
- [ ] Test with no missed doses (empty state)
- [ ] Test with many missed doses (pagination)

#### Task 5.7.5: Device testing

- [ ] Test on Android (various versions)
- [ ] Test on iOS (various versions)
- [ ] Test with parent app closed
- [ ] Test with caregiver app closed
- [ ] Test with device offline
- [ ] Test background task reliability
- [ ] Test battery impact

#### Task 5.7.6: Performance testing

- [ ] Test with 10+ overdue doses
- [ ] Measure background task execution time
- [ ] Check Firestore listener latency
- [ ] Monitor Firestore read counts
- [ ] Check battery usage
- [ ] Optimize if needed

**Acceptance:**

- All tests pass
- No critical bugs
- Performance meets requirements
- Works on all target devices
- Battery impact is acceptable

---

### 5.8: Documentation & Diagnostics

**Estimated Time:** 1-2 days

#### Task 5.8.1: Update documentation

- [ ] Document background task setup in README
- [ ] Document escalation flow in TAD
- [ ] Update data model documentation
- [ ] Add troubleshooting guide
- [ ] Document notification system

#### Task 5.8.2: Add diagnostics

- [ ] Create background task diagnostics screen
- [ ] Show last execution time
- [ ] Show success/failure counts
- [ ] Show pending missed doses
- [ ] Add manual trigger button for testing

#### Task 5.8.3: Create runbook

- [ ] Document common issues and fixes
- [ ] Escalation not working checklist
- [ ] Background task not running checklist
- [ ] Notification not delivered checklist
- [ ] Performance issues checklist
- [ ] Contact information for support

**Acceptance:**

- Documentation is complete and accurate
- Diagnostics help troubleshoot issues
- Team knows how to debug problems

---

## Timeline

### Week 1

- Days 1-2: Background task setup (5.1.1, 5.1.2)
- Days 3-4: Background task testing (5.1.3, 5.1.4)
- Day 5: Data model updates (5.2)

### Week 2

- Days 1-2: Caregiver listener (5.3.1, 5.3.2)
- Days 2-3: Notifications (5.3.3, 5.3.4, 5.3.5)
- Days 4-5: Start adherence dashboard (5.4.1-5.4.3)

### Week 3

- Days 1-2: Finish adherence dashboard (5.4.4-5.4.6)
- Days 3-4: Missed doses list (5.5)
- Day 5: Adherence calculations (5.6)

### Week 4 (if needed)

- Days 1-3: Testing & QA (5.7)
- Days 4-5: Documentation & diagnostics (5.8)

---

## Dependencies

- Phase 4 must be complete and working
- Notifee already configured (from Phase 4)
- Relationships established between parents and caregivers
- react-native-background-fetch or similar library

---

## Risks

1. Background task reliability on Android/iOS
2. Battery optimization killing background tasks
3. Caregiver app closed when dose missed (delayed notification)
4. Timezone handling complexity
5. Performance with large datasets
6. False positive escalations
7. Duplicate notifications

---

## Success Criteria

- [ ] Doses automatically escalate after 30 minutes
- [ ] Background task runs reliably
- [ ] All caregivers receive notifications via Firestore listener
- [ ] Adherence dashboard shows accurate data
- [ ] Missed doses list is complete
- [ ] No false positives
- [ ] No duplicate notifications
- [ ] Performance is acceptable
- [ ] Battery impact is minimal
- [ ] All tests pass
- [ ] Documentation is complete

---

End of Tasks
