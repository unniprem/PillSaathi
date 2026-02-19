# Requirements Document: Phase 4 - Reminders & Dose Tracking

## Introduction

Phase 4 implements the core reminder and dose tracking functionality for the PillSathi medicine reminder system. This phase enables parents to receive timely alarms for scheduled doses, mark doses as taken, and allows caregivers to monitor adherence in real-time. The system must ensure alarm reliability even when the app is closed, survive device restarts, and handle timezone changes gracefully.

## Glossary

- **Parent**: An elderly user who takes medicines and receives dose reminders
- **Caregiver**: A family member who manages medicines and monitors adherence for parents
- **Medicine**: A medication with associated schedule information
- **Schedule**: A set of times when a medicine should be taken (e.g., 8:00 AM, 2:00 PM, 8:00 PM)
- **Dose**: A single instance of a scheduled medicine at a specific time
- **Alarm**: A local notification that alerts the parent to take a dose
- **Alarm_Scheduler**: The system component that schedules local alarms using Notifee
- **Dose_Tracker**: The system component that manages dose status and history
- **Notifee**: The local notification library used for reliable alarm delivery
- **Full_Screen_Alarm**: An intrusive notification that displays over other apps
- **Dose_Status**: The state of a dose (scheduled, taken, missed, skipped)
- **Dose_History**: A chronological record of all doses with their statuses and timestamps
- **Real_Time_Sync**: Immediate propagation of dose status changes via Firestore
- **Offline_Mode**: Operation when the device has no internet connectivity

## Requirements

### Requirement 1: Alarm Scheduling

**User Story:** As a caregiver, I want alarms to be automatically scheduled when I create or update medicines, so that parents receive timely reminders without manual intervention.

#### Acceptance Criteria

1. WHEN a caregiver creates a medicine with a schedule, THE Alarm_Scheduler SHALL create local alarms for all scheduled times
2. WHEN a caregiver updates a medicine schedule, THE Alarm_Scheduler SHALL cancel existing alarms and create new alarms reflecting the updated times
3. WHEN a caregiver deletes a medicine, THE Alarm_Scheduler SHALL cancel all associated alarms
4. WHEN a caregiver deactivates a medicine, THE Alarm_Scheduler SHALL cancel all associated alarms
5. WHEN a caregiver reactivates a medicine, THE Alarm_Scheduler SHALL recreate alarms for all scheduled times
6. THE Alarm_Scheduler SHALL schedule alarms for the next 7 days to ensure continuity
7. WHEN the app launches, THE Alarm_Scheduler SHALL verify and reschedule any missing alarms
8. THE Alarm_Scheduler SHALL store alarm identifiers with dose records for cancellation and updates

### Requirement 2: Alarm Delivery and Reliability

**User Story:** As a parent, I want to receive reliable alarms at scheduled times even when the app is closed, so that I never miss a dose.

#### Acceptance Criteria

1. WHEN a scheduled dose time arrives, THE Alarm_Scheduler SHALL trigger a full-screen alarm notification
2. THE Full_Screen_Alarm SHALL display even when the device is locked
3. THE Full_Screen_Alarm SHALL display even when the app is closed or in background
4. WHEN the device restarts, THE Alarm_Scheduler SHALL restore all scheduled alarms
5. WHEN the device timezone changes, THE Alarm_Scheduler SHALL adjust alarm times to maintain correct local times
6. THE Alarm_Scheduler SHALL function without internet connectivity
7. WHEN battery optimization is enabled, THE Alarm_Scheduler SHALL request exemption to ensure alarm delivery
8. THE Full_Screen_Alarm SHALL remain visible until the parent interacts with it

### Requirement 3: Alarm User Interface

**User Story:** As a parent, I want a clear and simple alarm screen, so that I can quickly understand which medicine to take and mark it as taken.

#### Acceptance Criteria

