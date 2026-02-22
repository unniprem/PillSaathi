const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { sendMissedDoseNotification } = require('./sendMissedDoseNotification');

/**
 * Scheduled function that runs every 5 minutes to check for missed doses
 *
 * New Logic:
 * - First check: 1 minute after scheduled time (missedCount = 0)
 * - Retry 1: 10 minutes after scheduled time (missedCount = 1)
 * - Retry 2: 20 minutes after scheduled time (missedCount = 2)
 * - Escalate: 30 minutes after scheduled time (missedCount = 3) - notify caregivers
 *
 * Triggered by Cloud Scheduler every 5 minutes
 */
exports.scheduledDoseCheck = functions.pubsub
  .schedule('*/5 * * * *') // Every 5 minutes
  .timeZone('UTC')
  .onRun(async context => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const nowMillis = now.toMillis();

    console.log('Starting scheduled dose check at', now.toDate().toISOString());

    try {
      // Query all pending/snoozed doses that are overdue
      const oneMinuteAgo = new Date(nowMillis - 1 * 60 * 1000);

      const overdueSnapshot = await db
        .collection('doses')
        .where('status', 'in', ['pending', 'snoozed'])
        .where(
          'scheduledTime',
          '<',
          admin.firestore.Timestamp.fromDate(oneMinuteAgo),
        )
        .get();

      console.log(`Found ${overdueSnapshot.size} potentially overdue doses`);

      if (overdueSnapshot.empty) {
        console.log('No overdue doses found');
        return { processed: 0, escalated: 0, retried: 0 };
      }

      let processedCount = 0;
      let escalatedCount = 0;
      let retriedCount = 0;
      const batch = db.batch();
      const escalations = [];

      for (const doseDoc of overdueSnapshot.docs) {
        const dose = doseDoc.data();
        const scheduledMillis = dose.scheduledTime.toMillis();
        const minutesOverdue = Math.floor(
          (nowMillis - scheduledMillis) / (60 * 1000),
        );

        // Initialize missedCount if it doesn't exist
        const currentMissedCount = dose.missedCount || 0;

        console.log(
          `Dose ${doseDoc.id}: ${minutesOverdue} min overdue, missedCount: ${currentMissedCount}`,
        );

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

        // Determine action based on time overdue and missed count
        if (minutesOverdue >= 30 && currentMissedCount >= 2) {
          // 30+ minutes overdue and already retried twice - ESCALATE to caregivers
          console.log(`Escalating dose ${doseDoc.id} to caregivers (3rd miss)`);

          batch.update(doseDoc.ref, {
            status: 'missed',
            missedAt: now,
            escalatedAt: now,
            missedCount: 3,
            lastRetryAt: now,
          });

          // Queue notification to caregivers
          escalations.push({
            doseId: doseDoc.id,
            parentId: dose.parentId,
            medicineId: dose.medicineId,
            scheduledTime: dose.scheduledTime,
            missedCount: 3,
          });

          escalatedCount++;
          processedCount++;
        } else if (minutesOverdue >= 20 && currentMissedCount === 1) {
          // 20+ minutes overdue and first retry already done - RETRY 2
          console.log(`Retry 2 for dose ${doseDoc.id} (20 min overdue)`);

          batch.update(doseDoc.ref, {
            missedCount: 2,
            lastRetryAt: now,
          });

          retriedCount++;
          processedCount++;
        } else if (minutesOverdue >= 10 && currentMissedCount === 0) {
          // 10+ minutes overdue and no retries yet - RETRY 1
          console.log(`Retry 1 for dose ${doseDoc.id} (10 min overdue)`);

          batch.update(doseDoc.ref, {
            missedCount: 1,
            lastRetryAt: now,
          });

          retriedCount++;
          processedCount++;
        } else if (minutesOverdue >= 1 && currentMissedCount === 0) {
          // 1+ minute overdue and no missed count yet - FIRST CHECK
          console.log(`First check for dose ${doseDoc.id} (1 min overdue)`);

          batch.update(doseDoc.ref, {
            missedCount: 0,
            lastRetryAt: now,
          });

          processedCount++;
        }

        // If dose has been retried but not yet reached next threshold, skip
      }

      // Commit all dose updates
      if (processedCount > 0) {
        await batch.commit();
        console.log(
          `Updated ${processedCount} doses (${retriedCount} retries, ${escalatedCount} escalations)`,
        );
      }

      // Send notifications for escalations only
      for (const escalation of escalations) {
        try {
          await sendMissedDoseNotification.handler(escalation);
        } catch (error) {
          console.error(
            `Failed to send notification for dose ${escalation.doseId}:`,
            error,
          );
          // Continue processing other escalations
        }
      }

      console.log(
        `Dose check complete: ${processedCount} processed, ${retriedCount} retried, ${escalatedCount} escalated`,
      );

      return {
        processed: processedCount,
        retried: retriedCount,
        escalated: escalatedCount,
        timestamp: now.toDate().toISOString(),
      };
    } catch (error) {
      console.error('Error in scheduledDoseCheck:', error);
      throw error;
    }
  });
