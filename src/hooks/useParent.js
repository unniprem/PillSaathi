/**
 * useParent Hook
 *
 * Custom hook to fetch parent data and alias for a specific parent.
 * Used by caregivers to view parent information.
 *
 * Requirements: 4.1
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RelationshipService from '../services/pairing/RelationshipService';
import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

/**
 * Hook to fetch parent data and alias
 *
 * Fetches parent information from the users collection and
 * retrieves the alias from the relationship document.
 *
 * @param {string} parentId - Parent's Firebase Auth UID
 * @returns {Object} - { parent: Object | null, loading: boolean, error: Error | null, refetch: Function }
 *
 * @example
 * function ParentDetailScreen({ route }) {
 *   const { parentId } = route.params;
 *   const { parent, loading, error, refetch } = useParent(parentId);
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} onRetry={refetch} />;
 *   }
 *
 *   return <ParentInfo parent={parent} />;
 * }
 */
export function useParent(parentId) {
  const { user } = useAuth();
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const firestore = getFirestore(getApp());

  /**
   * Fetch parent data and alias
   */
  const fetchParent = async () => {
    if (!user || !parentId) {
      setParent(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch parent user data
      const parentDoc = await firestore.collection('users').doc(parentId).get();

      if (!parentDoc.exists) {
        throw new Error('Parent not found');
      }

      const parentData = parentDoc.data();

      // Fetch relationship to get alias
      const relationships = await RelationshipService.getRelationships(
        user.uid,
        'caregiver',
      );

      const relationship = relationships.find(
        rel => rel.parentUid === parentId,
      );

      if (!relationship) {
        throw new Error('Relationship not found');
      }

      setParent({
        id: parentId,
        name: relationship.parentAlias || parentData.name || 'Unknown',
        actualName: parentData.name,
        alias: relationship.parentAlias,
        phone: parentData.phoneNumber,
        email: parentData.email,
        relationshipId: relationship.id,
      });
    } catch (err) {
      console.error('Error fetching parent:', err);
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

  // Fetch parent when parentId changes or refetch is triggered
  useEffect(() => {
    fetchParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, user, refetchTrigger]);

  return {
    parent,
    loading,
    error,
    refetch,
  };
}

export default useParent;
