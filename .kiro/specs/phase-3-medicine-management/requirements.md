# Requirements Document

## Introduction

Phase 3 of the PillSathi app enables caregivers to create and manage medicines with schedules for their linked parents. Parents can view their assigned medicines and upcoming doses. This phase builds on the existing authentication and pairing system to provide the core medication management functionality.

## Glossary

- **Medicine**: A medication record containing name, dosage, and other details
- **Schedule**: A time-based pattern defining when doses should be taken
- **Dose**: A single instance of medicine to be taken at a specific time
- **Caregiver**: A user who manages medicines for linked parents
- **Parent**: A user who takes medicines managed by caregivers
- **Active_Medicine**: A medicine that is currently generating doses
- **Inactive_Medicine**: A medicine that is paused and not generating doses
- **Firestore**: Firebase's NoSQL database
- **Cloud_Function**: Server-side code that runs on Firebase infrastructure
- **Dose_Generator**: Cloud Function that creates dose instances from schedules

## Requirements

### Requirement 1: Medicine Creation

**User Story:** As a caregiver, I want to add a medicine for a linked parent, so that I can track their medication regimen.

#### Acceptance Criteria

1. WHEN a caregiver submits a valid medicine form, THE Medicine_System SHALL create a new medicine record in Firestore
2. WHEN creating a medicine, THE Medicine_System SHALL require medicine name, parent ID, and dosage information
3. WHEN a medicine is created, THE Medicine_System SHALL set the status to active by default
4. WHEN a caregiver attempts to create a medicine for a non-linked parent, THE Medicine_System SHALL reject the request
5. WHEN a medicine is created, THE Medicine_System SHALL store the caregiver ID as the creator

### Requirement 2: Medicine Data Management

**User Story:** As a caregiver, I want to set detailed dosage information, so that parents have clear instructions.

#### Acceptance Criteria

1. THE Medicine_System SHALL store medicine name as a non-empty string
2. THE Medicine_System SHALL store dosage amount as a positive number
3. THE Medicine_System SHALL store dosage unit (e.g., mg, ml, tablets)
4. THE Medicine_System SHALL store optional instructions as text
5. WHEN storing medicine data, THE Medicine_System SHALL validate all required fields are present

### Requirement 3: Schedule Creation

**User Story:** As a caregiver, I want to create a schedule with multiple daily times, so that medicines are taken at the right times.

#### Acceptance Criteria

1. WHEN a caregiver creates a schedule, THE Schedule_System SHALL require at least one daily time
2. WHEN a caregiver adds multiple times, THE Schedule_System SHALL store all times in the schedule
3. WHEN storing times, THE Schedule_System SHALL use 24-hour format (HH:MM)
4. WHEN a schedule is created, THE Schedule_System SHALL link it to a specific medicine
5. THE Schedule_System SHALL allow up to 10 times per day per schedule

### Requirement 4: Schedule Patterns

**User Story:** As a caregiver, I want to set repeat patterns, so that medicines follow the correct frequency.

#### Acceptance Criteria

1. THE Schedule_System SHALL support daily repeat pattern (every day)
2. THE Schedule_System SHALL support specific days pattern (selected days of week)
3. WHEN a specific days pattern is selected, THE Schedule_System SHALL require at least one day
4. WHEN storing day selections, THE Schedule_System SHALL use day numbers (0=Sunday, 6=Saturday)
5. THE Schedule_System SHALL store the repeat pattern type with the schedule

### Requirement 5: Medicine Editing

**User Story:** As a caregiver, I want to edit medicines, so that I can update information when needed.

#### Acceptance Criteria

1. WHEN a caregiver updates a medicine, THE Medicine_System SHALL validate the caregiver is linked to the parent
2. WHEN medicine data is updated, THE Medicine_System SHALL preserve the original creation timestamp
3. WHEN a medicine is updated, THE Medicine_System SHALL update the last modified timestamp
4. WHEN updating a medicine, THE Medicine_System SHALL validate all required fields
5. WHEN a caregiver attempts to edit another caregiver's medicine, THE Medicine_System SHALL reject the request

### Requirement 6: Medicine Deletion

**User Story:** As a caregiver, I want to delete medicines, so that I can remove discontinued medications.

#### Acceptance Criteria

1. WHEN a caregiver deletes a medicine, THE Medicine_System SHALL remove the medicine record from Firestore
2. WHEN a medicine is deleted, THE Medicine_System SHALL delete all associated schedules
3. WHEN a medicine is deleted, THE Medicine_System SHALL validate the caregiver is authorized
4. WHEN deleting a medicine with future doses, THE Medicine_System SHALL remove those doses
5. WHEN a medicine is deleted, THE Medicine_System SHALL preserve historical dose records

### Requirement 7: Medicine Activation Control

**User Story:** As a caregiver, I want to activate or deactivate medicines, so that I can pause medications without deleting them.

#### Acceptance Criteria

1. WHEN a caregiver deactivates a medicine, THE Medicine_System SHALL set the status to inactive
2. WHEN a medicine is inactive, THE Dose_Generator SHALL not create new doses for that medicine
3. WHEN a caregiver activates a medicine, THE Medicine_System SHALL set the status to active
4. WHEN a medicine is activated, THE Dose_Generator SHALL resume creating doses
5. WHEN toggling status, THE Medicine_System SHALL validate caregiver authorization

### Requirement 8: Dose Generation

**User Story:** As a system, I need to generate doses from schedules, so that parents know when to take medicines.

#### Acceptance Criteria