1. WHEN an alarm triggers, THE Full_Screen_Alarm SHALL display the medicine name prominently
2. WHEN an alarm triggers, THE Full_Screen_Alarm SHALL display the scheduled dose time
3. WHEN an alarm triggers, THE Full_Screen_Alarm SHALL display dosage information
4. WHEN an alarm triggers, THE Full_Screen_Alarm SHALL display special instructions if present
5. THE Full_Screen_Alarm SHALL provide a large "Taken" button for easy interaction
6. THE Full_Screen_Alarm SHALL provide a "Snooze" button to delay the alarm by 10 minutes
7. THE Full_Screen_Alarm SHALL provide a "Skip" button to mark the dose as intentionally skipped
8. THE Full_Screen_Alarm SHALL use high contrast colors and large fonts for elderly users
9. WHEN the parent dismisses the alarm without action, THE Dose_Tracker SHALL maintain the dose status as scheduled

### Requirement 4: Dose Tracking and Status Management

**User Story:** As a parent, I want to mark doses as taken from the alarm screen, so that my caregivers know I've taken my medicine.

#### Acceptance Criteria

1. WHEN a parent taps "Taken", THE Dose_Tracker SHALL update the dose status to "taken" with the current timestamp
2. WHEN a parent taps "Skip", THE Dose_Tracker SHALL update the dose status to "skipped" with the current timestamp
3. WHEN a parent taps "Snooze", THE Alarm_Scheduler SHALL reschedule the alarm for 10 minutes later
4. WHEN a dose is marked as taken, THE Dose_Tracker SHALL record the actual time taken
5. WHEN a dose remains unmarked 30 minutes after scheduled time, THE Dose_Tracker SHALL update the status to "missed"
6. THE Dose_Tracker SHALL create a dose record in Firestore when a dose is marked as taken or skipped
7. THE Dose_Tracker SHALL support marking doses as taken from the parent medicine detail screen
8. WHEN a dose is marked taken offline, THE Dose_Tracker SHALL sync the status when connectivity is restored

### Requirement 5: Real-Time Status Updates

**User Story:** As a caregiver, I want to see dose status updates immediately, so that I know when my parent has taken their medicine.

#### Acceptance Criteria

1. WHEN a parent marks a dose as taken, THE Real_Time_Sync SHALL propagate the update to all caregiver devices within 2 seconds
2. WHEN a parent marks a dose as skipped, THE Real_Time_Sync SHALL propagate the update to all caregiver devices within 2 seconds
3. WHEN a dose status changes, THE Real_Time_Sync SHALL update the caregiver's medicine list view
4. WHEN a dose status changes, THE Real_Time_Sync SHALL update the caregiver's dose history view
5. THE Real_Time_Sync SHALL use Firestore real-time listeners for immediate updates
6. WHEN multiple caregivers are linked to a parent, THE Real_Time_Sync SHALL notify all caregivers simultaneously

### Requirement 6: Dose History and Adherence Tracking

**User Story:** As a caregiver, I want to view dose history for each medicine, so that I can monitor adherence patterns and identify issues.

#### Acceptance Criteria

1. THE Dose_History SHALL display all doses for a medicine in reverse chronological order
2. WHEN displaying a dose, THE Dose_History SHALL show the scheduled time
3. WHEN displaying a dose, THE Dose_History SHALL show the actual time taken if marked as taken
4. WHEN displaying a dose, THE Dose_History SHALL show the dose status with clear visual indicators
5. THE Dose_History SHALL support filtering by date range
6. THE Dose_History SHALL support filtering by status (taken, missed, skipped)
7. THE Dose_History SHALL calculate and display adherence percentage for the selected period
8. THE Dose_History SHALL load efficiently for medicines with long histories (pagination or lazy loading)

### Requirement 7: Parent Dose View

**User Story:** As a parent, I want to see my upcoming doses and mark past doses as taken, so that I can manage my medicine schedule.

#### Acceptance Criteria

