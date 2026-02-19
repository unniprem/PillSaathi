# Implementation Plan: Phase 4 - Reminders & Dose Tracking

## Overview

This implementation plan breaks down the alarm scheduling and dose tracking system into incremental, testable steps. The approach prioritizes core alarm functionality first, then dose tracking, then offline support, and finally real-time sync and UI polish. Each task builds on previous work and includes validation through tests.

## Tasks

- [x] 1. Set up Notifee and alarm infrastructure

  - Install and configure Notifee library for React Native
  - Set up notification permissions handling
  - Create alarm channel configuration for Android
  - Configure full-screen notification capabilities
  - Set up AsyncStorage for alarm metadata persistence
  - _Requirements: 2.1, 2.2, 2.3, 2.7_

- [ ] 2. Implement AlarmSchedulerService core functionality

  - [ ] 2.1 Create AlarmSchedulerService class with alarm scheduling logic

    - Implement `scheduleMedicineAlarms()` to create alarms for 7-day window
    - Implement alarm time calculation from schedule data
    - Store alarm IDs in AsyncStorage with medicine reference
    - _Requirements: 1.1, 1.6, 1.8_

  - [ ]\* 2.2 Write property test for alarm creation completeness

    - **Property 1: Alarm creation completeness**
    - **Validates: Requirements 1.1, 1.6**

  - [ ] 2.3 Implement alarm cancellation methods

    - Implement `cancelMedicineAlarms()` to remove all alarms for a medicine
    - Retrieve alarm IDs from AsyncStorage and cancel with Notifee
    - Clean up alarm metadata from AsyncStorage
    - _Requirements: 1.3, 1.4_

  - [ ]\* 2.4 Write property test for alarm cancellation completeness

    - **Property 2: Alarm cancellation completeness**
    - **Validates: Requirements 1.3, 1.4**

  - [ ] 2.5 Implement alarm rescheduling logic

    - Implement `rescheduleMedicineAlarms()` to update alarms when schedule changes
    - Cancel existing alarms and create new ones atomically
    - _Requirements: 1.2, 1.5_

  - [ ]\* 2.6 Write property test for alarm rescheduling consistency
    - **Property 3: Alarm rescheduling consistency**
    - **Validates: Requirements 1.2, 1.5**

- [ ] 3. Implement alarm recovery and verification

  - [ ] 3.1 Create alarm verification and recovery logic

    - Implement `verifyAndRestoreAlarms()` to check for missing alarms on app launch
    - Query active medicines and their schedules
    - Compare expected alarms with actual scheduled alarms
    - Reschedule missing alarms
    - _Requirements: 1.7_

  - [ ]\* 3.2 Write property test for alarm recovery

    - **Property 5: Alarm recovery on app launch**
    - **Validates: Requirements 1.7**

  - [ ] 3.3 Implement timezone change handling

    - Implement `handleTimezoneChange()` to adjust alarms when timezone changes
    - Detect timezone changes using device timezone API
    - Recalculate alarm times to maintain local time consistency
    - _Requirements: 2.5_

  - [ ]\* 3.4 Write property test for timezone adjustment
    - **Property 6: Timezone adjustment correctness**
    - **Validates: Requirements 2.5**

- [ ] 4. Checkpoint - Verify alarm scheduling works

  - Test alarm scheduling manually on device
  - Verify alarms trigger at correct times
  - Ensure all tests pass, ask the user if questions arise

- [ ] 5. Integrate alarm scheduling with MedicineService

  - [ ] 5.1 Add alarm scheduling hooks to medicine CRUD operations

    - Call `scheduleMedicineAlarms()` after medicine creation
    - Call `rescheduleMedicineAlarms()` after medicine update
    - Call `cancelMedicineAlarms()` before medicine deletion
    - Handle medicine activation/deactivation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]\* 5.2 Write unit tests for medicine-alarm integration
    - Test alarm scheduling on medicine creation
    - Test alarm rescheduling on schedule update
    - Test alarm cancellation on medicine deletion
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 6. Implement DoseTrackerService core functionality

  - [ ] 6.1 Create DoseTrackerService class with dose status management

    - Implement `markDoseAsTaken()` to update dose status to "taken"
    - Implement `markDoseAsSkipped()` to update dose status to "skipped"
    - Update Firestore doses collection with status and timestamps
    - _Requirements: 4.1, 4.2, 4.4, 4.6_

  - [ ]\* 6.2 Write property tests for dose status transitions

    - **Property 11: Dose status transition to taken**
    - **Property 12: Dose status transition to skipped**
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [ ] 6.3 Implement dose record creation logic

    - Ensure dose records include all required fields
    - Validate dose data structure before Firestore write
    - _Requirements: 10.2, 10.5_

  - [ ]\* 6.4 Write property test for dose record structure

    - **Property 14: Dose record structure completeness**
    - **Validates: Requirements 10.2**

  - [ ] 6.5 Implement snooze functionality

    - Implement `snoozeDose()` to reschedule alarm for 10 minutes later
    - Calculate new alarm time and schedule with Notifee
    - _Requirements: 4.3_

  - [ ]\* 6.6 Write property test for snooze time calculation
    - **Property 9: Snooze time calculation**
    - **Validates: Requirements 4.3**

