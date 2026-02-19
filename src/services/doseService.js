/**
 * DoseService - Dose Query Service
 *
 * Handles dose query operations for the PillSathi app.
 * Provides methods to query upcoming doses for parents.
 * Note: Doses are created by Cloud Functions, not by this service.
 *
 * Requirements: 12.1, 12.3
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { retryOperation } from '../utils/retryHelper';

/**
 * DoseService class
 * Provides methods for dose query operations
 */
class DoseService {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance || getFirestore(getApp());
    this.dosesCollection = 'doses';
  }

  /**
   * Get upcoming doses for a parent within a time window
   * Queries doses with scheduledTime in the next N hours from now.
   * Returns doses sorted by scheduledTime in ascending order (earliest first).
   *
   * Requirements: 12.1 - Display doses for next 24 hours
   * Requirements: 12.3 - Sort by scheduled time
   *
   * @param {string} parentId - Parent's Firebase Auth UID
   * @param {number} hours - Number of hours to look ahead (default: 24)
   * @returns {Promise<Array<Object>>} Array of dose objects sorted by scheduledTime
   * @throws {Error} If query fails
   *
   * @example
   * try {
   *   const doses = await doseService.getUpcomingDoses('parent123', 24);
   *   doses.forEach(dose => {
   *     console.log('Dose:', dose.medicineName, 'at', dose.scheduledTime);
   *   });
   * } catch (error) {
   *   console.error('Failed to get upcoming doses:', error.message);
   * }
   */
  async getUpcomingDoses(parentId, hours = 24) {
    try {
      return await retryOperation(async () => {
        const now = new Date();
        const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

        console.log('Querying doses for parentId:', parentId);
        console.log('Time window:', now, 'to', futureTime);

        // Query doses within the time window
        const querySnapshot = await this.firestore
          .collection(this.dosesCollection)
          .where('parentId', '==', parentId)
          .where('scheduledTime', '>=', now)
          .where('scheduledTime', '<=', futureTime)
          .orderBy('scheduledTime', 'asc') // Requirement 12.3: Sort by time
          .get();

        console.log('Query returned', querySnapshot.size, 'doses');

        if (querySnapshot.empty) {
          return [];
        }

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledTime: doc.data().scheduledTime?.toDate() || null,
          createdAt: doc.data().createdAt?.toDate() || null,
        }));
      });
    } catch (error) {
      console.error('Detailed error in getUpcomingDoses:', error);
      const mappedError = new Error('Failed to get upcoming doses');
      mappedError.code = 'doses-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get doses for a specific date
   * Queries all doses scheduled for a specific date (00:00 to 23:59).
   *
   * @param {string} parentId - Parent's Firebase Auth UID
   * @param {Date} date - Date to query doses for
   * @returns {Promise<Array<Object>>} Array of dose objects sorted by scheduledTime
   * @throws {Error} If query fails
   *
   * @example
   * try {
   *   const today = new Date();
   *   const doses = await doseService.getDosesForDate('parent123', today);
   *   console.log(`Found ${doses.length} doses for today`);
   * } catch (error) {
   *   console.error('Failed to get doses for date:', error.message);
   * }
   */
  async getDosesForDate(parentId, date) {
    try {
      return await retryOperation(async () => {
        // Set start of day (00:00:00)
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        // Set end of day (23:59:59)
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        console.log('Querying doses for date:', date);
        console.log('ParentId:', parentId);
        console.log('Time range:', startOfDay, 'to', endOfDay);

        // Query doses for the date
        const querySnapshot = await this.firestore
          .collection(this.dosesCollection)
          .where('parentId', '==', parentId)
          .where('scheduledTime', '>=', startOfDay)
          .where('scheduledTime', '<=', endOfDay)
          .orderBy('scheduledTime', 'asc')
          .get();

        console.log('Query returned', querySnapshot.size, 'doses for today');

        if (querySnapshot.empty) {
          return [];
        }

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledTime: doc.data().scheduledTime?.toDate() || null,
          createdAt: doc.data().createdAt?.toDate() || null,
        }));
      });
    } catch (error) {
      console.error('Detailed error in getDosesForDate:', error);
      const mappedError = new Error('Failed to get doses for date');
      mappedError.code = 'doses-date-query-failed';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

// Export singleton instance
export default new DoseService();
