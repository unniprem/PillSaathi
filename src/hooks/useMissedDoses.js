/**
 * useMissedDoses Hook
 *
 * Custom hook to fetch missed doses with filtering and pagination support.
 * Uses Firestore queries to fetch doses with status 'missed' and applies
 * filters for parent, medicine, and date range.
 *
 * Requirements: Phase 5 - Escalation (5.7.3)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';

/**
 * Hook to fetch missed doses with filtering and pagination
 *
 * Fetches doses with status 'missed' for the specified filters.
 * Supports filtering by parent, medicine, and date range.
 * Implements pagination for efficient loading of large datasets.
 * Automatically refetches when filters change.
 *
 * @param {Object} filters - Filter options
 * @param {string} filters.parentId - Parent's Firebase Auth UID (required)
 * @param {string|null} filters.medicineId - Medicine ID to filter by (optional)
 * @param {Date|null} filters.startDate - Start of date range (optional)
 * @param {Date|null} filters.endDate - End of date range (optional)
 * @param {number} filters.pageSize - Number of doses per page (default: 20)
 * @returns {Object} Missed doses data and state
 * @returns {Array<Object>} returns.doses - Array of missed dose objects
 * @returns {boolean} returns.loading - True while fetching initial data
 * @returns {boolean} returns.loadingMore - True while fetching more pages
 * @returns {Error|null} returns.error - Error object if fetch failed, null otherwise
 * @returns {boolean} returns.hasMore - True if more doses available to load
 * @returns {Function} returns.loadMore - Function to load next page
 * @returns {Function} returns.refetch - Function to manually refetch data
 *
 * @example
 * function MissedDosesList({ parentId }) {
 *   const [medicineFilter, setMedicineFilter] = useState(null);
 *   const startDate = new Date();
 *   startDate.setDate(startDate.getDate() - 30); // 30 days ago
 *
 *   const {
 *     doses,
 *     loading,
 *     loadingMore,
 *     error,
 *     hasMore,
 *     loadMore,
 *     refetch
 *   } = useMissedDoses({
 *     parentId,
 *     medicineId: medicineFilter,
 *     startDate,
 *     endDate: new Date(),
 *     pageSize: 20
 *   });
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return (
 *     <FlatList
 *       data={doses}
 *       renderItem={({ item }) => <DoseCard dose={item} />}
 *       onEndReached={loadMore}
 *       ListFooterComponent={loadingMore ? <LoadingSpinner /> : null}
 *     />
 *   );
 * }
 */
export function useMissedDoses(filters = {}) {
  const {
    parentId,
    medicineId = null,
    startDate = null,
    endDate = null,
    pageSize = 20,
  } = filters;

  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  // Keep lastDocRef in sync with lastDoc state
  useEffect(() => {
    lastDocRef.current = lastDoc;
  }, [lastDoc]);

  /**
   * Build Firestore query with filters
   */
  const buildQuery = useCallback(
    (startAfterDoc = null) => {
      // Handle edge case: no parentId provided
      if (!parentId) {
        return null;
      }

      let query = firestore()
        .collection('doses')
        .where('parentId', '==', parentId)
        .where('status', '==', 'missed');

      // Apply medicine filter if provided
      if (medicineId) {
        query = query.where('medicineId', '==', medicineId);
      }

      // Apply date range filters if provided
      if (startDate) {
        query = query.where('scheduledTime', '>=', startDate);
      }
      if (endDate) {
        query = query.where('scheduledTime', '<=', endDate);
      }

      // Sort by most recent first
      query = query.orderBy('scheduledTime', 'desc');

      // Apply pagination
      query = query.limit(pageSize);

      // Start after last document for pagination
      if (startAfterDoc) {
        query = query.startAfter(startAfterDoc);
      }

      return query;
    },
    [parentId, medicineId, startDate, endDate, pageSize],
  );

  /**
   * Fetch doses from Firestore
   */
  const fetchDoses = useCallback(
    async (isLoadingMore = false) => {
      // Handle edge case: no parentId provided
      if (!parentId) {
        setDoses([]);
        setLoading(false);
        setError(null);
        setHasMore(false);
        return;
      }

      // Handle edge case: invalid date range
      if (startDate && endDate && startDate > endDate) {
        setDoses([]);
        setLoading(false);
        setError(new Error('Start date must be before end date'));
        setHasMore(false);
        return;
      }

      try {
        if (isLoadingMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setError(null);
        }

        const query = buildQuery(isLoadingMore ? lastDocRef.current : null);

        if (!query) {
          setDoses([]);
          setLoading(false);
          setLoadingMore(false);
          setHasMore(false);
          return;
        }

        const snapshot = await query.get();

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
            escalatedAt:
              doseData.escalatedAt?.toDate?.() || doseData.escalatedAt,
          });
        });

        // Update last document for pagination
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        }

        // Check if there are more doses to load
        setHasMore(snapshot.docs.length === pageSize);

        // Update doses list
        if (isLoadingMore) {
          setDoses(prevDoses => [...prevDoses, ...fetchedDoses]);
        } else {
          setDoses(fetchedDoses);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching missed doses:', err);
        setError(err);
        if (!isLoadingMore) {
          setDoses([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [parentId, buildQuery, pageSize, startDate, endDate],
  );

  /**
   * Load more doses (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) {
      fetchDoses(true);
    }
  }, [loadingMore, loading, hasMore, fetchDoses]);

  /**
   * Refetch doses from beginning
   */
  const refetch = useCallback(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchDoses(false);
  }, [fetchDoses]);

  /**
   * Fetch doses when filters change
   */
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchDoses(false);
  }, [parentId, medicineId, startDate, endDate, pageSize, fetchDoses]);

  return {
    doses,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

export default useMissedDoses;
