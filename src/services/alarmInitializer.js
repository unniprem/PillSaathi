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
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Alarm system already initialized');
      return true;
    }

    try {
      console.log('Initializing alarm system...');

      // Initialize notification configuration
      const hasPermission = await notificationConfig.initialize();

      if (!hasPermission) {
        console.warn('Notification permissions not granted');
      }

      // Request battery optimization exemption on Android
      if (Platform.OS === 'android') {
        await notificationConfig.requestBatteryOptimizationExemption();
      }

      this.isInitialized = true;
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
