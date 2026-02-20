/**
 * Notification Configuration Service
 * Handles Notifee setup, channel configuration, and permission management
 */

import notifee, {
  AndroidImportance,
  AndroidCategory,
  AuthorizationStatus,
} from '@notifee/react-native';
import { Platform, Linking, Alert } from 'react-native';

class NotificationConfigService {
  constructor() {
    this.channelId = 'medicine-alarms';
    this.initialized = false;
  }

  /**
   * Initialize notification system
   * Sets up Android channel and requests permissions
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      // Create Android notification channel
      if (Platform.OS === 'android') {
        await this.createAlarmChannel();
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();

      this.initialized = true;
      return hasPermission;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Create Android notification channel for medicine alarms
   * Configures high importance, full-screen intent, and sound
   */
  async createAlarmChannel() {
    try {
      await notifee.createChannel({
        id: this.channelId,
        name: 'Medicine Alarms',
        description: 'Reminders for scheduled medicine doses',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        lights: true,
        lightColor: '#FF0000',
        badge: true,
        bypassDnd: true, // Bypass Do Not Disturb
      });

      console.log('Alarm channel created successfully');
      return true;
    } catch (error) {
      console.error('Failed to create alarm channel:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   * Handles both iOS and Android permission flows
   * Requirements: 2.7 - Request notification permissions on first use
   * Requirements: 2.7 - Handle permission denial gracefully
   */
  async requestPermissions() {
    try {
      const settings = await notifee.requestPermission();

      if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
        console.log('Notification permissions granted');
        return true;
      }

      if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
        console.warn('Notification permissions denied');
        // Requirements: 2.7 - Guide user to settings if permissions denied
        this.showPermissionDeniedAlert();
        return false;
      }

      // Provisional or not determined
      console.warn(
        'Notification permissions not fully granted:',
        settings.authorizationStatus,
      );
      return false;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      // Handle permission request failure gracefully
      this.showPermissionErrorAlert(error);
      return false;
    }
  }

  /**
   * Check current permission status
   */
  async checkPermissions() {
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  }

  /**
   * Show alert when permissions are denied
   * Guides user to settings to enable permissions
   * Requirements: 2.7 - Guide user to settings if permissions denied
   */
  showPermissionDeniedAlert() {
    Alert.alert(
      'Notification Permission Required',
      'PillSaathi needs notification permissions to remind you about your medicines. Please enable notifications in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => this.openSettings(),
        },
      ],
    );
  }

  /**
   * Show alert when permission request fails
   * Requirements: 2.7 - Handle permission denial gracefully
   */
  showPermissionErrorAlert(error) {
    Alert.alert(
      'Permission Error',
      `Unable to request notification permissions: ${error.message}. Please try again or enable notifications manually in your device settings.`,
      [
        {
          text: 'OK',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => this.openSettings(),
        },
      ],
    );
  }

  /**
   * Open device settings for the app
   */
  async openSettings() {
    try {
      await notifee.openNotificationSettings();
    } catch (error) {
      console.error('Failed to open settings:', error);
      // Fallback to general settings
      Linking.openSettings();
    }
  }

  /**
   * Request battery optimization exemption (Android only)
   * Critical for alarm reliability
   * Requirements: 2.7 - Request battery optimization exemption
   */
  async requestBatteryOptimizationExemption() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const batteryOptimizationEnabled =
        await notifee.isBatteryOptimizationEnabled();

      if (batteryOptimizationEnabled) {
        Alert.alert(
          'Battery Optimization',
          'To ensure medicine alarms work reliably, please disable battery optimization for PillSaathi.',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                console.log('User declined battery optimization exemption');
              },
            },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  await notifee.openBatteryOptimizationSettings();
                } catch (error) {
                  console.error(
                    'Failed to open battery optimization settings:',
                    error,
                  );
                  Alert.alert(
                    'Error',
                    'Unable to open battery optimization settings. Please navigate to Settings > Apps > PillSaathi > Battery manually.',
                    [{ text: 'OK' }],
                  );
                }
              },
            },
          ],
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check battery optimization:', error);
      // Don't block the flow if we can't check battery optimization
      return true;
    }
  }

  /**
   * Get the alarm channel ID
   */
  getChannelId() {
    return this.channelId;
  }

  /**
   * Display a full-screen notification
   * Used for medicine alarms
   */
  async displayFullScreenNotification(notificationData) {
    try {
      const { id, title, body, data } = notificationData;

      await notifee.displayNotification({
        id,
        title,
        body,
        data,
        android: {
          channelId: this.channelId,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.ALARM,
          fullScreenAction: {
            id: 'full_screen_alarm',
            launchActivity: 'default',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          autoCancel: false,
          ongoing: true,
          sound: 'default',
          vibrationPattern: [300, 500, 300, 500],
          lights: [300, 500],
          lightColor: '#FF0000',
        },
        ios: {
          sound: 'default',
          critical: true,
          criticalVolume: 1.0,
          interruptionLevel: 'timeSensitive',
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to display full-screen notification:', error);
      return false;
    }
  }

  /**
   * Cancel a notification by ID
   */
  async cancelNotification(notificationId) {
    try {
      await notifee.cancelNotification(notificationId);
      return true;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    try {
      await notifee.cancelAllNotifications();
      return true;
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new NotificationConfigService();
