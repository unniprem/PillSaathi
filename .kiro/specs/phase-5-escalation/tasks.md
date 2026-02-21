# Phase 5: Escalation - Tasks

Version: 2.0
Date: 2026-02-21
Status: Ready for Implementation
Approach: Cloud Functions + Cloud Scheduler

---

## Task Breakdown

### 5.1: Cloud Functions Setup

**Estimated Time:** 2-3 days

#### Task 5.1.1: Enable Firebase Blaze plan and APIs

- [ ] Enable Blaze (pay-as-you-go) plan in Firebase Console
- [ ] Set budget alert ($10/month for dev)
- [ ] Enable Cloud Functions API
- [ ] Enable Cloud Scheduler API
- [ ] Enable Cloud Build API
- [ ] Enable Cloud Pub/Sub API
- [ ] Verify APIs are enabled

#### Task 5.1.2: Install Cloud Functions dependencies

- [x] Navigate to functions directory
- [x] Run `npm install` to install dependencies
- [x] Verify firebase-admin and firebase-functions installed
- [x] Check Node.js version (18+)

#### Task 5.1.3: Update firebase.json configuration

- [x] Add functions configuration to firebase.json
- [x] Set runtime to nodejs18
- [x] Configure functions source directory
- [x] Commit changes

#### Task 5.1.4: Deploy Cloud Functions to dev

- [ ] Login to Firebase CLI (`firebase login`)
- [ ] Select dev project (`firebase use dev`)
- [x] Deploy functions (`firebase deploy --only functions`)
- [x] Verify deployment successful
- [x] Check Cloud Scheduler job created
- [x] View function logs

**Acceptance:**

- Blaze plan enabled
- All APIs enabled
- Functions deployed successfully
- Cloud Scheduler job running every 5 minutes
- No errors in deployment logs

---

### 5.2: Test Cloud Functions

**Estimated Time:** 1-2 days

#### Task 5.2.1: Create test data in Firestore

- [x] Create test parent user
- [ ] Create test medicine (active)
- [ ] Create test dose 35 minutes in the past (status: pending)
- [ ] Create test caregiver user
- [ ] Create relationship between parent and caregiver
- [ ] Add device token for caregiver

#### Task 5.2.2: Manually trigger scheduledDoseCheck

- [ ] Trigger function via CLI or Console
- [ ] Check function logs for execution
- [ ] Verify dose status changed to 'missed'
- [ ] Verify missedAt and escalatedAt timestamps set
- [ ] Check escalationLogs collection created
- [ ] Verify log entry added

#### Task 5.2.3: Test FCM notification delivery

- [ ] Verify caregiver received push notification
- [ ] Check notification title and body
- [ ] Verify notification data payload
- [ ] Test notification tap (opens app)
- [ ] Check escalationLogs for notification counts
- [ ] Test with multiple caregivers

#### Task 5.2.4: Test edge cases

- [ ] Test with inactive medicine (should skip)
- [ ] Test with already missed dose (should skip)
- [ ] Test with taken dose (should skip)
- [ ] Test with invalid device token (should handle gracefully)
- [ ] Test with no caregivers (should log, no error)
- [ ] Test with 10+ overdue doses (batch processing)

**Acceptance:**

- Test dose marked as missed
- FCM notification delivered
- escalationLogs populated correctly
- Edge cases handled gracefully
- No errors in function logs

---

### 5.3: Firestore Security Rules & Indexes

**Estimated Time:** 1 day

#### Task 5.3.1: Update doses security rules

- [ ] Allow caregivers to read doses for their parents
- [ ] Restrict dose updates to specific fields
- [ ] Test rules with Firebase emulator
- [ ] Deploy rules to dev
- [ ] Verify rules work correctly

#### Task 5.3.2: Add escalationLogs security rules

- [ ] Allow caregivers to read logs for their parents
- [ ] Prevent all writes (Cloud Functions only)
- [ ] Test rules with Firebase emulator
- [ ] Deploy rules to dev
- [ ] Verify rules work correctly

