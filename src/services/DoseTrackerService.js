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
import { retryOperation } from '../utils/retryHelper';
import AlarmSchedulerService from './AlarmSchedulerService';
import OfflineQueueService from './OfflineQueueService';

class DoseTrackerService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
    this.dosesCollection = 'doses';
    this.initialized = false;
  }

  /**
   * Initialize the DoseTrackerService
   * Sets up offline queue monitoring and auto-sync
   *
   * Requirements: 8.6 - Trigger sync when connectivity restored
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize offline queue service with sync callback
      await OfflineQueueService.initialize(async () => {
        // Auto-sync when connectivity is restored
        await this.syncOfflineActions();
      });

      this.initialized = true;
      console.log('DoseTrackerService initialized with offline support');
    } catch (error) {
      console.error('Failed to initialize DoseTrackerService:', error);
    }
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
   * Delegates to OfflineQueueService
   *
   * Requirements: 8.2 - Queue offline actions
   *
   * @param {Object} action - Action to queue
   * @returns {Promise<string>} Action ID
   */
  async queueOfflineAction(action) {
    return OfflineQueueService.queueOfflineAction(action);
  }

  /**
   * Sync offline actions to Firestore
   * Processes queued actions when connectivity is restored
   * Preserves original timestamps during sync
   *
   * Requirements: 4.8 - Sync offline actions when connectivity restored
   * Requirements: 8.3 - Sync all offline actions to Firestore
   * Requirements: 8.4 - Preserve original timestamps during sync
   *
   * @returns {Promise<number>} Number of actions synced successfully
   */
  async syncOfflineActions() {
    try {
      // Check if we're online
      if (!OfflineQueueService.isOnline()) {
        console.log('Cannot sync offline actions: device is offline');
        return 0;
      }

      // Get offline queue
      const queue = await OfflineQueueService.getQueue();

      if (queue.actions.length === 0) {
        console.log('No offline actions to sync');
        return 0;
      }

      console.log(`Syncing ${queue.actions.length} offline actions...`);

      let syncedCount = 0;
      const failedActions = [];

      // Process each action
      for (const action of queue.actions) {
        try {
          await this.processOfflineAction(action);

          // Remove successfully synced action from queue
          await OfflineQueueService.removeAction(action.id);
          syncedCount++;

          console.log('Successfully synced action:', action.id);
        } catch (error) {
          console.error('Failed to sync action:', action.id, error);

          // Increment retry count
          const newRetryCount = (action.retryCount || 0) + 1;

          // If retry count exceeds threshold, log and skip
          if (newRetryCount >= 5) {
            console.error(
              'Action exceeded max retries, removing from queue:',
              action.id,
            );
            await OfflineQueueService.removeAction(action.id);
          } else {
            // Update retry count for next sync attempt
            await OfflineQueueService.updateRetryCount(
              action.id,
              newRetryCount,
            );
            failedActions.push(action);
          }
        }
      }

      if (failedActions.length > 0) {
        console.log(
          `Sync complete: ${syncedCount} succeeded, ${failedActions.length} failed`,
        );
      } else {
        console.log(
          `Sync complete: ${syncedCount} actions synced successfully`,
        );
      }

      return syncedCount;
    } catch (error) {
      console.error('Error syncing offline actions:', error);
      throw new Error('Failed to sync offline actions');
    }
  }

  /**
   * Process a single offline action
   * Applies the action to Firestore with original timestamp preserved
   * Uses Firestore transactions for atomic updates and conflict resolution
   *
   * Requirements: 8.4 - Preserve original timestamps during sync
   * Requirements: 8.5 - Apply parent's action as authoritative in conflicts
   *
   * @param {Object} action - Action to process
   * @returns {Promise<void>}
   * @private
   */
  async processOfflineAction(action) {
    const { type, doseId, timestamp, data } = action;

    console.log('Processing offline action:', { type, doseId, timestamp });

    // Use Firestore transaction for atomic updates (Requirement 8.5)
    await this.firestore.runTransaction(async transaction => {
      const doseRef = this.firestore
        .collection(this.dosesCollection)
        .doc(doseId);
      const doseDoc = await transaction.get(doseRef);

      if (!doseDoc.exists) {
        throw new Error(`Dose not found: ${doseId}`);
      }

      // Prepare update data based on action type
      let updateData = {};

      switch (type) {
        case 'mark_taken':
          // Parent's action is authoritative (Requirement 8.5)
          // Even if dose was already updated, apply parent's action
          updateData = {
            status: 'taken',
            takenAt: timestamp, // Use original timestamp (Requirement 8.4)
            updatedAt: new Date(),
          };
          console.log(
            'Applying parent action: mark as taken with timestamp',
            timestamp,
          );
          break;

        case 'mark_skipped':
          // Parent's action is authoritative (Requirement 8.5)
          updateData = {
            status: 'skipped',
            skippedReason: data.reason || null,
            updatedAt: new Date(),
          };
          console.log('Applying parent action: mark as skipped');
          break;

        default:
          throw new Error(`Unknown offline action type: ${type}`);
      }

      // Apply update within transaction
      transaction.update(doseRef, updateData);

      console.log('Transaction update prepared for dose:', doseId);
    });

    console.log('Successfully processed offline action:', action.id);
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
  /**
   * Get dose history for a medicine
   * Supports date range filtering, status filtering, sorting, and pagination
   *
   * Requirements: 6.1 - Display doses in reverse chronological order
   * Requirements: 6.5 - Support filtering by date range
   * Requirements: 6.6 - Support filtering by status
   * Requirements: 10.7 - Support querying doses by date range and status
   *
   * @param {string} medicineId - Medicine ID
   * @param {Date} startDate - Start date for history
   * @param {Date} endDate - End date for history
   * @param {Array<string>} statusFilter - Optional status filter (e.g., ['taken', 'missed'])
   * @param {number} limit - Optional limit for pagination (default: 50)
   * @param {Object} lastDoc - Optional last document for pagination
   * @returns {Promise<{doses: Array<Object>, lastDoc: Object}>} Dose records and last document for pagination
   * @throws {Error} If query fails
   */
  async getDoseHistory(
    medicineId,
    startDate,
    endDate,
    statusFilter = null,
    limit = 50,
    lastDoc = null,
  ) {
    try {
      console.log('Querying dose history:', {
        medicineId,
        startDate,
        endDate,
        statusFilter,
        limit,
      });

      // Build query with medicineId filter
      let query = this.firestore
        .collection(this.dosesCollection)
        .where('medicineId', '==', medicineId);

      // Add date range filter (Requirement 6.5, 10.7)
      if (startDate) {
        query = query.where('scheduledTime', '>=', startDate);
      }
      if (endDate) {
        query = query.where('scheduledTime', '<=', endDate);
      }

      // Add status filter if provided (Requirement 6.6, 10.7)
      if (statusFilter && statusFilter.length > 0) {
        query = query.where('status', 'in', statusFilter);
      }

      // Sort by scheduledTime descending (Requirement 6.1)
      query = query.orderBy('scheduledTime', 'desc');

      // Add pagination
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      query = query.limit(limit);

      // Execute query
      const snapshot = await query.get();

      const doses = [];
      snapshot.forEach(doc => {
        doses.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log(`Retrieved ${doses.length} dose records`);

      return {
        doses,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      };
    } catch (error) {
      console.error('Error querying dose history:', error);
      const mappedError = new Error('Failed to query dose history');
      mappedError.code = 'dose-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get today's doses for a medicine
   * Filters by medicine and parent ID for current date
   *
   * Requirements: 7.1 - Get doses for current date
   *
   * @param {string} medicineId - Medicine ID
   * @param {string} parentId - Parent ID
   * @returns {Promise<Array<Object>>} Array of today's doses
   * @throws {Error} If query fails
   */
  async getTodaysDoses(medicineId, parentId) {
    try {
      // Calculate today's date range (00:00:00 to 23:59:59 local time)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      console.log("Querying today's doses:", {
        medicineId,
        parentId,
        startOfDay,
        endOfDay,
      });

      // Build query
      const query = this.firestore
        .collection(this.dosesCollection)
        .where('medicineId', '==', medicineId)
        .where('parentId', '==', parentId)
        .where('scheduledTime', '>=', startOfDay)
        .where('scheduledTime', '<=', endOfDay)
        .orderBy('scheduledTime', 'asc');

      // Execute query
      const snapshot = await query.get();

      const doses = [];
      snapshot.forEach(doc => {
        doses.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log(`Retrieved ${doses.length} doses for today`);

      return doses;
    } catch (error) {
      console.error("Error querying today's doses:", error);
      const mappedError = new Error("Failed to query today's doses");
      mappedError.code = 'dose-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Calculate adherence percentage for a medicine
   * Counts taken doses vs total doses in date range
   *
   * Requirements: 6.7 - Calculate and display adherence percentage
   *
   * @param {string} medicineId - Medicine ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Adherence percentage (0-100)
   * @throws {Error} If calculation fails
   */
  async calculateAdherence(medicineId, startDate, endDate) {
    try {
      console.log('Calculating adherence:', {
        medicineId,
        startDate,
        endDate,
      });

      // Query all doses in date range
      const query = this.firestore
        .collection(this.dosesCollection)
        .where('medicineId', '==', medicineId)
        .where('scheduledTime', '>=', startDate)
        .where('scheduledTime', '<=', endDate);

      const snapshot = await query.get();

      if (snapshot.empty) {
        console.log('No doses found for adherence calculation');
        return 0;
      }

      // Count total doses and taken doses
      let totalDoses = 0;
      let takenDoses = 0;

      snapshot.forEach(doc => {
        const dose = doc.data();
        totalDoses++;
        if (dose.status === 'taken') {
          takenDoses++;
        }
      });

      // Calculate adherence percentage
      const adherence = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

      console.log(
        `Adherence: ${takenDoses}/${totalDoses} = ${adherence.toFixed(2)}%`,
      );

      return adherence;
    } catch (error) {
      console.error('Error calculating adherence:', error);
      const mappedError = new Error('Failed to calculate adherence');
      mappedError.code = 'adherence-calculation-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new DoseTrackerService();
