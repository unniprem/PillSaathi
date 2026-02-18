# Implementation Plan: Phase 3 - Medicine & Schedule Management

## Overview

This implementation plan breaks down Phase 3 into discrete coding tasks that build incrementally. The approach starts with data models and services, then implements Cloud Functions for dose generation, followed by UI components for caregivers and parents. Each major section includes property-based tests to validate correctness early.

The implementation assumes Firebase (Firestore, Auth, Cloud Functions) is already configured from Phase 0-2, and the pairing system is functional.

## Tasks

- [x] 1. Set up data models and validation

  - Create src/models/Medicine.js with validation functions
  - Create src/models/Schedule.js with validation functions
  - Create src/models/Dose.js with data structure
  - Implement validateMedicine() function
  - Implement validateSchedule() function
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.5, 3.1, 3.3, 4.3, 4.4_

- [ ]\* 1.1 Write property tests for medicine validation

  - **Property 5: Required fields validation**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

- [ ]\* 1.2 Write property tests for schedule validation

  - **Property 8: Schedule requires at least one time**
  - **Property 11: Specific days pattern requires day selection**
  - **Validates: Requirements 3.1, 4.3**

- [x] 2. Implement medicine service layer

  - [x] 2.1 Create src/services/medicineService.js

    - Implement createMedicine(data) function
    - Implement updateMedicine(medicineId, data) function
    - Implement deleteMedicine(medicineId) function
    - Implement toggleMedicineStatus(medicineId) function
    - Implement getMedicinesForParent(parentId) function
    - Implement getActiveMedicinesForParent(parentId) function
    - _Requirements: 1.1, 1.3, 1.5, 5.1, 5.2, 5.3, 6.1, 7.1, 7.3, 10.1, 11.1_

  - [ ]\* 2.2 Write property tests for medicine creation

    - **Property 1: Valid medicine creation succeeds**
    - **Property 2: New medicines default to active status**
    - **Property 4: Medicine stores creator ID**
    - **Validates: Requirements 1.1, 1.3, 1.5**

  - [ ]\* 2.3 Write property tests for medicine updates

    - **Property 15: Updates preserve creation timestamp**
    - **Property 16: Updates modify updatedAt timestamp**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]\* 2.4 Write property tests for medicine status
    - **Property 22: Status toggle updates correctly**
    - **Validates: Requirements 7.1, 7.3**

- [x] 3. Implement schedule service layer

  - [x] 3.1 Create src/services/scheduleService.js

    - Implement createSchedule(medicineId, data) function
    - Implement updateSchedule(scheduleId, data) function
    - Implement deleteSchedule(scheduleId) function
    - Implement getScheduleForMedicine(medicineId) function
    - _Requirements: 3.1, 3.2, 3.4, 4.5_

  - [ ]\* 3.2 Write property tests for schedule creation

    - **Property 9: Schedule stores all provided times**
    - **Property 10: Schedule links to medicine**
    - **Property 13: Schedule stores repeat pattern**
    - **Validates: Requirements 3.2, 3.4, 4.5**

  - [ ]\* 3.3 Write property tests for schedule patterns
    - **Property 12: Day numbers are in valid range**
    - **Validates: Requirements 4.4**

- [-] 4. Implement dose generation Cloud Function

  - [x] 4.1 Create functions/generateDoses.js

    - Implement generateDosesForSchedule(schedule, medicine, startDate, days) function
    - Implement date iteration logic for 7-day window
    - Implement repeat pattern matching (daily and specific_days)
    - Implement dose object creation with all required fields
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 4.2 Implement batch write logic

    - Implement writeDosesInBatches(doses) function
    - Split doses into batches of 500
    - Use Firestore batch.commit() for each batch
    - Add error handling and retry logic
    - _Requirements: 9.1, 9.2, 9.4_

  - [-] 4.3 Wire up Cloud Function trigger

    - Set up Firestore onCreate trigger for schedules collection
    - Set up Firestore onUpdate trigger for schedules collection
    - Call generateDosesForSchedule and writeDosesInBatches
    - Add logging for dose creation count
    - _Requirements: 8.1, 9.5_

  - [ ]\* 4.4 Write property tests for dose generation
    - **Property 26: Dose generation creates 7-day window**
    - **Property 27: Generated doses match schedule times**
    - **Property 28: Daily pattern generates doses every day**
    - **Property 29: Specific days pattern generates selective doses**
    - **Property 30: Doses link to medicine and schedule**
    - **Property 31: No duplicate doses for same time**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 9.3**

- [ ] 5. Checkpoint - Ensure backend services work

  - Run all property tests for services and dose generation
  - Verify medicine and schedule CRUD operations
  - Verify dose generation creates correct doses
  - Ask the user if questions arise

