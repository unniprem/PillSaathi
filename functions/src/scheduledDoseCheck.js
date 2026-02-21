const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { sendMissedDoseNotification } = require('./sendMissedDoseNotification');

/**
 * Scheduled function that runs every 5 minutes to check for missed doses
 * Triggered by Cloud Scheduler
 */
exports.scheduledDoseCheck = functions.pubsub
  .schedule('*/5 * * * *') // Every 5 minutes
  .timeZone('UTC')
  .onRun(async context => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const thirtyMinutesAgo = new Date(now.toMillis() - 30 * 60 * 1000);

    console.log('Starting scheduled dose check at', now.toDate().toISOString());

    try {
      // Query all overdue doses
      const overdueSnapshot = await db
        .collection('doses')
        .where('status', 'in', ['pending', 'snoozed'])
        .where(
          'scheduledTime',
          '<',
          admin.firestore.Timestamp.fromDate(thirtyMinutesAgo),
        )
        .get();

      console.log(`Found ${overdueSnapshot.size} potentially overdue doses`);

      if (overdueSnapshot.empty) {
        console.log('No overdue doses found');
        return { processed: 0, escalated: 0 };
      }

      let processedCount = 0;
      let escalatedCount = 0;
      const batch = db.batch();
      const escalations = [];

      for (const doseDoc of overdueSnapshot.docs) {
        const dose = doseDoc.data();

        // Verify medicine is still active
        const medicineDoc = await db
          .collection('medicines')
          .doc(dose.medicineId)
          .get();

        if (!medicineDoc.exists || medicineDoc.data().isActive === false) {
          console.log(
            `Skipping dose ${doseDoc.id} - medicine inactive or deleted`,
          );
          continue;
        }

        // Update dose status to missed
        batch.update(doseDoc.ref, {
          status: 'missed',
          missedAt: now,
          escalatedAt: now,
        });

        // Queue notification
        escalations.push({
          doseId: doseDoc.id,
          parentId: dose.parentId,
          medicineId: dose.medicineId,
          scheduledTime: dose.scheduledTime,
        });

        processedCount++;
      }

      // Commit all dose updates
      if (processedCount > 0) {
        await batch.commit();
        console.log(`Updated ${processedCount} doses to missed status`);
      }

      // Send notifications for each escalation
      for (const escalation of escalations) {
        try {
          await sendMissedDoseNotification.handler(escalation);
          escalatedCount++;
        } catch (error) {
          console.error(
            `Failed to send notification for dose ${escalation.doseId}:`,
            error,
          );
          // Continue processing other escalations
        }
      }

      console.log(
        `Escalation complete: ${escalatedCount}/${processedCount} notifications sent`,
      );

      return {
        processed: processedCount,
        escalated: escalatedCount,
        timestamp: now.toDate().toISOString(),
      };
    } catch (error) {
      console.error('Error in scheduledDoseCheck:', error);
      throw error;
    }
  });
