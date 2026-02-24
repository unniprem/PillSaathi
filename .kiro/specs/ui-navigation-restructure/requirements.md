# Requirements Document

## Introduction

This document specifies the requirements for restructuring the PillSathi app's navigation and UI layout for both Caregiver and Parent user roles. The restructure aims to improve user experience by reorganizing navigation elements, moving key actions to more accessible locations, and creating a more intuitive information hierarchy. The changes affect the React Native application's navigation structure, which currently uses React Navigation with bottom tabs and stack navigators.

## Glossary

- **Caregiver**: A user who provides care for one or more parents and manages their medicine schedules
- **Parent**: A user who receives care and has medicines managed by caregivers
- **Dashboard**: The main home screen displayed when a user logs into the app
- **Bottom_Navigation**: The tab bar at the bottom of the screen for primary navigation
- **Header**: The top bar of the screen containing title and action buttons
- **Pairing**: The process of connecting caregivers with parents through invite codes
- **Medicine_Details**: Detailed information about a specific medicine including dosage, schedule, and instructions
- **Upcoming_Medicines**: A list of medicines scheduled to be taken in the near future
- **Generate_Code**: The action of creating an invite code for pairing relationships
- **Medicine_Management**: The collection of features for adding, editing, viewing, and organizing medicines

## Requirements

### Requirement 1: Caregiver Dashboard Parent List

**User Story:** As a caregiver, I want to see all parents I care for on my dashboard, so that I can quickly access each parent's information and medicine schedule.

#### Acceptance Criteria

1. WHEN a caregiver opens the app, THE Dashboard SHALL display a list of all parents the caregiver is paired with
2. WHEN the Dashboard displays parents, THE System SHALL show each parent's name and relevant summary information
3. WHEN a caregiver taps on a parent in the list, THE System SHALL navigate to that parent's detailed view
4. IF the caregiver has no paired parents, THEN THE Dashboard SHALL display an appropriate empty state message

### Requirement 2: Caregiver Header Logout Button

**User Story:** As a caregiver, I want the logout button in the header at the top of the screen, so that I can easily sign out without navigating through multiple screens.

#### Acceptance Criteria

1. WHEN a caregiver views any screen, THE Header SHALL display a logout button
2. WHEN a caregiver taps the logout button, THE System SHALL prompt for confirmation before logging out
3. WHEN logout is confirmed, THE System SHALL sign out the user and navigate to the authentication screen
4. THE Header SHALL position the logout button in a consistent location across all screens

### Requirement 3: Caregiver Pairing in Bottom Navigation

**User Story:** As a caregiver, I want pairing functionality accessible from the bottom navigation tabs, so that I can quickly manage parent relationships without deep navigation.

#### Acceptance Criteria

1. THE Bottom_Navigation SHALL include a tab for pairing functionality
2. WHEN a caregiver taps the pairing tab, THE System SHALL navigate to the pairing screen
3. THE Pairing_Tab SHALL display an appropriate icon and label
4. THE Bottom_Navigation SHALL maintain the pairing tab's visibility across all primary screens

### Requirement 4: Caregiver Medicine Management Inside Parent View

**User Story:** As a caregiver, I want to manage medicines within each parent's view, so that I can organize medicines by the parent they belong to.

#### Acceptance Criteria

1. WHEN a caregiver views a parent's details, THE System SHALL display medicine management options for that parent
2. WHEN a caregiver adds a medicine, THE System SHALL associate it with the currently viewed parent
3. WHEN a caregiver edits a medicine, THE System SHALL maintain the medicine's association with its parent
4. THE Parent_View SHALL provide clear navigation to add, edit, and view medicines for that specific parent

### Requirement 5: Caregiver Medicine List Display

**User Story:** As a caregiver, I want to see all medicines listed when viewing a parent, so that I can quickly review all medications for that parent.

#### Acceptance Criteria

1. WHEN a caregiver views a parent's details, THE System SHALL display a list of all medicines for that parent
2. WHEN the medicine list is displayed, THE System SHALL show key information for each medicine including name and dosage
3. WHEN a parent has no medicines, THE System SHALL display an appropriate empty state with an option to add the first medicine
4. THE Medicine_List SHALL be sorted in a consistent and logical order

