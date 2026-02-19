# Implementation Plan: UI Navigation Restructure

## Overview

This implementation plan restructures the PillSathi app's navigation and UI for both Caregiver and Parent users. The work is organized into logical phases: profile management, caregiver UI restructure, parent UI restructure, and integration. Each task builds incrementally to ensure the app remains functional throughout development.

## Tasks

- [x] 1. Set up profile data model and validation utilities

  - Add `name`, `dateOfBirth`, `email`, and `profileCompleted` fields to User model
  - Create validation functions for name (required, non-empty), date of birth (required, valid date, age >= 13), and email (optional, valid format)
  - Create utility functions for checking profile completion status
  - _Requirements: 18.1, 18.2, 19.1, 19.3, 19.4_

- [ ]\* 1.1 Write property test for profile validation

  - **Property 28: Profile Validation**
  - **Validates: Requirements 18.2, 19.3**

- [x] 2. Implement ProfileSetupScreen for new users

  - [x] 2.1 Create ProfileSetupScreen component with form fields

    - Implement form with name (required), date of birth (required), and email (optional) fields
    - Add validation and error display for each field
    - Disable submit button until required fields are valid
    - _Requirements: 19.2, 19.3, 19.4_

  - [x] 2.2 Implement profile save and navigation logic

    - Save profile data to Firestore users collection
    - Set `profileCompleted: true` flag
    - Navigate to appropriate dashboard based on user role
    - _Requirements: 19.6_

  - [ ]\* 2.3 Write unit tests for ProfileSetupScreen
    - Test validation for required fields
    - Test optional email field
    - Test successful submission flow
    - _Requirements: 19.3, 19.4, 19.6_

- [x] 3. Implement profile completion check in authentication flow

  - [x] 3.1 Create useProfileCompletionCheck hook

    - Check if user profile is complete after authentication
    - Redirect to ProfileSetupScreen if incomplete
    - Allow direct navigation to dashboard if complete
    - _Requirements: 19.1, 19.2, 19.7_

  - [x] 3.2 Integrate profile check into RootNavigator

    - Call useProfileCompletionCheck after authentication
    - Handle navigation based on profile completion status
    - _Requirements: 19.1, 19.2, 19.7_

  - [ ]\* 3.3 Write unit tests for profile completion check
    - Test redirect for incomplete profile
    - Test direct navigation for complete profile
    - _Requirements: 19.1, 19.2, 19.7_

- [ ] 4. Checkpoint - Ensure profile setup works

  - Test new user flow: login → profile setup → dashboard
  - Test existing user flow: login → dashboard (skip profile setup)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement EditProfileScreen for profile updates

  - [x] 5.1 Create EditProfileScreen component

    - Pre-fill form with current user profile data
    - Allow editing of name, date of birth, and email
    - Validate input before saving
    - _Requirements: 18.1, 18.2, 18.5_

  - [x] 5.2 Implement profile update logic

    - Save updated profile to Firestore
    - Update local user state
    - Navigate back to profile screen
    - _Requirements: 18.3_

  - [ ]\* 5.3 Write unit tests for EditProfileScreen
    - Test form pre-filling with current data
    - Test validation
    - Test successful update
    - _Requirements: 18.1, 18.2, 18.3, 18.5_

- [x] 6. Create reusable LogoutHeader component

  - [x] 6.1 Implement LogoutHeader component

    - Create header component with logout button
    - Position logout button consistently (top-right)
    - Implement logout confirmation dialog
    - Call AuthContext.signOut() on confirmation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 12.1, 12.2, 12.3, 12.4_

  - [ ]\* 6.2 Write unit tests for LogoutHeader
    - Test logout button renders
    - Test confirmation dialog appears on tap
    - Test signOut is called on confirmation
    - _Requirements: 2.2, 2.3_

- [x] 7. Integrate LogoutHeader into all screens

  - [x] 7.1 Add LogoutHeader to CaregiverNavigator screens

    - Set as headerRight option in stack navigator
    - Apply to all screens in HomeStack, PairingStack, and ProfileStack
    - _Requirements: 2.1, 2.4_

  - [x] 7.2 Add LogoutHeader to ParentNavigator screens

    - Set as headerRight option in stack navigator
    - Apply to all screens in HomeStack and ProfileStack
    - _Requirements: 12.1, 12.4_

  - [ ]\* 7.3 Write property test for header consistency
    - **Property 4: Header Logout Button Presence**
    - **Property 5: Logout Button Consistent Positioning**
    - **Validates: Requirements 2.1, 2.4, 12.1, 12.4**

