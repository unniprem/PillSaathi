/**
 * PairingContext - Pairing & Relationships State Management
 *
 * Provides pairing and relationship state and methods throughout the app using React Context.
 * Manages invite code generation, redemption, relationship viewing, and real-time updates.
 *
 * Requirements: 1.1, 3.5, 4.1, 4.3, 5.1, 5.3, 6.2, 6.3, 9.1, 9.3
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import InviteCodeService from '../services/pairing/InviteCodeService';
import RelationshipService from '../services/pairing/RelationshipService';
import CloudFunctionsService from '../services/pairing/CloudFunctionsService';
import DevPairingHelper from '../services/pairing/DevPairingHelper';
import { useAuth } from './AuthContext';

// Use dev helper for local testing (set to false when Cloud Functions are deployed)
const USE_DEV_HELPER = true; // TODO: Change to false after deploying Cloud Functions

/**
 * Pairing state shape:
 * {
 *   inviteCode: {
 *     code: string,
 *     expiresAt: Date,
 *     createdAt: Date,
 *     parentUid: string
 *   } | null,
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
 * Wraps the app and provides pairing state and methods to all children
 *
 * Requirements: 1.1 - Manage invite code state
 * Requirements: 4.1 - Manage relationships state
 * Requirements: 5.1 - Provide relationship data via context
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element}
 *
 * @example
 * <AuthProvider>
 *   <PairingProvider>
 *     <App />
 *   </PairingProvider>
 * </AuthProvider>
 */
export const PairingProvider = ({ children }) => {
  const { user, profile } = useAuth();

  const [inviteCode, setInviteCode] = useState(null);
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
      // Use dev helper if Cloud Functions not available
      if (USE_DEV_HELPER) {
        await DevPairingHelper.redeemInviteCodeDev(code, user.uid);
      } else {
        await CloudFunctionsService.redeemInviteCode(code, user.uid);
      }
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

    if (profile?.role !== 'caregiver') {
      const permError = new Error('Only caregivers can remove relationships');
      permError.code = 'permission-denied';
      throw permError;
    }

    if (!USE_DEV_HELPER && !CloudFunctionsService) {
      const serviceError = new Error(
        'Cloud Functions service not available. Please ensure @react-native-firebase/functions is installed.',
      );
      serviceError.code = 'service-unavailable';
      throw serviceError;
    }

    // Store previous state for rollback
    const previousRelationships = [...relationships];

    // Optimistically update UI - remove relationship immediately
    setRelationships(prev =>
      prev.filter(relationship => relationship.id !== relationshipId),
    );

    setLoading(true);
    setError(null);

    try {
      // Use dev helper if Cloud Functions not available
      if (USE_DEV_HELPER) {
        await DevPairingHelper.removeRelationshipDev(relationshipId, user.uid);
      } else {
        await CloudFunctionsService.removeRelationship(relationshipId);
      }

      // Success - relationship removed
      // The real-time listener will update the state, but we've already updated optimistically
    } catch (err) {
      // Rollback on error - restore previous state
      setRelationships(previousRelationships);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh relationships list
   * Manually fetches the latest relationships from Firestore.
   * Updates relationships state.
   *
   * Requirements: 9.1 - Manual refresh capability
   *
   * @returns {Promise<void>}
   * @throws {Error} If refresh fails
   *
   * @example
   * try {
   *   await refreshRelationships();
   *   console.log('Relationships refreshed');
   * } catch (error) {
   *   console.error('Failed to refresh relationships:', error.message);
   * }
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
   * Subscribes to relationship changes when user is authenticated.
   * Cleans up listeners on unmount or when user changes.
   *
   * Requirements: 4.3 - Update display in real-time
   * Requirements: 5.3 - Real-time listener for relationships
   * Requirements: 6.3 - Update both users' lists when relationship removed
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
      setInviteCode(null);
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, profile]);

  /**
   * Load active invite code for parents on mount
   * Fetches the active invite code if user is a parent.
   */
  useEffect(() => {
    const loadActiveInviteCode = async () => {
      if (user && profile?.role === 'parent') {
        try {
          const activeCode = await InviteCodeService.getActiveInviteCode(
            user.uid,
          );
          setInviteCode(activeCode);
        } catch (err) {
          console.error('Failed to load active invite code:', err);
          // Don't set error state for this - it's not critical
        }
      }
    };

    loadActiveInviteCode();
  }, [user, profile]);

  // Context value with methods
  const value = {
    inviteCode,
    relationships,
    loading,
    error,
    generateInviteCode,
    redeemInviteCode,
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
 *
 * @returns {Object} Pairing context value
 * @throws {Error} If used outside PairingProvider
 *
 * @example
 * const { inviteCode, relationships, loading, generateInviteCode, redeemInviteCode } = usePairing();
 */
export const usePairing = () => {
  const context = useContext(PairingContext);
  if (!context) {
    throw new Error('usePairing must be used within a PairingProvider');
  }
  return context;
};

export default PairingContext;
