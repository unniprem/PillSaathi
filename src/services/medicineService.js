/**
 * MedicineService - Medicine Management Service
 *
 * Handles medicine CRUD operations for the PillSathi app.
 * Provides methods to create, update, delete, and query medicines.
 * Enforces authorization rules to ensure only linked caregivers can manage medicines.
 *
 * Requirements: 1.1, 1.3, 1.5, 5.1, 5.2, 5.3, 6.1, 7.1, 7.3, 10.1, 11.1
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { retryOperation } from '../utils/retryHelper';
import { validateMedicine } from '../models/Medicine';
import offlineQueue from '../utils/offlineQueue';
import { isNetworkError } from '../utils/errorHandler';
import AlarmSchedulerService from './AlarmSchedulerService';
import scheduleService from './scheduleService';

/**
 * MedicineService class
 * Provides methods for medicine operations
 */
class MedicineService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
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
   * Create a new medicine
   * Validates medicine data, checks authorization, and creates a new medicine record.
   * Sets default status to 'active' and stores creation timestamps.
   *
   * Requirements: 1.1 - Create medicine with valid data
   * Requirements: 1.3 - Default status to active
   * Requirements: 1.5 - Store creator ID
   * Requirements: 16.4 - Queue writes when offline
   *
   * @param {Object} data - Medicine data
   * @param {string} data.name - Medicine name (required)
   * @param {string} data.parentId - Parent's Firebase Auth UID (required)
   * @param {string} data.caregiverId - Caregiver's Firebase Auth UID (required)
   * @param {number} data.dosageAmount - Dosage amount (required, positive number)
   * @param {string} data.dosageUnit - Dosage unit (required, e.g., "mg", "ml")
   * @param {string} data.instructions - Optional instructions
   * @param {boolean} [options.useOfflineQueue=false] - Whether to use offline queue for this operation
   * @returns {Promise<string>} Medicine document ID
   * @throws {Error} If validation fails or caregiver is not linked
   *
   * @example
   * try {
   *   const medicineId = await medicineService.createMedicine({
   *     name: 'Aspirin',
   *     parentId: 'parent123',
   *     caregiverId: 'caregiver456',
   *     dosageAmount: 100,
   *     dosageUnit: 'mg',
   *     instructions: 'Take with food'
   *   }, { useOfflineQueue: true });
   *   console.log('Medicine created:', medicineId);
   * } catch (error) {
   *   console.error('Failed to create medicine:', error.message);
   * }
   */
  async createMedicine(data, options = {}) {
    const { useOfflineQueue: shouldUseQueue = false } = options;

    try {
      // Validate medicine data
      const validation = validateMedicine(data);
      if (!validation.isValid) {
        const error = new Error('Medicine validation failed');
        error.code = 'validation-failed';
        error.errors = validation.errors;
        throw error;
      }

      // Check if caregiver is linked to parent (Requirement 1.4)
      const isLinked = await this.checkCaregiverLinked(
        data.caregiverId,
        data.parentId,
      );
      if (!isLinked) {
        const error = new Error('Caregiver is not linked to this parent');
        error.code = 'unauthorized';
        throw error;
      }

      const createOperation = async () => {
        return retryOperation(async () => {
          const now = new Date();

          // Create medicine document
          const medicineData = {
            name: data.name.trim(),
            parentId: data.parentId,
            caregiverId: data.caregiverId,
            dosageAmount: data.dosageAmount,
            dosageUnit: data.dosageUnit.trim(),
            instructions: data.instructions?.trim() || '',
            status: 'active', // Requirement 1.3: Default to active
            createdAt: now,
            updatedAt: now,
          };

          const docRef = await this.firestore
            .collection(this.medicinesCollection)
            .add(medicineData);

          return docRef.id;
        });
      };

      // Try to execute immediately
      try {
        const medicineId = await createOperation();

        // Schedule alarms if medicine is active and has a schedule (Requirement 1.1)
        try {
          const schedule = await scheduleService.getScheduleForMedicine(
            medicineId,
          );
          if (schedule && schedule.times && schedule.times.length > 0) {
            await AlarmSchedulerService.scheduleMedicineAlarms(
              medicineId,
              {
                name: data.name.trim(),
                dosageAmount: data.dosageAmount,
                dosageUnit: data.dosageUnit.trim(),
                instructions: data.instructions?.trim() || '',
              },
              schedule,
            );
            console.log('Alarms scheduled for new medicine:', medicineId);
          }
        } catch (alarmError) {
          // Log alarm scheduling error but don't fail medicine creation
          console.error(
            'Failed to schedule alarms for medicine:',
            medicineId,
            alarmError,
          );
        }

        return medicineId;
      } catch (error) {
        // If network error and offline queue enabled, queue the operation
        if (shouldUseQueue && isNetworkError(error)) {
          console.log('[MedicineService] Network error, queueing operation');
          await offlineQueue.enqueue('createMedicine', createOperation, {
            medicineName: data.name,
          });

          // Return a temporary ID
          const tempId = `temp_${Date.now()}`;
          return tempId;
        }
        throw error;
      }
    } catch (error) {
      if (error.code === 'validation-failed' || error.code === 'unauthorized') {
        throw error;
      }

      const mappedError = new Error('Failed to create medicine');
      mappedError.code = 'medicine-create-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Update an existing medicine
   * Validates medicine data, checks authorization, and updates the medicine record.
   * Preserves creation timestamp and updates the updatedAt timestamp.
   *
   * Requirements: 5.1 - Validate caregiver is linked
   * Requirements: 5.2 - Preserve creation timestamp
   * Requirements: 5.3 - Update last modified timestamp
   * Requirements: 5.5 - Reject unauthorized updates
   *
   * @param {string} medicineId - Medicine document ID
   * @param {Object} data - Medicine data to update
   * @param {string} caregiverId - Caregiver's Firebase Auth UID
   * @returns {Promise<void>}
   * @throws {Error} If validation fails, medicine not found, or unauthorized
   *
   * @example
   * try {
   *   await medicineService.updateMedicine('med123', {
   *     name: 'Aspirin',
   *     dosageAmount: 150,
   *     dosageUnit: 'mg',
   *     instructions: 'Take with food after meals'
   *   }, 'caregiver456');
   *   console.log('Medicine updated successfully');
   * } catch (error) {
   *   console.error('Failed to update medicine:', error.message);
   * }
   */
  async updateMedicine(medicineId, data, caregiverId) {
    try {
      return await retryOperation(async () => {
        // Fetch existing medicine
        const medicineDoc = await this.firestore
          .collection(this.medicinesCollection)
          .doc(medicineId)
          .get();

        if (!medicineDoc.exists) {
          const error = new Error('Medicine not found');
          error.code = 'medicine-not-found';
          throw error;
        }

        const existingData = medicineDoc.data();

        // Check authorization (Requirement 5.1, 5.5)
        const isLinked = await this.checkCaregiverLinked(
          caregiverId,
          existingData.parentId,
        );
        if (!isLinked) {
          const error = new Error(
            'You are not authorized to update this medicine. Only linked caregivers can modify medicines.',
          );
          error.code = 'unauthorized';
          throw error;
        }

        // Validate updated data
        const updatedData = {
          ...existingData,
          ...data,
        };
        const validation = validateMedicine(updatedData);
        if (!validation.isValid) {
          const error = new Error('Medicine validation failed');
          error.code = 'validation-failed';
          error.errors = validation.errors;
          throw error;
        }

        // Update medicine document
        const updateData = {
          ...(data.name && { name: data.name.trim() }),
          ...(data.dosageAmount && { dosageAmount: data.dosageAmount }),
          ...(data.dosageUnit && { dosageUnit: data.dosageUnit.trim() }),
          ...(data.instructions !== undefined && {
            instructions: data.instructions.trim(),
          }),
          updatedAt: new Date(), // Requirement 5.3: Update timestamp
          // Requirement 5.2: createdAt is NOT updated (preserved)
        };

        await this.firestore
          .collection(this.medicinesCollection)
          .doc(medicineId)
          .update(updateData);

        // Reschedule alarms if medicine data changed and medicine is active (Requirement 1.2)
        if (existingData.status === 'active') {
          try {
            const schedule = await scheduleService.getScheduleForMedicine(
              medicineId,
            );
            if (schedule && schedule.times && schedule.times.length > 0) {
              // Get updated medicine data for alarm scheduling
              const updatedMedicine = {
                name: data.name?.trim() || existingData.name,
                dosageAmount: data.dosageAmount || existingData.dosageAmount,
                dosageUnit: data.dosageUnit?.trim() || existingData.dosageUnit,
                instructions:
                  data.instructions !== undefined
                    ? data.instructions.trim()
                    : existingData.instructions || '',
              };

              await AlarmSchedulerService.rescheduleMedicineAlarms(
                medicineId,
                updatedMedicine,
                schedule,
              );
              console.log(
                'Alarms rescheduled for updated medicine:',
                medicineId,
              );
            }
          } catch (alarmError) {
            // Log alarm rescheduling error but don't fail medicine update
            console.error(
              'Failed to reschedule alarms for medicine:',
              medicineId,
              alarmError,
            );
          }
        }
      });
    } catch (error) {
      if (
        error.code === 'validation-failed' ||
        error.code === 'unauthorized' ||
        error.code === 'medicine-not-found'
      ) {
        throw error;
      }

      const mappedError = new Error('Failed to update medicine');
      mappedError.code = 'medicine-update-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Delete a medicine
   * Removes the medicine record from Firestore.
   * Note: Cascade deletion of schedules and doses should be handled by Cloud Functions.
   *
   * Requirements: 6.1 - Remove medicine record
   * Requirements: 6.3 - Validate caregiver is authorized
   *
   * @param {string} medicineId - Medicine document ID
   * @param {string} caregiverId - Caregiver's Firebase Auth UID
   * @returns {Promise<void>}
   * @throws {Error} If medicine not found, unauthorized, or deletion fails
   *
   * @example
   * try {
   *   await medicineService.deleteMedicine('med123', 'caregiver456');
   *   console.log('Medicine deleted successfully');
   * } catch (error) {
   *   console.error('Failed to delete medicine:', error.message);
   * }
   */
  async deleteMedicine(medicineId, caregiverId) {
    try {
      return await retryOperation(async () => {
        // Check if medicine exists
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

        // Check authorization (Requirement 6.3)
        const isLinked = await this.checkCaregiverLinked(
          caregiverId,
          medicineData.parentId,
        );
        if (!isLinked) {
          const error = new Error(
            'You are not authorized to delete this medicine. Only linked caregivers can delete medicines.',
          );
          error.code = 'unauthorized';
          throw error;
        }

        // Cancel alarms before deleting medicine (Requirement 1.3)
        try {
          await AlarmSchedulerService.cancelMedicineAlarms(medicineId);
          console.log('Alarms cancelled for deleted medicine:', medicineId);
        } catch (alarmError) {
          // Log alarm cancellation error but don't fail medicine deletion
          console.error(
            'Failed to cancel alarms for medicine:',
            medicineId,
            alarmError,
          );
        }

        // Delete medicine document
        await this.firestore
          .collection(this.medicinesCollection)
          .doc(medicineId)
          .delete();
      });
    } catch (error) {
      if (
        error.code === 'medicine-not-found' ||
        error.code === 'unauthorized'
      ) {
        throw error;
      }

      const mappedError = new Error('Failed to delete medicine');
      mappedError.code = 'medicine-delete-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Toggle medicine status (active/inactive)
   * Switches medicine status between 'active' and 'inactive'.
   *
   * Requirements: 7.1 - Set status to inactive
   * Requirements: 7.3 - Set status to active
   * Requirements: 7.5 - Validate caregiver authorization
   *
   * @param {string} medicineId - Medicine document ID
   * @param {string} caregiverId - Caregiver's Firebase Auth UID
   * @returns {Promise<string>} New status ('active' or 'inactive')
   * @throws {Error} If medicine not found, unauthorized, or update fails
   *
   * @example
   * try {
   *   const newStatus = await medicineService.toggleMedicineStatus('med123', 'caregiver456');
   *   console.log('Medicine status:', newStatus);
   * } catch (error) {
   *   console.error('Failed to toggle status:', error.message);
   * }
   */
  async toggleMedicineStatus(medicineId, caregiverId) {
    try {
      return await retryOperation(async () => {
        // Fetch existing medicine
        const medicineDoc = await this.firestore
          .collection(this.medicinesCollection)
          .doc(medicineId)
          .get();

        if (!medicineDoc.exists) {
          const error = new Error('Medicine not found');
          error.code = 'medicine-not-found';
          throw error;
        }

        const existingData = medicineDoc.data();

        // Check authorization (Requirement 7.5)
        const isLinked = await this.checkCaregiverLinked(
          caregiverId,
          existingData.parentId,
        );
        if (!isLinked) {
          const error = new Error(
            'You are not authorized to change the status of this medicine. Only linked caregivers can modify medicine status.',
          );
          error.code = 'unauthorized';
          throw error;
        }

        const currentStatus = existingData.status || 'active';

        // Toggle status
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        // Update medicine document
        await this.firestore
          .collection(this.medicinesCollection)
          .doc(medicineId)
          .update({
            status: newStatus,
            updatedAt: new Date(),
          });

        // Handle alarm scheduling based on status change
        try {
          if (newStatus === 'inactive') {
            // Cancel alarms when deactivating (Requirement 1.4)
            await AlarmSchedulerService.cancelMedicineAlarms(medicineId);
            console.log(
              'Alarms cancelled for deactivated medicine:',
              medicineId,
            );
          } else if (newStatus === 'active') {
            // Recreate alarms when reactivating (Requirement 1.5)
            const schedule = await scheduleService.getScheduleForMedicine(
              medicineId,
            );
            if (schedule && schedule.times && schedule.times.length > 0) {
              await AlarmSchedulerService.scheduleMedicineAlarms(
                medicineId,
                {
                  name: existingData.name,
                  dosageAmount: existingData.dosageAmount,
                  dosageUnit: existingData.dosageUnit,
                  instructions: existingData.instructions || '',
                },
                schedule,
              );
              console.log(
                'Alarms scheduled for reactivated medicine:',
                medicineId,
              );
            }
          }
        } catch (alarmError) {
          // Log alarm error but don't fail status toggle
          console.error(
            'Failed to handle alarms for status change:',
            medicineId,
            alarmError,
          );
        }

        return newStatus;
      });
    } catch (error) {
      if (
        error.code === 'medicine-not-found' ||
        error.code === 'unauthorized'
      ) {
        throw error;
      }

      const mappedError = new Error('Failed to toggle medicine status');
      mappedError.code = 'medicine-status-toggle-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get all medicines for a parent
   * Queries all medicines (active and inactive) for a specific parent.
   *
   * Requirements: 10.1 - Display all medicines for parent
   *
   * @param {string} parentId - Parent's Firebase Auth UID
   * @returns {Promise<Array<Object>>} Array of medicine objects
   * @throws {Error} If query fails
   *
   * @example
   * try {
   *   const medicines = await medicineService.getMedicinesForParent('parent123');
   *   medicines.forEach(med => {
   *     console.log('Medicine:', med.name, 'Status:', med.status);
   *   });
   * } catch (error) {
   *   console.error('Failed to get medicines:', error.message);
   * }
   */
  async getMedicinesForParent(parentId) {
    try {
      return await retryOperation(async () => {
        const querySnapshot = await this.firestore
          .collection(this.medicinesCollection)
          .where('parentId', '==', parentId)
          .get();

        if (querySnapshot.empty) {
          return [];
        }

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || null,
          updatedAt: doc.data().updatedAt?.toDate() || null,
        }));
      });
    } catch (error) {
      const mappedError = new Error('Failed to get medicines for parent');
      mappedError.code = 'medicines-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get active medicines for a parent
   * Queries only active medicines for a specific parent.
   *
   * Requirements: 11.1 - Display only active medicines
   *
   * @param {string} parentId - Parent's Firebase Auth UID
   * @returns {Promise<Array<Object>>} Array of active medicine objects
   * @throws {Error} If query fails
   *
   * @example
   * try {
   *   const medicines = await medicineService.getActiveMedicinesForParent('parent123');
   *   medicines.forEach(med => {
   *     console.log('Active medicine:', med.name);
   *   });
   * } catch (error) {
   *   console.error('Failed to get active medicines:', error.message);
   * }
   */
  async getActiveMedicinesForParent(parentId) {
    try {
      return await retryOperation(async () => {
        const querySnapshot = await this.firestore
          .collection(this.medicinesCollection)
          .where('parentId', '==', parentId)
          .where('status', '==', 'active')
          .get();

        if (querySnapshot.empty) {
          return [];
        }

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || null,
          updatedAt: doc.data().updatedAt?.toDate() || null,
        }));
      });
    } catch (error) {
      const mappedError = new Error(
        'Failed to get active medicines for parent',
      );
      mappedError.code = 'active-medicines-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get a single medicine by ID
   * Fetches a specific medicine document by its ID.
   *
   * Requirements: 6.2 - Display medicine details
   *
   * @param {string} medicineId - Medicine document ID
   * @returns {Promise<Object>} Medicine object with all fields
   * @throws {Error} If medicine not found or query fails
   *
   * @example
   * try {
   *   const medicine = await medicineService.getMedicineById('med123');
   *   console.log('Medicine:', medicine.name, medicine.dosageAmount, medicine.dosageUnit);
   * } catch (error) {
   *   console.error('Failed to get medicine:', error.message);
   * }
   */
  async getMedicineById(medicineId) {
    try {
      return await retryOperation(async () => {
        const docSnapshot = await this.firestore
          .collection(this.medicinesCollection)
          .doc(medicineId)
          .get();

        if (!docSnapshot.exists) {
          const error = new Error('Medicine not found');
          error.code = 'medicine-not-found';
          throw error;
        }

        return {
          id: docSnapshot.id,
          ...docSnapshot.data(),
          createdAt: docSnapshot.data().createdAt?.toDate() || null,
          updatedAt: docSnapshot.data().updatedAt?.toDate() || null,
        };
      });
    } catch (error) {
      if (error.code === 'medicine-not-found') {
        throw error;
      }
      const mappedError = new Error('Failed to get medicine');
      mappedError.code = 'medicine-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new MedicineService();
