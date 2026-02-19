/**
 * PairingContext - Relationships State Management
 *
 * Provides relationship state and methods throughout the app using React Context.
 * Manages relationship viewing and removal with real-time updates.
 *
 * Note: Invite code generation/redemption moved to role-specific contexts:
 * - ParentPairingContext for parents
 * - CaregiverPairingContext for caregivers
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import RelationshipService from '../services/pairing/RelationshipService';
import PairingService from '../services/pairing/PairingService';
import { useAuth } from './AuthContext';

/**
 * Pairing state shape:
 * {
 *   relationships: Array<{
 *     id: string,
 *     parentUid: string,
 *     caregiverUid: string,
 *     createdAt: Date,
 *     parentName?: string,
 *     parentPhone?: string,
 *     caregiverName?: string,
 *     caregiverPhone?: string
 *   }>,
 *   loading: boolean,
 *   error: string | null
 * }
 */

// Create the context
const PairingContext = createContext(null);

/**
 * PairingProvider Component
 * Wraps the app and provides relationship state and methods to all children
 */
export const PairingProvider = ({ children }) => {
  const { user, profile } = useAuth();

  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generate invite code for parent
   * Uses InviteCodeService to generate or retrieve active invite code.
   * Updates context state with the code.
   *
   * Requirements: 1.1 - Generate invite code
   *
   * @returns {Promise<{code: string, expiresAt: Date}>}
   * @throws {Error} If generation fails or user is not a parent
   *
   * @example
   * try {
   *   const code = await generateInviteCode();
   *   console.log('Invite code:', code.code);
   * } catch (error) {
   *   console.error('Failed to generate code:', error.message);
   * }
   */
  const generateInviteCode = async () => {
    if (!user) {
      const authError = new Error('User not authenticated');
      authError.code = 'unauthenticated';
      throw authError;
    }

    if (profile?.role !== 'parent') {
      const permError = new Error('Only parents can generate invite codes');
      permError.code = 'permission-denied';
      throw permError;
    }

    setLoading(true);
    setError(null);

    try {
      const code = await InviteCodeService.generateInviteCode(user.uid);
      setInviteCode(code);
      return code;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Redeem invite code for caregiver
   * Calls Cloud Function to validate code and create relationship.
   * Updates relationships state on success.
   *
   * Requirements: 3.5 - Redeem invite code and create relationship
   *
   * @param {string} code - Invite code to redeem
   * @returns {Promise<void>}
   * @throws {Error} If redemption fails or user is not a caregiver
   *
   * @example
   * try {
   *   await redeemInviteCode('ABC12345');
   *   console.log('Code redeemed successfully');
   * } catch (error) {
   *   console.error('Failed to redeem code:', error.message);
   * }
   */
  const redeemInviteCode = async code => {
    if (!user) {
      const authError = new Error('User not authenticated');
      authError.code = 'unauthenticated';
      throw authError;
    }

    if (profile?.role !== 'caregiver') {
      const permError = new Error('Only caregivers can redeem invite codes');
      permError.code = 'permission-denied';
      throw permError;
    }

    setLoading(true);
    setError(null);

    try {
      await PairingService.redeemInviteCode(code, user.uid);
      // Refresh relationships to include the new one
      await refreshRelationships();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove a relationship
   * Calls Cloud Function to delete relationship.
   * Uses optimistic UI updates: immediately updates UI, then rolls back on error.
   * Shows success confirmation on success.
   * Only caregivers can remove relationships.
   *
   * Requirements: 6.2 - Remove relationship (caregiver only)
   * Requirements: 6.3 - Update both users' lists when relationship removed
   * Requirements: 9.3 - Optimistic UI updates
   *
   * @param {string} relationshipId - Relationship document ID to remove
   * @returns {Promise<void>}
   * @throws {Error} If removal fails
   *
   * @example
   * try {
   *   await removeRelationship(relationshipId);
   *   console.log('Relationship removed');
   * } catch (error) {
   *   console.error('Failed to remove relationship:', error.message);
   * }
   */
  const removeRelationship = async relationshipId => {
    if (!user) {
      const authError = new Error('User not authenticated');
      authError.code = 'unauthenticated';
      throw authError;
    }

    // Store previous state for rollback
    const previousRelationships = [...relationships];

    // Optimistically update UI
    setRelationships(prev =>
      prev.filter(relationship => relationship.id !== relationshipId),
    );

    setLoading(true);
    setError(null);

    try {
      await PairingService.removeRelationship(relationshipId);
    } catch (err) {
      // Rollback on error
      setRelationships(previousRelationships);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh relationships list
   */
  const refreshRelationships = async () => {
    if (!user || !profile) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedRelationships = await RelationshipService.getRelationships(
        user.uid,
        profile.role,
      );
      setRelationships(updatedRelationships);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Set up real-time listeners for relationships
   */
  useEffect(() => {
    let unsubscribe = null;

    // Only set up listener if user is authenticated and has a profile
    if (user && profile) {
      try {
        unsubscribe = RelationshipService.subscribeToRelationships(
          user.uid,
          profile.role,
          (updatedRelationships, listenerError) => {
            if (listenerError) {
              console.error('Relationship listener error:', listenerError);
              setError(listenerError.message);
            } else {
              setRelationships(updatedRelationships);
              setError(null);
            }
          },
        );
      } catch (err) {
        console.error('Failed to set up relationship listener:', err);
        setError(err.message);
      }
    } else {
      // Clear relationships if user is not authenticated
      setRelationships([]);
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, profile]);

  // Context value with methods
  const value = {
    relationships,
    loading,
    error,
    removeRelationship,
    refreshRelationships,
  };

  return (
    <PairingContext.Provider value={value}>{children}</PairingContext.Provider>
  );
};

/**
 * usePairing Hook
 * Custom hook to access pairing context
 */
export const usePairing = () => {
  const context = useContext(PairingContext);
  if (!context) {
    throw new Error('usePairing must be used within a PairingProvider');
  }
  return context;
};

export default PairingContext;
