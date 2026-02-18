/**
 * ScheduleService - Schedule Management Service
 *
 * Handles schedule CRUD operations for the PillSathi app.
 * Provides methods to create, update, delete, and query schedules.
 * Schedules define when medicines should be taken with time and repeat patterns.
 *
 * Requirements: 3.1, 3.2, 3.4, 4.5
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { retryOperation } from '../utils/retryHelper';
import { validateSchedule } from '../models/Schedule';

/**
 * ScheduleService class
 * Provides methods for schedule operations
 */
class ScheduleService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
    this.schedulesCollection = 'schedules';
    this.medicinesCollection = 'medicines';
    this.relationshipsCollection = 'relationships';
  }

  /**
   * Check if a caregiver is linked to a parent
   * Queries the relationships collection to verify the pairing exists.
   *
   * Requirements: 1.4, 5.1, 6.3
   *
   * @param {string} caregiverId - Caregiver's Firebase Auth UID
   * @param {string} parentId - Parent's Firebase Auth UID
   * @returns {Promise<boolean>} True if linked, false otherwise
   * @private
   */
  async checkCaregiverLinked(caregiverId, parentId) {
    try {
      // Query relationships where caregiver and parent match
      const querySnapshot = await this.firestore
        .collection(this.relationshipsCollection)
        .where('caregiverUid', '==', caregiverId)
        .where('parentUid', '==', parentId)
        .limit(1)
        .get();

      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking caregiver link:', error);
      return false;
    }
  }

  /**
   * Create a new schedule
   * Validates schedule data, checks that medicine exists, verifies authorization, and creates a new schedule record.
   * Links the schedule to a specific medicine.
   *
   * Requirements: 3.1 - Require at least one daily time
   * Requirements: 3.2 - Store all provided times
   * Requirements: 3.4 - Link schedule to medicine
   * Requirements: 4.5 - Store repeat pattern
   * Requirements: 1.4, 5.1 - Validate caregiver authorization
   *
   * @param {string} medicineId - Medicine document ID to link schedule to
   * @param {Object} data - Schedule data
   * @param {Array<string>} data.times - Array of times in "HH:MM" format (required, 1-10 items)
   * @param {string} data.repeatPattern - "daily" or "specific_days" (required)
   * @param {Array<number>} data.selectedDays - Array of day numbers 0-6 (required for specific_days)
   * @param {string} caregiverId - Caregiver's Firebase Auth UID
   * @returns {Promise<string>} Schedule document ID
   * @throws {Error} If validation fails, medicine not found, or unauthorized
   *
   * @example
   * try {
   *   const scheduleId = await scheduleService.createSchedule('med123', {
   *     times: ['08:00', '20:00'],
   *     repeatPattern: 'daily',
   *     selectedDays: []
   *   }, 'caregiver456');
   *   console.log('Schedule created:', scheduleId);
   * } catch (error) {
   *   console.error('Failed to create schedule:', error.message);
   * }
   */
  async createSchedule(medicineId, data, caregiverId) {
    try {
      // Validate schedule data
      const scheduleData = {
        ...data,
        medicineId,
      };
      const validation = validateSchedule(scheduleData);
      if (!validation.isValid) {
        const error = new Error('Schedule validation failed');
        error.code = 'validation-failed';
        error.errors = validation.errors;
        throw error;
      }

      return await retryOperation(async () => {
        // Check if medicine exists (Requirement 3.4)
        const medicineDoc = await this.firestore
          .collection(this.medicinesCollection)
          .doc(medicineId)
          .get();

        if (!medicineDoc.exists) {
          const error = new Error('Medicine not found');
          error.code = 'medicine-not-found';
          throw error;
        }

        const medicineData = medicineDoc.data();

        // Check authorization - caregiver must be linked to parent
        const isLinked = await this.checkCaregiverLinked(
          caregiverId,
          medicineData.parentId,
        );
        if (!isLinked) {
          const error = new Error(
            'You are not authorized to create a schedule for this medicine. Only linked caregivers can create schedules.',
          );
          error.code = 'unauthorized';
          throw error;
        }

        const now = new Date();

        // Create schedule document
        const scheduleRecord = {
          medicineId,
          times: data.times, // Requirement 3.2: Store all provided times
          repeatPattern: data.repeatPattern, // Requirement 4.5: Store repeat pattern
          selectedDays: data.selectedDays || [],
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await this.firestore
          .collection(this.schedulesCollection)
          .add(scheduleRecord);

        return docRef.id;
      });
    } catch (error) {
      if (
        error.code === 'validation-failed' ||
        error.code === 'medicine-not-found' ||
        error.code === 'unauthorized'
      ) {
        throw error;
      }

      const mappedError = new Error('Failed to create schedule');
      mappedError.code = 'schedule-create-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Update an existing schedule
   * Validates schedule data, verifies authorization, and updates the schedule record.
   * Preserves creation timestamp and updates the updatedAt timestamp.
   *
   * Requirements: 3.1 - Require at least one daily time
   * Requirements: 3.2 - Store all provided times
   * Requirements: 4.5 - Store repeat pattern
   * Requirements: 1.4, 5.1 - Validate caregiver authorization
   *
   * @param {string} scheduleId - Schedule document ID
   * @param {Object} data - Schedule data to update
   * @param {Array<string>} data.times - Array of times in "HH:MM" format (optional)
   * @param {string} data.repeatPattern - "daily" or "specific_days" (optional)
   * @param {Array<number>} data.selectedDays - Array of day numbers 0-6 (optional)
   * @param {string} caregiverId - Caregiver's Firebase Auth UID
   * @returns {Promise<void>}
   * @throws {Error} If validation fails, schedule not found, or unauthorized
   *
   * @example
   * try {
   *   await scheduleService.updateSchedule('sched123', {
   *     times: ['09:00', '21:00'],
   *     repeatPattern: 'specific_days',
   *     selectedDays: [1, 3, 5]
   *   }, 'caregiver456');
   *   console.log('Schedule updated successfully');
   * } catch (error) {
   *   console.error('Failed to update schedule:', error.message);
   * }
   */
  async updateSchedule(scheduleId, data, caregiverId) {
    try {
      return await retryOperation(async () => {
        // Fetch existing schedule
        const scheduleDoc = await this.firestore
          .collection(this.schedulesCollection)
          .doc(scheduleId)
          .get();

        if (!scheduleDoc.exists) {
          const error = new Error('Schedule not found');
          error.code = 'schedule-not-found';
          throw error;
        }

        const existingData = scheduleDoc.data();

        // Fetch medicine to check authorization
        const medicineDoc = await this.firestore
          .collection(this.medicinesCollection)
          .doc(existingData.medicineId)
          .get();

        if (!medicineDoc.exists) {
          const error = new Error('Associated medicine not found');
          error.code = 'medicine-not-found';
          throw error;
        }

        const medicineData = medicineDoc.data();

        // Check authorization - caregiver must be linked to parent
        const isLinked = await this.checkCaregiverLinked(
          caregiverId,
          medicineData.parentId,
        );
        if (!isLinked) {
          const error = new Error(
            'You are not authorized to update this schedule. Only linked caregivers can modify schedules.',
          );
          error.code = 'unauthorized';
          throw error;
        }

        // Merge with existing data for validation
        const updatedData = {
          ...existingData,
          ...data,
        };
        const validation = validateSchedule(updatedData);
        if (!validation.isValid) {
          const error = new Error('Schedule validation failed');
          error.code = 'validation-failed';
          error.errors = validation.errors;
          throw error;
        }

        // Update schedule document
        const updateData = {
          ...(data.times && { times: data.times }),
          ...(data.repeatPattern && { repeatPattern: data.repeatPattern }),
          ...(data.selectedDays !== undefined && {
            selectedDays: data.selectedDays,
          }),
          updatedAt: new Date(),
          // createdAt is NOT updated (preserved)
        };

        await this.firestore
          .collection(this.schedulesCollection)
          .doc(scheduleId)
          .update(updateData);
      });
    } catch (error) {
      if (
        error.code === 'validation-failed' ||
        error.code === 'schedule-not-found' ||
        error.code === 'medicine-not-found' ||
        error.code === 'unauthorized'
      ) {
        throw error;
      }

      const mappedError = new Error('Failed to update schedule');
      mappedError.code = 'schedule-update-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Delete a schedule
   * Removes the schedule record from Firestore.
   * Note: Cascade deletion of doses should be handled by Cloud Functions.
   *
   * Requirements: 1.4, 5.1 - Validate caregiver authorization
   *
   * @param {string} scheduleId - Schedule document ID
   * @param {string} caregiverId - Caregiver's Firebase Auth UID
   * @returns {Promise<void>}
   * @throws {Error} If schedule not found, unauthorized, or deletion fails
   *
   * @example
   * try {
   *   await scheduleService.deleteSchedule('sched123', 'caregiver456');
   *   console.log('Schedule deleted successfully');
   * } catch (error) {
   *   console.error('Failed to delete schedule:', error.message);
   * }
   */
  async deleteSchedule(scheduleId, caregiverId) {
    try {
      return await retryOperation(async () => {
        // Check if schedule exists
        const scheduleDoc = await this.firestore
          .collection(this.schedulesCollection)
          .doc(scheduleId)
          .get();

        if (!scheduleDoc.exists) {
          const error = new Error('Schedule not found');
          error.code = 'schedule-not-found';
          throw error;
        }

        const scheduleData = scheduleDoc.data();

        // Fetch medicine to check authorization
        const medicineDoc = await this.firestore
          .collection(this.medicinesCollection)
          .doc(scheduleData.medicineId)
          .get();

        if (!medicineDoc.exists) {
          const error = new Error('Associated medicine not found');
          error.code = 'medicine-not-found';
          throw error;
        }

        const medicineData = medicineDoc.data();

        // Check authorization - caregiver must be linked to parent
        const isLinked = await this.checkCaregiverLinked(
          caregiverId,
          medicineData.parentId,
        );
        if (!isLinked) {
          const error = new Error(
            'You are not authorized to delete this schedule. Only linked caregivers can delete schedules.',
          );
          error.code = 'unauthorized';
          throw error;
        }

        // Delete schedule document
        await this.firestore
          .collection(this.schedulesCollection)
          .doc(scheduleId)
          .delete();
      });
    } catch (error) {
      if (
        error.code === 'schedule-not-found' ||
        error.code === 'medicine-not-found' ||
        error.code === 'unauthorized'
      ) {
        throw error;
      }

      const mappedError = new Error('Failed to delete schedule');
      mappedError.code = 'schedule-delete-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get schedule for a medicine
   * Queries the schedule associated with a specific medicine.
   * Returns null if no schedule exists.
   *
   * @param {string} medicineId - Medicine document ID
   * @returns {Promise<Object|null>} Schedule object or null if not found
   * @throws {Error} If query fails
   *
   * @example
   * try {
   *   const schedule = await scheduleService.getScheduleForMedicine('med123');
   *   if (schedule) {
   *     console.log('Schedule times:', schedule.times);
   *   } else {
   *     console.log('No schedule found for this medicine');
   *   }
   * } catch (error) {
   *   console.error('Failed to get schedule:', error.message);
   * }
   */
  async getScheduleForMedicine(medicineId) {
    try {
      return await retryOperation(async () => {
        const querySnapshot = await this.firestore
          .collection(this.schedulesCollection)
          .where('medicineId', '==', medicineId)
          .limit(1)
          .get();

        if (querySnapshot.empty) {
          return null;
        }

        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || null,
          updatedAt: doc.data().updatedAt?.toDate() || null,
        };
      });
    } catch (error) {
      const mappedError = new Error('Failed to get schedule for medicine');
      mappedError.code = 'schedule-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new ScheduleService();