#### Task 5.3.3: Create Firestore indexes

- [x] Add composite index for doses query (status + scheduledTime)
- [x] Add index for escalationLogs (parentId + createdAt)
- [x] Deploy indexes to dev
- [x] Wait for indexes to build
- [x] Verify indexes active

**Acceptance:**

- Security rules prevent unauthorized access
- Caregivers can read relevant data
- Indexes created and active
- Queries execute efficiently

---

### 5.4: App FCM Handler Updates

**Estimated Time:** 1-2 days

#### Task 5.4.1: Update FCM message handler

- [x] Add handler for "missed_dose" notification type in App.js
- [x] Extract doseId, parentId, medicineId from data
- [x] Navigate to dose history or adherence dashboard
- [x] Show in-app alert if app is open
- [x] Update badge count
- [ ] Test on Android
- [ ] Test on iOS

#### Task 5.4.2: Test notification handling

- [ ] Test with app in foreground
- [ ] Test with app in background
- [ ] Test with app closed
- [ ] Test notification tap navigation
- [ ] Test with multiple notifications
- [ ] Verify badge count updates

**Acceptance:**

- Notifications handled correctly in all app states
- Tapping notification navigates to correct screen
- In-app alerts shown when app is open
- Badge count updates correctly

---

### 5.5: Adherence Dashboard UI

**Estimated Time:** 4-5 days

#### Task 5.5.1: Create AdherenceDashboard screen

- [x] Create src/screens/caregiver/AdherenceDashboardScreen.js
- [x] Add to caregiver navigation stack
- [x] Add navigation from caregiver home
- [x] Basic layout with header
- [x] Add to navigation types

#### Task 5.5.2: Implement parent selector

- [x] Dropdown/picker for multiple parents
- [x] Default to first parent
- [x] Update data when parent changes
- [x] Show parent name and photo
- [x] Handle single parent case

#### Task 5.5.3: Implement time period selector

- [x] Segmented control: 7 days, 30 days, All time
- [x] Calculate date range based on selection
- [x] Update data when period changes
- [x] Default to 7 days
- [x] Style selector

#### Task 5.5.4: Build adherence summary card

- [x] Large percentage display (e.g., "85%")
- [x] Color coding (green >80%, yellow 60-80%, red <60%)
- [x] Breakdown: X taken, Y missed, Z snoozed
- [x] Total doses scheduled
- [x] Visual progress bar or ring
- [x] Style card

#### Task 5.5.5: Build per-medicine adherence list

- [x] FlatList of medicines with adherence %
- [x] Sort by lowest adherence first
- [x] Show medicine name and icon
- [x] Show taken/total count
- [x] Tap to see medicine details
- [x] Style list items

#### Task 5.5.6: Add loading and error states

- [x] Loading spinner while fetching data
- [x] Error message if query fails
- [x] Empty state if no doses in period
- [x] Retry button on error
- [x] Pull to refresh

**Acceptance:**

- Dashboard shows accurate adherence data
- Filtering by parent and time period works
- UI is clear and easy to understand
- Performance is good (< 1 second load)
- All states handled (loading, error, empty)

---

### 5.6: Missed Doses List UI

**Estimated Time:** 2-3 days

#### Task 5.6.1: Create MissedDosesList screen

- [-] Create src/screens/caregiver/MissedDosesListScreen.js
- [ ] Add to caregiver navigation stack
- [~] Add navigation from adherence dashboard
- [ ] Basic layout with header
- [ ] Add to navigation types

#### Task 5.6.2: Implement filters

- [~] Parent filter (if multiple parents)
- [~] Medicine filter (dropdown of all medicines)
- [~] Date range picker
- [~] Clear filters button
- [~] Apply filters to query
- [~] Style filters

#### Task 5.6.3: Build missed doses list