- [ ] 7. Implement dose query and history functions

  - [ ] 7.1 Create dose history query methods

    - Implement `getDoseHistory()` with date range and status filtering
    - Implement sorting by scheduledTime descending
    - Add pagination support for large histories
    - _Requirements: 6.1, 6.5, 6.6, 10.7_

  - [ ]\* 7.2 Write property tests for dose queries

    - **Property 19: Dose history sorting**
    - **Property 20: Date range query correctness**
    - **Property 21: Status filter correctness**
    - **Validates: Requirements 6.1, 6.5, 6.6**

  - [ ] 7.3 Implement today's doses query

    - Implement `getTodaysDoses()` to get doses for current date
    - Filter by medicine and parent ID
    - _Requirements: 7.1_

  - [ ]\* 7.4 Write property test for today's doses query

    - **Property 22: Today's doses query correctness**
    - **Validates: Requirements 7.1**

  - [ ] 7.5 Implement adherence calculation

    - Implement `calculateAdherence()` to compute adherence percentage
    - Count taken doses vs total doses in date range
    - _Requirements: 6.7_

  - [ ]\* 7.6 Write property test for adherence calculation
    - **Property 23: Adherence calculation correctness**
    - **Validates: Requirements 6.7**

- [ ] 8. Checkpoint - Verify dose tracking works

  - Test marking doses as taken/skipped
  - Verify dose history queries return correct data
  - Ensure all tests pass, ask the user if questions arise

- [ ] 9. Implement offline support

  - [ ] 9.1 Create offline action queue system

    - Implement offline queue storage in AsyncStorage
    - Implement `queueOfflineAction()` to store actions when offline
    - Add network connectivity detection
    - _Requirements: 8.2_

  - [ ]\* 9.2 Write property test for offline action queueing

    - **Property 16: Offline action queueing**
    - **Validates: Requirements 8.2**

  - [ ] 9.3 Implement offline sync logic

    - Implement `syncOfflineActions()` to process queued actions
    - Preserve original timestamps during sync
    - Handle sync errors with retry logic
    - _Requirements: 4.8, 8.3, 8.4_

  - [ ]\* 9.4 Write property test for offline sync round-trip

    - **Property 17: Offline sync round-trip**
    - **Validates: Requirements 4.8, 8.3, 8.4**

  - [ ] 9.5 Implement conflict resolution

    - Use Firestore transactions for atomic updates
    - Apply parent's action as authoritative in conflicts
    - _Requirements: 8.5_

  - [ ]\* 9.6 Write property test for conflict resolution

    - **Property 18: Conflict resolution authority**
    - **Validates: Requirements 8.5**

  - [ ] 9.7 Add connectivity monitoring
    - Listen for network state changes
    - Trigger sync when connectivity restored
    - Display connectivity indicator in UI
    - _Requirements: 8.6_

