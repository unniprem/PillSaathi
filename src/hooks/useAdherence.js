/**
 * useAdherence Hook
 *
 * Custom hook to fetch and calculate adherence metrics for a parent.
 * Uses Firestore queries to fetch doses within a date range and calculates
 * adherence percentage, status breakdown, and per-medicine adherence.
 *
 * Requirements: Phase 5 - Escalation (5.7.2)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import {
  calculateAdherence,
  getAdherenceByMedicine,
} from '../utils/adherenceCalculations';

/**
 * Hook to fetch doses and calculate adherence metrics for a parent
 *
 * Fetches doses for the specified parent within the given date range.
 * Calculates overall adherence metrics and per-medicine breakdown.
 * Automatically refetches when parentId or date range changes.
 * Memoizes calculations for performance.
 *
 * @param {string} parentId - Parent's Firebase Auth UID
 * @param {Date} startDate - Start of date range (inclusive)
 * @param {Date} endDate - End of date range (inclusive)
 * @returns {Object} Adherence data and state
 * @returns {number} returns.percentage - Overall adherence percentage (0-100)
 * @returns {number} returns.taken - Count of doses with status 'taken'
 * @returns {number} returns.missed - Count of doses with status 'missed'
 * @returns {number} returns.snoozed - Count of doses with status 'snoozed'
 * @returns {number} returns.pending - Count of doses with status 'pending'
 * @returns {number} returns.total - Total count of doses
 * @returns {Object<string, Object>} returns.byMedicine - Adherence metrics grouped by medicineId
 * @returns {Array<Object>} returns.doses - Raw dose data from Firestore
 * @returns {boolean} returns.loading - True while fetching data
 * @returns {Error|null} returns.error - Error object if fetch failed, null otherwise
 * @returns {Function} returns.refetch - Function to manually refetch data
 *
 * @example
 * function AdherenceDashboard({ parentId }) {
 *   const startDate = new Date();
 *   startDate.setDate(startDate.getDate() - 7); // 7 days ago
 *   const endDate = new Date();
 *
 *   const {
 *     percentage,
 *     taken,
 *     missed,
 *     snoozed,
 *     total,
 *     byMedicine,
 *     loading,
 *     error,
 *     refetch
 *   } = useAdherence(parentId, startDate, endDate);
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return (
 *     <View>
 *       <Text>Adherence: {percentage}%</Text>
 *       <Text>Taken: {taken} / {total}</Text>
 *     </View>
 *   );
 * }
 */
export function useAdherence(parentId, startDate, endDate) {
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch doses from Firestore
   */
  const fetchDoses = useCallback(async () => {
    // Handle edge case: no parentId provided
    if (!parentId) {
      setDoses([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Handle edge case: invalid date range
    if (!startDate || !endDate) {
      setDoses([]);
      setLoading(false);
      setError(new Error('Invalid date range'));
      return;
    }

    // Handle edge case: startDate after endDate
    if (startDate > endDate) {
      setDoses([]);
      setLoading(false);
      setError(new Error('Start date must be before end date'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query doses for the parent within the date range
      const snapshot = await firestore()
        .collection('doses')
        .where('parentId', '==', parentId)
        .where('scheduledTime', '>=', startDate)
        .where('scheduledTime', '<=', endDate)
        .orderBy('scheduledTime', 'desc')
        .get();

      const fetchedDoses = [];

      snapshot.forEach(doc => {
        const doseData = doc.data();
        fetchedDoses.push({
          id: doc.id,
          ...doseData,
          // Convert Firestore Timestamps to Date objects
          scheduledTime:
            doseData.scheduledTime?.toDate?.() || doseData.scheduledTime,
          takenAt: doseData.takenAt?.toDate?.() || doseData.takenAt,
          missedAt: doseData.missedAt?.toDate?.() || doseData.missedAt,
          snoozedUntil:
            doseData.snoozedUntil?.toDate?.() || doseData.snoozedUntil,
        });
      });

      setDoses(fetchedDoses);
      setError(null);
    } catch (err) {
      console.error('Error fetching doses for adherence:', err);
      setError(err);
      setDoses([]);
    } finally {
      setLoading(false);
    }
  }, [parentId, startDate, endDate]);

  /**
   * Fetch doses when dependencies change
   */
  useEffect(() => {
    fetchDoses();
  }, [fetchDoses]);

  /**
   * Calculate overall adherence metrics (memoized)
   */
  const adherenceMetrics = useMemo(() => {
    return calculateAdherence(doses);
  }, [doses]);

  /**
   * Calculate per-medicine adherence (memoized)
   */
  const adherenceByMedicine = useMemo(() => {
    return getAdherenceByMedicine(doses);
  }, [doses]);

  return {
    // Overall metrics
    percentage: adherenceMetrics.percentage,
    taken: adherenceMetrics.taken,
    missed: adherenceMetrics.missed,
    snoozed: adherenceMetrics.snoozed,
    pending: adherenceMetrics.pending,
    total: adherenceMetrics.total,

    // Per-medicine breakdown
    byMedicine: adherenceByMedicine,

    // Raw data
    doses,

    // State
    loading,
    error,

    // Actions
    refetch: fetchDoses,
  };
}

export default useAdherence;
