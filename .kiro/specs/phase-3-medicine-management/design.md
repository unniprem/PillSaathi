# Design Document: Phase 3 - Medicine & Schedule Management

## Overview

Phase 3 implements the core medication management functionality for PillSathi. The system enables caregivers to create medicines with flexible schedules, while parents can view their medications and upcoming doses. The architecture leverages Firebase Firestore for data storage, Cloud Functions for automated dose generation, and React Native for the mobile UI.

The design follows a clear separation between caregiver management capabilities and parent viewing capabilities, with security enforced at the Firestore rules level. Dose generation is handled server-side to ensure consistency and reliability.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
├──────────────────────┬──────────────────────────────────────┤
│  Caregiver UI        │         Parent UI                     │
│  - Medicine Form     │         - Medicine List (View)        │
│  - Medicine List     │         - Upcoming Doses              │
│  - Schedule Config   │                                       │
│  - Edit/Delete       │                                       │
└──────────────────────┴──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Firestore                        │
│  Collections:                                                │
│  - medicines/        (medicine records)                      │
│  - schedules/        (schedule patterns)                     │
│  - doses/            (generated dose instances)              │
│  - pairings/         (existing from Phase 2)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloud Functions                             │
│  - generateDoses     (creates doses from schedules)          │
│  - cleanupOldDoses   (removes past doses)                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Medicine Creation Flow:**

   - Caregiver fills medicine form → Validates locally → Writes to Firestore medicines collection → Cloud Function triggered → Generates doses for next 7 days

2. **Dose Viewing Flow:**

   - Parent opens app → Queries doses collection for next 24 hours → Displays sorted list

3. **Medicine Update Flow:**
   - Caregiver edits medicine → Updates Firestore → Cloud Function regenerates future doses

## Components and Interfaces

### Firestore Data Models

#### Medicine Document

```javascript
// Collection: medicines
// Document ID: auto-generated
{
  id: string,                    // Document ID
  name: string,                  // Medicine name (required, non-empty)
  parentId: string,              // User ID of parent (required)
  caregiverId: string,           // User ID of caregiver who created (required)
  dosageAmount: number,          // Positive number (required)
  dosageUnit: string,            // e.g., "mg", "ml", "tablets" (required)
  instructions: string,          // Optional instructions (can be empty)
  status: string,                // "active" or "inactive" (required)
  createdAt: timestamp,          // Creation timestamp
  updatedAt: timestamp           // Last update timestamp
}
```

#### Schedule Document

```javascript
// Collection: schedules
// Document ID: auto-generated
{
  id: string,                    // Document ID
  medicineId: string,            // Reference to medicine (required)
  times: array<string>,          // Array of times in "HH:MM" format (1-10 items)
  repeatPattern: string,         // "daily" or "specific_days" (required)
  selectedDays: array<number>,   // [0-6] where 0=Sunday, only for specific_days pattern
  createdAt: timestamp,          // Creation timestamp
  updatedAt: timestamp           // Last update timestamp
}
```

#### Dose Document

```javascript
// Collection: doses
// Document ID: auto-generated
{
  id: string,                    // Document ID
  medicineId: string,            // Reference to medicine (required)
  scheduleId: string,            // Reference to schedule (required)
  parentId: string,              // User ID of parent (required)
  medicineName: string,          // Denormalized for display
  dosageAmount: number,          // Denormalized for display
  dosageUnit: string,            // Denormalized for display
  scheduledTime: timestamp,      // When dose should be taken
  status: string,                // "pending", "taken", "missed", "skipped"
  createdAt: timestamp           // When dose was generated
}
```

### React Native Components

#### MedicineForm Component

