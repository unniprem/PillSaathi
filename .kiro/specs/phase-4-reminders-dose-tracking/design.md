# Design Document: Phase 4 - Reminders & Dose Tracking

## Overview

Phase 4 implements the alarm scheduling and dose tracking system for PillSathi. The design focuses on reliability, offline support, and real-time synchronization. The system uses Notifee for local alarm scheduling to ensure alarms work even when the app is closed or the device is offline. Dose status updates are synchronized in real-time via Firestore listeners, allowing caregivers to monitor adherence immediately.

### Key Design Principles

1. **Alarm Reliability**: Alarms must work offline, survive app closure, and persist through device restarts
2. **Local-First**: All alarm scheduling happens locally using Notifee, not dependent on cloud services
3. **Real-Time Sync**: Dose status changes propagate immediately to all connected devices via Firestore
4. **Offline Support**: Parents can mark doses as taken offline, with automatic sync when connectivity returns
5. **Simplicity**: Minimal UI for elderly users with large touch targets and clear visual feedback

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Alarm Scheduler │◄────────┤ Medicine Service │          │
│  │    (Notifee)     │         │                  │          │
│  └────────┬─────────┘         └──────────────────┘          │
│           │                                                   │
│           │ triggers                                          │
│           ▼                                                   │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Full Screen     │         │  Dose Tracker    │          │
│  │  Alarm UI        │────────►│   Service        │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                         │                     │
│                                         │ sync                │
│                                         ▼                     │
│                               ┌──────────────────┐           │
│                               │   Firestore      │           │
│                               │   (doses)        │           │
│                               └────────┬─────────┘           │
│                                        │                      │
│                                        │ real-time            │
│                                        ▼                      │
│                               ┌──────────────────┐           │
│                               │  Caregiver UI    │           │
│                               │  (listeners)     │           │
│                               └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Alarm Scheduling Flow**:

   - Caregiver creates/updates medicine → Medicine Service calls Alarm Scheduler
   - Alarm Scheduler generates alarm IDs and schedules with Notifee
   - Alarm IDs stored in local storage for reference
   - Alarms scheduled for next 7 days (rolling window)

2. **Alarm Trigger Flow**:

   - Notifee triggers alarm at scheduled time
   - Full-screen alarm UI displays with medicine details
   - Parent interacts (Taken/Skip/Snooze)
   - Dose Tracker updates Firestore with status

3. **Real-Time Sync Flow**:

   - Dose status changes in Firestore
   - Firestore listeners notify all connected caregiver devices
   - UI updates immediately with new status

4. **Offline Flow**:
   - Parent marks dose as taken while offline
   - Dose Tracker stores action in local queue
   - When connectivity returns, queue is processed
   - Firestore updated with original timestamps preserved

## Components and Interfaces

### 1. AlarmSchedulerService

Manages local alarm scheduling using Notifee.

```javascript
class AlarmSchedulerService {
  /**
   * Schedule alarms for a medicine
   * Creates alarms for next 7 days based on schedule
   *
   * @param {string} medicineId - Medicine ID
   * @param {Object} medicine - Medicine data
   * @param {Object} schedule - Schedule data with times and repeat pattern
   * @returns {Promise<Array<string>>} Array of alarm IDs
   */
  async scheduleMedicineAlarms(medicineId, medicine, schedule);

  /**
   * Cancel all alarms for a medicine
   *
   * @param {string} medicineId - Medicine ID
   * @returns {Promise<void>}
   */
  async cancelMedicineAlarms(medicineId);

  /**
   * Reschedule alarms for a medicine
   * Cancels existing and creates new alarms
   *
   * @param {string} medicineId - Medicine ID
   * @param {Object} medicine - Medicine data
   * @param {Object} schedule - Updated schedule data
   * @returns {Promise<Array<string>>} Array of new alarm IDs
   */
  async rescheduleMedicineAlarms(medicineId, medicine, schedule);

  /**
   * Verify and restore alarms on app launch
   * Checks for missing alarms and reschedules if needed
   *
   * @param {string} parentId - Parent ID
   * @returns {Promise<number>} Number of alarms restored
   */
  async verifyAndRestoreAlarms(parentId);

  /**
   * Handle timezone change
   * Reschedules all alarms with new timezone
   *
   * @param {string} parentId - Parent ID
   * @returns {Promise<void>}
   */
  async handleTimezoneChange(parentId);

  /**
   * Request battery optimization exemption
   * Guides user to system settings if needed
   *
   * @returns {Promise<boolean>} True if exemption granted
   */
  async requestBatteryOptimizationExemption();

  /**
   * Get all scheduled alarms for debugging
   *
   * @returns {Promise<Array<Object>>} Array of alarm objects
   */
  async getAllScheduledAlarms();
}
```

