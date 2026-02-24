/**
 * RetryAlarmService - Retry Alarm Management Service
 *
 * Monitors dose missedCount changes and triggers retry alarms.
 * Implements the 3-retry escalation system:
 * - missedCount 1: First retry at 10 minutes
 * - missedCount 2: Second retry at 20 minutes
 * - missedCount 3: Escalated to caregivers (no alarm)
 *
 * @format
 */

import notifee, { AndroidImportance } from '@notifee/react-native';
import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import notificationConfig from './notificationConfig';

class RetryAlarmService {
  constructor() {
    this.unsubscribe = null;
    this.isMonitoring = false;
    this.parentId = null;
  }

  /**
   * Start monitoring doses for retry alarms
   * Sets up Firestore listener for missedCount changes
   *
   * @param {string} parentId - Parent user ID to monitor
   */
  startMonitoring(parentId) {
    if (this.isMonitoring && this.parentId === parentId) {
      console.log(
        '[RetryAlarmService] Already monitoring for parent:',
        parentId,
      );
      return;
    }

    // Stop existing monitoring if any
    this.stopMonitoring();

    console.log(
      '[RetryAlarmService] Starting monitoring for parent:',
      parentId,
    );
    this.parentId = parentId;
    this.isMonitoring = true;

    const firestore = getFirestore(getApp());
    const DOSES_COLLECTION = 'doses'; // Collection name constant

    // Listen for changes to scheduled doses for this parent
    this.unsubscribe = firestore
      .collection(DOSES_COLLECTION)
      .where('parentId', '==', parentId)
      .where('status', 'in', ['scheduled', 'pending', 'snoozed'])
      .onSnapshot(
        snapshot => {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
              const dose = {
                id: change.doc.id,
                ...change.doc.data(),
              };

              this.handleDoseChange(dose);
            }
          });
        },
        error => {
          console.error('[RetryAlarmService] Firestore listener error:', error);
        },
      );

    console.log('[RetryAlarmService] Monitoring started');
  }

  /**
   * Stop monitoring doses
   */
  stopMonitoring() {
    if (this.unsubscribe) {
      console.log('[RetryAlarmService] Stopping monitoring');
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.isMonitoring = false;
    this.parentId = null;
  }

  /**
   * Handle dose change event
   * Triggers retry alarm if missedCount increased
   *
   * @param {Object} dose - Dose document data
   * @private
   */
  async handleDoseChange(dose) {
    const missedCount = dose.missedCount || 0;

    console.log('[RetryAlarmService] Dose changed:', {
      doseId: dose.id,
      medicineName: dose.medicineName,
      missedCount,
      status: dose.status,
    });

    // Only trigger retry alarms for missedCount 1 or 2
    // missedCount 3 means escalated to caregivers (no more retries)
    if (missedCount === 1 || missedCount === 2) {
      await this.triggerRetryAlarm(dose);
    }
  }

  /**
   * Trigger a retry alarm notification
   * Creates an immediate full-screen alarm notification
   *
   * @param {Object} dose - Dose data
   * @private
   */
  async triggerRetryAlarm(dose) {
    try {
      const missedCount = dose.missedCount || 0;
      const retryNumber = missedCount; // 1 or 2

      console.log('[RetryAlarmService] Triggering retry alarm:', {
        doseId: dose.id,
        medicineName: dose.medicineName,
        retryNumber,
      });

      // Ensure notification channel exists
      await notificationConfig.initialize();

      // Create retry alarm notification
      const notificationId = `retry_alarm_${dose.id}_${missedCount}`;

      await notifee.displayNotification({
        id: notificationId,
        title: `⏰ Reminder: ${dose.medicineName}`,
        body: `Retry ${retryNumber} of 3 - Please take your medicine now\n${dose.dosageAmount} ${dose.dosageUnit}`,
        data: {
          type: 'medicine_alarm',
          doseId: dose.id,
          medicineId: dose.medicineId,
          medicineName: dose.medicineName,
          dosageAmount: String(dose.dosageAmount),
          dosageUnit: dose.dosageUnit,
          instructions: dose.instructions || '',
          scheduledTime: dose.scheduledTime?.toDate?.()?.toISOString() || '',
          isRetry: 'true',
          retryNumber: String(retryNumber),
        },
        android: {
          channelId: notificationConfig.getChannelId(),
          importance: AndroidImportance.HIGH,
          category: 'alarm',
          autoCancel: false,
          ongoing: true,
          sound: 'default',
          loopSound: true,
          timeoutAfter: 60000, // Ring for 60 seconds (1 minute)
          vibrationPattern: [500, 500, 500, 500],
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          fullScreenAction: {
            id: 'full_screen_alarm',
            launchActivity: 'default',
          },
          actions: [
            {
              title: 'Mark as Taken',
              pressAction: {
                id: 'mark_taken',
              },
            },
            {
              title: 'Snooze 10 min',
              pressAction: {
                id: 'snooze',
              },
            },
          ],
          // Add retry badge
          badge: retryNumber,
          color: retryNumber === 2 ? '#FF6B6B' : '#FFA500', // Red for 2nd retry, orange for 1st
        },
        ios: {
          sound: 'default',
          critical: true,
          criticalVolume: 1.0,
          interruptionLevel: 'timeSensitive',
          badge: retryNumber,
        },
      });

      console.log('[RetryAlarmService] Retry alarm triggered successfully');
    } catch (error) {
      console.error(
        '[RetryAlarmService] Failed to trigger retry alarm:',
        error,
      );
    }
  }

  /**
   * Cancel retry alarm for a specific dose
   *
   * @param {string} doseId - Dose ID
   */
  async cancelRetryAlarm(doseId) {
    try {
      // Cancel both possible retry alarm IDs
      await notifee.cancelNotification(`retry_alarm_${doseId}_1`);
      await notifee.cancelNotification(`retry_alarm_${doseId}_2`);

      console.log(
        '[RetryAlarmService] Cancelled retry alarms for dose:',
        doseId,
      );
    } catch (error) {
      console.error('[RetryAlarmService] Failed to cancel retry alarm:', error);
    }
  }

  /**
   * Get monitoring status
   *
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      parentId: this.parentId,
    };
  }
}

// Export singleton instance
export default new RetryAlarmService();
