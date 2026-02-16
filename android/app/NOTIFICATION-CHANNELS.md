# Notification Channels Configuration

This document describes the notification channels configured for PillSathi using Notifee.

## Overview

Notification channels are required for Android 8.0 (API level 26) and above. They allow users to control notification behavior for different types of notifications.

## Configured Channels

### 1. Medication Reminders

- **Channel ID**: `medication_reminders`
- **Name**: Medication Reminders
- **Importance**: HIGH
- **Description**: Notifications for medication reminders and alerts
- **Features**:
  - Vibration enabled
  - LED lights enabled
  - Badge enabled
  - Makes sound
  - Appears as heads-up notification

**Use Case**: Time-sensitive medication reminders that require immediate user attention.

### 2. General Notifications

- **Channel ID**: `general`
- **Name**: General Notifications
- **Importance**: DEFAULT
- **Description**: General app notifications and updates
- **Features**:
  - Vibration enabled
  - Badge enabled
  - Makes sound
  - Does not appear as heads-up notification

**Use Case**: Non-urgent app updates, tips, and general information.

### 3. Urgent Alerts

- **Channel ID**: `alerts`
- **Name**: Urgent Alerts
- **Importance**: HIGH
- **Description**: Critical alerts and urgent notifications
- **Features**:
  - Vibration enabled
  - LED lights enabled
  - Badge enabled
  - Makes sound
  - Appears as heads-up notification

**Use Case**: Critical alerts such as missed medications, caregiver alerts, or emergency notifications.

## Implementation

Channels are created in `MainApplication.kt` during app initialization. The `createNotificationChannels()` method is called in the `onCreate()` lifecycle method.

## Usage in JavaScript/TypeScript

To use these channels with Notifee, specify the channel ID when creating a notification:

```javascript
import notifee from '@notifee/react-native';

// Medication reminder notification
await notifee.displayNotification({
  title: 'Time to take your medication',
  body: 'Aspirin - 1 tablet',
  android: {
    channelId: 'medication_reminders',
    smallIcon: 'ic_launcher',
    pressAction: {
      id: 'default',
    },
  },
});

// General notification
await notifee.displayNotification({
  title: 'Tip of the day',
  body: 'Remember to stay hydrated!',
  android: {
    channelId: 'general',
    smallIcon: 'ic_launcher',
  },
});

// Urgent alert
await notifee.displayNotification({
  title: 'Missed Medication Alert',
  body: 'You missed your 2 PM medication',
  android: {
    channelId: 'alerts',
    smallIcon: 'ic_launcher',
    pressAction: {
      id: 'default',
    },
  },
});
```

## User Control

Users can customize notification behavior for each channel by:

1. Long-pressing on a notification
2. Tapping the settings icon
3. Or going to: Settings > Apps > PillSathi > Notifications

From there, users can:

- Turn channels on/off
- Change importance level
- Disable sound
- Disable vibration
- Disable LED lights
- Disable badges

## Testing

To verify channels are created:

1. Build and run the app on Android 8.0+
2. Go to: Settings > Apps > PillSathi > Notifications
3. Verify all three channels appear:
   - Medication Reminders
   - General Notifications
   - Urgent Alerts

## Notes

- Channels are created only once when the app first launches
- Modifying channel properties in code after creation will not affect existing channels
- To change channel properties, you must either:
  - Uninstall and reinstall the app
  - Change the channel ID
  - Or have users manually adjust settings

## References

- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [Notifee Documentation](https://notifee.app/react-native/docs/android/channels)