### 2. DoseTrackerService

Manages dose status and history.

```javascript
class DoseTrackerService {
  /**
   * Mark dose as taken
   * Updates Firestore and handles offline queue
   *
   * @param {string} doseId - Dose ID
   * @param {Date} takenAt - Time dose was taken (defaults to now)
   * @returns {Promise<void>}
   */
  async markDoseAsTaken(doseId, takenAt = new Date());

  /**
   * Mark dose as skipped
   *
   * @param {string} doseId - Dose ID
   * @param {string} reason - Optional reason for skipping
   * @returns {Promise<void>}
   */
  async markDoseAsSkipped(doseId, reason = null);

  /**
   * Snooze dose alarm
   * Reschedules alarm for 10 minutes later
   *
   * @param {string} doseId - Dose ID
   * @param {string} medicineId - Medicine ID
   * @returns {Promise<void>}
   */
  async snoozeDose(doseId, medicineId);

  /**
   * Get dose history for a medicine
   *
   * @param {string} medicineId - Medicine ID
   * @param {Date} startDate - Start date for history
   * @param {Date} endDate - End date for history
   * @param {Array<string>} statusFilter - Optional status filter
   * @returns {Promise<Array<Object>>} Array of dose records
   */
  async getDoseHistory(medicineId, startDate, endDate, statusFilter = null);

  /**
   * Calculate adherence percentage
   *
   * @param {string} medicineId - Medicine ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Adherence percentage (0-100)
   */
  async calculateAdherence(medicineId, startDate, endDate);

  /**
   * Sync offline actions
   * Processes queued actions when connectivity returns
   *
   * @returns {Promise<number>} Number of actions synced
   */
  async syncOfflineActions();

  /**
   * Get today's doses for a medicine
   *
   * @param {string} medicineId - Medicine ID
   * @param {string} parentId - Parent ID
   * @returns {Promise<Array<Object>>} Array of today's doses
   */
  async getTodaysDoses(medicineId, parentId);
}
```

### 3. FullScreenAlarmScreen

React Native screen component for alarm UI.

```javascript
const FullScreenAlarmScreen = ({ route }) => {
  const {
    doseId,
    medicineId,
    medicineName,
    dosageAmount,
    dosageUnit,
    scheduledTime,
    instructions,
  } = route.params;

  const handleTaken = async () => {
    await DoseTrackerService.markDoseAsTaken(doseId);
    // Dismiss alarm and navigate back
  };

  const handleSkip = async () => {
    await DoseTrackerService.markDoseAsSkipped(doseId);
    // Dismiss alarm and navigate back
  };

  const handleSnooze = async () => {
    await DoseTrackerService.snoozeDose(doseId, medicineId);
    // Dismiss alarm temporarily
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{medicineName}</Text>
      <Text style={styles.dosage}>
        {dosageAmount} {dosageUnit}
      </Text>
      <Text style={styles.time}>{formatTime(scheduledTime)}</Text>
      {instructions && <Text style={styles.instructions}>{instructions}</Text>}

      <TouchableOpacity style={styles.takenButton} onPress={handleTaken}>
        <Text style={styles.takenButtonText}>Taken</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.snoozeButton} onPress={handleSnooze}>
        <Text style={styles.snoozeButtonText}>Snooze (10 min)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 4. Integration with Existing Services

The alarm system integrates with existing services:

```javascript
// In MedicineService.createMedicine()
async createMedicine(data, options = {}) {
  // ... existing code ...

  // After medicine and schedule created
  if (scheduleData && medicine.status === 'active') {
    await AlarmSchedulerService.scheduleMedicineAlarms(
      medicineId,
      medicineData,
      scheduleData
    );
  }

  return medicineId;
}

// In MedicineService.updateMedicine()
async updateMedicine(medicineId, data, caregiverId) {
  // ... existing code ...

  // If schedule changed, reschedule alarms
  if (scheduleChanged && medicine.status === 'active') {
    await AlarmSchedulerService.rescheduleMedicineAlarms(
      medicineId,
      updatedMedicine,
      updatedSchedule
    );
  }
}

