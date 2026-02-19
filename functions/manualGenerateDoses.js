/**
 * Manual Dose Generation Script
 *
 * This script manually generates doses for all existing schedules.
 * Use this when you have existing schedules but no doses (e.g., after initial setup).
 *
 * To run this script:
 * 1. Make sure you're in the functions directory
 * 2. Run: node manualGenerateDoses.js
 */

const admin = require('firebase-admin');
const { generateDosesForSchedule } = require('./generateDoses');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

/**
 * Write doses in batches
 */
async function writeDosesInBatches(doses) {
  const BATCH_SIZE = 500;
  let totalWritten = 0;

  for (let i = 0; i < doses.length; i += BATCH_SIZE) {
    const batchDoses = doses.slice(i, i + BATCH_SIZE);
    const batch = firestore.batch();

    for (const dose of batchDoses) {
      const doseRef = firestore.collection('doses').doc();
      batch.set(doseRef, dose);
    }

    await batch.commit();
    totalWritten += batchDoses.length;
    console.log(`Written ${totalWritten} doses so far...`);
  }

  return totalWritten;
}

/**
 * Main function to generate doses for all schedules
 */
async function generateDosesForAllSchedules() {
  try {
    console.log('Fetching all schedules...');

    // Get all schedules
    const schedulesSnapshot = await firestore.collection('schedules').get();

    if (schedulesSnapshot.empty) {
      console.log('No schedules found.');
      return;
    }

    console.log(`Found ${schedulesSnapshot.size} schedules`);

    let totalDosesGenerated = 0;

    // Process each schedule
    for (const scheduleDoc of schedulesSnapshot.docs) {
      const scheduleData = scheduleDoc.data();
      const scheduleId = scheduleDoc.id;

      console.log(`\nProcessing schedule ${scheduleId}...`);

      // Fetch the associated medicine
      const medicineDoc = await firestore
        .collection('medicines')
        .doc(scheduleData.medicineId)
        .get();

      if (!medicineDoc.exists) {
        console.log(
          `  Medicine ${scheduleData.medicineId} not found, skipping...`,
        );
        continue;
      }

      const medicineData = medicineDoc.data();

      // Only generate doses for active medicines
      if (medicineData.status !== 'active') {
        console.log(`  Medicine is inactive, skipping...`);
        continue;
      }

      // Prepare schedule and medicine objects
      const schedule = {
        id: scheduleId,
        ...scheduleData,
      };

      const medicine = {
        id: medicineDoc.id,
        ...medicineData,
      };

      // Generate doses for the next 7 days
      const startDate = new Date();
      const doses = generateDosesForSchedule(schedule, medicine, startDate, 7);

      console.log(`  Generated ${doses.length} doses`);

      // Write doses to Firestore
      const dosesWritten = await writeDosesInBatches(doses);
      totalDosesGenerated += dosesWritten;

      console.log(`  Successfully wrote ${dosesWritten} doses`);
    }

    console.log(
      `\n✅ Complete! Generated ${totalDosesGenerated} total doses for ${schedulesSnapshot.size} schedules`,
    );
  } catch (error) {
    console.error('Error generating doses:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
generateDosesForAllSchedules();