1. THE Parent_Medicine_Detail_Screen SHALL display today's scheduled doses for a medicine
2. WHEN displaying a scheduled dose, THE Parent_Medicine_Detail_Screen SHALL show the scheduled time and status
3. WHEN a dose is scheduled but not yet due, THE Parent_Medicine_Detail_Screen SHALL display it as "upcoming"
4. WHEN a dose is overdue, THE Parent_Medicine_Detail_Screen SHALL display it with a warning indicator
5. THE Parent_Medicine_Detail_Screen SHALL allow marking past doses as taken with a timestamp
6. THE Parent_Medicine_Detail_Screen SHALL prevent marking future doses as taken
7. THE Parent_Medicine_Detail_Screen SHALL display the most recent dose status prominently

### Requirement 8: Offline Support

**User Story:** As a parent, I want alarms to work without internet, so that I receive reminders even when connectivity is unavailable.

#### Acceptance Criteria

1. THE Alarm_Scheduler SHALL schedule and trigger alarms without requiring internet connectivity
2. WHEN a parent marks a dose as taken offline, THE Dose_Tracker SHALL store the action locally
3. WHEN connectivity is restored, THE Dose_Tracker SHALL sync all offline actions to Firestore
4. WHEN syncing offline actions, THE Dose_Tracker SHALL preserve the original timestamps
5. WHEN conflicts occur during sync, THE Dose_Tracker SHALL use the parent's action as authoritative
6. THE Offline_Mode SHALL display a connectivity indicator to inform the parent of sync status

### Requirement 9: Alarm Management and Debugging

**User Story:** As a developer, I want comprehensive alarm management tools, so that I can debug issues and ensure alarm reliability.

#### Acceptance Criteria

1. THE Alarm_Scheduler SHALL log all alarm scheduling operations with timestamps
2. THE Alarm_Scheduler SHALL log all alarm trigger events with timestamps
3. THE Alarm_Scheduler SHALL provide a method to list all currently scheduled alarms
4. THE Alarm_Scheduler SHALL provide a method to verify alarm integrity on app launch
5. WHEN alarm scheduling fails, THE Alarm_Scheduler SHALL log the error and attempt retry
6. THE Alarm_Scheduler SHALL track alarm delivery success rate for monitoring
7. THE Alarm_Scheduler SHALL provide a method to manually reschedule all alarms for testing

### Requirement 10: Data Model and Storage

**User Story:** As a developer, I want a clear data model for doses, so that the system can efficiently track and query dose information.

#### Acceptance Criteria

1. THE Dose_Tracker SHALL store dose records in a Firestore "doses" collection
2. WHEN creating a dose record, THE Dose_Tracker SHALL include medicineId, parentId, scheduledTime, status, and timestamps
3. THE Dose_Tracker SHALL index doses by parentId and scheduledTime for efficient queries
4. THE Dose_Tracker SHALL index doses by medicineId and scheduledTime for history queries
5. THE Dose_Tracker SHALL store alarm identifiers with dose records for cross-reference
6. WHEN a dose is taken, THE Dose_Tracker SHALL store the actualTimeTaken timestamp
7. THE Dose_Tracker SHALL support querying doses by date range and status
8. THE Dose_Tracker SHALL implement efficient pagination for large dose histories

## Special Considerations

### Parser and Serializer Requirements

This feature does not require custom parsers or serializers beyond standard JSON serialization provided by Firestore and React Native.

### Timezone Handling

All dose times must be stored in UTC in Firestore and converted to local time for display and alarm scheduling. The Alarm_Scheduler must handle timezone changes by detecting system timezone changes and rescheduling alarms accordingly.

### Battery Optimization

On Android, aggressive battery optimization can kill background alarms. The app must request battery optimization exemption and guide users through the settings if needed.

### Alarm Limits

Some Android devices limit the number of scheduled alarms. The Alarm_Scheduler must schedule alarms for a rolling 7-day window and refresh them periodically to stay within limits.
