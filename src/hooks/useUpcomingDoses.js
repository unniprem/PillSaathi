/**
 * useUpcomingDoses Hook
 *
 * Custom hook to fetch upcoming doses for a parent within a time window.
 * Used to display upcoming medicines scheduled in the next N hours.
 * Marks overdue doses for highlighting.
 *
 * Requirements: 7.1, 11.1
 */

import { useState, useEffect } from 'react';
import doseService from '../services/doseService';

/**
 * Hook to fetch upcoming doses for a parent
 *
 * Fetches doses scheduled within the specified time window (default 24 hours).
 * Returns doses sorted chronologically by scheduled time.
 * Marks doses as overdue if scheduledTime is in the past.
 *
 * @param {string} parentId - Parent's Firebase Auth UID
 * @param {number} hours - Number of hours to look ahead (default: 24)
 * @returns {Object} - { doses: Array, loading: boolean, error: Error | null, refetch: Function }
 *
 * @example
 * function ParentDetailScreen({ route }) {
 *   const { parentId } = route.params;
 *   const { doses, loading, error, refetch } = useUpcomingDoses(parentId, 24);
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <FlatList
 *       data={doses}
 *       renderItem={({ item }) => <DoseCard dose={item} />}
 *     />
 *   );
 * }
 */
export function useUpcomingDoses(parentId, hours = 24) {
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * Fetch upcoming doses
   */
  const fetchUpcomingDoses = async () => {
    if (!parentId) {
      setDoses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const upcomingDoses = await doseService.getUpcomingDoses(parentId, hours);

      // Mark overdue doses (Requirement 11.1)
      const now = new Date();
      const dosesWithOverdueFlag = upcomingDoses
        .filter(dose => dose.status !== 'taken') // Filter out taken doses
        .map(dose => ({
          ...dose,
          isOverdue: dose.scheduledTime && dose.scheduledTime < now,
        }));

      setDoses(dosesWithOverdueFlag);
    } catch (err) {
      console.error('Error fetching upcoming doses:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refetch function to manually trigger a refresh
   */
  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  // Fetch doses when parentId or hours changes or refetch is triggered
  useEffect(() => {
    fetchUpcomingDoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, hours, refetchTrigger]);

  return {
    doses,
    loading,
    error,
    refetch,
  };
}

export default useUpcomingDoses;
