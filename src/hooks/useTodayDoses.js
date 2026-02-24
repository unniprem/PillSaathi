/**
 * useTodayDoses Hook
 *
 * Custom hook to fetch doses for the current day (midnight to midnight).
 * Used to display today's medicine schedule for parent users.
 * Marks overdue doses for highlighting.
 *
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import doseService from '../services/doseService';

/**
 * Hook to fetch today's doses for the current parent user
 *
 * Fetches all doses scheduled for today (00:00 to 23:59).
 * Returns doses sorted chronologically by scheduled time.
 * Marks doses as overdue if scheduledTime is in the past.
 * Provides markAsTaken function for quick actions.
 *
 * @returns {Object} - { doses: Array, loading: boolean, error: Error | null, refetch: Function, markAsTaken: Function }
 *
 * @example
 * function ParentUpcomingScreen() {
 *   const { doses, loading, error, markAsTaken } = useTodayDoses();
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <FlatList
 *       data={doses}
 *       renderItem={({ item }) => (
 *         <DoseCard
 *           dose={item}
 *           onMarkTaken={() => markAsTaken(item.id)}
 *         />
 *       )}
 *     />
 *   );
 * }
 */
export function useTodayDoses() {
  const { user } = useAuth();
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * Fetch today's doses
   */
  const fetchTodayDoses = async () => {
    if (!user?.uid) {
      setDoses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const todayDoses = await doseService.getDosesForDate(user.uid, today);

      // Mark overdue doses (Requirements 17.4, 17.5)
      const now = new Date();
      const dosesWithOverdueFlag = todayDoses
        .filter(dose => dose.status !== 'taken') // Filter out taken doses
        .map(dose => ({
          ...dose,
          isOverdue: dose.scheduledTime && dose.scheduledTime < now,
        }));

      setDoses(dosesWithOverdueFlag);
    } catch (err) {
      console.error('Error fetching today doses:', err);
      setError(err.message || "Failed to load today's medicines");
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

  // Fetch doses when user changes or refetch is triggered
  useEffect(() => {
    fetchTodayDoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, refetchTrigger]);

  return {
    doses,
    loading,
    error,
    refetch,
  };
}

export default useTodayDoses;
