/**
 * useAllUpcomingDoses Hook
 *
 * Custom hook to fetch all upcoming doses across all paired parents for a caregiver.
 * Merges doses from all parents and sorts by scheduled time.
 * Includes parent name (using alias if available).
 *
 * Requirements: 15.2
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import doseService from '../services/doseService';
import RelationshipService from '../services/pairing/RelationshipService';

/**
 * Hook to fetch all upcoming doses across all paired parents
 *
 * Fetches all paired parents for the caregiver, then fetches upcoming doses
 * for each parent, merges them, and sorts by scheduled time.
 * Each dose includes the parent name (using alias if available).
 *
 * @param {number} hours - Number of hours to look ahead (default: 24)
 * @returns {Object} - { doses: Array, loading: boolean, error: Error | null, refetch: Function }
 *
 * @example
 * function CaregiverUpcomingScreen() {
 *   const { doses, loading, error, refetch } = useAllUpcomingDoses(24);
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} onRetry={refetch} />;
 *   }
 *
 *   return (
 *     <FlatList
 *       data={doses}
 *       renderItem={({ item }) => <UpcomingDoseCard dose={item} />}
 *     />
 *   );
 * }
 */
export function useAllUpcomingDoses(hours = 24) {
  const { user } = useAuth();
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * Fetch all upcoming doses across all paired parents
   */
  const fetchAllUpcomingDoses = async () => {
    if (!user) {
      setDoses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all relationships for this caregiver
      const relationships = await RelationshipService.getRelationships(
        user.uid,
        'caregiver',
      );

      if (relationships.length === 0) {
        setDoses([]);
        setLoading(false);
        return;
      }

      // Fetch upcoming doses for each parent
      const dosesPromises = relationships.map(async relationship => {
        try {
          const parentDoses = await doseService.getUpcomingDoses(
            relationship.parentUid,
            hours,
          );

          // Add parent information to each dose
          return parentDoses.map(dose => ({
            ...dose,
            parentId: relationship.parentUid,
            parentName: relationship.parentAlias || relationship.parentName,
            parentActualName: relationship.parentName,
          }));
        } catch (err) {
          console.error(
            `Error fetching doses for parent ${relationship.parentUid}:`,
            err,
          );
          // Return empty array for this parent if fetch fails
          return [];
        }
      });

      // Wait for all dose fetches to complete
      const allDosesArrays = await Promise.all(dosesPromises);

      // Flatten the array of arrays into a single array
      const allDoses = allDosesArrays.flat();

      // Sort by scheduled time (chronologically)
      const sortedDoses = allDoses.sort((a, b) => {
        const timeA = a.scheduledTime?.getTime() || 0;
        const timeB = b.scheduledTime?.getTime() || 0;
        return timeA - timeB;
      });

      setDoses(sortedDoses);
    } catch (err) {
      console.error('Error fetching all upcoming doses:', err);
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

  // Fetch doses when user changes, hours changes, or refetch is triggered
  useEffect(() => {
    fetchAllUpcomingDoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hours, refetchTrigger]);

  return {
    doses,
    loading,
    error,
    refetch,
  };
}

export default useAllUpcomingDoses;