- [~] FlatList of missed doses
- [~] Each item shows: medicine name, scheduled time, missed time
- [~] Show "X hours ago" relative time
- [~] Sort by most recent first
- [~] Pagination (load more on scroll)
- [ ] Pull to refresh
- [ ] Style list items

#### Task 5.6.4: Add empty state

- [~] Show when no missed doses
- [~] Positive message ("Great adherence!")
- [~] Illustration or icon
- [~] Style empty state

#### Task 5.6.5: Add dose detail navigation

- [~] Tap dose to see full details
- [~] Show medicine info, schedule, history
- [~] Back button to return to list
- [~] Test navigation

**Acceptance:**

- List shows all missed doses
- Filters work correctly
- Performance is good with large lists
- Empty state is encouraging
- Navigation works correctly

---

### 5.7: Adherence Calculations

**Estimated Time:** 2 days

#### Task 5.7.1: Create adherence utility functions

- [ ] Create src/utils/adherenceCalculations.js
- [ ] Function: calculateAdherence(doses)
- [ ] Function: getAdherenceByMedicine(doses)
- [ ] Function: getAdherenceTrend(doses, period)
- [ ] Handle edge cases (no doses, all missed, etc.)
- [ ] Add JSDoc comments
- [ ] Add unit tests

#### Task 5.7.2: Create useAdherence hook

- [ ] Create src/hooks/useAdherence.js
- [ ] Query doses for parent and date range
- [ ] Calculate adherence metrics
- [ ] Return: percentage, taken, missed, snoozed, total
- [ ] Handle loading and error states
- [ ] Memoize calculations
- [ ] Add JSDoc comments

#### Task 5.7.3: Create useMissedDoses hook

- [ ] Create src/hooks/useMissedDoses.js
- [ ] Query doses with status 'missed'
- [ ] Apply filters (parent, medicine, date range)
- [ ] Sort by most recent
- [ ] Implement pagination
- [ ] Return doses and loading state
- [ ] Add JSDoc comments

**Acceptance:**

- Calculations are accurate
- Hooks are performant
- Unit tests pass
- Works with real Firestore data
- Proper error handling

---

### 5.8: Testing & QA

**Estimated Time:** 3-4 days

#### Task 5.8.1: Unit tests

- [ ] Test scheduledDoseCheck logic (mock Firestore)
- [ ] Test adherence calculations
- [ ] Test notification payload building
- [ ] Test grace period calculation
- [ ] Test edge cases
- [ ] All tests pass

#### Task 5.8.2: Integration tests

- [ ] Test Cloud Function with Firestore emulator
- [ ] Test FCM notification delivery
- [ ] Test adherence queries
- [ ] Test security rules
- [ ] All tests pass

#### Task 5.8.3: Manual testing - Backend

- [x] Create test doses in dev Firebase
- [-] Wait 30 minutes, verify escalation (User will test manually)
- [-] Check dose status updated (User will test manually)
- [-] Verify notifications sent (User will test manually)
- [-] Check escalationLogs created (User will test manually)
- [-] Test with multiple caregivers (User will test manually)
- [-] Test with 10+ overdue doses (User will test manually)

#### Task 5.8.4: Manual testing - UI

- [ ] Test adherence dashboard with various data
- [ ] Test parent and time period filters
- [ ] Test missed doses list
- [ ] Test notification tap navigation
- [ ] Test with no missed doses (empty state)
- [ ] Test with many missed doses (pagination)
- [ ] Test on different screen sizes

#### Task 5.8.5: Device testing

- [ ] Test on Android (various versions)
- [ ] Test on iOS (various versions)
- [ ] Test with app closed
- [ ] Test with app in background
- [ ] Test with device offline
- [ ] Test notification permissions
- [ ] Test with poor network

#### Task 5.8.6: Performance testing

- [ ] Test with 100+ doses
- [ ] Measure query times
- [ ] Check Cloud Function execution time
- [ ] Monitor Firestore read counts
- [ ] Check function logs for errors
- [ ] Optimize if needed

