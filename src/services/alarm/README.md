# Alarm Infrastructure

This directory contains the core alarm infrastructure for the PillSathi medicine reminder system.

## Components

### 1. notificationConfig.js

Handles Notifee setup, channel configuration, and permission management.

**Key Features:**

- Creates Android notification channel with high importance
- Requests notification permissions (iOS and Android)
- Configures full-screen notification capabilities
- Manages battery optimization exemption (Android)
- Provides methods to display and cancel notifications

**Usage:**

```javascript
import notificationConfig from './services/notificationConfig';

// Initialize (called automatically in App.js)
await notificationConfig.initialize();

// Display a full-screen alarm
await notificationConfig.displayFullScreenNotification({
  id: 'alarm-1',
  title: 'Take Medicine',
  body: 'Aspirin 100mg',
  data: { medicineId: 'med-1' },
});

// Cancel a notification
await notificationConfig.cancelNotification('alarm-1');
```

### 2. alarmStorage.js

Manages alarm metadata persistence using AsyncStorage.

**Key Features:**

- Stores alarm IDs with medicine references
- Tracks schedule versions for updates
- Maintains list of all medicines with alarms
- Provides CRUD operations for alarm metadata

**Data Structure:**

```javascript
{
  medicineId: 'med-1',
  alarmIds: [
    {
      alarmId: 'alarm-1',
      scheduledTime: Date,
      doseId: 'dose-1'
    }
  ],
  lastScheduled: Date,
  scheduleVersion: 1
}
```

**Usage:**

```javascript
import alarmStorage from './services/alarmStorage';

// Store alarm metadata
await alarmStorage.storeAlarmMetadata('med-1', {
  alarmIds: [...],
  lastScheduled: new Date(),
  scheduleVersion: 1
});

// Retrieve alarm metadata
const metadata = await alarmStorage.getAlarmMetadata('med-1');

// Delete alarm metadata
await alarmStorage.deleteAlarmMetadata('med-1');
```

### 3. alarmInitializer.js

Handles app startup initialization for the alarm system.

**Key Features:**

- Initializes notification configuration on app launch
- Requests battery optimization exemption (Android)
- Ensures single initialization
- Provides initialization status

**Usage:**

```javascript
import alarmInitializer from './services/alarmInitializer';

// Initialize (called automatically in App.js)
await alarmInitializer.initialize();

// Check initialization status
const isInitialized = alarmInitializer.getInitializationStatus();
```

## Platform Configuration

### Android

The following permissions are configured in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_HEALTH" />
```

The MainActivity is configured with:

- `android:showWhenLocked="true"` - Show alarm when device is locked
- `android:turnScreenOn="true"` - Turn screen on for alarms

### iOS

iOS notification permissions are requested at runtime. No additional Info.plist configuration is required beyond what Notifee provides.

## Integration

The alarm infrastructure is automatically initialized in `App.js`:

```javascript
import alarmInitializer from './src/services/alarmInitializer';

useEffect(() => {
  const initializeApp = async () => {
    // ... other initialization
    await alarmInitializer.initialize();
  };
  initializeApp();
}, []);
```

## Testing

Comprehensive tests are available in `src/services/__tests__/alarmInfrastructure.test.js`.

Run tests:

```bash
npm test -- src/services/__tests__/alarmInfrastructure.test.js
```

## Next Steps

The alarm infrastructure is now ready for use by:

1. AlarmSchedulerService (Task 2) - Will use this infrastructure to schedule alarms
2. DoseTrackerService (Task 6) - Will use this infrastructure to handle alarm interactions
3. FullScreenAlarmScreen (Task 10) - Will display when alarms trigger

## Requirements Validated

This implementation satisfies the following requirements:

- **Requirement 2.1**: Full-screen alarm notifications
- **Requirement 2.2**: Alarms display when device is locked
- **Requirement 2.3**: Alarms display when app is closed
- **Requirement 2.7**: Battery optimization exemption for alarm reliability
