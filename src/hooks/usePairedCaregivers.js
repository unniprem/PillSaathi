/**
 * usePairedCaregivers Hook
 *
 * Custom hook to fetch all caregivers paired with a specific parent user.
 * For each caregiver, fetches caregiver data and pairing status.
 *
 * Requirements: 9.1
 */

import { useState, useEffect } from 'react';
import RelationshipService from '../services/pairing/RelationshipService';

/**
 * Hook to fetch paired caregivers for a parent
 *
 * Fetches all relationships where parentId matches the specified parent,
 * retrieves caregiver data for each relationship.
 *
 * @param {string} parentId - Parent's Firebase Auth UID
 * @returns {Object} - { caregivers: Array, loading: boolean, error: Error | null, refetch: Function }
 *
 * @example
 * function GenerateCodeScreen() {
 *   const { user } = useAuth();
 *   const { caregivers, loading, error, refetch } = usePairedCaregivers(user.uid);
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
 *       data={caregivers}
 *       renderItem={({ item }) => <CaregiverCard caregiver={item} />}
 *     />
 *   );
 * }
 */
export function usePairedCaregivers(parentId) {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * Fetch paired caregivers
   */
  const fetchPairedCaregivers = async () => {
    if (!parentId) {
      setCaregivers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all relationships for this parent
      const relationships = await RelationshipService.getRelationships(
        parentId,
        'parent',
      );

      // Map relationships to caregiver data
      const caregiversWithData = relationships.map(relationship => ({
        id: relationship.caregiverUid,
        name: relationship.caregiverName,
        phone: relationship.caregiverPhone,
        status: 'active', // All fetched relationships are active
        relationshipId: relationship.id,
        createdAt: relationship.createdAt,
      }));

      setCaregivers(caregiversWithData);
    } catch (err) {
      console.error('Error fetching paired caregivers:', err);
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

  // Fetch paired caregivers when parentId changes or refetch is triggered
  useEffect(() => {
    fetchPairedCaregivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, refetchTrigger]);

  return {
    caregivers,
    loading,
    error,
    refetch,
  };
}

export default usePairedCaregivers;