- [ ] 10. Implement Full-Screen Alarm UI

  - [ ] 10.1 Create FullScreenAlarmScreen component

    - Design layout with large touch targets for elderly users
    - Display medicine name, dosage, time, and instructions
    - Implement "Taken", "Snooze", and "Skip" buttons
    - Use high contrast colors and large fonts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 10.2 Wire alarm triggers to FullScreenAlarmScreen

    - Configure Notifee to open FullScreenAlarmScreen on alarm trigger
    - Pass medicine and dose data to screen via navigation params
    - Handle alarm dismissal without action
    - _Requirements: 2.1, 3.9_

  - [ ]\* 10.3 Write property test for alarm notification data

    - **Property 8: Alarm notification data completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]\* 10.4 Write unit tests for alarm UI interactions
    - Test "Taken" button calls markDoseAsTaken
    - Test "Skip" button calls markDoseAsSkipped
    - Test "Snooze" button calls snoozeDose
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 11. Implement Parent Medicine Detail Screen enhancements

  - [ ] 11.1 Add today's doses display to ParentMedicineDetailScreen

    - Query and display today's doses for the medicine
    - Show scheduled time and current status for each dose
    - Implement "upcoming" vs "overdue" status logic
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]\* 11.2 Write property test for dose status display logic

    - **Property 24: Dose status display logic**
    - **Validates: Requirements 7.3**

  - [ ] 11.3 Add manual dose marking functionality

    - Allow marking past doses as taken from detail screen
    - Prevent marking future doses as taken
    - _Requirements: 7.5, 7.6_

  - [ ]\* 11.4 Write property test for future dose prevention
    - **Property 15: Future dose marking prevention**
    - **Validates: Requirements 7.6**

- [ ] 12. Implement Caregiver Dose History Screen

  - [ ] 12.1 Create CaregiverDoseHistoryScreen component

    - Display dose history in reverse chronological order
    - Show scheduled time, actual time taken, and status
    - Implement date range picker for filtering
    - Implement status filter (taken, missed, skipped)
    - Display adherence percentage for selected period
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 12.2 Add real-time listeners for dose updates

    - Set up Firestore listeners for dose collection
    - Update UI when dose status changes
    - Handle listener lifecycle (mount/unmount)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]\* 12.3 Write unit tests for dose history UI
    - Test date range filtering
    - Test status filtering
    - Test adherence calculation display
    - _Requirements: 6.5, 6.6, 6.7_

- [ ] 13. Implement logging and debugging tools

  - [ ] 13.1 Add comprehensive logging to AlarmSchedulerService

    - Log all alarm scheduling operations with timestamps
    - Log all alarm trigger events
    - Log errors with retry attempts
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ]\* 13.2 Write property tests for logging behavior

    - **Property 25: Alarm scheduling logging**
    - **Property 26: Alarm trigger logging**
    - **Property 27: Error retry behavior**
    - **Validates: Requirements 9.1, 9.2, 9.5**

  - [ ] 13.3 Create debugging utility methods
    - Implement `getAllScheduledAlarms()` for debugging
    - Implement `verifyAlarmIntegrity()` for diagnostics
    - Implement `manualRescheduleAll()` for testing
    - _Requirements: 9.3, 9.4, 9.7_

- [ ] 14. Add error handling and edge cases

  - [ ] 14.1 Implement permission handling

    - Request notification permissions on first use
    - Handle permission denial gracefully
    - Guide user to settings if permissions denied
    - _Requirements: 2.7_

  - [ ] 14.2 Implement error handling for Firestore operations

    - Add retry logic with exponential backoff
    - Queue failed operations for offline sync
    - Display user-friendly error messages
    - _Requirements: 4.6, 4.8_

  - [ ]\* 14.3 Write unit tests for error scenarios
    - Test Notifee permission denied
    - Test Firestore write failure
    - Test invalid schedule data
    - Test corrupted offline queue

- [ ] 15. Final checkpoint and integration testing

  - Run all unit tests and property tests
  - Test complete flow: create medicine → alarm triggers → mark taken → caregiver sees update
  - Test offline scenario: mark taken offline → go online → verify sync
  - Test alarm reliability: close app → verify alarm still triggers
  - Ensure all tests pass, ask the user if questions arise

- [ ] 16. Create Firestore indexes
  - Create composite indexes for dose queries
  - Index: parentId (ASC) + scheduledTime (ASC)
  - Index: parentId (ASC) + scheduledTime (DESC)
  - Index: medicineId (ASC) + scheduledTime (ASC)
  - Index: medicineId (ASC) + scheduledTime (DESC)
  - Index: medicineId (ASC) + status (ASC) + scheduledTime (ASC)
  - Index: scheduleId (ASC) + scheduledTime (ASC)
  - _Requirements: 10.3, 10.4_

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across many generated inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Manual device testing is required for alarm reliability (24-48 hour test recommended)
- Alarm scheduling should be tested on both Android and iOS as behavior differs
- Battery optimization exemption is critical on Android for alarm reliability