- [x] 8. Add parent alias field to relationship data model

  - Update Firestore relationships collection schema to include `parentAlias` field
  - Create utility functions for getting/setting parent alias
  - Update relationship queries to include alias field
  - _Requirements: 16.1, 16.2, 16.3_

- [ ]\* 8.1 Write property test for alias preservation

  - **Property 26: Parent Actual Name Preservation**
  - **Validates: Requirements 16.3**

- [x] 9. Implement EditAliasDialog component

  - [x] 9.1 Create EditAliasDialog modal component

    - Create modal with text input for alias
    - Pre-fill with current alias if exists
    - Implement save and cancel actions
    - _Requirements: 16.1_

  - [x] 9.2 Implement alias save logic

    - Update relationship document in Firestore with new alias
    - Update local state to reflect alias change
    - _Requirements: 16.2_

  - [ ]\* 9.3 Write unit tests for EditAliasDialog
    - Test modal renders with current alias
    - Test save updates Firestore
    - Test cancel closes modal without saving
    - _Requirements: 16.1, 16.2_

- [ ] 10. Redesign CaregiverHomeScreen to display parent list

  - [x] 10.1 Create usePairedParents hook

    - Fetch all relationships where caregiverId matches current user
    - For each relationship, fetch parent data and alias
    - Calculate upcoming medicine count for each parent
    - _Requirements: 1.1_

  - [x] 10.2 Create ParentCard component

    - Display parent name (use alias if available)
    - Display summary information (upcoming medicine count)
    - Handle tap to navigate to parent detail
    - _Requirements: 1.2, 1.3_

  - [x] 10.3 Update CaregiverHomeScreen to render parent list

    - Use FlatList to display ParentCard components
    - Implement empty state for no paired parents
    - _Requirements: 1.1, 1.4_

  - [ ]\* 10.4 Write property tests for caregiver dashboard
    - **Property 1: Caregiver Dashboard Displays All Paired Parents**
    - **Property 2: Parent Information Rendering Completeness**
    - **Property 3: Parent Selection Navigation**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 11. Create ParentDetailScreen for caregiver view

  - [x] 11.1 Create ParentDetailScreen component

    - Fetch parent data and alias using parentId from route params
    - Display parent information section with edit alias button
    - Display upcoming doses section (next 24 hours)
    - Display medicine list section
    - _Requirements: 4.1, 5.1, 7.1_

  - [x] 11.2 Integrate EditAliasDialog into ParentDetailScreen

    - Show dialog when edit alias button is tapped
    - Update parent name display when alias is saved
    - _Requirements: 16.1, 16.2_

  - [x] 11.3 Implement medicine list in ParentDetailScreen

    - Display all medicines for the parent
    - Show medicine name and dosage for each
    - Handle tap to navigate to medicine details
    - Show empty state if no medicines
    - _Requirements: 5.1, 5.2, 5.3, 6.1_

  - [ ]\* 11.4 Write property tests for parent detail screen
    - **Property 8: Parent Medicine List Completeness**
    - **Property 9: Medicine Information Rendering**
    - **Property 12: Upcoming Medicines Display**
    - **Validates: Requirements 5.1, 5.2, 7.1**

- [x] 12. Update medicine management to work within parent context

  - [x] 12.1 Update MedicineFormScreen to accept parentId

    - Ensure parentId is passed when navigating to form
    - Associate new medicines with the parentId
    - Preserve parentId when editing medicines
    - _Requirements: 4.2, 4.3_

  - [x] 12.2 Update navigation to MedicineFormScreen

    - Pass parentId from ParentDetailScreen
    - Update all navigation calls to include parentId
    - _Requirements: 4.4_

  - [ ]\* 12.3 Write property test for medicine parent association
    - **Property 7: Medicine Parent Association Preservation**
    - **Validates: Requirements 4.3**

