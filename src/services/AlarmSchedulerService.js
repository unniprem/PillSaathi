/**
 * AlarmSchedulerService - Alarm Scheduling Service
 *
 * Manages local alarm scheduling using Notifee for medicine reminders.
 * Handles alarm creation, cancellation, and rescheduling for a 7-day rolling window.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import notifee, { TriggerType } from '@notifee/react-native';
import notificationConfig from './notificationConfig';
import alarmStorage from './alarmStorage';

class AlarmSchedulerService {
  constructor() {
    this.ALARM_WINDOW_DAYS = 7; // Schedule alarms for next 7 days
  }

  /**
   * Schedule alarms for a medicine
   * Creates alarms for next 7 days based on schedule
   *
   * Requirements: 1.1 - Create alarms when medicine is created
   * Requirements: 1.6 - Schedule alarms for 7-day window
   * Requirements: 1.8 - Store alarm IDs with medicine reference
   *
   * @param {string} medicineId - Medicine ID
   * @param {Object} medicine - Medicine data
   * @param {string} medicine.name - Medicine name
   * @param {number} medicine.dosageAmount - Dosage amount
   * @param {string} medicine.dosageUnit - Dosage unit
   * @param {string} medicine.instructions - Optional instructions
   * @param {Object} schedule - Schedule data
   * @param {Array<string>} schedule.times - Array of times in "HH:MM" format
   * @param {string} schedule.repeatPattern - "daily" or "specific_days"
   * @param {Array<number>} schedule.selectedDays - Array of day numbers 0-6 (for specific_days)
   * @returns {Promise<Array<string>>} Array of alarm IDs
   */
  async scheduleMedicineAlarms(medicineId, medicine, schedule) {
    try {
      // Ensure notification system is initialized
      await notificationConfig.initialize();

      // Calculate alarm times for the next 7 days
      const alarmTimes = this.calculateAlarmTimes(
        schedule,
        this.ALARM_WINDOW_DAYS,
      );

      if (alarmTimes.length === 0) {
        console.warn('No alarm times calculated for medicine:', medicineId);
        return [];
      }

      // Create alarms with Notifee
      const alarmIds = [];
      for (const alarmTime of alarmTimes) {
        try {
          const alarmId = await this.createAlarm(
            medicineId,
            medicine,
            alarmTime,
          );
          if (alarmId) {
            alarmIds.push({
              alarmId,
              scheduledTime: alarmTime,
              doseId: null, // Will be set when dose is created
            });
          }
        } catch (error) {
          console.error('Failed to create alarm for time:', alarmTime, error);
          // Continue with other alarms even if one fails
        }
      }

      // Store alarm metadata in AsyncStorage (Requirement 1.8)
      await alarmStorage.storeAlarmMetadata(medicineId, {
        alarmIds,
        lastScheduled: new Date(),
        scheduleVersion: 1,
      });

      console.log(
        `Scheduled ${alarmIds.length} alarms for medicine:`,
        medicineId,
      );
      return alarmIds.map(a => a.alarmId);
    } catch (error) {
      console.error('Failed to schedule medicine alarms:', error);
      throw error;
    }
  }

  /**
   * Calculate alarm times for the next N days based on schedule
   *
   * @param {Object} schedule - Schedule data
   * @param {number} days - Number of days to calculate alarms for
   * @returns {Array<Date>} Array of alarm Date objects
   * @private
   */
  calculateAlarmTimes(schedule, days) {
    const alarmTimes = [];
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0); // Start from beginning of today

    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

      // Check if we should schedule alarms for this day
      let shouldSchedule = false;
      if (schedule.repeatPattern === 'daily') {
        shouldSchedule = true;
      } else if (schedule.repeatPattern === 'specific_days') {
        shouldSchedule =
          schedule.selectedDays && schedule.selectedDays.includes(dayOfWeek);
      }

      if (shouldSchedule) {
        // Create alarm for each time in the schedule
        for (const timeStr of schedule.times) {
          const alarmTime = this.parseTimeString(timeStr, currentDate);

          // Only schedule if alarm time is in the future
          if (alarmTime > now) {
            alarmTimes.push(alarmTime);
          }
        }
      }
    }

    return alarmTimes;
  }

  /**
   * Parse time string and create Date object for specific date
   *
   * @param {string} timeStr - Time in "HH:MM" format
   * @param {Date} date - Date to apply time to
   * @returns {Date} Date object with time applied
   * @private
   */
  parseTimeString(timeStr, date) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Create a single alarm with Notifee
   *
   * @param {string} medicineId - Medicine ID
   * @param {Object} medicine - Medicine data
   * @param {Date} alarmTime - When alarm should trigger
   * @returns {Promise<string>} Alarm ID
   * @private
   */
  async createAlarm(medicineId, medicine, alarmTime) {
    try {
      const alarmId = `alarm_${medicineId}_${alarmTime.getTime()}`;

      // Create trigger for specific time
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: alarmTime.getTime(),
      };

      // Create notification
      await notifee.createTriggerNotification(
        {
          id: alarmId,
          title: `Time to take ${medicine.name}`,
          body: `${medicine.dosageAmount} ${medicine.dosageUnit}${
            medicine.instructions ? ` - ${medicine.instructions}` : ''
          }`,
          data: {
            medicineId,
            medicineName: medicine.name,
            dosageAmount: String(medicine.dosageAmount),
            dosageUnit: medicine.dosageUnit,
            instructions: medicine.instructions || '',
            scheduledTime: alarmTime.toISOString(),
            type: 'medicine_alarm',
          },
          android: {
            channelId: notificationConfig.getChannelId(),
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            fullScreenAction: {
              id: 'full_screen_alarm',
              launchActivity: 'default',
            },
          },
          ios: {
            sound: 'default',
            critical: true,
            criticalVolume: 1.0,
          },
        },
        trigger,
      );

      return alarmId;
    } catch (error) {
      console.error('Failed to create alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel all alarms for a medicine
   *
   * Requirements: 1.3 - Cancel alarms when medicine is deleted
   * Requirements: 1.4 - Cancel alarms when medicine is deactivated
   *
   * @param {string} medicineId - Medicine ID
   * @returns {Promise<void>}
   */
  async cancelMedicineAlarms(medicineId) {
    try {
      // Retrieve alarm metadata from AsyncStorage
      const metadata = await alarmStorage.getAlarmMetadata(medicineId);

      if (!metadata || !metadata.alarmIds || metadata.alarmIds.length === 0) {
        console.log('No alarms found for medicine:', medicineId);
        return;
      }

      // Cancel each alarm with Notifee
      for (const alarm of metadata.alarmIds) {
        try {
          await notifee.cancelNotification(alarm.alarmId);
        } catch (error) {
          console.error('Failed to cancel alarm:', alarm.alarmId, error);
          // Continue with other alarms even if one fails
        }
      }

      // Clean up alarm metadata from AsyncStorage
      await alarmStorage.deleteAlarmMetadata(medicineId);

      console.log(
        `Cancelled ${metadata.alarmIds.length} alarms for medicine:`,
        medicineId,
      );
    } catch (error) {
      console.error('Failed to cancel medicine alarms:', error);
      throw error;
    }
  }

  /**
   * Reschedule alarms for a medicine
   * Cancels existing alarms and creates new ones atomically
   *
   * Requirements: 1.2 - Reschedule alarms when schedule is updated
   * Requirements: 1.5 - Recreate alarms when medicine is reactivated
   *
   * @param {string} medicineId - Medicine ID
   * @param {Object} medicine - Medicine data
   * @param {Object} schedule - Updated schedule data
   * @returns {Promise<Array<string>>} Array of new alarm IDs
   */
  async rescheduleMedicineAlarms(medicineId, medicine, schedule) {
    try {
      // Cancel existing alarms
      await this.cancelMedicineAlarms(medicineId);

      // Create new alarms
      const alarmIds = await this.scheduleMedicineAlarms(
        medicineId,
        medicine,
        schedule,
      );

      console.log(
        `Rescheduled ${alarmIds.length} alarms for medicine:`,
        medicineId,
      );
      return alarmIds;
    } catch (error) {
      console.error('Failed to reschedule medicine alarms:', error);
      throw error;
    }
  }

  /**
   * Verify and restore alarms on app launch
   * Checks for missing alarms and reschedules if needed
   *
   * Requirements: 1.7 - Verify and reschedule missing alarms on app launch
   *
   * @param {string} parentId - Parent ID
   * @returns {Promise<number>} Number of alarms restored
   */
  async verifyAndRestoreAlarms(parentId) {
    try {
      console.log('Verifying and restoring alarms for parent:', parentId);

      // Import MedicineService and ScheduleService dynamically to avoid circular dependencies
      const MedicineService = require('./MedicineService').default;
      const scheduleService = require('./scheduleService').default;

      // Query active medicines for this parent
      const activeMedicines = await MedicineService.getActiveMedicinesForParent(
        parentId,
      );

      if (activeMedicines.length === 0) {
        console.log('No active medicines found for parent:', parentId);
        return 0;
      }

      let restoredCount = 0;

      // For each active medicine, verify alarms
      for (const medicine of activeMedicines) {
        try {
          // Get schedule for this medicine
          const schedule = await scheduleService.getScheduleForMedicine(
            medicine.id,
          );

          if (!schedule) {
            console.warn('No schedule found for medicine:', medicine.id);
            continue;
          }

          // Get stored alarm metadata
          const metadata = await alarmStorage.getAlarmMetadata(medicine.id);

          // Get actual scheduled alarms from Notifee
          const actualAlarms = await notifee.getTriggerNotificationIds();

          // Check if we need to reschedule
          let needsReschedule = false;

          if (
            !metadata ||
            !metadata.alarmIds ||
            metadata.alarmIds.length === 0
          ) {
            // No metadata stored, definitely need to reschedule
            needsReschedule = true;
            console.log('No alarm metadata found for medicine:', medicine.id);
          } else {
            // Check if stored alarm IDs exist in actual alarms
            const storedAlarmIds = metadata.alarmIds.map(a => a.alarmId);
            const missingAlarms = storedAlarmIds.filter(
              id => !actualAlarms.includes(id),
            );

            if (missingAlarms.length > 0) {
              needsReschedule = true;
              console.log(
                `Found ${missingAlarms.length} missing alarms for medicine:`,
                medicine.id,
              );
            }

            // Also check if we need to refresh the 7-day window
            const now = new Date();
            const lastScheduled = metadata.lastScheduled || new Date(0);
            const hoursSinceLastSchedule =
              (now.getTime() - lastScheduled.getTime()) / (1000 * 60 * 60);

            // Refresh if it's been more than 24 hours since last schedule
            if (hoursSinceLastSchedule > 24) {
              needsReschedule = true;
              console.log(
                'Alarm window needs refresh for medicine:',
                medicine.id,
              );
            }
          }

          // Reschedule if needed
          if (needsReschedule) {
            await this.rescheduleMedicineAlarms(
              medicine.id,
              medicine,
              schedule,
            );
            restoredCount++;
            console.log('Restored alarms for medicine:', medicine.id);
          }
        } catch (error) {
          console.error(
            'Failed to verify alarms for medicine:',
            medicine.id,
            error,
          );
          // Continue with other medicines even if one fails
        }
      }

      console.log(
        `Alarm verification complete. Restored ${restoredCount} medicines.`,
      );
      return restoredCount;
    } catch (error) {
      console.error('Failed to verify and restore alarms:', error);
      throw error;
    }
  }
  /**
   * Handle timezone change
   * Reschedules all alarms with new timezone to maintain local time consistency
   *
   * Requirements: 2.5 - Adjust alarm times when timezone changes
   *
   * @param {string} parentId - Parent ID
   * @returns {Promise<void>}
   */
  async handleTimezoneChange(parentId) {
    try {
      console.log('Handling timezone change for parent:', parentId);

      // Import MedicineService and ScheduleService dynamically to avoid circular dependencies
      const MedicineService = require('./MedicineService').default;
      const scheduleService = require('./scheduleService').default;

      // Query active medicines for this parent
      const activeMedicines = await MedicineService.getActiveMedicinesForParent(
        parentId,
      );

      if (activeMedicines.length === 0) {
        console.log('No active medicines found for parent:', parentId);
        return;
      }

      // Reschedule alarms for each medicine to adjust to new timezone
      for (const medicine of activeMedicines) {
        try {
          // Get schedule for this medicine
          const schedule = await scheduleService.getScheduleForMedicine(
            medicine.id,
          );

          if (!schedule) {
            console.warn('No schedule found for medicine:', medicine.id);
            continue;
          }

          // Reschedule alarms - this will recalculate times in the new timezone
          await this.rescheduleMedicineAlarms(medicine.id, medicine, schedule);
          console.log('Rescheduled alarms for timezone change:', medicine.id);
        } catch (error) {
          console.error(
            'Failed to reschedule alarms for medicine:',
            medicine.id,
            error,
          );
          // Continue with other medicines even if one fails
        }
      }

      console.log('Timezone change handling complete for parent:', parentId);
    } catch (error) {
      console.error('Failed to handle timezone change:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new AlarmSchedulerService();