- [~] 6. Implement Firestore security rules

  - [ ] 6.1 Update firestore.rules

    - Add isLinkedCaregiver(parentId) helper function
    - Add medicines collection rules (read, create, update, delete)
    - Add schedules collection rules (read, write)
    - Add doses collection rules (read only, no write for clients)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]\* 6.2 Write property tests for security rules
    - **Property 40: Medicine read access control**
    - **Property 41: Medicine write access control**
    - **Property 42: Parents cannot write medicine data**
    - **Property 44: Dose read access control**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.5**

- [~] 7. Implement reusable UI components

  - [ ] 7.1 Create src/components/TimePicker.js

    - Implement time picker using React Native DateTimePicker
    - Add formatTime(date) helper to return "HH:MM"
    - Handle time selection and onChange callback
    - _Requirements: 3.3_

  - [ ] 7.2 Create src/components/FrequencySelector.js

    - Implement radio buttons for "daily" vs "specific_days"
    - Implement day checkboxes (Sun-Sat) for specific_days pattern
    - Handle pattern and day selection changes
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]\* 7.3 Write unit tests for UI components
    - Test TimePicker renders and handles time changes
    - Test FrequencySelector renders and handles pattern changes
    - Test day selection toggles correctly

- [ ] 8. Implement medicine form component

  - [ ] 8.1 Create src/components/MedicineForm.js

    - Add form fields: name, dosageAmount, dosageUnit, instructions
    - Add times list with add/remove functionality
    - Integrate TimePicker for adding times
    - Integrate FrequencySelector for repeat pattern
    - Implement form state management
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2_

  - [ ] 8.2 Add form validation

    - Validate required fields on blur and submit
    - Validate dosageAmount is positive number
    - Validate at least one time is added
    - Display inline error messages
    - Disable submit button when validation fails
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 8.3 Implement form submission

    - Call medicineService.createMedicine() with form data
    - Call scheduleService.createSchedule() with schedule data
    - Handle success (navigate back or show success message)
    - Handle errors (display error message)
    - Show loading state during submission
    - _Requirements: 16.1, 16.2, 16.3_

  - [ ]\* 8.4 Write property tests for form validation

    - **Property 45: Empty required fields show errors**
    - **Property 46: Invalid dosage shows error**
    - **Property 47: Invalid forms prevent submission**
    - **Property 48: Valid forms enable submission**
    - **Validates: Requirements 14.1, 14.2, 14.4, 14.5**

  - [ ]\* 8.5 Write property tests for time management
    - **Property 49: Adding time updates list**
    - **Property 50: Removing time updates list**
    - **Property 51: Times displayed in chronological order**
    - **Property 52: Duplicate times are prevented**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4**

- [ ] 9. Implement caregiver medicine list

  - [ ] 9.1 Create src/screens/CaregiverMedicineList.js

    - Load medicines using medicineService.getMedicinesForParent()
    - Display medicine cards with name, dosage, status
    - Add edit button (navigate to MedicineForm with medicineId)
    - Add delete button (call medicineService.deleteMedicine())
    - Add status toggle switch (call medicineService.toggleMedicineStatus())
    - Handle empty state with "Add Medicine" prompt
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 6.1, 6.2, 7.1, 7.3_

  - [ ]\* 9.2 Write property tests for medicine list

    - **Property 32: Caregiver sees all parent medicines**
    - **Property 33: Medicine display includes required fields**
    - **Validates: Requirements 10.1, 10.2**

  - [ ]\* 9.3 Write unit tests for medicine deletion
    - Test delete removes medicine from Firestore
    - Test delete cascades to schedules
    - Test delete removes future doses only
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 10. Implement parent medicine view

  - [ ] 10.1 Create src/screens/ParentMedicineView.js

    - Load active medicines using medicineService.getActiveMedicinesForParent()
    - Display medicine cards with name, dosage, instructions
    - Load and display schedule times for each medicine
    - Handle empty state with appropriate message
    - Do not show edit/delete options
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]\* 10.2 Write property tests for parent medicine view
    - **Property 34: Parent sees only active medicines**
    - **Property 35: Parent medicine view includes schedule times**
    - **Validates: Requirements 11.1, 11.3**

