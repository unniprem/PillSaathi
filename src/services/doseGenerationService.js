/**
 * Dose Generation Service
 *
 * Generates dose instances from schedules directly in the app.
 * This runs client-side instead of using Cloud Functions.
 *
 * @format
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

/**
 * DoseGenerationService class
 */
class DoseGenerationService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
  }

  /**
   * Generate doses for a schedule
   *
   * @param {Object} schedule - Schedule data
   * @param {Object} medicine - Medicine data
   * @param {Date} startDate - Start date for generation
   * @param {number} days - Number of days to generate (default: 7)
   * @returns {Array<Object>} Array of dose objects
   */
  generateDosesForSchedule(schedule, medicine, startDate, days = 7) {
    const doses = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    // Track generated dose times to prevent duplicates
    const generatedDoseTimes = new Set();

    // Iterate through each day in the window
    for (
      let date = new Date(startDate);
      date < endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dayOfWeek = date.getDay();

      // Check if this day matches the repeat pattern
      let shouldCreateDose = false;
      if (schedule.repeatPattern === 'daily') {
        shouldCreateDose = true;
      } else if (schedule.repeatPattern === 'specific_days') {
        shouldCreateDose = schedule.selectedDays?.includes(dayOfWeek) || false;
      }

      if (shouldCreateDose) {
        // Create a dose for each time in the schedule
        for (const time of schedule.times || []) {
          const [hours, minutes] = time.split(':').map(Number);
          const scheduledTime = new Date(date);
          scheduledTime.setHours(hours, minutes, 0, 0);

          // Create unique key to prevent duplicates
          const doseKey = `${medicine.id}_${scheduledTime.getTime()}`;

          if (!generatedDoseTimes.has(doseKey)) {
            generatedDoseTimes.add(doseKey);

            doses.push({
              medicineId: medicine.id,
              scheduleId: schedule.id,
              parentId: medicine.parentId,
              medicineName: medicine.name,
              dosageAmount: medicine.dosageAmount,
              dosageUnit: medicine.dosageUnit,
              scheduledTime,
              status: 'scheduled', // Changed from 'pending' to 'scheduled'
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
    }

    return doses;
  }

  /**
   * Write doses to Firestore in batches
   *
   * @param {Array<Object>} doses - Array of dose objects
   * @returns {Promise<number>} Number of doses written
   */
  async writeDosesInBatches(doses) {
    const BATCH_SIZE = 500;
    let totalWritten = 0;

    // Split doses into batches
    for (let i = 0; i < doses.length; i += BATCH_SIZE) {
      const batchDoses = doses.slice(i, i + BATCH_SIZE);
      const batch = this.firestore.batch();

      // Add all doses in this batch
      for (const dose of batchDoses) {
        const doseRef = this.firestore.collection('doses').doc();
        batch.set(doseRef, dose);
      }

      // Commit the batch
      await batch.commit();
      totalWritten += batchDoses.length;
      console.log(`Written ${totalWritten} doses so far...`);
    }

    return totalWritten;
  }

  /**
   * Delete future doses for a schedule
   *
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<number>} Number of doses deleted
   */
  async deleteFutureDoses(scheduleId) {
    const now = new Date();
    const querySnapshot = await this.firestore
      .collection('doses')
      .where('scheduleId', '==', scheduleId)
      .where('scheduledTime', '>', now)
      .get();

    if (querySnapshot.empty) {
      return 0;
    }

    // Delete in batches
    const batch = this.firestore.batch();
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return querySnapshot.size;
  }

  /**
   * Generate doses when a schedule is created
   *
   * @param {string} scheduleId - Schedule ID
   * @param {Object} scheduleData - Schedule data
   * @param {string} medicineId - Medicine ID
   * @returns {Promise<number>} Number of doses generated
   */
  async onScheduleCreated(scheduleId, scheduleData, medicineId) {
    try {
      console.log(`Generating doses for new schedule ${scheduleId}...`);

      // Fetch the medicine
      const medicineDoc = await this.firestore
        .collection('medicines')
        .doc(medicineId)
        .get();

      if (!medicineDoc.exists) {
        console.error(`Medicine ${medicineId} not found`);
        return 0;
      }

      const medicineData = medicineDoc.data();

      // Only generate if medicine is active
      if (medicineData.status !== 'active') {
        console.log(`Medicine ${medicineId} is inactive, skipping`);
        return 0;
      }

      // Prepare objects
      const schedule = {
        id: scheduleId,
        ...scheduleData,
      };

      const medicine = {
        id: medicineDoc.id,
        ...medicineData,
      };

      // Generate doses for next 7 days
      const startDate = new Date();
      const doses = this.generateDosesForSchedule(
        schedule,
        medicine,
        startDate,
        7,
      );

      // Write to Firestore
      const dosesWritten = await this.writeDosesInBatches(doses);

      console.log(`Successfully generated ${dosesWritten} doses`);

      // Schedule alarms for this medicine
      try {
        const AlarmSchedulerService =
          require('./AlarmSchedulerService').default;

        // Only schedule alarms if current user is the parent
        // Alarms should only trigger on parent's device, not caregiver's
        const { getAuth } = require('@react-native-firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;

        console.log('Checking if should schedule alarms:', {
          hasCurrentUser: !!currentUser,
          currentUserId: currentUser?.uid,
          parentId: medicineData.parentId,
          isMatch: currentUser?.uid === medicineData.parentId,
        });

        if (currentUser && currentUser.uid === medicineData.parentId) {
          console.log('Scheduling alarms for parent device...');
          await AlarmSchedulerService.scheduleMedicineAlarms(
            medicineId,
            {
              name: medicineData.name,
              dosageAmount: medicineData.dosageAmount,
              dosageUnit: medicineData.dosageUnit,
              instructions: medicineData.instructions || '',
            },
            scheduleData,
          );
          console.log(
            `✓ Alarms scheduled for medicine ${medicineId} on parent device`,
          );
        } else {
          console.log(
            `✗ Skipping alarm scheduling - current user (${currentUser?.uid}) is not the parent (${medicineData.parentId})`,
          );
        }
      } catch (alarmError) {
        console.error('Failed to schedule alarms:', alarmError);
        // Don't fail dose generation if alarm scheduling fails
      }

      return dosesWritten;
    } catch (error) {
      console.error('Error generating doses:', error);
      throw error;
    }
  }

  /**
   * Regenerate doses when a schedule is updated
   *
   * @param {string} scheduleId - Schedule ID
   * @param {Object} scheduleData - Updated schedule data
   * @param {string} medicineId - Medicine ID
   * @returns {Promise<number>} Number of doses generated
   */
  async onScheduleUpdated(scheduleId, scheduleData, medicineId) {
    try {
      console.log(`Regenerating doses for updated schedule ${scheduleId}...`);

      // Delete future doses
      const deletedCount = await this.deleteFutureDoses(scheduleId);
      console.log(`Deleted ${deletedCount} future doses`);

      // Cancel existing alarms for this medicine
      try {
        const AlarmSchedulerService =
          require('./AlarmSchedulerService').default;
        await AlarmSchedulerService.cancelMedicineAlarms(medicineId);
        console.log(`Cancelled alarms for medicine ${medicineId}`);
      } catch (alarmError) {
        console.error('Failed to cancel alarms:', alarmError);
      }

      // Generate new doses (this will also schedule new alarms)
      return await this.onScheduleCreated(scheduleId, scheduleData, medicineId);
    } catch (error) {
      console.error('Error regenerating doses:', error);
      throw error;
    }
  }

  /**
   * Clean up old doses (older than specified days) for a specific parent
   * This should be called by parents to maintain their dose history
   *
   * @param {string} parentId - Parent user ID
   * @param {number} daysToKeep - Number of days of history to keep (default: 30)
   * @returns {Promise<number>} Number of doses deleted
   */
  async cleanupOldDoses(parentId, daysToKeep = 30) {
    try {
      console.log(
        `Cleaning up doses older than ${daysToKeep} days for parent ${parentId}...`,
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const querySnapshot = await this.firestore
        .collection('doses')
        .where('parentId', '==', parentId)
        .where('scheduledTime', '<', cutoffDate)
        .get();

      if (querySnapshot.empty) {
        console.log('No old doses to clean up');
        return 0;
      }

      // Delete in batches
      const BATCH_SIZE = 500;
      let totalDeleted = 0;

      for (let i = 0; i < querySnapshot.docs.length; i += BATCH_SIZE) {
        const batchDocs = querySnapshot.docs.slice(i, i + BATCH_SIZE);
        const batch = this.firestore.batch();

        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        totalDeleted += batchDocs.length;
        console.log(`Deleted ${totalDeleted} old doses so far...`);
      }

      console.log(`Successfully deleted ${totalDeleted} old doses`);
      return totalDeleted;
    } catch (error) {
      console.error('Error cleaning up old doses:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new DoseGenerationService();