- [ ] 13. Checkpoint - Ensure caregiver parent-scoped medicine management works

  - Test viewing parent list
  - Test navigating to parent detail
  - Test viewing medicines for a parent
  - Test adding/editing medicines within parent context
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Restructure CaregiverNavigator to add Pairing and Upcoming tabs

  - [x] 14.1 Create PairingStack in CaregiverNavigator

    - Move CaregiverPairingScreen to new PairingStack
    - Add GenerateCodeScreen to PairingStack
    - Configure tab with appropriate icon and label
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 14.2 Create UpcomingStack in CaregiverNavigator

    - Create new stack for upcoming medicines tab
    - Add CaregiverUpcomingScreen to stack
    - Configure tab with appropriate icon and label
    - _Requirements: 15.1_

  - [x] 14.3 Update CaregiverNavigator tab configuration

    - Add PairingTab to bottom navigation
    - Add UpcomingTab to bottom navigation
    - Ensure HomeTab and ProfileTab remain
    - _Requirements: 3.1, 15.1_

  - [ ]\* 14.4 Write unit tests for tab configuration
    - Test all tabs are present in navigator
    - Test tab navigation works correctly
    - _Requirements: 3.1, 3.2, 15.1_

- [x] 15. Implement CaregiverUpcomingScreen

  - [x] 15.1 Create useAllUpcomingDoses hook

    - Fetch all paired parents for caregiver
    - For each parent, fetch upcoming doses
    - Merge doses and sort by scheduled time
    - Include parent name (use alias if available)
    - _Requirements: 15.2_

  - [x] 15.2 Create UpcomingDoseCard component

    - Display medicine name, scheduled time, dosage, and parent name
    - Handle tap to navigate to medicine details
    - Highlight overdue doses
    - _Requirements: 15.3_

  - [x] 15.3 Implement CaregiverUpcomingScreen

    - Use FlatList to display UpcomingDoseCard components
    - Show empty state if no upcoming doses
    - _Requirements: 15.2_

  - [ ]\* 15.4 Write property tests for caregiver upcoming screen
    - **Property 13: Upcoming Dose Information Completeness**
    - **Property 14: Upcoming Medicines Chronological Sorting**
    - **Property 24: Caregiver All Upcoming Medicines Aggregation**
    - **Property 25: Parent Name Display with Alias**
    - **Validates: Requirements 15.2, 15.3, 15.4, 16.2**

- [x] 16. Implement GenerateCodeScreen

  - [x] 16.1 Create GenerateCodeScreen component

    - Add button to generate new invite code
    - Display generated code prominently
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 16.2 Create usePairedCaregivers hook

    - Fetch all caregivers paired with a specific parent
    - Return caregiver names and pairing status
    - _Requirements: 9.1_

  - [x] 16.3 Add paired caregivers list to GenerateCodeScreen

    - Display list of all paired caregivers
    - Show caregiver name and status
    - Show appropriate message if no caregivers
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]\* 16.4 Write property tests for generate code screen
    - **Property 16: Paired Caregivers List Completeness**
    - **Property 17: Caregiver Information Rendering**
    - **Validates: Requirements 9.1, 9.2**

- [ ] 17. Checkpoint - Ensure caregiver navigation restructure is complete

  - Test pairing tab is accessible from bottom navigation
  - Test upcoming tab shows all doses across parents
  - Test generate code screen works
  - Test navigation state is preserved when switching tabs
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Redesign ParentHomeScreen to show medicines and upcoming doses

  - [x] 18.1 Create useMyMedicines hook

    - Fetch all medicines for current parent user
    - Return medicines sorted consistently
    - _Requirements: 10.1_

  - [x] 18.2 Create useUpcomingDoses hook

    - Fetch upcoming doses for current user within time window
    - Sort doses chronologically
    - Mark overdue doses
    - _Requirements: 11.1_

  - [x] 18.3 Update ParentHomeScreen layout

    - Add "Upcoming Medicines" section at top
    - Add "All Medicines" section below
    - Display medicines with name, dosage, and frequency
    - Show empty states appropriately
    - _Requirements: 10.1, 10.2, 10.3, 11.1, 11.2_

  - [ ]\* 18.4 Write property tests for parent dashboard
    - **Property 18: Parent Dashboard Medicine List**
    - **Property 13: Upcoming Dose Information Completeness**
    - **Property 14: Upcoming Medicines Chronological Sorting**
    - **Property 19: Overdue Medicine Highlighting**
    - **Validates: Requirements 10.1, 11.1, 11.2, 11.3, 11.4**

