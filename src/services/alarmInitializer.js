/**
 * Alarm Initializer Service
 * Handles app startup initialization for alarm system
 */

import notificationConfig from './notificationConfig';
import { Platform } from 'react-native';

class AlarmInitializerService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize alarm system on app startup
   * Should be called in App.js or root component
   *
   * @param {string} userId - Current user ID (optional)
   * @param {string} userRole - Current user role (optional, 'parent' or 'caregiver')
   */
  async initialize(userId = null, userRole = null) {
    try {
      console.log('Initializing alarm system...', {
        userId,
        userRole,
        isInitialized: this.isInitialized,
      });

      // Initialize notification configuration (only once)
      if (!this.isInitialized) {
        const hasPermission = await notificationConfig.initialize();

        if (!hasPermission) {
          console.warn('Notification permissions not granted');
        }

        // Request battery optimization exemption on Android
        if (Platform.OS === 'android') {
          await notificationConfig.requestBatteryOptimizationExemption();
        }

        this.isInitialized = true;
      }

      // If user is a parent, sync alarms for their medicines (can run multiple times)
      if (userId && userRole === 'parent') {
        try {
          console.log('Syncing alarms for parent user:', userId);
          const AlarmSchedulerService =
            require('./AlarmSchedulerService').default;
          const result = await AlarmSchedulerService.syncAlarmsForParent(
            userId,
          );
          console.log('Alarms synced successfully:', result);
        } catch (syncError) {
          console.error('Failed to sync alarms:', syncError);
          // Don't fail initialization if sync fails
        }
      }

      console.log('Alarm system initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize alarm system:', error);
      return false;
    }
  }

  /**
   * Check if alarm system is initialized
   */
  getInitializationStatus() {
    return this.isInitialized;
  }

  /**
   * Reset initialization status (for testing)
   */
  reset() {
    this.isInitialized = false;
  }
}

// Export singleton instance
export default new AlarmInitializerService();
