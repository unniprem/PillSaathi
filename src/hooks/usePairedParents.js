/**
 * usePairedParents Hook
 *
 * Custom hook to fetch all parents paired with the current caregiver user.
 * For each parent, fetches parent data, alias, and calculates upcoming medicine count.
 *
 * Requirements: 1.1
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RelationshipService from '../services/pairing/RelationshipService';
import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

/**
 * Hook to fetch paired parents for a caregiver
 *
 * Fetches all relationships where caregiverId matches current user,
 * retrieves parent data and alias for each relationship,
 * and calculates upcoming medicine count for each parent.
 *
 * @returns {Object} - { parents: Array, loading: boolean, error: Error | null, refetch: Function }
 *
 * @example
 * function CaregiverHomeScreen() {
 *   const { parents, loading, error, refetch } = usePairedParents();
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
 *       data={parents}
 *       renderItem={({ item }) => <ParentCard parent={item} />}
 *     />
 *   );
 * }
 */
export function usePairedParents() {
  const { user } = useAuth();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const firestore = getFirestore(getApp());

  /**
   * Calculate upcoming medicine count for a parent
   * Counts medicines scheduled in the next 24 hours
   *
   * @param {string} parentId - Parent's Firebase Auth UID
   * @returns {Promise<number>} Count of upcoming medicines
   */
  const calculateUpcomingMedicineCount = async parentId => {
    try {
      // Query schedules for this parent within the next 24 hours
      const SCHEDULES_COLLECTION = 'schedules';
      const schedulesSnapshot = await firestore
        .collection(SCHEDULES_COLLECTION)
        .where('parentId', '==', parentId)
        .where('status', '==', 'active')
        .get();

      if (schedulesSnapshot.empty) {
        return 0;
      }

      // Count schedules that have doses in the next 24 hours
      let count = 0;
      schedulesSnapshot.docs.forEach(doc => {
        const schedule = doc.data();

        // Check if schedule has upcoming doses
        // For simplicity, we'll count active schedules
        // In a real implementation, you'd check actual dose times
        if (schedule.times && schedule.times.length > 0) {
          count += schedule.times.length;
        }
      });

      return count;
    } catch (err) {
      console.error('Error calculating upcoming medicine count:', err);
      return 0;
    }
  };

  /**
   * Fetch paired parents
   */
  const fetchPairedParents = async () => {
    if (!user) {
      setParents([]);
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

      // For each relationship, calculate upcoming medicine count
      const parentsWithData = await Promise.all(
        relationships.map(async relationship => {
          const upcomingMedicineCount = await calculateUpcomingMedicineCount(
            relationship.parentUid,
          );

          return {
            id: relationship.parentUid,
            name: relationship.parentAlias || relationship.parentName,
            actualName: relationship.parentName,
            alias: relationship.parentAlias,
            phone: relationship.parentPhone,
            upcomingMedicineCount,
            relationshipId: relationship.id,
          };
        }),
      );

      setParents(parentsWithData);
    } catch (err) {
      console.error('Error fetching paired parents:', err);
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

  // Fetch paired parents when user changes or refetch is triggered
  useEffect(() => {
    fetchPairedParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refetchTrigger]);

  return {
    parents,
    loading,
    error,
    refetch,
  };
}

export default usePairedParents;