1. WHEN a schedule is created, THE Dose_Generator SHALL create doses for the next 7 days
2. WHEN generating doses, THE Dose_Generator SHALL use the schedule's time and repeat pattern
3. WHEN a daily pattern is used, THE Dose_Generator SHALL create doses for every day
4. WHEN a specific days pattern is used, THE Dose_Generator SHALL create doses only for selected days
5. WHEN generating doses, THE Dose_Generator SHALL link each dose to the medicine and schedule

### Requirement 9: Batch Dose Creation

**User Story:** As a system, I need to efficiently create multiple doses, so that the system performs well.

#### Acceptance Criteria

1. WHEN creating multiple doses, THE Dose_Generator SHALL use Firestore batch writes
2. WHEN a batch write fails, THE Dose_Generator SHALL retry the operation
3. WHEN generating doses, THE Dose_Generator SHALL not create duplicate doses for the same time
4. WHEN the batch size exceeds 500 operations, THE Dose_Generator SHALL split into multiple batches
5. WHEN batch creation completes, THE Dose_Generator SHALL log the number of doses created

### Requirement 10: Caregiver Medicine List

**User Story:** As a caregiver, I want to view all medicines for a parent, so that I can manage their medication regimen.

#### Acceptance Criteria

1. WHEN a caregiver views the medicine list, THE Medicine_UI SHALL display all medicines for the selected parent
2. WHEN displaying medicines, THE Medicine_UI SHALL show medicine name, dosage, and status
3. WHEN displaying medicines, THE Medicine_UI SHALL show edit and delete options
4. WHEN displaying medicines, THE Medicine_UI SHALL show the activation toggle
5. WHEN no medicines exist, THE Medicine_UI SHALL display a message prompting to add medicines

### Requirement 11: Parent Medicine View

**User Story:** As a parent, I want to view my medicines, so that I know what medications I'm taking.

#### Acceptance Criteria

1. WHEN a parent views their medicine list, THE Medicine_UI SHALL display only active medicines
2. WHEN displaying medicines, THE Medicine_UI SHALL show medicine name, dosage, and instructions
3. WHEN displaying medicines, THE Medicine_UI SHALL show the schedule times
4. WHEN no active medicines exist, THE Medicine_UI SHALL display an appropriate message
5. WHEN viewing medicines, THE Medicine_UI SHALL not show edit or delete options to parents

### Requirement 12: Parent Dose View

**User Story:** As a parent, I want to view upcoming doses, so that I know when to take my medicines.

#### Acceptance Criteria

1. WHEN a parent views upcoming doses, THE Dose_UI SHALL display doses for the next 24 hours
2. WHEN displaying doses, THE Dose_UI SHALL show medicine name, dosage, and scheduled time
3. WHEN displaying doses, THE Dose_UI SHALL sort by scheduled time (earliest first)
4. WHEN no upcoming doses exist, THE Dose_UI SHALL display an appropriate message
5. WHEN displaying doses, THE Dose_UI SHALL group doses by time if multiple medicines share the same time

### Requirement 13: Firestore Security Rules

**User Story:** As a system administrator, I want secure data access, so that users can only access authorized data.

#### Acceptance Criteria

1. WHEN a user reads medicines, THE Firestore_Rules SHALL allow access only if the user is the parent or a linked caregiver
2. WHEN a caregiver writes medicine data, THE Firestore_Rules SHALL validate the caregiver is linked to the parent
3. WHEN a parent attempts to write medicine data, THE Firestore_Rules SHALL reject the request
4. WHEN accessing schedules, THE Firestore_Rules SHALL enforce the same authorization as medicines
5. WHEN accessing doses, THE Firestore_Rules SHALL allow read access to the parent and linked caregivers

### Requirement 14: Medicine Form Validation

**User Story:** As a caregiver, I want clear validation feedback, so that I can correct errors when adding medicines.

#### Acceptance Criteria

1. WHEN a required field is empty, THE Medicine_Form SHALL display an error message
2. WHEN dosage amount is not a positive number, THE Medicine_Form SHALL display an error message
3. WHEN no schedule times are added, THE Medicine_Form SHALL display an error message
4. WHEN form validation fails, THE Medicine_Form SHALL prevent submission
5. WHEN all validations pass, THE Medicine_Form SHALL enable the submit button

### Requirement 15: Schedule Time Management

**User Story:** As a caregiver, I want to add and remove schedule times easily, so that I can configure complex schedules.

#### Acceptance Criteria

1. WHEN a caregiver adds a time, THE Schedule_UI SHALL add it to the list of times
2. WHEN a caregiver removes a time, THE Schedule_UI SHALL remove it from the list
3. WHEN displaying times, THE Schedule_UI SHALL sort them chronologically
4. WHEN a duplicate time is added, THE Schedule_UI SHALL prevent the addition
5. WHEN the maximum number of times is reached, THE Schedule_UI SHALL disable the add button

### Requirement 16: Data Persistence

**User Story:** As a user, I want my data saved reliably, so that I don't lose information.

#### Acceptance Criteria

1. WHEN medicine data is submitted, THE Medicine_System SHALL write to Firestore before showing success
2. WHEN a Firestore write fails, THE Medicine_System SHALL display an error message to the user
3. WHEN schedule data is submitted, THE Schedule_System SHALL write to Firestore atomically with the medicine
4. WHEN network connectivity is lost, THE Medicine_System SHALL queue writes for retry
5. WHEN writes are queued, THE Medicine_UI SHALL indicate pending sync status