**Acceptance:**

- All tests pass
- No critical bugs
- Performance meets requirements
- Works on all target devices
- Function executes reliably

---

### 5.9: Monitoring & Documentation

**Estimated Time:** 1-2 days

#### Task 5.9.1: Set up Cloud Monitoring

- [ ] Create monitoring dashboard
- [ ] Add function invocation count metric
- [ ] Add function execution time metric
- [ ] Add function error rate metric
- [ ] Add Firestore read/write metrics
- [ ] Add notification delivery metrics

#### Task 5.9.2: Set up alerts

- [ ] Alert on function error rate > 5%
- [ ] Alert on function execution time > 30 seconds
- [ ] Alert on scheduler job failures
- [ ] Alert on budget threshold exceeded
- [ ] Test alerts trigger correctly

#### Task 5.9.3: Update documentation

- [ ] Document Cloud Functions setup in README
- [ ] Document escalation flow in TAD
- [ ] Update data model documentation
- [ ] Add troubleshooting guide
- [ ] Document monitoring procedures
- [ ] Create runbook for common issues

**Acceptance:**

- Monitoring dashboard shows key metrics
- Alerts configured and tested
- Documentation is complete and accurate
- Team knows how to troubleshoot issues

---

### 5.10: Production Deployment

**Estimated Time:** 1-2 days

#### Task 5.10.1: Deploy to production

- [ ] Review all code changes
- [ ] Run all tests
- [ ] Deploy functions to prod (`firebase use prod && firebase deploy --only functions`)
- [ ] Deploy security rules to prod
- [ ] Deploy indexes to prod
- [ ] Verify deployment successful
- [ ] Check Cloud Scheduler job created

#### Task 5.10.2: Monitor production

- [ ] Monitor function logs for 24 hours
- [ ] Check notification delivery rates
- [ ] Monitor Firestore costs
- [ ] Check for errors
- [ ] Verify escalations working correctly
- [ ] Monitor user feedback

#### Task 5.10.3: Create rollback plan

- [ ] Document rollback procedure
- [ ] Test pausing Cloud Scheduler
- [ ] Verify can redeploy previous version
- [ ] Document emergency contacts

**Acceptance:**

- Functions deployed to production
- No errors in production logs
- Escalations working correctly
- Monitoring shows healthy metrics
- Rollback plan documented

---

## Timeline

### Week 1

- Days 1-2: Cloud Functions setup (5.1)
- Days 3-4: Test Cloud Functions (5.2)
- Day 5: Security rules & indexes (5.3)

### Week 2

- Days 1-2: App FCM handler (5.4)
- Days 3-5: Start adherence dashboard (5.5.1-5.5.3)

### Week 3

- Days 1-2: Finish adherence dashboard (5.5.4-5.5.6)
- Days 3-4: Missed doses list (5.6)
- Day 5: Adherence calculations (5.7)

### Week 4

- Days 1-3: Testing & QA (5.8)
- Days 4-5: Monitoring & documentation (5.9)

### Week 5 (if needed)

- Days 1-2: Production deployment (5.10)
- Days 3-5: Monitor and stabilize

---

## Dependencies

- Phase 4 must be complete and working
- Firebase Blaze plan enabled
- Cloud Functions and Cloud Scheduler APIs enabled
- FCM configured in app
- Device tokens registered

---

## Risks

1. Cloud Scheduler reliability
2. FCM notification delivery issues
3. Timezone handling complexity
4. Performance with large datasets
5. False positive escalations
6. High Firestore costs

---

## Success Criteria

- [ ] Doses automatically escalate after 30 minutes
- [ ] Cloud Function runs reliably every 5 minutes
- [ ] All caregivers receive FCM notifications
- [ ] Adherence dashboard shows accurate data
- [ ] Missed doses list is complete
- [ ] No false positives
- [ ] Performance is acceptable
- [ ] Costs within budget
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] Monitoring and alerts set up

---

End of Tasks