```javascript
// Component for adding/editing medicines
// Props: { parentId, medicineId (optional for edit), onSuccess, onCancel }

MedicineForm {
  state: {
    name: string,
    dosageAmount: string,
    dosageUnit: string,
    instructions: string,
    times: array<string>,
    repeatPattern: string,
    selectedDays: array<number>,
    errors: object,
    isSubmitting: boolean
  }

  methods: {
    validateForm(): boolean
    handleSubmit(): Promise<void>
    addTime(time: string): void
    removeTime(index: number): void
    toggleDay(day: number): void
  }
}
```

#### MedicineList Component

```javascript
// Component for displaying medicines (caregiver view)
// Props: { parentId, onEdit, onDelete }

MedicineList {
  state: {
    medicines: array<Medicine>,
    loading: boolean,
    error: string
  }

  methods: {
    loadMedicines(): Promise<void>
    toggleStatus(medicineId: string): Promise<void>
    deleteMedicine(medicineId: string): Promise<void>
  }
}
```

#### ParentMedicineView Component

```javascript
// Component for displaying medicines (parent view)
// Props: { userId }

ParentMedicineView {
  state: {
    medicines: array<Medicine>,
    loading: boolean
  }

  methods: {
    loadActiveMedicines(): Promise<void>
  }
}
```

#### UpcomingDoses Component

```javascript
// Component for displaying upcoming doses (parent view)
// Props: { userId }

UpcomingDoses {
  state: {
    doses: array<Dose>,
    loading: boolean
  }

  methods: {
    loadUpcomingDoses(): Promise<void>
    groupDosesByTime(doses: array<Dose>): object
  }
}
```

#### TimePicker Component

```javascript
// Reusable time picker component
// Props: { value, onChange, label }

TimePicker {
  state: {
    showPicker: boolean,
    selectedTime: Date
  }

  methods: {
    formatTime(date: Date): string  // Returns "HH:MM"
    handleTimeChange(event, date: Date): void
  }
}
```

#### FrequencySelector Component

```javascript
// Component for selecting repeat pattern and days
// Props: { repeatPattern, selectedDays, onPatternChange, onDaysChange }

FrequencySelector {
  state: {
    pattern: string,
    days: array<number>
  }

  methods: {
    handlePatternChange(pattern: string): void
    toggleDay(day: number): void
  }
}
```

### Cloud Functions

#### generateDoses Function

```javascript
// Triggered when: schedule is created or updated
// Input: scheduleId
// Output: creates dose documents in Firestore

async function generateDoses(scheduleId) {
  // 1. Fetch schedule and medicine data
  // 2. Calculate dates for next 7 days
  // 3. For each date, check if it matches repeat pattern
  // 4. For each matching date and time, create dose
  // 5. Use batch writes for efficiency
  // 6. Return count of doses created
}
```

#### cleanupOldDoses Function

```javascript
// Triggered: daily via Cloud Scheduler
// Input: none
// Output: deletes old dose documents

async function cleanupOldDoses() {
  // 1. Query doses older than 30 days
  // 2. Delete in batches
  // 3. Log cleanup results
}
```

### Service Layer

#### MedicineService

```javascript
// Service for medicine operations
// Location: src/services/medicineService.js

MedicineService {
  methods: {
    createMedicine(data: object): Promise<string>
    updateMedicine(medicineId: string, data: object): Promise<void>
    deleteMedicine(medicineId: string): Promise<void>
    toggleMedicineStatus(medicineId: string): Promise<void>
    getMedicinesForParent(parentId: string): Promise<array<Medicine>>
    getActiveMedicinesForParent(parentId: string): Promise<array<Medicine>>
  }
}
```

#### ScheduleService

```javascript
// Service for schedule operations
// Location: src/services/scheduleService.js

ScheduleService {
  methods: {
    createSchedule(medicineId: string, data: object): Promise<string>
    updateSchedule(scheduleId: string, data: object): Promise<void>
    deleteSchedule(scheduleId: string): Promise<void>
    getScheduleForMedicine(medicineId: string): Promise<Schedule>
  }
}
```

#### DoseService

