/**
 * Notification Handler Service
 * Handles Notifee foreground and background event listeners
 * Routes alarm notifications to FullScreenAlarmScreen
 *
 * Requirements: 2.1, 3.9
 *
 * @format
 */

import notifee, { EventType } from '@notifee/react-native';
import { ParentScreens } from '../types/navigation';
import AlarmSchedulerService from './AlarmSchedulerService';

class NotificationHandlerService {
  constructor() {
    this.navigationRef = null;
    this.isInitialized = false;
  }

  /**
   * Set navigation reference for routing
   * Should be called from RootNavigator
   *
   * @param {Object} ref - Navigation ref from NavigationContainer
   */
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  /**
   * Initialize notification event handlers
   * Sets up foreground and background event listeners
   *
   * Requirements: 2.1 - Trigger full-screen alarm when dose time arrives
   */
  initialize() {
    if (this.isInitialized) {
      console.log('Notification handlers already initialized');
      return;
    }

    // Handle foreground events (app is open)
    notifee.onForegroundEvent(({ type, detail }) => {
      this.handleNotificationEvent(type, detail);
    });

    // Handle background events (app is closed/background)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      this.handleNotificationEvent(type, detail);
    });

    this.isInitialized = true;
    console.log('Notification handlers initialized');
  }

  /**
   * Handle notification events
   * Routes to appropriate handler based on event type
   *
   * @param {number} type - Event type from Notifee
   * @param {Object} detail - Event detail with notification data
   */
  handleNotificationEvent(type, detail) {
    const { notification } = detail;

    // Only handle medicine alarm notifications
    if (
      !notification?.data?.type ||
      notification.data.type !== 'medicine_alarm'
    ) {
      return;
    }

    switch (type) {
      case EventType.PRESS:
        // User pressed the notification
        this.handleAlarmPress(notification);
        break;

      case EventType.ACTION_PRESS:
        // User pressed an action button (if we add quick actions later)
        this.handleActionPress(notification, detail.pressAction);
        break;

      case EventType.DISMISSED:
        // User dismissed the notification without action
        // Requirement 3.9: Maintain scheduled status when dismissed
        this.handleAlarmDismiss(notification);
        break;

      case EventType.DELIVERED:
        // Notification was delivered
        // Requirement 9.2: Log alarm trigger events with timestamps
        AlarmSchedulerService._log('info', 'ALARM_TRIGGERED', {
          alarmId: notification.id,
          medicineId: notification.data?.medicineId,
          doseId: notification.data?.doseId,
          scheduledTime: notification.data?.scheduledTime,
        });
        console.log('Alarm delivered:', notification.id);
        break;

      default:
        break;
    }
  }

  /**
   * Handle alarm notification press
   * Navigates to FullScreenAlarmScreen with alarm data
   *
   * Requirements: 2.1 - Open FullScreenAlarmScreen on alarm trigger
   *
   * @param {Object} notification - Notification object from Notifee
   */
  handleAlarmPress(notification) {
    try {
      const { data, id } = notification;

      // Log alarm interaction
      AlarmSchedulerService._log('info', 'ALARM_PRESSED', {
        alarmId: id,
        medicineId: data?.medicineId,
        doseId: data?.doseId,
      });

      // Extract alarm data including doseId
      const {
        doseId,
        medicineId,
        medicineName,
        dosageAmount,
        dosageUnit,
        instructions,
        scheduledTime,
      } = data;

      // Validate required data
      if (!doseId || !medicineId || !medicineName) {
        console.error('Missing required alarm data:', data);
        return;
      }

      // Navigate to FullScreenAlarmScreen
      if (this.navigationRef?.current) {
        this.navigationRef.current.navigate('Parent', {
          screen: ParentScreens.FULL_SCREEN_ALARM,
          params: {
            doseId,
            medicineId,
            medicineName,
            dosageAmount: parseFloat(dosageAmount) || 0,
            dosageUnit,
            scheduledTime,
            instructions,
            alarmId: id,
          },
        });
      } else {
        console.warn(
          'Navigation ref not available, cannot navigate to alarm screen',
        );
      }
    } catch (error) {
      console.error('Failed to handle alarm press:', error);
    }
  }

  /**
   * Handle action button press
   * For future quick actions (e.g., "Take" button on notification)
   *
   * @param {Object} notification - Notification object
   * @param {Object} action - Action that was pressed
   */
  handleActionPress(notification, action) {
    console.log('Action pressed:', action?.id);
    // Future implementation for quick actions
  }

  /**
   * Handle alarm dismissal without action
   * Requirement 3.9: Maintain scheduled status when dismissed
   *
   * @param {Object} notification - Notification object
   */
  handleAlarmDismiss(notification) {
    // Log alarm dismissal
    AlarmSchedulerService._log('info', 'ALARM_DISMISSED', {
      alarmId: notification.id,
      medicineId: notification.data?.medicineId,
      doseId: notification.data?.doseId,
    });
    console.log('Alarm dismissed without action:', notification.id);
    // Dose status remains "scheduled" - no action needed
  }

  /**
   * Reset initialization status (for testing)
   */
  reset() {
    this.isInitialized = false;
    this.navigationRef = null;
  }
}

// Export singleton instance
export default new NotificationHandlerService();
