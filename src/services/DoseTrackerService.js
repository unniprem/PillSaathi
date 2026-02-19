/**
 * DoseTrackerService - Dose Tracking Service
 *
 * Manages dose status and history for the PillSathi app.
 * Handles marking doses as taken/skipped, snoozing, and offline support.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 10.2, 10.5
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { retryOperation } from '../utils/retryHelper';
import AlarmSchedulerService from './AlarmSchedulerService';

const OFFLINE_QUEUE_KEY = '@pillsathi:offline_dose_actions';

class DoseTrackerService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
    this.dosesCollection = 'doses';
  }

  /**
   * Validate dose data structure before Firestore write
   * Ensures all required fields are present
   *
   * Requirements: 10.2 - Dose record structure completeness
   *
   * @param {Object} doseData - Dose data to validate
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateDoseData(doseData) {
    const requiredFields = [
      'medicineId',
      'parentId',
      'scheduledTime',
      'status',
      'createdAt',
      'updatedAt',
    ];

    for (const field of requiredFields) {
      if (
        !(field in doseData) ||
        doseData[field] === undefined ||
        doseData[field] === null
      ) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate status values
    const validStatuses = ['scheduled', 'taken', 'missed', 'skipped'];
    if (!validStatuses.includes(doseData.status)) {
      throw new Error(`Invalid status: ${doseData.status}`);
    }

    return true;
  }

  /**
   * Mark dose as taken
   * Updates the dose status to 'taken' and records the time it was taken
   *
   * Requirements: 4.1 - Update dose status to "taken" with timestamp
   * Requirements: 4.4 - Record actual time taken
   * Requirements: 4.6 - Create dose record in Firestore
   *
   * @param {string} doseId - Dose document ID
   * @param {Date} takenAt - Time dose was taken (defaults to now)
   * @returns {Promise<void>}
   * @throws {Error} If update fails
   */
  async markDoseAsTaken(doseId, takenAt = new Date()) {
    try {
      return await retryOperation(async () => {
        const updateData = {
          status: 'taken',
          takenAt,
          updatedAt: new Date(),
        };

        console.log('Marking dose as taken:', doseId, 'at', takenAt);

        await this.firestore
          .collection(this.dosesCollection)
          .doc(doseId)
          .update(updateData);

        console.log('Dose marked as taken successfully:', doseId);
      });
    } catch (error) {
      console.error('Error marking dose as taken:', error);

      // Queue for offline sync if network error
      if (this.isNetworkError(error)) {
        await this.queueOfflineAction({
          type: 'mark_taken',
          doseId,
          timestamp: takenAt,
          data: { takenAt },
        });
        console.log('Dose action queued for offline sync');
        return;
      }

      const mappedError = new Error('Failed to mark dose as taken');
      mappedError.code = 'dose-update-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Mark dose as skipped
   * Updates the dose status to 'skipped' with optional reason
   *
   * Requirements: 4.2 - Update dose status to "skipped" with timestamp
   * Requirements: 4.6 - Create dose record in Firestore
   *
   * @param {string} doseId - Dose document ID
   * @param {string} reason - Optional reason for skipping
   * @returns {Promise<void>}
   * @throws {Error} If update fails
   */
  async markDoseAsSkipped(doseId, reason = null) {
    try {
      return await retryOperation(async () => {
        const updateData = {
          status: 'skipped',
          updatedAt: new Date(),
        };

        if (reason) {
          updateData.skippedReason = reason;
        }

        console.log('Marking dose as skipped:', doseId);

        await this.firestore
          .collection(this.dosesCollection)
          .doc(doseId)
          .update(updateData);

        console.log('Dose marked as skipped successfully:', doseId);
      });
    } catch (error) {
      console.error('Error marking dose as skipped:', error);

      // Queue for offline sync if network error
      if (this.isNetworkError(error)) {
        await this.queueOfflineAction({
          type: 'mark_skipped',
          doseId,
          timestamp: new Date(),
          data: { reason },
        });
        console.log('Dose action queued for offline sync');
        return;
      }

      const mappedError = new Error('Failed to mark dose as skipped');
      mappedError.code = 'dose-update-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Check if error is a network error
   *
   * @param {Error} error - Error to check
   * @returns {boolean} True if network error
   */
  isNetworkError(error) {
    return (
      error.code === 'unavailable' ||
      error.code === 'network-request-failed' ||
      error.message?.includes('network') ||
      error.message?.includes('offline')
    );
  }

  /**
   * Queue offline action for later sync
   *
   * @param {Object} action - Action to queue
   * @returns {Promise<void>}
   */
  async queueOfflineAction(action) {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = queueJson ? JSON.parse(queueJson) : { actions: [] };

      queue.actions.push({
        id: `${Date.now()}_${Math.random()}`,
        ...action,
        retryCount: 0,
      });

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log('Action queued for offline sync:', action.type);
    } catch (error) {
      console.error('Failed to queue offline action:', error);
    }
  }

  /**
   * Create a dose record in Firestore
   * Ensures all required fields are present and validates structure
   *
   * Requirements: 10.2 - Dose record structure completeness
   * Requirements: 10.5 - Store alarm identifiers with dose records
   *
   * @param {Object} doseData - Dose data to create
   * @param {string} doseData.medicineId - Medicine ID
   * @param {string} doseData.scheduleId - Schedule ID
   * @param {string} doseData.parentId - Parent user ID
   * @param {string} doseData.medicineName - Medicine name (denormalized)
   * @param {number} doseData.dosageAmount - Dosage amount (denormalized)
   * @param {string} doseData.dosageUnit - Dosage unit (denormalized)
   * @param {Date} doseData.scheduledTime - When dose should be taken
   * @param {string} doseData.alarmId - Notifee alarm ID (optional)
   * @returns {Promise<string>} Created dose document ID
   * @throws {Error} If creation fails or validation fails
   */
  async createDoseRecord(doseData) {
    try {
      // Prepare dose record with all required fields
      const now = new Date();
      const doseRecord = {
        medicineId: doseData.medicineId,
        scheduleId: doseData.scheduleId,
        parentId: doseData.parentId,
        medicineName: doseData.medicineName,
        dosageAmount: doseData.dosageAmount,
        dosageUnit: doseData.dosageUnit,
        scheduledTime: doseData.scheduledTime,
        status: 'scheduled',
        takenAt: null,
        skippedReason: null,
        alarmId: doseData.alarmId || null,
        createdAt: now,
        updatedAt: now,
      };

      // Validate dose data structure (Requirement 10.2)
      this.validateDoseData(doseRecord);

      console.log('Creating dose record:', doseRecord);

      // Create dose document in Firestore
      const docRef = await this.firestore
        .collection(this.dosesCollection)
        .add(doseRecord);

      console.log('Dose record created successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating dose record:', error);
      const mappedError = new Error('Failed to create dose record');
      mappedError.code = 'dose-creation-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Snooze dose alarm
   * Reschedules alarm for 10 minutes later
   *
   * Requirements: 4.3 - Reschedule alarm for 10 minutes later
   *
   * @param {string} doseId - Dose document ID
   * @param {string} medicineId - Medicine ID
   * @returns {Promise<void>}
   * @throws {Error} If snooze fails
   */
  async snoozeDose(doseId, medicineId) {
    try {
      // Calculate snooze time (10 minutes from now)
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + 10);

      console.log('Snoozing dose:', doseId, 'until', snoozeTime);

      // Get dose data to pass to alarm
      const doseDoc = await this.firestore
        .collection(this.dosesCollection)
        .doc(doseId)
        .get();

      if (!doseDoc.exists) {
        throw new Error('Dose not found');
      }

      const doseData = doseDoc.data();

      // Create a new alarm for the snooze time
      // Note: This uses the AlarmSchedulerService's createAlarm method
      // We need to create a single alarm, not a full schedule
      const medicine = {
        name: doseData.medicineName,
        dosageAmount: doseData.dosageAmount,
        dosageUnit: doseData.dosageUnit,
        instructions: doseData.instructions || '',
      };

      // Create the snoozed alarm
      await AlarmSchedulerService.createAlarm(medicineId, medicine, snoozeTime);

      console.log('Dose snoozed successfully until:', snoozeTime);
    } catch (error) {
      console.error('Error snoozing dose:', error);
      const mappedError = new Error('Failed to snooze dose');
      mappedError.code = 'dose-snooze-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new DoseTrackerService();