```javascript
// Service for dose operations
// Location: src/services/doseService.js

DoseService {
  methods: {
    getUpcomingDoses(parentId: string, hours: number): Promise<array<Dose>>
    getDosesForDate(parentId: string, date: Date): Promise<array<Dose>>
  }
}
```

## Data Models

### Validation Rules

#### Medicine Validation

```javascript
function validateMedicine(data) {
  const errors = {};

  if (!data.name || data.name.trim() === '') {
    errors.name = 'Medicine name is required';
  }

  if (!data.dosageAmount || data.dosageAmount <= 0) {
    errors.dosageAmount = 'Dosage amount must be a positive number';
  }

  if (!data.dosageUnit || data.dosageUnit.trim() === '') {
    errors.dosageUnit = 'Dosage unit is required';
  }

  if (!data.parentId) {
    errors.parentId = 'Parent ID is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

#### Schedule Validation

```javascript
function validateSchedule(data) {
  const errors = {};

  if (!data.times || data.times.length === 0) {
    errors.times = 'At least one time is required';
  }

  if (data.times && data.times.length > 10) {
    errors.times = 'Maximum 10 times allowed per schedule';
  }

  if (
    !data.repeatPattern ||
    !['daily', 'specific_days'].includes(data.repeatPattern)
  ) {
    errors.repeatPattern = 'Invalid repeat pattern';
  }

  if (
    data.repeatPattern === 'specific_days' &&
    (!data.selectedDays || data.selectedDays.length === 0)
  ) {
    errors.selectedDays = 'At least one day must be selected';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

### Dose Generation Algorithm

```javascript
function generateDosesForSchedule(schedule, medicine, startDate, days = 7) {
  const doses = [];
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  // Iterate through each day
  for (
    let date = new Date(startDate);
    date < endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const dayOfWeek = date.getDay();

    // Check if this day matches the repeat pattern
    let shouldCreateDose = false;
    if (schedule.repeatPattern === 'daily') {
      shouldCreateDose = true;
    } else if (schedule.repeatPattern === 'specific_days') {
      shouldCreateDose = schedule.selectedDays.includes(dayOfWeek);
    }

    if (shouldCreateDose) {
      // Create a dose for each time in the schedule
      for (const time of schedule.times) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hours, minutes, 0, 0);

        doses.push({
          medicineId: medicine.id,
          scheduleId: schedule.id,
          parentId: medicine.parentId,
          medicineName: medicine.name,
          dosageAmount: medicine.dosageAmount,
          dosageUnit: medicine.dosageUnit,
          scheduledTime: scheduledTime,
          status: 'pending',
          createdAt: new Date(),
        });
      }
    }
  }

  return doses;
}
```

### Batch Write Implementation

```javascript
async function writeDosesInBatches(doses) {
  const BATCH_SIZE = 500;
  const batches = [];

  // Split doses into batches of 500
  for (let i = 0; i < doses.length; i += BATCH_SIZE) {
    const batchDoses = doses.slice(i, i + BATCH_SIZE);
    batches.push(batchDoses);
  }

  // Write each batch
  for (const batchDoses of batches) {
    const batch = firestore.batch();

    for (const dose of batchDoses) {
      const doseRef = firestore.collection('doses').doc();
      batch.set(doseRef, dose);
    }

    await batch.commit();
  }

  return doses.length;
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is a caregiver for a parent
    function isLinkedCaregiver(parentId) {
      return exists(/databases/$(database)/documents/pairings/$(parentId + '_' + request.auth.uid))
        || exists(/databases/$(database)/documents/pairings/$(request.auth.uid + '_' + parentId));
    }

    // Medicines collection
    match /medicines/{medicineId} {
      allow read: if request.auth != null &&
        (resource.data.parentId == request.auth.uid || isLinkedCaregiver(resource.data.parentId));

      allow create: if request.auth != null &&
        request.resource.data.caregiverId == request.auth.uid &&
        isLinkedCaregiver(request.resource.data.parentId) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() > 0 &&
        request.resource.data.dosageAmount is number &&
        request.resource.data.dosageAmount > 0;

      allow update: if request.auth != null &&
        resource.data.caregiverId == request.auth.uid &&
        isLinkedCaregiver(resource.data.parentId);

      allow delete: if request.auth != null &&
        resource.data.caregiverId == request.auth.uid &&
        isLinkedCaregiver(resource.data.parentId);
    }

    // Schedules collection
    match /schedules/{scheduleId} {
      allow read: if request.auth != null;

      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/medicines/$(request.resource.data.medicineId)).data.caregiverId == request.auth.uid;
    }

    // Doses collection
    match /doses/{doseId} {
      allow read: if request.auth != null &&
        (resource.data.parentId == request.auth.uid || isLinkedCaregiver(resource.data.parentId));

      allow write: if false;  // Only Cloud Functions can write doses
    }
  }
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Medicine Creation Properties

**Property 1: Valid medicine creation succeeds**
_For any_ valid medicine data (with name, parentId, dosage amount, dosage unit, and linked caregiver), creating the medicine should result in a new record existing in Firestore with all provided fields.
**Validates: Requirements 1.1, 1.2**

**Property 2: New medicines default to active status**
_For any_ newly created medicine, the status field should be set to "active".
**Validates: Requirements 1.3**

**Property 3: Unauthorized medicine creation is rejected**
_For any_ caregiver and parent pair that are not linked, attempting to create a medicine should be rejected.
**Validates: Requirements 1.4**

**Property 4: Medicine stores creator ID**
_For any_ created medicine, the caregiverId field should match the ID of the user who created it.
**Validates: Requirements 1.5**

### Medicine Data Validation Properties

**Property 5: Required fields validation**
_For any_ medicine data missing required fields (name, parentId, dosageAmount, or dosageUnit), the system should reject the creation or update.
**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

**Property 6: Dosage amount must be positive**
_For any_ medicine data with dosageAmount ≤ 0 or non-numeric, the system should reject the creation or update.
**Validates: Requirements 2.2**

**Property 7: Instructions field is optional**
_For any_ medicine data with or without instructions field, the system should accept the creation if all required fields are valid.
**Validates: Requirements 2.4**

### Schedule Creation Properties

**Property 8: Schedule requires at least one time**
_For any_ schedule data with an empty times array, the system should reject the creation.
**Validates: Requirements 3.1**

**Property 9: Schedule stores all provided times**
_For any_ schedule created with N times (1 ≤ N ≤ 10), querying the schedule should return all N times in HH:MM format.
**Validates: Requirements 3.2, 3.3**

**Property 10: Schedule links to medicine**
_For any_ created schedule, the medicineId field should reference a valid medicine document.
**Validates: Requirements 3.4**

### Schedule Pattern Properties

**Property 11: Specific days pattern requires day selection**
_For any_ schedule with repeatPattern "specific_days" and empty selectedDays array, the system should reject the creation.
**Validates: Requirements 4.3**

**Property 12: Day numbers are in valid range**
_For any_ schedule with repeatPattern "specific_days", all values in selectedDays should be integers between 0 and 6 inclusive.
**Validates: Requirements 4.4**

**Property 13: Schedule stores repeat pattern**
_For any_ created schedule, the repeatPattern field should be either "daily" or "specific_days".
**Validates: Requirements 4.5**

### Medicine Update Properties

**Property 14: Only linked caregivers can update medicines**
_For any_ medicine and caregiver pair where the caregiver is not linked to the medicine's parent, update attempts should be rejected.
**Validates: Requirements 5.1, 5.5**

**Property 15: Updates preserve creation timestamp**
_For any_ medicine update, the createdAt timestamp should remain unchanged from the original value.
**Validates: Requirements 5.2**

**Property 16: Updates modify updatedAt timestamp**
_For any_ medicine update, the updatedAt timestamp should be set to a value greater than the previous updatedAt value.
**Validates: Requirements 5.3**

**Property 17: Updates validate required fields**
_For any_ medicine update with missing required fields, the system should reject the update.
**Validates: Requirements 5.4**

### Medicine Deletion Properties

**Property 18: Medicine deletion removes record**
_For any_ medicine that is deleted by an authorized caregiver, querying for that medicine should return no results.
**Validates: Requirements 6.1**

**Property 19: Medicine deletion cascades to schedules**
_For any_ medicine with associated schedules, deleting the medicine should also delete all associated schedule records.
**Validates: Requirements 6.2**

**Property 20: Only authorized caregivers can delete**
_For any_ medicine and caregiver pair where the caregiver is not the creator or not linked to the parent, deletion attempts should be rejected.
**Validates: Requirements 6.3**

**Property 21: Deletion removes future doses only**
_For any_ medicine with both past and future doses, deleting the medicine should remove future doses while preserving doses with scheduledTime in the past.
**Validates: Requirements 6.4, 6.5**

### Medicine Status Properties

**Property 22: Status toggle updates correctly**
_For any_ medicine, toggling from active to inactive should set status to "inactive", and toggling from inactive to active should set status to "active".
**Validates: Requirements 7.1, 7.3**

**Property 23: Inactive medicines don't generate doses**
_For any_ medicine with status "inactive", the dose generator should not create new doses for that medicine.
**Validates: Requirements 7.2**

**Property 24: Active medicines generate doses**
_For any_ medicine with status "active" and a valid schedule, the dose generator should create doses according to the schedule.
**Validates: Requirements 7.4**

**Property 25: Only authorized caregivers can toggle status**
_For any_ medicine and caregiver pair where the caregiver is not authorized, status toggle attempts should be rejected.
**Validates: Requirements 7.5**

### Dose Generation Properties

**Property 26: Dose generation creates 7-day window**
_For any_ schedule with daily pattern and one time, the dose generator should create exactly 7 doses (one per day for 7 days).
**Validates: Requirements 8.1**

**Property 27: Generated doses match schedule times**
_For any_ schedule with times T1, T2, ..., Tn, all generated doses should have scheduledTime matching one of the schedule times on the appropriate date.
**Validates: Requirements 8.2**

**Property 28: Daily pattern generates doses every day**
_For any_ schedule with repeatPattern "daily" and one time, the dose generator should create doses for all 7 consecutive days.
**Validates: Requirements 8.3**

**Property 29: Specific days pattern generates selective doses**
_For any_ schedule with repeatPattern "specific_days" and selectedDays array D, doses should only be generated for days of the week in D within the 7-day window.
**Validates: Requirements 8.4**

**Property 30: Doses link to medicine and schedule**
_For any_ generated dose, the medicineId and scheduleId fields should reference valid medicine and schedule documents.
**Validates: Requirements 8.5**

**Property 31: No duplicate doses for same time**
_For any_ medicine and schedule, no two doses should have the same medicineId and scheduledTime.
**Validates: Requirements 9.3**

### UI Display Properties

**Property 32: Caregiver sees all parent medicines**
_For any_ parent with N medicines, a linked caregiver viewing the medicine list should see all N medicines.
**Validates: Requirements 10.1**

**Property 33: Medicine display includes required fields**
_For any_ medicine displayed in the UI, the rendered output should contain the medicine name, dosage amount, dosage unit, and status.
**Validates: Requirements 10.2, 11.2**

**Property 34: Parent sees only active medicines**
_For any_ parent with N active medicines and M inactive medicines, the parent medicine view should display exactly N medicines.
**Validates: Requirements 11.1**

**Property 35: Parent medicine view includes schedule times**
_For any_ medicine with a schedule containing times T1, T2, ..., Tn, the parent medicine view should display all n times.
**Validates: Requirements 11.3**

**Property 36: Upcoming doses filtered by time window**
_For any_ parent with doses at various times, the upcoming doses view should display only doses with scheduledTime within the next 24 hours from the current time.
**Validates: Requirements 12.1**

**Property 37: Dose display includes required fields**
_For any_ dose displayed in the UI, the rendered output should contain the medicine name, dosage amount, dosage unit, and scheduled time.
**Validates: Requirements 12.2**

**Property 38: Doses sorted by scheduled time**
_For any_ list of doses displayed to a parent, the doses should be ordered by scheduledTime in ascending order (earliest first).
**Validates: Requirements 12.3**

**Property 39: Doses grouped by time when shared**
_For any_ set of doses with the same scheduledTime, the UI should group them together in the display.
**Validates: Requirements 12.5**

### Security Properties

**Property 40: Medicine read access control**
_For any_ medicine and user pair, read access should be granted if and only if the user is the parent or a linked caregiver.
**Validates: Requirements 13.1**

**Property 41: Medicine write access control**
_For any_ medicine write operation, it should succeed if and only if the user is a linked caregiver for the parent.
**Validates: Requirements 13.2**

**Property 42: Parents cannot write medicine data**
_For any_ parent user attempting to create, update, or delete medicine data, the operation should be rejected.
**Validates: Requirements 13.3**

**Property 43: Schedule access follows medicine authorization**
_For any_ schedule and user pair, access should follow the same authorization rules as the associated medicine.
**Validates: Requirements 13.4**

**Property 44: Dose read access control**
_For any_ dose and user pair, read access should be granted if and only if the user is the parent or a linked caregiver.
**Validates: Requirements 13.5**

### Form Validation Properties

**Property 45: Empty required fields show errors**
_For any_ medicine form with one or more empty required fields, the form should display error messages for each empty field.
**Validates: Requirements 14.1**

**Property 46: Invalid dosage shows error**
_For any_ medicine form with dosageAmount that is not a positive number, the form should display an error message.
**Validates: Requirements 14.2**

**Property 47: Invalid forms prevent submission**
_For any_ medicine form with validation errors, the submit action should be disabled or blocked.
**Validates: Requirements 14.4**

**Property 48: Valid forms enable submission**
_For any_ medicine form with all validations passing, the submit action should be enabled.
**Validates: Requirements 14.5**

### Schedule Time Management Properties

**Property 49: Adding time updates list**
_For any_ schedule UI with N times, adding a new valid time should result in N+1 times in the list.
**Validates: Requirements 15.1**

**Property 50: Removing time updates list**
_For any_ schedule UI with N times, removing a time should result in N-1 times in the list.
**Validates: Requirements 15.2**

**Property 51: Times displayed in chronological order**
_For any_ schedule UI with times added in random order, the displayed times should be sorted chronologically (earliest to latest).
**Validates: Requirements 15.3**

**Property 52: Duplicate times are prevented**
_For any_ schedule UI with a time T already in the list, attempting to add T again should be rejected.
**Validates: Requirements 15.4**

### Data Persistence Properties

**Property 53: Success shown after Firestore write**
_For any_ medicine creation, the success message or navigation should only occur after the Firestore write completes successfully.
**Validates: Requirements 16.1**

**Property 54: Medicine and schedule written atomically**
_For any_ medicine creation with a schedule, either both the medicine and schedule documents should exist in Firestore, or neither should exist.
**Validates: Requirements 16.3**

## Error Handling

### Client-Side Error Handling

**Form Validation Errors:**

- Display inline error messages for each invalid field
- Prevent form submission until all validations pass
- Clear error messages when user corrects the input

**Network Errors:**

- Display user-friendly error messages for network failures
- Implement retry logic with exponential backoff
- Queue writes when offline and sync when connection restored
- Show sync status indicator in UI

**Authorization Errors:**

- Display clear messages when user lacks permission
- Redirect to appropriate screen if pairing is broken
- Log authorization failures for debugging

### Server-Side Error Handling

**Cloud Function Errors:**

- Implement try-catch blocks around all Firestore operations
- Log errors with context (medicineId, scheduleId, userId)
- Retry transient failures (network, timeout)
- Alert on persistent failures

**Batch Write Errors:**

- Retry failed batches up to 3 times
- Log batch failures with dose count and error details
- Continue processing remaining batches if one fails

**Data Validation Errors:**

- Validate all inputs before processing
- Return descriptive error messages
- Log validation failures for monitoring

### Edge Cases

**Empty States:**

- Display helpful messages when no medicines exist
- Provide clear call-to-action to add first medicine
- Handle empty schedule times gracefully

**Boundary Conditions:**

- Enforce maximum 10 times per schedule
- Handle schedules with all days selected
- Handle schedules with single day selected
- Validate time format strictly (HH:MM)

**Concurrent Modifications:**

- Use Firestore transactions for critical updates
- Handle optimistic locking conflicts
- Refresh UI data after conflicts resolved

**Timezone Handling:**

- Store all times in user's local timezone
- Convert to UTC for Firestore timestamps
- Display times in user's local timezone

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:

- Specific examples of medicine creation, update, deletion
- Edge cases (empty times array, maximum times, boundary days)
- Error conditions (network failures, authorization failures)
- UI component rendering and interactions
- Integration between services and Firestore

**Property-Based Tests** focus on:

- Universal properties that hold for all valid inputs
- Data validation across random inputs
- Authorization rules across various user/medicine combinations
- Dose generation correctness across random schedules
- UI filtering and sorting across random data sets

Together, these approaches provide comprehensive coverage: unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library:** fast-check (JavaScript property-based testing library)

**Configuration:**

- Minimum 100 iterations per property test
- Each test tagged with: **Feature: phase-3-medicine-management, Property N: [property text]**
- Use custom generators for domain objects (Medicine, Schedule, Dose)
- Seed random generator for reproducibility

**Custom Generators Needed:**

- Medicine generator (valid and invalid variants)
- Schedule generator (various patterns and times)
- User/pairing generator (linked and unlinked variants)
- Time generator (valid HH:MM format)
- Date generator (for dose scheduling)

### Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── medicineService.test.js
│   │   ├── scheduleService.test.js
│   │   └── doseService.test.js
│   ├── components/
│   │   ├── MedicineForm.test.js
│   │   ├── MedicineList.test.js
│   │   ├── ParentMedicineView.test.js
│   │   └── UpcomingDoses.test.js
│   └── functions/
│       └── generateDoses.test.js
├── property/
│   ├── medicineProperties.test.js
│   ├── scheduleProperties.test.js
│   ├── doseGenerationProperties.test.js
│   ├── authorizationProperties.test.js
│   └── uiProperties.test.js
└── integration/
    ├── medicineFlow.test.js
    └── doseGenerationFlow.test.js
```

### Key Test Scenarios

**Medicine Management:**

- Create medicine with valid data
- Create medicine with missing required fields (should fail)
- Update medicine preserves createdAt
- Delete medicine cascades to schedules and future doses
- Toggle medicine status affects dose generation

**Schedule Management:**

- Create daily schedule generates 7 days of doses
- Create specific_days schedule generates only selected days
- Multiple times per day creates multiple doses per day
- Maximum 10 times enforced
- Invalid time format rejected

**Authorization:**

- Linked caregiver can create/update/delete medicines
- Unlinked caregiver cannot access medicines
- Parent can read but not write medicines
- Security rules enforced at Firestore level

**Dose Generation:**

- Doses created for next 7 days
- Doses match schedule times and pattern
- No duplicate doses created
- Inactive medicines don't generate doses
- Batch writes handle large dose counts

**UI Behavior:**

- Caregiver sees all medicines for parent
- Parent sees only active medicines
- Upcoming doses filtered to next 24 hours
- Doses sorted by time
- Form validation prevents invalid submissions
