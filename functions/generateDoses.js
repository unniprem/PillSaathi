/**
 * Dose Generation Module
 *
 * This module contains the logic for generating dose instances from schedules.
 * Doses are created for a 7-day window based on the schedule's repeat pattern.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4
 */

/**
 * Generates doses for a schedule over a specified number of days
 *
 * @param {Object} schedule - Schedule document data
 * @param {string} schedule.id - Schedule document ID
 * @param {string} schedule.medicineId - Reference to medicine
 * @param {Array<string>} schedule.times - Array of times in "HH:MM" format
 * @param {string} schedule.repeatPattern - "daily" or "specific_days"
 * @param {Array<number>} schedule.selectedDays - Day numbers (0=Sunday, 6=Saturday)
 *
 * @param {Object} medicine - Medicine document data
 * @param {string} medicine.id - Medicine document ID
 * @param {string} medicine.parentId - Parent user ID
 * @param {string} medicine.name - Medicine name
 * @param {number} medicine.dosageAmount - Dosage amount
 * @param {string} medicine.dosageUnit - Dosage unit
 *
 * @param {Date} startDate - Start date for dose generation
 * @param {number} days - Number of days to generate doses for (default: 7)
 *
 * @returns {Array<Object>} - Array of dose objects ready to be written to Firestore
 *
 * Requirements:
 * - 8.1: Generate doses for next 7 days
 * - 8.2: Use schedule's time and repeat pattern
 * - 8.3: Daily pattern creates doses for every day
 * - 8.4: Specific days pattern creates doses only for selected days
 * - 8.5: Link each dose to medicine and schedule
 * - 9.3: No duplicate doses for same time
 */
function generateDosesForSchedule(schedule, medicine, startDate, days = 7) {
  const doses = [];
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  // Track generated dose times to prevent duplicates (Requirement 9.3)
  const generatedDoseTimes = new Set();

  // Iterate through each day in the window (Requirement 8.1)
  for (
    let date = new Date(startDate);
    date < endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const dayOfWeek = date.getDay();

    // Check if this day matches the repeat pattern (Requirements 8.2, 8.3, 8.4)
    let shouldCreateDose = false;
    if (schedule.repeatPattern === 'daily') {
      // Requirement 8.3: Daily pattern generates doses every day
      shouldCreateDose = true;
    } else if (schedule.repeatPattern === 'specific_days') {
      // Requirement 8.4: Specific days pattern generates selective doses
      shouldCreateDose = schedule.selectedDays.includes(dayOfWeek);
    }

    if (shouldCreateDose) {
      // Create a dose for each time in the schedule (Requirement 8.2)
      for (const time of schedule.times) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Create unique key to prevent duplicates (Requirement 9.3)
        const doseKey = `${medicine.id}_${scheduledTime.getTime()}`;

        if (!generatedDoseTimes.has(doseKey)) {
          generatedDoseTimes.add(doseKey);

          // Requirement 8.5: Link dose to medicine and schedule
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

module.exports = {
  generateDosesForSchedule,
};

/**
 * Writes doses to Firestore in batches
 *
 * Firestore has a limit of 500 operations per batch, so this function
 * splits large dose arrays into multiple batches and commits them sequentially.
 *
 * @param {Object} firestore - Firestore instance
 * @param {Array<Object>} doses - Array of dose objects to write
 *
 * @returns {Promise<number>} - Number of doses successfully written
 *
 * Requirements:
 * - 9.1: Use Firestore batch writes
 * - 9.2: Retry failed operations
 * - 9.4: Split into batches of 500
 */
async function writeDosesInBatches(firestore, doses) {
  const BATCH_SIZE = 500; // Requirement 9.4: Maximum 500 operations per batch
  const MAX_RETRIES = 3; // Requirement 9.2: Retry logic
  let totalWritten = 0;

  // Split doses into batches of 500 (Requirement 9.4)
  const batches = [];
  for (let i = 0; i < doses.length; i += BATCH_SIZE) {
    const batchDoses = doses.slice(i, i + BATCH_SIZE);
    batches.push(batchDoses);
  }

  // Write each batch with retry logic (Requirements 9.1, 9.2)
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchDoses = batches[batchIndex];
    let retryCount = 0;
    let success = false;

    while (retryCount < MAX_RETRIES && !success) {
      try {
        const batch = firestore.batch();

        // Add all doses in this batch
        for (const dose of batchDoses) {
          const doseRef = firestore.collection('doses').doc();
          batch.set(doseRef, dose);
        }

        // Commit the batch (Requirement 9.1)
        await batch.commit();
        totalWritten += batchDoses.length;
        success = true;

        console.log(
          `Successfully wrote batch ${batchIndex + 1}/${batches.length} (${
            batchDoses.length
          } doses)`,
        );
      } catch (error) {
        retryCount++;
        console.error(
          `Error writing batch ${
            batchIndex + 1
          }, attempt ${retryCount}/${MAX_RETRIES}:`,
          error,
        );

        // If we've exhausted retries, throw the error
        if (retryCount >= MAX_RETRIES) {
          throw new Error(
            `Failed to write batch ${
              batchIndex + 1
            } after ${MAX_RETRIES} attempts: ${error.message}`,
          );
        }

        // Wait before retrying (exponential backoff)
        const delayMs = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return totalWritten;
}

module.exports = {
  generateDosesForSchedule,
  writeDosesInBatches,
};