- [ ] 11. Implement dose service and parent dose view

  - [ ] 11.1 Create src/services/doseService.js

    - Implement getUpcomingDoses(parentId, hours) function
    - Query doses with scheduledTime in next N hours
    - Return doses sorted by scheduledTime
    - _Requirements: 12.1, 12.3_

  - [ ] 11.2 Create src/screens/UpcomingDoses.js

    - Load doses using doseService.getUpcomingDoses(parentId, 24)
    - Display dose cards with medicine name, dosage, scheduled time
    - Implement groupDosesByTime() to group doses with same time
    - Display grouped doses together
    - Handle empty state with appropriate message
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]\* 11.3 Write property tests for dose display
    - **Property 36: Upcoming doses filtered by time window**
    - **Property 37: Dose display includes required fields**
    - **Property 38: Doses sorted by scheduled time**
    - **Property 39: Doses grouped by time when shared**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.5**

- [ ] 12. Implement medicine editing

  - [ ] 12.1 Update MedicineForm.js to support edit mode

    - Accept medicineId prop for edit mode
    - Load existing medicine and schedule data when medicineId provided
    - Pre-populate form fields with existing data
    - Call updateMedicine() instead of createMedicine() in edit mode
    - Update schedule data accordingly
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]\* 12.2 Write property tests for medicine updates
    - **Property 14: Only linked caregivers can update medicines**
    - **Property 17: Updates validate required fields**
    - **Validates: Requirements 5.1, 5.4, 5.5**

- [ ] 13. Implement authorization checks

  - [ ] 13.1 Add authorization helpers to services

    - Implement checkCaregiverLinked(caregiverId, parentId) helper
    - Add authorization checks to all medicine write operations
    - Add authorization checks to schedule write operations
    - Return clear error messages for authorization failures
    - _Requirements: 1.4, 5.1, 5.5, 6.3, 7.5_

  - [ ]\* 13.2 Write property tests for authorization
    - **Property 3: Unauthorized medicine creation is rejected**
    - **Property 20: Only authorized caregivers can delete**
    - **Property 25: Only authorized caregivers can toggle status**
    - **Validates: Requirements 1.4, 6.3, 7.5**

- [ ] 14. Implement offline support and error handling

  - [ ] 14.1 Add network error handling

    - Wrap all Firestore operations in try-catch blocks
    - Display user-friendly error messages
    - Implement retry logic with exponential backoff
    - Add loading and error states to all components
    - _Requirements: 16.2, 16.4_

  - [ ] 14.2 Add offline queue (optional enhancement)

    - Queue write operations when offline
    - Show pending sync indicator in UI
    - Retry queued operations when connection restored
    - _Requirements: 16.4, 16.5_

  - [ ]\* 14.3 Write unit tests for error handling
    - Test network failure displays error message
    - Test retry logic attempts multiple times
    - Test offline queue stores operations

- [ ] 15. Implement dose cleanup Cloud Function

  - [ ] 15.1 Create functions/cleanupOldDoses.js

    - Query doses with scheduledTime older than 30 days
    - Delete doses in batches of 500
    - Log cleanup results (count of deleted doses)
    - Set up Cloud Scheduler to run daily
    - _Requirements: 6.5_

  - [ ]\* 15.2 Write unit tests for cleanup function
    - Test cleanup deletes old doses
    - Test cleanup preserves recent doses
    - Test batch deletion handles large counts

- [ ] 16. Wire up navigation and integrate screens

  - [ ] 16.1 Add navigation routes

    - Add CaregiverMedicineList screen to navigation
    - Add MedicineForm screen to navigation (create and edit modes)
    - Add ParentMedicineView screen to navigation
    - Add UpcomingDoses screen to navigation
    - Add navigation from caregiver dashboard to medicine list
    - Add navigation from parent dashboard to medicine view and upcoming doses
    - _Requirements: All UI requirements_

  - [ ] 16.2 Add "Add Medicine" button
    - Add floating action button or header button to CaregiverMedicineList
    - Navigate to MedicineForm in create mode
    - Pass parentId to MedicineForm

- [ ] 17. Final checkpoint - End-to-end testing

  - Test complete flow: caregiver creates medicine → doses generated → parent views medicine and doses
  - Test edit flow: caregiver edits medicine → doses regenerated
  - Test delete flow: caregiver deletes medicine → schedules and future doses removed
  - Test status toggle: caregiver deactivates medicine → no new doses generated
  - Verify all property tests pass
  - Verify security rules enforce authorization
  - Ask the user if questions arise

- [ ] 18. Deploy and verify
  - Deploy Cloud Functions to Firebase
  - Deploy Firestore security rules
  - Test on physical device or emulator
  - Verify dose generation runs automatically
  - Verify cleanup function scheduled correctly

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness across random inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation builds incrementally: models → services → Cloud Functions → UI
- Authorization is enforced at both the service layer and Firestore rules level
- Dose generation is fully automated via Cloud Functions
- The design assumes Firebase SDK and React Native are already configured
