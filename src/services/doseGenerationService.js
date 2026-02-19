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
              status: 'pending',
              createdAt: new Date(),
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

      // Generate new doses
      return await this.onScheduleCreated(scheduleId, scheduleData, medicineId);
    } catch (error) {
      console.error('Error regenerating doses:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new DoseGenerationService();
