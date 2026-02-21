/**
 * Utility to regenerate doses for existing medicines
 *
 * Use this if you have medicines but no dose history showing
 *
 * Usage:
 * import { regenerateAllDoses } from './utils/regenerateDoses';
 * await regenerateAllDoses(parentId);
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import doseGenerationService from '../services/doseGenerationService';

/**
 * Regenerate doses for all active medicines of a parent
 */
export async function regenerateAllDoses(parentId) {
  console.log('=== REGENERATING DOSES ===');
  console.log('Parent ID:', parentId);

  const firestore = getFirestore(getApp());
  let totalDosesGenerated = 0;
  let medicinesProcessed = 0;

  try {
    // 1. Get all active medicines for this parent
    console.log('\n1. Fetching active medicines...');
    const medicinesSnapshot = await firestore
      .collection('medicines')
      .where('parentId', '==', parentId)
      .where('status', '==', 'active')
      .get();

    console.log(`   Found ${medicinesSnapshot.size} active medicines`);

    if (medicinesSnapshot.empty) {
      console.log('   No active medicines found. Add some medicines first!');
      return { medicinesProcessed: 0, dosesGenerated: 0 };
    }

    // 2. For each medicine, get its schedule and generate doses
    for (const medicineDoc of medicinesSnapshot.docs) {
      const medicine = {
        id: medicineDoc.id,
        ...medicineDoc.data(),
      };

      console.log(`\n2. Processing medicine: ${medicine.name}`);

      // Get the schedule for this medicine
      const schedulesSnapshot = await firestore
        .collection('schedules')
        .where('medicineId', '==', medicine.id)
        .limit(1)
        .get();

      if (schedulesSnapshot.empty) {
        console.log(`   ⚠ No schedule found for ${medicine.name}`);
        continue;
      }

      const scheduleDoc = schedulesSnapshot.docs[0];
      const schedule = {
        id: scheduleDoc.id,
        ...scheduleDoc.data(),
      };

      console.log(
        `   Schedule: ${schedule.times?.join(', ')} (${
          schedule.repeatPattern
        })`,
      );

      // 3. Delete existing future doses for this schedule
      console.log('   Deleting existing future doses...');
      const deletedCount = await doseGenerationService.deleteFutureDoses(
        schedule.id,
      );
      console.log(`   Deleted ${deletedCount} existing doses`);

      // 4. Generate new doses
      console.log('   Generating new doses...');
      const dosesGenerated = await doseGenerationService.onScheduleCreated(
        schedule.id,
        schedule,
        medicine.id,
      );

      console.log(`   ✓ Generated ${dosesGenerated} doses`);
      totalDosesGenerated += dosesGenerated;
      medicinesProcessed++;
    }

    console.log('\n=== REGENERATION COMPLETE ===');
    console.log(`Medicines processed: ${medicinesProcessed}`);
    console.log(`Total doses generated: ${totalDosesGenerated}`);

    return {
      medicinesProcessed,
      dosesGenerated: totalDosesGenerated,
    };
  } catch (error) {
    console.error('Error regenerating doses:', error);
    throw error;
  }
}

/**
 * Check dose status for a parent
 */
export async function checkDoseStatus(parentId) {
  console.log('=== CHECKING DOSE STATUS ===');
  console.log('Parent ID:', parentId);

  const firestore = getFirestore(getApp());

  try {
    // 1. Count medicines
    const medicinesSnapshot = await firestore
      .collection('medicines')
      .where('parentId', '==', parentId)
      .get();

    const activeMedicines = medicinesSnapshot.docs.filter(
      doc => doc.data().status === 'active',
    );

    console.log(
      `\nMedicines: ${medicinesSnapshot.size} total, ${activeMedicines.length} active`,
    );

    // 2. Count schedules
    const scheduleIds = [];
    for (const medicineDoc of activeMedicines) {
      const schedulesSnapshot = await firestore
        .collection('schedules')
        .where('medicineId', '==', medicineDoc.id)
        .get();

      scheduleIds.push(...schedulesSnapshot.docs.map(d => d.id));
    }

    console.log(`Schedules: ${scheduleIds.length}`);

    // 3. Count doses
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dosesSnapshot = await firestore
      .collection('doses')
      .where('parentId', '==', parentId)
      .where('scheduledTime', '>=', sevenDaysAgo)
      .get();

    console.log(`\nDoses (last 7 days): ${dosesSnapshot.size}`);

    if (dosesSnapshot.size > 0) {
      const statusCounts = {
        scheduled: 0,
        taken: 0,
        missed: 0,
        skipped: 0,
        pending: 0,
        other: 0,
      };

      dosesSnapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        } else {
          statusCounts.other++;
        }
      });

      console.log('Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 0) {
          console.log(`  ${status}: ${count}`);
        }
      });

      // Show next few doses
      const futureDoses = dosesSnapshot.docs
        .filter(doc => doc.data().scheduledTime.toDate() > now)
        .sort(
          (a, b) =>
            a.data().scheduledTime.toDate() - b.data().scheduledTime.toDate(),
        )
        .slice(0, 3);

      if (futureDoses.length > 0) {
        console.log('\nNext upcoming doses:');
        futureDoses.forEach(doc => {
          const data = doc.data();
          const time = data.scheduledTime.toDate();
          console.log(
            `  ${data.medicineName} at ${time.toLocaleString()} (${
              data.status
            })`,
          );
        });
      }
    } else {
      console.log('⚠ No doses found!');
      console.log('\nPossible reasons:');
      console.log('1. Doses were never generated');
      console.log('2. All doses are older than 7 days');
      console.log('3. Medicines have no schedules');

      if (activeMedicines.length > 0 && scheduleIds.length > 0) {
        console.log(
          '\n💡 You have active medicines with schedules but no doses.',
        );
        console.log('   Run: await regenerateAllDoses(parentId)');
      }
    }

    console.log('\n=== CHECK COMPLETE ===');

    return {
      medicines: medicinesSnapshot.size,
      activeMedicines: activeMedicines.length,
      schedules: scheduleIds.length,
      doses: dosesSnapshot.size,
    };
  } catch (error) {
    console.error('Error checking dose status:', error);
    throw error;
  }
}

/**
 * Quick fix - check status and regenerate if needed
 */
export async function quickFixDoses(parentId) {
  console.log('Running quick fix for doses...\n');

  try {
    // 1. Check current status
    const status = await checkDoseStatus(parentId);

    // 2. If no doses but have active medicines with schedules, regenerate
    if (
      status.doses === 0 &&
      status.activeMedicines > 0 &&
      status.schedules > 0
    ) {
      console.log('\n💡 Regenerating doses...');
      const result = await regenerateAllDoses(parentId);
      console.log('\n✓ Quick fix complete!');
      return result;
    } else if (status.doses > 0) {
      console.log('\n✓ Doses already exist. No regeneration needed.');
      return status;
    } else {
      console.log(
        '\n⚠ Cannot regenerate: No active medicines or schedules found.',
      );
      console.log('   Add medicines with schedules first.');
      return status;
    }
  } catch (error) {
    console.error('\n✗ Quick fix failed:', error.message);
    throw error;
  }
}