### Requirement 6: Caregiver Medicine Details Navigation

**User Story:** As a caregiver, I want to tap on a medicine to see its details, so that I can review complete information about dosage, schedule, and instructions.

#### Acceptance Criteria

1. WHEN a caregiver taps on a medicine in the list, THE System SHALL navigate to the medicine details screen
2. WHEN the medicine details screen is displayed, THE System SHALL show all relevant information including name, dosage, schedule, frequency, and special instructions
3. THE Medicine_Details_Screen SHALL provide options to edit or delete the medicine
4. WHEN navigating back from medicine details, THE System SHALL return to the parent's medicine list

### Requirement 7: Caregiver Upcoming Medicines Display

**User Story:** As a caregiver, I want to see upcoming medicines for each parent, so that I can prepare for upcoming doses and ensure timely administration.

#### Acceptance Criteria

1. WHEN a caregiver views a parent's details, THE System SHALL display upcoming medicines scheduled for that parent
2. WHEN displaying upcoming medicines, THE System SHALL show the medicine name, scheduled time, and dosage
3. THE Upcoming_Medicines SHALL be sorted chronologically by scheduled time
4. THE System SHALL display upcoming medicines for a configurable time window (e.g., next 24 hours)

### Requirement 8: Caregiver Generate Code Button

**User Story:** As a caregiver, I want a generate code button at the bottom of the pairing screen, so that I can create invite codes for parents to pair with me.

#### Acceptance Criteria

1. WHEN a caregiver views the pairing screen, THE System SHALL display a generate code button at the bottom
2. WHEN a caregiver taps the generate code button, THE System SHALL create a new invite code
3. WHEN an invite code is generated, THE System SHALL display the code prominently for sharing
4. THE Generate_Code_Button SHALL be clearly visible and accessible without scrolling

### Requirement 9: Caregiver Paired Caregivers List

**User Story:** As a caregiver, I want to see all caregivers paired with each parent when generating codes, so that I can understand the existing care team.

#### Acceptance Criteria

1. WHEN a caregiver views the generate code interface, THE System SHALL list all caregivers currently paired with the parent
2. WHEN displaying paired caregivers, THE System SHALL show each caregiver's name and pairing status
3. IF no other caregivers are paired, THEN THE System SHALL display an appropriate message
4. THE Paired_Caregivers_List SHALL update in real-time when new pairings are established

### Requirement 10: Parent Dashboard Medicine List

**User Story:** As a parent, I want to see all my medicines listed on my dashboard, so that I can quickly review my medication schedule.

#### Acceptance Criteria

1. WHEN a parent opens the app, THE Dashboard SHALL display a list of all medicines for that parent
2. WHEN the medicine list is displayed, THE System SHALL show key information for each medicine including name, dosage, and frequency
3. WHEN a parent has no medicines, THE System SHALL display an appropriate empty state message
4. THE Medicine_List SHALL be organized in a clear and readable format

### Requirement 11: Parent Dashboard Upcoming Medicines

**User Story:** As a parent, I want to see upcoming medicines on my dashboard, so that I know which medicines I need to take soon.

#### Acceptance Criteria

1. WHEN a parent views the dashboard, THE System SHALL display upcoming medicines scheduled for the parent
2. WHEN displaying upcoming medicines, THE System SHALL show the medicine name, scheduled time, and dosage
3. THE Upcoming_Medicines SHALL be sorted chronologically by scheduled time
4. THE System SHALL highlight medicines that are due soon or overdue

### Requirement 12: Parent Header Logout Button

**User Story:** As a parent, I want the logout button in the header at the top of the screen, so that I can easily sign out without navigating through multiple screens.

#### Acceptance Criteria

1. WHEN a parent views any screen, THE Header SHALL display a logout button
2. WHEN a parent taps the logout button, THE System SHALL prompt for confirmation before logging out
3. WHEN logout is confirmed, THE System SHALL sign out the user and navigate to the authentication screen
4. THE Header SHALL position the logout button in a consistent location across all screens

### Requirement 13: Navigation State Preservation

**User Story:** As a user, I want my navigation state preserved when switching between tabs, so that I don't lose my place when navigating the app.