// In MedicineService.deleteMedicine()
async deleteMedicine(medicineId, caregiverId) {
  // Cancel alarms before deleting
  await AlarmSchedulerService.cancelMedicineAlarms(medicineId);

  // ... existing deletion code ...
}
```

## Data Models

### Dose Document (Firestore)

```javascript
{
  id: string,                    // Auto-generated document ID
  medicineId: string,            // Reference to medicine
  scheduleId: string,            // Reference to schedule
  parentId: string,              // Parent user ID
  medicineName: string,          // Denormalized for display
  dosageAmount: number,          // Denormalized for display
  dosageUnit: string,            // Denormalized for display
  scheduledTime: Timestamp,      // When dose should be taken (UTC)
  status: string,                // 'scheduled', 'taken', 'missed', 'skipped'
  takenAt: Timestamp | null,     // When dose was actually taken
  skippedReason: string | null,  // Optional reason for skipping
  alarmId: string | null,        // Notifee alarm ID for reference
  createdAt: Timestamp,          // When dose record was created
  updatedAt: Timestamp,          // Last update time
}
```

### Alarm Metadata (AsyncStorage)

```javascript
{
  medicineId: string,
  alarmIds: Array<{
    alarmId: string,             // Notifee alarm ID
    scheduledTime: Date,         // When alarm will trigger
    doseId: string | null,       // Associated dose ID if exists
  }>,
  lastScheduled: Date,           // When alarms were last scheduled
  scheduleVersion: number,       // Increment on schedule changes
}
```

### Offline Action Queue (AsyncStorage)

```javascript
{
  actions: Array<{
    id: string,                  // Unique action ID
    type: string,                // 'mark_taken', 'mark_skipped', 'snooze'
    doseId: string,              // Dose ID
    timestamp: Date,             // When action occurred
    data: Object,                // Action-specific data
    retryCount: number,          // Number of sync attempts
  }>,
}
```

### Firestore Indexes

Required composite indexes:

```
Collection: doses
- parentId (ASC) + scheduledTime (ASC)
- parentId (ASC) + scheduledTime (DESC)
- medicineId (ASC) + scheduledTime (ASC)
- medicineId (ASC) + scheduledTime (DESC)
- medicineId (ASC) + status (ASC) + scheduledTime (ASC)
- scheduleId (ASC) + scheduledTime (ASC)
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **Alarm data structure properties (3.1-3.4)** can be combined into a single comprehensive property about alarm notification data completeness
2. **Dose status update properties (4.1, 4.2, 4.4)** overlap significantly and can be consolidated into properties about state transitions
3. **Dose history data properties (6.2, 6.3, 7.2)** are redundant with dose record structure properties (10.2, 10.6)
4. **Query filtering properties (6.5, 6.6, 10.7)** can be combined into comprehensive query correctness properties
5. **Offline sync properties (8.2, 8.3, 8.4)** can be consolidated into a round-trip property

The following properties represent the unique, non-redundant correctness guarantees for this system.

### Alarm Scheduling Properties

**Property 1: Alarm creation completeness**
_For any_ medicine with an active status and a valid schedule, scheduling alarms should create exactly one alarm for each scheduled time within the next 7 days.
**Validates: Requirements 1.1, 1.6**

**Property 2: Alarm cancellation completeness**
_For any_ medicine with scheduled alarms, deleting or deactivating the medicine should result in zero remaining alarms for that medicine.
**Validates: Requirements 1.3, 1.4**

**Property 3: Alarm rescheduling consistency**
_For any_ medicine with scheduled alarms, updating the schedule should result in alarms that exactly match the new schedule times (old alarms removed, new alarms created).
**Validates: Requirements 1.2, 1.5**

**Property 4: Alarm metadata persistence**
_For any_ scheduled alarm, there should exist a corresponding alarm ID stored in local storage that can be used to cancel or update the alarm.
**Validates: Requirements 1.8, 10.5**

**Property 5: Alarm recovery on app launch**
_For any_ parent with active medicines, launching the app should result in all expected alarms being scheduled (missing alarms restored).
**Validates: Requirements 1.7**

**Property 6: Timezone adjustment correctness**
_For any_ scheduled alarm, if the device timezone changes, the alarm's local time should remain constant (e.g., 8:00 AM stays 8:00 AM in the new timezone).
**Validates: Requirements 2.5**

**Property 7: Offline alarm scheduling**
_For any_ alarm scheduling operation, no network requests should be made (alarms are purely local).
**Validates: Requirements 2.6, 8.1**

### Alarm Notification Properties

**Property 8: Alarm notification data completeness**
_For any_ triggered alarm, the notification data should include medicine name, dosage amount, dosage unit, scheduled time, and instructions (if present).
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

**Property 9: Snooze time calculation**
_For any_ dose that is snoozed, the new alarm time should be exactly 10 minutes after the snooze action timestamp.
**Validates: Requirements 4.3**

