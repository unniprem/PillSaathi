/**
 * Dose Cleanup Module
 *
 * This module contains the logic for cleaning up old dose records from Firestore.
 * Doses older than 30 days are deleted to maintain database performance and reduce storage costs.
 *
 * Requirements: 6.5 - Preserve historical dose records (delete only after 30 days)
 */

const admin = require('firebase-admin');

/**
 * Cleans up doses older than 30 days
 *
 * This function queries for doses with scheduledTime older than 30 days
 * and deletes them in batches of 500 to comply with Firestore batch limits.
 *
 * @param {Object} firestore - Firestore instance
 * @returns {Promise<number>} - Number of doses deleted
 *
 * Requirements:
 * - 6.5: Delete doses older than 30 days while preserving recent historical records
 */
async function cleanupOldDoses(firestore) {
  const BATCH_SIZE = 500;
  const DAYS_TO_KEEP = 30;

  // Calculate cutoff date (30 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

  console.log(
    `Starting cleanup of doses older than ${cutoffDate.toISOString()}`,
  );

  let totalDeleted = 0;
  let hasMore = true;

  // Query and delete in batches until no more old doses exist
  while (hasMore) {
    try {
      // Query for old doses (limit to batch size)
      const oldDosesSnapshot = await firestore
        .collection('doses') // eslint-disable-line no-restricted-syntax
        .where('scheduledTime', '<', cutoffTimestamp)
        .limit(BATCH_SIZE)
        .get();

      // Check if there are any doses to delete
      if (oldDosesSnapshot.empty) {
        hasMore = false;
        console.log('No more old doses to delete');
        break;
      }

      // Create batch for deletion
      const batch = firestore.batch();

      oldDosesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Commit the batch
      await batch.commit();

      const deletedCount = oldDosesSnapshot.size;
      totalDeleted += deletedCount;

      console.log(
        `Deleted batch of ${deletedCount} doses (total: ${totalDeleted})`,
      );

      // If we got fewer than BATCH_SIZE, we're done
      if (deletedCount < BATCH_SIZE) {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error during dose cleanup:', error);
      throw error;
    }
  }

  console.log(`Cleanup complete. Total doses deleted: ${totalDeleted}`);
  return totalDeleted;
}

module.exports = {
  cleanupOldDoses,
};