#### Acceptance Criteria

1. WHEN a user switches between bottom navigation tabs, THE System SHALL preserve the navigation stack for each tab
2. WHEN a user returns to a previously visited tab, THE System SHALL restore the user to their last position in that tab
3. THE System SHALL maintain scroll position and form state when switching tabs
4. WHEN the app is backgrounded and resumed, THE System SHALL restore the user's navigation state

### Requirement 14: Consistent Navigation Patterns

**User Story:** As a user, I want consistent navigation patterns across the app, so that I can predict how navigation will work in different sections.

#### Acceptance Criteria

1. THE System SHALL use consistent back button behavior across all screens
2. THE System SHALL use consistent modal presentation for add/edit forms
3. THE System SHALL use consistent transition animations for navigation actions
4. THE System SHALL provide consistent header styling and button placement across all screens

### Requirement 15: Caregiver Upcoming Medicines Tab

**User Story:** As a caregiver, I want a dedicated tab showing all upcoming medicines across all parents, so that I can see my complete schedule at a glance.

#### Acceptance Criteria

1. THE Bottom_Navigation SHALL include an upcoming medicines tab for caregivers
2. WHEN a caregiver taps the upcoming medicines tab, THE System SHALL display all upcoming medicines across all parents
3. WHEN displaying upcoming medicines, THE System SHALL show the medicine name, scheduled time, dosage, and parent name
4. THE Upcoming_Medicines_List SHALL be sorted chronologically by scheduled time
5. WHEN a caregiver taps on an upcoming medicine entry, THE System SHALL navigate to that medicine's details

### Requirement 16: Caregiver Parent Name Alias

**User Story:** As a caregiver, I want to set a custom alias for each parent I care for, so that I can use familiar names instead of formal names.

#### Acceptance Criteria

1. WHEN a caregiver views a parent's details, THE System SHALL provide an option to edit the parent's display name
2. WHEN a caregiver sets an alias for a parent, THE System SHALL use that alias throughout the caregiver's interface
3. THE System SHALL preserve the parent's actual name in the database while displaying the alias
4. WHEN no alias is set, THE System SHALL display the parent's actual name

### Requirement 17: Parent Upcoming Medicines Tab

**User Story:** As a parent, I want a dedicated tab showing all my upcoming medicines for the day, so that I can easily see my daily medication schedule.

#### Acceptance Criteria

1. THE Bottom_Navigation SHALL include an upcoming medicines tab for parents
2. WHEN a parent taps the upcoming medicines tab, THE System SHALL display all upcoming medicines for the current day
3. WHEN displaying upcoming medicines, THE System SHALL show the medicine name, scheduled time, and dosage
4. THE Upcoming_Medicines_List SHALL be sorted chronologically by scheduled time
5. THE System SHALL highlight medicines that are due soon or overdue

### Requirement 18: User Profile Management

**User Story:** As a user, I want to add and update my profile information including name and date of birth, so that my account has accurate personal information.

#### Acceptance Criteria

1. WHEN a user accesses profile settings, THE System SHALL provide fields to enter or edit name and date of birth
2. WHEN a user updates profile information, THE System SHALL validate the input before saving
3. WHEN a user saves profile changes, THE System SHALL persist the information to the database
4. THE System SHALL allow email as an optional field that can be added or updated
5. THE Profile_Form SHALL display current values when editing existing information

### Requirement 19: Mandatory Profile Completion for New Users

**User Story:** As a new user, I must complete my profile with name and date of birth before accessing the app, so that the system has essential information about me.

#### Acceptance Criteria

1. WHEN a new user logs in for the first time, THE System SHALL check if profile information is complete
2. IF profile information is incomplete, THEN THE System SHALL display a profile completion screen
3. THE Profile_Completion_Screen SHALL require name and date of birth as mandatory fields
4. THE Profile_Completion_Screen SHALL allow email as an optional field
5. THE System SHALL prevent navigation to the dashboard until required profile fields are completed
6. WHEN a user completes the required profile fields, THE System SHALL save the information and navigate to the dashboard
7. WHEN a user has already completed their profile, THE System SHALL navigate directly to the dashboard after login
