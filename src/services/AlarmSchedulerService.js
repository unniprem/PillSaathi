/**
 * AlarmSchedulerService - Alarm Scheduling Service
 *
 * Manages local alarm scheduling using Notifee for medicine reminders.
 * Handles alarm creation, cancellation, and rescheduling for a 7-day rolling window.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import notifee, { TriggerType, AndroidImportance } from '@notifee/react-native';
import notificationConfig from './notificationConfig';
import alarmStorage from './alarmStorage';

class AlarmSchedulerService {
  constructor() {
    this.ALARM_WINDOW_DAYS = 7; // Schedule alarms for next 7 days
    this.logs = []; // In-memory log storage
    this.MAX_LOGS = 1000; // Maximum number of logs to keep in memory
  }

  /**
   * Log an operation with timestamp
   * Requirements: 9.1 - Log all alarm scheduling operations with timestamps
   *
   * @param {string} level - Log level: 'info', 'warn', 'error'
   * @param {string} operation - Operation name
   * @param {Object} details - Operation details
   * @private
   */
  _log(level, operation, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      details,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Also log to console for debugging
    const message = `[AlarmScheduler] ${operation}`;
    switch (level) {
      case 'error':
        console.error(message, details);
        break;
      case 'warn':
        console.warn(message, details);
        break;
      default:
        console.log(message, details);
    }

    return logEntry;
  }

  /**
   * Check and request notification permissions
   * Requirements: 2.7 - Request notification permissions on first use
   * Requirements: 2.7 - Handle permission denial gracefully
   * Requirements: 2.7 - Guide user to settings if permissions denied
   *
   * @returns {Promise<boolean>} True if permissions granted
   */
  async checkAndRequestPermissions() {
    try {
      // Check current permission status
      const hasPermission = await notificationConfig.checkPermissions();

      if (hasPermission) {
        this._log('info', 'PERMISSIONS_ALREADY_GRANTED', {});
        return true;
      }

      // Request permissions
      this._log('info', 'REQUESTING_PERMISSIONS', {});
      const granted = await notificationConfig.requestPermissions();

      if (granted) {
        this._log('info', 'PERMISSIONS_GRANTED', {});
        return true;
      }

      // Permissions denied - guide user to settings
      this._log('warn', 'PERMISSIONS_DENIED', {
        message: 'User denied notification permissions',
      });

      // The notificationConfig will show an alert guiding user to settings
      return false;
    } catch (error) {
      this._log('error', 'PERMISSION_CHECK_ERROR', {
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Request battery optimization exemption
   * Requirements: 2.7 - Request battery optimization exemption
   *
   * @returns {Promise<boolean>} True if exemption granted or not needed
   */
  async requestBatteryOptimizationExemption() {
    try {
      this._log('info', 'REQUESTING_BATTERY_EXEMPTION', {});
      const granted =
        await notificationConfig.requestBatteryOptimizationExemption();

      if (granted) {
        this._log('info', 'BATTERY_EXEMPTION_GRANTED', {});
      } else {
        this._log('warn', 'BATTERY_EXEMPTION_DENIED', {
          message: 'Battery optimization not disabled',
        });
      }

      return granted;
    } catch (error) {
      this._log('error', 'BATTERY_EXEMPTION_ERROR', {
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Get all logs
   * Requirements: 9.3 - Provide debugging tools
   *
   * @param {Object} filters - Optional filters
   * @param {string} filters.level - Filter by log level
   * @param {string} filters.operation - Filter by operation name
   * @param {Date} filters.startTime - Filter by start time
   * @param {Date} filters.endTime - Filter by end time
   * @returns {Array<Object>} Array of log entries
   */
  getLogs(filters = {}) {
    let filteredLogs = [...this.logs];

    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters.operation) {
      filteredLogs = filteredLogs.filter(
        log => log.operation === filters.operation,
      );
    }

    if (filters.startTime) {
      filteredLogs = filteredLogs.filter(
        log => new Date(log.timestamp) >= filters.startTime,
      );
    }

    if (filters.endTime) {
      filteredLogs = filteredLogs.filter(
        log => new Date(log.timestamp) <= filters.endTime,
      );
    }

    return filteredLogs;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this._log('info', 'LOGS_CLEARED', {});
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
    const startTime = Date.now();
    this._log('info', 'SCHEDULE_ALARMS_START', {
      medicineId,
      medicineName: medicine.name,
      schedulePattern: schedule.repeatPattern,
      scheduleTimes: schedule.times,
    });

    try {
      // Ensure notification system is initialized and permissions granted
      // Requirements: 2.7 - Request notification permissions on first use
      const hasPermission = await notificationConfig.initialize();

      if (!hasPermission) {
        const error = new Error('Notification permissions not granted');
        error.code = 'permission-denied';
        this._log('error', 'PERMISSION_DENIED', {
          medicineId,
          message: 'User denied notification permissions',
        });
        throw error;
      }

      // Calculate alarm times for the next 7 days
      const alarmTimes = this.calculateAlarmTimes(
        schedule,
        this.ALARM_WINDOW_DAYS,
      );

      if (alarmTimes.length === 0) {
        this._log('warn', 'NO_ALARM_TIMES_CALCULATED', {
          medicineId,
          schedule,
        });
        return [];
      }

      this._log('info', 'ALARM_TIMES_CALCULATED', {
        medicineId,
        alarmCount: alarmTimes.length,
        firstAlarm: alarmTimes[0]?.toISOString(),
        lastAlarm: alarmTimes[alarmTimes.length - 1]?.toISOString(),
      });

      // Create alarms with Notifee
      const alarmIds = [];
      const errors = [];
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
          errors.push({ alarmTime, error: error.message });
          this._log('error', 'ALARM_CREATION_FAILED', {
            medicineId,
            alarmTime: alarmTime.toISOString(),
            error: error.message,
            retryAttempt: 0,
          });
          // Continue with other alarms even if one fails
        }
      }

      // Store alarm metadata in AsyncStorage (Requirement 1.8)
      await alarmStorage.storeAlarmMetadata(medicineId, {
        alarmIds,
        lastScheduled: new Date(),
        scheduleVersion: 1,
      });

      const duration = Date.now() - startTime;
      this._log('info', 'SCHEDULE_ALARMS_SUCCESS', {
        medicineId,
        alarmsScheduled: alarmIds.length,
        alarmsRequested: alarmTimes.length,
        failedAlarms: errors.length,
        durationMs: duration,
      });

      return alarmIds.map(a => a.alarmId);
    } catch (error) {
      const duration = Date.now() - startTime;
      this._log('error', 'SCHEDULE_ALARMS_ERROR', {
        medicineId,
        error: error.message,
        stack: error.stack,
        durationMs: duration,
      });
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
    this._log('info', 'CREATE_ALARM_START', {
      medicineId,
      alarmTime: alarmTime.toISOString(),
    });

    try {
      const alarmId = `alarm_${medicineId}_${alarmTime.getTime()}`;

      // Query for the dose document that matches this alarm time
      // This allows us to include the actual doseId in the notification
      let doseId = null;
      try {
        const { getFirestore } = require('@react-native-firebase/firestore');
        const { getApp } = require('@react-native-firebase/app');
        const firestore = getFirestore(getApp());

        // Query for dose with matching medicineId and scheduledTime
        const dosesSnapshot = await firestore
          .collection('doses')
          .where('medicineId', '==', medicineId)
          .where('scheduledTime', '==', alarmTime)
          .limit(1)
          .get();

        if (!dosesSnapshot.empty) {
          doseId = dosesSnapshot.docs[0].id;
        } else {
          // If no dose found, create a deterministic ID
          // This can happen if doses haven't been generated yet
          doseId = `dose_${medicineId}_${alarmTime.getTime()}`;
          this._log('warn', 'DOSE_NOT_FOUND_FOR_ALARM', {
            medicineId,
            alarmTime: alarmTime.toISOString(),
            generatedDoseId: doseId,
          });
        }
      } catch (error) {
        this._log('error', 'DOSE_QUERY_FAILED', {
          medicineId,
          alarmTime: alarmTime.toISOString(),
          error: error.message,
        });
        // Fallback to generated ID
        doseId = `dose_${medicineId}_${alarmTime.getTime()}`;
      }

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
            doseId, // Include actual dose ID
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
            importance: AndroidImportance.HIGH,
            category: 'alarm',
            autoCancel: false, // Don't dismiss automatically
            ongoing: true, // Make it persistent
            sound: 'default',
            loopSound: true, // Loop the sound like an alarm
            vibrationPattern: [500, 500, 500, 500], // Continuous vibration (even number of values)
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
          },
          ios: {
            sound: 'default',
            critical: true,
            criticalVolume: 1.0,
            interruptionLevel: 'timeSensitive',
          },
        },
        trigger,
      );

      this._log('info', 'CREATE_ALARM_SUCCESS', {
        alarmId,
        medicineId,
        doseId,
        alarmTime: alarmTime.toISOString(),
      });

      return alarmId;
    } catch (error) {
      this._log('error', 'CREATE_ALARM_ERROR', {
        medicineId,
        alarmTime: alarmTime.toISOString(),
        error: error.message,
        stack: error.stack,
      });
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
    this._log('info', 'CANCEL_ALARMS_START', { medicineId });

    try {
      // Retrieve alarm metadata from AsyncStorage
      const metadata = await alarmStorage.getAlarmMetadata(medicineId);

      if (!metadata || !metadata.alarmIds || metadata.alarmIds.length === 0) {
        this._log('warn', 'NO_ALARMS_TO_CANCEL', { medicineId });
        return;
      }

      const alarmCount = metadata.alarmIds.length;
      const errors = [];

      // Cancel each alarm with Notifee
      for (const alarm of metadata.alarmIds) {
        try {
          await notifee.cancelNotification(alarm.alarmId);
        } catch (error) {
          errors.push({ alarmId: alarm.alarmId, error: error.message });
          this._log('error', 'CANCEL_ALARM_FAILED', {
            medicineId,
            alarmId: alarm.alarmId,
            error: error.message,
          });
          // Continue with other alarms even if one fails
        }
      }

      // Clean up alarm metadata from AsyncStorage
      await alarmStorage.deleteAlarmMetadata(medicineId);

      this._log('info', 'CANCEL_ALARMS_SUCCESS', {
        medicineId,
        alarmsCancelled: alarmCount - errors.length,
        alarmsRequested: alarmCount,
        failedCancellations: errors.length,
      });
    } catch (error) {
      this._log('error', 'CANCEL_ALARMS_ERROR', {
        medicineId,
        error: error.message,
        stack: error.stack,
      });
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
    this._log('info', 'RESCHEDULE_ALARMS_START', {
      medicineId,
      medicineName: medicine.name,
    });

    try {
      // Cancel existing alarms
      await this.cancelMedicineAlarms(medicineId);

      // Create new alarms
      const alarmIds = await this.scheduleMedicineAlarms(
        medicineId,
        medicine,
        schedule,
      );

      this._log('info', 'RESCHEDULE_ALARMS_SUCCESS', {
        medicineId,
        newAlarmCount: alarmIds.length,
      });

      return alarmIds;
    } catch (error) {
      this._log('error', 'RESCHEDULE_ALARMS_ERROR', {
        medicineId,
        error: error.message,
        stack: error.stack,
      });
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
    this._log('info', 'VERIFY_RESTORE_ALARMS_START', { parentId });

    try {
      // Import MedicineService and ScheduleService dynamically to avoid circular dependencies
      const MedicineService = require('./MedicineService').default;
      const scheduleService = require('./scheduleService').default;

      // Query active medicines for this parent
      const activeMedicines = await MedicineService.getActiveMedicinesForParent(
        parentId,
      );

      if (activeMedicines.length === 0) {
        this._log('info', 'NO_ACTIVE_MEDICINES', { parentId });
        return 0;
      }

      this._log('info', 'ACTIVE_MEDICINES_FOUND', {
        parentId,
        medicineCount: activeMedicines.length,
      });

      let restoredCount = 0;

      // For each active medicine, verify alarms
      for (const medicine of activeMedicines) {
        try {
          // Get schedule for this medicine
          const schedule = await scheduleService.getScheduleForMedicine(
            medicine.id,
          );

          if (!schedule) {
            this._log('warn', 'NO_SCHEDULE_FOUND', {
              medicineId: medicine.id,
            });
            continue;
          }

          // Get stored alarm metadata
          const metadata = await alarmStorage.getAlarmMetadata(medicine.id);

          // Get actual scheduled alarms from Notifee
          const actualAlarms = await notifee.getTriggerNotificationIds();

          // Check if we need to reschedule
          let needsReschedule = false;
          let reason = '';

          if (
            !metadata ||
            !metadata.alarmIds ||
            metadata.alarmIds.length === 0
          ) {
            // No metadata stored, definitely need to reschedule
            needsReschedule = true;
            reason = 'no_metadata';
            this._log('info', 'NO_ALARM_METADATA', {
              medicineId: medicine.id,
            });
          } else {
            // Check if stored alarm IDs exist in actual alarms
            const storedAlarmIds = metadata.alarmIds.map(a => a.alarmId);
            const missingAlarms = storedAlarmIds.filter(
              id => !actualAlarms.includes(id),
            );

            if (missingAlarms.length > 0) {
              needsReschedule = true;
              reason = 'missing_alarms';
              this._log('warn', 'MISSING_ALARMS_DETECTED', {
                medicineId: medicine.id,
                missingCount: missingAlarms.length,
                totalStored: storedAlarmIds.length,
              });
            }

            // Also check if we need to refresh the 7-day window
            const now = new Date();
            const lastScheduled = metadata.lastScheduled || new Date(0);
            const hoursSinceLastSchedule =
              (now.getTime() - lastScheduled.getTime()) / (1000 * 60 * 60);

            // Refresh if it's been more than 24 hours since last schedule
            if (hoursSinceLastSchedule > 24) {
              needsReschedule = true;
              reason = reason ? `${reason},window_refresh` : 'window_refresh';
              this._log('info', 'ALARM_WINDOW_REFRESH_NEEDED', {
                medicineId: medicine.id,
                hoursSinceLastSchedule: Math.round(hoursSinceLastSchedule),
              });
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
            this._log('info', 'ALARMS_RESTORED', {
              medicineId: medicine.id,
              reason,
            });
          }
        } catch (error) {
          this._log('error', 'VERIFY_MEDICINE_ALARMS_ERROR', {
            medicineId: medicine.id,
            error: error.message,
          });
          // Continue with other medicines even if one fails
        }
      }

      this._log('info', 'VERIFY_RESTORE_ALARMS_COMPLETE', {
        parentId,
        medicinesChecked: activeMedicines.length,
        medicinesRestored: restoredCount,
      });

      return restoredCount;
    } catch (error) {
      this._log('error', 'VERIFY_RESTORE_ALARMS_ERROR', {
        parentId,
        error: error.message,
        stack: error.stack,
      });
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
    this._log('info', 'TIMEZONE_CHANGE_START', { parentId });

    try {
      // Import MedicineService and ScheduleService dynamically to avoid circular dependencies
      const MedicineService = require('./MedicineService').default;
      const scheduleService = require('./scheduleService').default;

      // Query active medicines for this parent
      const activeMedicines = await MedicineService.getActiveMedicinesForParent(
        parentId,
      );

      if (activeMedicines.length === 0) {
        this._log('info', 'NO_ACTIVE_MEDICINES_FOR_TIMEZONE', { parentId });
        return;
      }

      let rescheduledCount = 0;
      const errors = [];

      // Reschedule alarms for each medicine to adjust to new timezone
      for (const medicine of activeMedicines) {
        try {
          // Get schedule for this medicine
          const schedule = await scheduleService.getScheduleForMedicine(
            medicine.id,
          );

          if (!schedule) {
            this._log('warn', 'NO_SCHEDULE_FOR_TIMEZONE_CHANGE', {
              medicineId: medicine.id,
            });
            continue;
          }

          // Reschedule alarms - this will recalculate times in the new timezone
          await this.rescheduleMedicineAlarms(medicine.id, medicine, schedule);
          rescheduledCount++;
          this._log('info', 'TIMEZONE_ALARMS_RESCHEDULED', {
            medicineId: medicine.id,
          });
        } catch (error) {
          errors.push({ medicineId: medicine.id, error: error.message });
          this._log('error', 'TIMEZONE_RESCHEDULE_ERROR', {
            medicineId: medicine.id,
            error: error.message,
          });
          // Continue with other medicines even if one fails
        }
      }

      this._log('info', 'TIMEZONE_CHANGE_COMPLETE', {
        parentId,
        medicinesProcessed: activeMedicines.length,
        medicinesRescheduled: rescheduledCount,
        errors: errors.length,
      });
    } catch (error) {
      this._log('error', 'TIMEZONE_CHANGE_ERROR', {
        parentId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get all scheduled alarms for debugging
   * Requirements: 9.3 - Provide method to list all currently scheduled alarms
   *
   * @returns {Promise<Array<Object>>} Array of alarm objects with details
   */
  async getAllScheduledAlarms() {
    this._log('info', 'GET_ALL_ALARMS_START', {});

    try {
      // Get all trigger notification IDs from Notifee
      const notifeeAlarmIds = await notifee.getTriggerNotificationIds();

      // Get all trigger notifications with full details
      const notifeeAlarms = await notifee.getTriggerNotifications();

      // Get all stored alarm metadata from AsyncStorage
      const allMetadata = await alarmStorage.getAllAlarmMetadata();

      // Combine data for comprehensive view
      const alarms = notifeeAlarms.map(alarm => {
        const metadata = allMetadata.find(m =>
          m.alarmIds?.some(a => a.alarmId === alarm.notification.id),
        );

        return {
          alarmId: alarm.notification.id,
          medicineId: alarm.notification.data?.medicineId,
          medicineName: alarm.notification.data?.medicineName,
          doseId: alarm.notification.data?.doseId,
          scheduledTime: alarm.notification.data?.scheduledTime,
          triggerTimestamp: alarm.trigger?.timestamp,
          hasMetadata: !!metadata,
          metadata: metadata
            ? {
                medicineId: metadata.medicineId,
                lastScheduled: metadata.lastScheduled,
                scheduleVersion: metadata.scheduleVersion,
              }
            : null,
        };
      });

      this._log('info', 'GET_ALL_ALARMS_SUCCESS', {
        totalAlarms: alarms.length,
        notifeeAlarms: notifeeAlarmIds.length,
        storedMetadata: allMetadata.length,
      });

      return alarms;
    } catch (error) {
      this._log('error', 'GET_ALL_ALARMS_ERROR', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Verify alarm integrity for diagnostics
   * Requirements: 9.4 - Provide method to verify alarm integrity on app launch
   *
   * Checks for:
   * - Alarms in Notifee but not in metadata
   * - Alarms in metadata but not in Notifee
   * - Expired alarms that should have been cleaned up
   * - Alarms scheduled too far in the future (beyond 7-day window)
   *
   * @param {string} parentId - Parent ID to check alarms for
   * @returns {Promise<Object>} Integrity report with issues found
   */
  async verifyAlarmIntegrity(parentId) {
    this._log('info', 'VERIFY_INTEGRITY_START', { parentId });

    try {
      // Get all Notifee alarms
      const notifeeAlarms = await notifee.getTriggerNotifications();
      const notifeeAlarmIds = notifeeAlarms.map(a => a.notification.id);

      // Get all stored metadata
      const allMetadata = await alarmStorage.getAllAlarmMetadata();

      // Get active medicines for this parent
      const MedicineService = require('./MedicineService').default;
      const activeMedicines = await MedicineService.getActiveMedicinesForParent(
        parentId,
      );
      const activeMedicineIds = activeMedicines.map(m => m.id);

      const issues = {
        orphanedNotifeeAlarms: [], // In Notifee but not in metadata
        orphanedMetadata: [], // In metadata but not in Notifee
        expiredAlarms: [], // Past alarms that should be cleaned up
        futureAlarms: [], // Alarms beyond 7-day window
        inactiveMedicineAlarms: [], // Alarms for inactive medicines
        missingAlarms: [], // Active medicines with no alarms
      };

      const now = new Date();
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      // Check for orphaned Notifee alarms
      for (const alarm of notifeeAlarms) {
        const alarmId = alarm.notification.id;
        const medicineId = alarm.notification.data?.medicineId;

        // Check if alarm has metadata
        const hasMetadata = allMetadata.some(m =>
          m.alarmIds?.some(a => a.alarmId === alarmId),
        );

        if (!hasMetadata) {
          issues.orphanedNotifeeAlarms.push({
            alarmId,
            medicineId,
            scheduledTime: alarm.notification.data?.scheduledTime,
          });
        }

        // Check if alarm is for inactive medicine
        if (medicineId && !activeMedicineIds.includes(medicineId)) {
          issues.inactiveMedicineAlarms.push({
            alarmId,
            medicineId,
          });
        }

        // Check if alarm is expired
        const triggerTime = new Date(alarm.trigger?.timestamp);
        if (triggerTime < now) {
          issues.expiredAlarms.push({
            alarmId,
            medicineId,
            triggerTime: triggerTime.toISOString(),
          });
        }

        // Check if alarm is too far in future
        if (triggerTime > sevenDaysFromNow) {
          issues.futureAlarms.push({
            alarmId,
            medicineId,
            triggerTime: triggerTime.toISOString(),
            daysInFuture: Math.ceil(
              (triggerTime - now) / (1000 * 60 * 60 * 24),
            ),
          });
        }
      }

      // Check for orphaned metadata
      for (const metadata of allMetadata) {
        if (!metadata.alarmIds || metadata.alarmIds.length === 0) {
          continue;
        }

        for (const alarm of metadata.alarmIds) {
          if (!notifeeAlarmIds.includes(alarm.alarmId)) {
            issues.orphanedMetadata.push({
              medicineId: metadata.medicineId,
              alarmId: alarm.alarmId,
              scheduledTime: alarm.scheduledTime,
            });
          }
        }
      }

      // Check for active medicines with no alarms
      for (const medicine of activeMedicines) {
        const hasAlarms = allMetadata.some(
          m => m.medicineId === medicine.id && m.alarmIds?.length > 0,
        );

        if (!hasAlarms) {
          issues.missingAlarms.push({
            medicineId: medicine.id,
            medicineName: medicine.name,
          });
        }
      }

      const totalIssues =
        issues.orphanedNotifeeAlarms.length +
        issues.orphanedMetadata.length +
        issues.expiredAlarms.length +
        issues.futureAlarms.length +
        issues.inactiveMedicineAlarms.length +
        issues.missingAlarms.length;

      this._log('info', 'VERIFY_INTEGRITY_COMPLETE', {
        parentId,
        totalIssues,
        orphanedNotifeeAlarms: issues.orphanedNotifeeAlarms.length,
        orphanedMetadata: issues.orphanedMetadata.length,
        expiredAlarms: issues.expiredAlarms.length,
        futureAlarms: issues.futureAlarms.length,
        inactiveMedicineAlarms: issues.inactiveMedicineAlarms.length,
        missingAlarms: issues.missingAlarms.length,
      });

      return {
        parentId,
        timestamp: now.toISOString(),
        totalIssues,
        issues,
        summary: {
          totalNotifeeAlarms: notifeeAlarms.length,
          totalMetadata: allMetadata.length,
          activeMedicines: activeMedicines.length,
        },
      };
    } catch (error) {
      this._log('error', 'VERIFY_INTEGRITY_ERROR', {
        parentId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Manually reschedule all alarms for testing
   * Requirements: 9.7 - Provide method to manually reschedule all alarms
   *
   * WARNING: This is a destructive operation that cancels and recreates all alarms.
   * Use only for testing or recovery scenarios.
   *
   * @param {string} parentId - Parent ID to reschedule alarms for
   * @param {boolean} force - Force reschedule even if alarms exist
   * @returns {Promise<Object>} Reschedule results
   */
  async manualRescheduleAll(parentId, force = false) {
    this._log('info', 'MANUAL_RESCHEDULE_ALL_START', { parentId, force });

    try {
      // Get active medicines for this parent
      const MedicineService = require('./MedicineService').default;
      const scheduleService = require('./scheduleService').default;

      const activeMedicines = await MedicineService.getActiveMedicinesForParent(
        parentId,
      );

      if (activeMedicines.length === 0) {
        this._log('warn', 'NO_MEDICINES_TO_RESCHEDULE', { parentId });
        return {
          success: true,
          medicinesProcessed: 0,
          alarmsCreated: 0,
          errors: [],
        };
      }

      const results = {
        success: true,
        medicinesProcessed: 0,
        alarmsCreated: 0,
        errors: [],
      };

      // Reschedule each medicine
      for (const medicine of activeMedicines) {
        try {
          // Get schedule
          const schedule = await scheduleService.getScheduleForMedicine(
            medicine.id,
          );

          if (!schedule) {
            this._log('warn', 'NO_SCHEDULE_FOR_MANUAL_RESCHEDULE', {
              medicineId: medicine.id,
            });
            results.errors.push({
              medicineId: medicine.id,
              error: 'No schedule found',
            });
            continue;
          }

          // Check if alarms already exist
          const metadata = await alarmStorage.getAlarmMetadata(medicine.id);
          if (metadata?.alarmIds?.length > 0 && !force) {
            this._log('info', 'SKIPPING_EXISTING_ALARMS', {
              medicineId: medicine.id,
              alarmCount: metadata.alarmIds.length,
            });
            continue;
          }

          // Reschedule
          const alarmIds = await this.rescheduleMedicineAlarms(
            medicine.id,
            medicine,
            schedule,
          );

          results.medicinesProcessed++;
          results.alarmsCreated += alarmIds.length;

          this._log('info', 'MANUAL_RESCHEDULE_SUCCESS', {
            medicineId: medicine.id,
            alarmsCreated: alarmIds.length,
          });
        } catch (error) {
          results.success = false;
          results.errors.push({
            medicineId: medicine.id,
            error: error.message,
          });

          this._log('error', 'MANUAL_RESCHEDULE_MEDICINE_ERROR', {
            medicineId: medicine.id,
            error: error.message,
          });
        }
      }

      this._log('info', 'MANUAL_RESCHEDULE_ALL_COMPLETE', {
        parentId,
        medicinesProcessed: results.medicinesProcessed,
        alarmsCreated: results.alarmsCreated,
        errors: results.errors.length,
      });

      return results;
    } catch (error) {
      this._log('error', 'MANUAL_RESCHEDULE_ALL_ERROR', {
        parentId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Sync alarms for a parent user on app startup
   * Ensures all active medicines have alarms scheduled
   *
   * @param {string} parentId - Parent user ID
   * @returns {Promise<Object>} Sync results
   */
  async syncAlarmsForParent(parentId) {
    this._log('info', 'SYNC_ALARMS_START', { parentId });

    try {
      const { getFirestore } = require('@react-native-firebase/firestore');
      const { getApp } = require('@react-native-firebase/app');
      const firestore = getFirestore(getApp());

      // Get all active medicines for this parent
      const medicinesSnapshot = await firestore
        .collection('medicines')
        .where('parentId', '==', parentId)
        .where('status', '==', 'active')
        .get();

      if (medicinesSnapshot.empty) {
        this._log('info', 'SYNC_ALARMS_NO_MEDICINES', { parentId });
        return { medicinesProcessed: 0, alarmsScheduled: 0 };
      }

      let alarmsScheduled = 0;
      const errors = [];

      for (const medicineDoc of medicinesSnapshot.docs) {
        try {
          const medicineId = medicineDoc.id;
          const medicineData = medicineDoc.data();

          // Check if alarms already exist for this medicine
          const existingMetadata = await alarmStorage.getAlarmMetadata(
            medicineId,
          );

          if (
            existingMetadata &&
            existingMetadata.alarmIds &&
            existingMetadata.alarmIds.length > 0
          ) {
            // Alarms already exist, skip
            continue;
          }

          // Get schedule for this medicine
          const scheduleSnapshot = await firestore
            .collection('schedules')
            .where('medicineId', '==', medicineId)
            .limit(1)
            .get();

          if (!scheduleSnapshot.empty) {
            const scheduleData = scheduleSnapshot.docs[0].data();

            // Schedule alarms
            await this.scheduleMedicineAlarms(
              medicineId,
              {
                name: medicineData.name,
                dosageAmount: medicineData.dosageAmount,
                dosageUnit: medicineData.dosageUnit,
                instructions: medicineData.instructions || '',
              },
              scheduleData,
            );

            alarmsScheduled++;
            this._log('info', 'SYNC_ALARMS_SCHEDULED', {
              medicineId,
              medicineName: medicineData.name,
            });
          }
        } catch (error) {
          errors.push({
            medicineId: medicineDoc.id,
            error: error.message,
          });
          this._log('error', 'SYNC_ALARMS_MEDICINE_ERROR', {
            medicineId: medicineDoc.id,
            error: error.message,
          });
        }
      }

      this._log('info', 'SYNC_ALARMS_COMPLETE', {
        parentId,
        medicinesProcessed: medicinesSnapshot.size,
        alarmsScheduled,
        errors: errors.length,
      });

      return {
        medicinesProcessed: medicinesSnapshot.size,
        alarmsScheduled,
        errors,
      };
    } catch (error) {
      this._log('error', 'SYNC_ALARMS_ERROR', {
        parentId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

// Export singleton instance
export default new AlarmSchedulerService();
