/**
 * useParentMedicines Hook
 *
 * Custom hook to fetch all medicines for a specific parent.
 * Used by caregivers to view and manage medicines for a parent.
 *
 * Requirements: 5.1
 */

import { useState, useEffect } from 'react';
import medicineService from '../services/medicineService';

/**
 * Hook to fetch medicines for a parent
 *
 * Fetches all medicines (active and inactive) for the specified parent.
 * Returns medicines sorted by creation date (newest first).
 *
 * @param {string} parentId - Parent's Firebase Auth UID
 * @returns {Object} - { medicines: Array, loading: boolean, error: Error | null, refetch: Function }
 *
 * @example
 * function ParentDetailScreen({ route }) {
 *   const { parentId } = route.params;
 *   const { medicines, loading, error, refetch } = useParentMedicines(parentId);
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <FlatList
 *       data={medicines}
 *       renderItem={({ item }) => <MedicineCard medicine={item} />}
 *     />
 *   );
 * }
 */
export function useParentMedicines(parentId) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * Fetch medicines for parent
   */
  const fetchMedicines = async () => {
    if (!parentId) {
      setMedicines([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const parentMedicines = await medicineService.getMedicinesForParent(
        parentId,
      );

      // Sort by creation date (newest first)
      const sortedMedicines = parentMedicines.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) {
          return 0;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setMedicines(sortedMedicines);
    } catch (err) {
      console.error('Error fetching medicines:', err);
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

  // Fetch medicines when parentId changes or refetch is triggered
  useEffect(() => {
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, refetchTrigger]);

  return {
    medicines,
    loading,
    error,
    refetch,
  };
}

export default useParentMedicines;
