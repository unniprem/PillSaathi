/**
 * useMyMedicines Hook
 *
 * Custom hook to fetch all medicines for the current parent user.
 * Used by parents to view their own medicines on the dashboard.
 *
 * Requirements: 10.1
 */

import { useState, useEffect } from 'react';
import medicineService from '../services/medicineService';

/**
 * Hook to fetch medicines for the current parent user
 *
 * Fetches all medicines (active and inactive) for the current parent.
 * Returns medicines sorted consistently by name (alphabetically).
 *
 * @param {string} parentId - Parent's Firebase Auth UID (current user)
 * @returns {Object} - { medicines: Array, loading: boolean, error: Error | null, refetch: Function }
 *
 * @example
 * function ParentHomeScreen() {
 *   const { user } = useAuth();
 *   const { medicines, loading, error, refetch } = useMyMedicines(user.uid);
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
export function useMyMedicines(parentId) {
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

      // Sort by name alphabetically for consistent ordering (Requirement 10.1)
      const sortedMedicines = parentMedicines.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
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

export default useMyMedicines;