- [x] 19. Restructure ParentNavigator to add Upcoming tab

  - [x] 19.1 Create UpcomingStack in ParentNavigator

    - Create new stack for upcoming medicines tab
    - Add ParentUpcomingScreen to stack
    - Configure tab with appropriate icon and label
    - _Requirements: 17.1_

  - [x] 19.2 Update ParentNavigator tab configuration

    - Add UpcomingTab to bottom navigation
    - Ensure HomeTab and ProfileTab remain
    - _Requirements: 17.1_

  - [ ]\* 19.3 Write unit tests for tab configuration
    - Test all tabs are present in navigator
    - Test tab navigation works correctly
    - _Requirements: 17.1_

- [x] 20. Implement ParentUpcomingScreen

  - [x] 20.1 Create useTodayDoses hook

    - Fetch doses for current day (midnight to midnight)
    - Sort doses chronologically
    - Mark overdue doses
    - _Requirements: 17.2_

  - [x] 20.2 Create DoseCard component for parent view

    - Display medicine name, scheduled time, and dosage
    - Highlight overdue doses
    - Handle tap to navigate to medicine details
    - Add quick action to mark as taken
    - _Requirements: 17.3, 17.5_

  - [x] 20.3 Implement ParentUpcomingScreen

    - Use FlatList to display DoseCard components
    - Show empty state if no doses today
    - _Requirements: 17.2_

  - [ ]\* 20.4 Write property tests for parent upcoming screen
    - **Property 27: Parent Daily Upcoming Medicines Filtering**
    - **Property 13: Upcoming Dose Information Completeness**
    - **Property 14: Upcoming Medicines Chronological Sorting**
    - **Property 19: Overdue Medicine Highlighting**
    - **Validates: Requirements 17.2, 17.3, 17.4, 17.5**

- [x] 21. Implement navigation state persistence

  - [x] 21.1 Configure React Navigation state persistence

    - Enable state persistence in navigation container
    - Store navigation state to AsyncStorage
    - Restore navigation state on app launch
    - _Requirements: 13.1, 13.2_

  - [ ]\* 21.2 Write property test for navigation stack preservation
    - **Property 20: Navigation Stack Preservation**
    - **Validates: Requirements 13.1, 13.2**

- [x] 22. Ensure consistent navigation patterns

  - [x] 22.1 Audit all screen configurations for consistency

    - Verify back button behavior is consistent
    - Verify modal presentation for add/edit forms
    - Verify header styling is consistent
    - _Requirements: 14.1, 14.2, 14.4_

  - [x] 22.2 Update any inconsistent screen configurations

    - Fix back button behavior where needed
    - Ensure all add/edit forms use modal presentation
    - Apply consistent header styles
    - _Requirements: 14.1, 14.2, 14.4_

  - [ ]\* 22.3 Write property tests for navigation consistency
    - **Property 21: Consistent Back Button Behavior**
    - **Property 22: Modal Presentation Consistency**
    - **Property 23: Header Styling Consistency**
    - **Validates: Requirements 14.1, 14.2, 14.4**

- [x] 23. Update navigation type definitions

  - Update `src/types/navigation.js` with new screens and parameters
  - Add ProfileSetupScreen, EditProfileScreen, ParentDetailScreen, GenerateCodeScreen
  - Add UpcomingTab to both navigators
  - Update param types for new screens
  - _Requirements: All_

- [ ] 24. Final checkpoint - End-to-end testing
  - Test complete new user flow: login → profile setup → dashboard
  - Test complete existing user flow: login → dashboard
  - Test caregiver: parent list → parent detail → medicine management
  - Test caregiver: upcoming tab shows all doses across parents
  - Test caregiver: pairing tab and generate code
  - Test caregiver: edit parent alias
  - Test parent: dashboard shows medicines and upcoming doses
  - Test parent: upcoming tab shows today's doses
  - Test both: profile editing
  - Test both: logout from any screen
  - Test both: navigation state preserved when switching tabs
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout development
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with existing medicine management features