**Property 10: Alarm dismissal preserves status**
_For any_ dose with status "scheduled", dismissing the alarm without taking action should leave the status as "scheduled".
**Validates: Requirements 3.9**

### Dose Tracking Properties

**Property 11: Dose status transition to taken**
_For any_ dose, marking it as taken should result in status="taken", a non-null takenAt timestamp, and the takenAt timestamp should be within 1 second of the action time.
**Validates: Requirements 4.1, 4.4, 10.6**

**Property 12: Dose status transition to skipped**
_For any_ dose, marking it as skipped should result in status="skipped" and a non-null updatedAt timestamp.
**Validates: Requirements 4.2**

**Property 13: Dose record creation in Firestore**
_For any_ dose marked as taken or skipped, a corresponding document should exist in the Firestore "doses" collection with the correct status.
**Validates: Requirements 4.6**

**Property 14: Dose record structure completeness**
_For any_ created dose record, it should include all required fields: medicineId, parentId, scheduledTime, status, createdAt, and updatedAt.
**Validates: Requirements 10.2**

**Property 15: Future dose marking prevention**
_For any_ dose where scheduledTime is in the future, attempting to mark it as taken should be rejected or prevented.
**Validates: Requirements 7.6**

### Offline Sync Properties

**Property 16: Offline action queueing**
_For any_ dose marking action performed while offline, the action should be stored in the local offline queue with the original timestamp.
**Validates: Requirements 8.2**

**Property 17: Offline sync round-trip**
_For any_ offline action in the queue, when connectivity is restored and sync completes, the Firestore record should reflect the action with the original timestamp preserved.
**Validates: Requirements 4.8, 8.3, 8.4**

**Property 18: Conflict resolution authority**
_For any_ dose with conflicting updates during sync, the parent's action should be the final state in Firestore.
**Validates: Requirements 8.5**

### Dose History and Query Properties

**Property 19: Dose history sorting**
_For any_ dose history query result, doses should be ordered by scheduledTime in descending order (most recent first).
**Validates: Requirements 6.1**

**Property 20: Date range query correctness**
_For any_ dose query with a date range filter, all returned doses should have scheduledTime within the specified range (inclusive).
**Validates: Requirements 6.5, 10.7**

**Property 21: Status filter correctness**
_For any_ dose query with a status filter, all returned doses should have the specified status.
**Validates: Requirements 6.6, 10.7**

**Property 22: Today's doses query correctness**
_For any_ medicine and parent, querying today's doses should return only doses where scheduledTime falls within today's date (00:00:00 to 23:59:59 local time).
**Validates: Requirements 7.1**

**Property 23: Adherence calculation correctness**
_For any_ set of doses in a date range, adherence percentage should equal (count of doses with status="taken") / (total count of doses) \* 100.
**Validates: Requirements 6.7**

**Property 24: Dose status display logic**
_For any_ dose, if scheduledTime > current time and status="scheduled", it should be classified as "upcoming"; otherwise, it should use its actual status.
**Validates: Requirements 7.3**

### Logging and Debugging Properties

**Property 25: Alarm scheduling logging**
_For any_ alarm scheduling operation (create, cancel, update), a log entry should be created with a timestamp and operation details.
**Validates: Requirements 9.1**

**Property 26: Alarm trigger logging**
_For any_ alarm that triggers, a log entry should be created with a timestamp and alarm details.
**Validates: Requirements 9.2**

**Property 27: Error retry behavior**
_For any_ alarm scheduling operation that fails, the system should log the error and attempt at least one retry before giving up.
**Validates: Requirements 9.5**

## Error Handling

### Alarm Scheduling Errors

1. **Notifee Permission Denied**

   - Error: User denies notification permissions
   - Handling: Display permission request dialog, guide user to settings if needed
   - Fallback: Store alarm metadata but mark as "permission_required"

2. **Alarm Limit Exceeded**

   - Error: Device limits number of scheduled alarms
   - Handling: Schedule alarms for next 7 days only, refresh on app launch
   - Fallback: Prioritize nearest alarms, warn user if limits reached

3. **Invalid Schedule Data**
   - Error: Schedule has invalid times or repeat patterns
   - Handling: Validate schedule before scheduling alarms
   - Fallback: Log error, notify caregiver of invalid schedule

### Dose Tracking Errors

1. **Firestore Write Failure**

   - Error: Network error or permission denied when updating dose
   - Handling: Queue action in offline queue, retry with exponential backoff
   - Fallback: Store locally, sync when connectivity restored

2. **Dose Not Found**

   - Error: Attempting to update a dose that doesn't exist
   - Handling: Log error, create new dose record if possible
   - Fallback: Notify user that dose record is missing

3. **Concurrent Updates**
   - Error: Multiple devices updating same dose simultaneously
   - Handling: Use Firestore transactions for atomic updates
   - Fallback: Last write wins, parent's action takes precedence

### Offline Sync Errors

1. **Sync Conflict**

   - Error: Offline action conflicts with server state
   - Handling: Apply parent's action as authoritative
   - Fallback: Log conflict for debugging

2. **Partial Sync Failure**

   - Error: Some offline actions sync successfully, others fail
   - Handling: Retry failed actions individually
   - Fallback: Keep failed actions in queue, retry on next sync

3. **Queue Corruption**
   - Error: Offline queue data is corrupted or invalid
   - Handling: Validate queue on load, discard invalid entries
   - Fallback: Log corruption, start fresh queue

### Timezone Errors

1. **Timezone Detection Failure**

   - Error: Cannot detect device timezone
   - Handling: Use UTC as fallback, warn user
   - Fallback: Prompt user to set timezone manually

2. **Timezone Conversion Error**
   - Error: Invalid timezone data during conversion
   - Handling: Log error, use original time without conversion
   - Fallback: Notify user of potential time discrepancy

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for JavaScript/React Native property-based testing.

**Test Configuration**:

- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: phase-4-reminders-dose-tracking, Property N: [property text]`

**Example Property Test Structure**:

```javascript
import fc from 'fast-check';

describe('Alarm Scheduling Properties', () => {
  // Feature: phase-4-reminders-dose-tracking, Property 1: Alarm creation completeness
  it('should create exactly one alarm per scheduled time for 7 days', () => {
    fc.assert(
      fc.property(
        fc.record({
          medicineId: fc.uuid(),
          schedule: fc.record({
            times: fc.array(fc.string(), { minLength: 1, maxLength: 4 }),
            repeatPattern: fc.constantFrom('daily', 'specific_days'),
            selectedDays: fc.array(fc.integer({ min: 0, max: 6 })),
          }),
        }),
        async ({ medicineId, schedule }) => {
          // Schedule alarms
          const alarmIds = await AlarmSchedulerService.scheduleMedicineAlarms(
            medicineId,
            { name: 'Test Med', status: 'active' },
            schedule,
          );

          // Calculate expected alarm count for 7 days
          const expectedCount = calculateExpectedAlarmCount(schedule, 7);

          // Verify alarm count matches expected
          expect(alarmIds.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

### Unit Testing Focus Areas

Unit tests should focus on:

1. **Specific Examples**:

   - Scheduling a medicine with 3 times per day for 7 days (21 alarms)
   - Marking a specific dose as taken at a known time
   - Filtering dose history for last 7 days

2. **Edge Cases**:

   - Empty schedule (no times)
   - Schedule with times at midnight
   - Dose marked taken exactly at scheduled time
   - Offline queue with 100+ actions

3. **Error Conditions**:

   - Notifee permission denied
   - Firestore write failure
   - Invalid timezone data
   - Corrupted offline queue

4. **Integration Points**:
   - Medicine service calling alarm scheduler
   - Alarm trigger opening full-screen UI
   - Firestore listener updating UI

### Test Coverage Goals

- **Alarm Scheduler**: 90%+ coverage of scheduling logic
- **Dose Tracker**: 90%+ coverage of status management
- **Offline Sync**: 85%+ coverage of queue and sync logic
- **Query Functions**: 95%+ coverage of filtering and sorting

### Manual Testing Requirements

Some requirements cannot be automated and require manual device testing:

1. **Alarm Reliability**:

   - Alarms trigger when app is closed
   - Alarms trigger when device is locked
   - Alarms survive device restart
   - Alarms work after 24+ hours

2. **UI/UX**:

   - Full-screen alarm is visible and intrusive
   - Buttons are large enough for elderly users
   - High contrast colors are readable
   - UI responds quickly to interactions

3. **Platform-Specific**:

   - Battery optimization exemption request
   - Notification permissions flow
   - Timezone change handling on real device

4. **Performance**:
   - Dose history loads quickly with 1000+ doses
   - Alarm scheduling completes in < 2 seconds
   - Offline sync processes 50+ actions in < 5 seconds

### Testing Timeline

- **Unit Tests**: Written alongside implementation (each task)
- **Property Tests**: Written after core implementation (checkpoint tasks)
- **Integration Tests**: Written after all components integrated
- **Manual Tests**: Performed during final testing phase (24-48 hour alarm reliability test)
