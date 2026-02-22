/**
 * ParentPairingContext - Parent-specific Pairing State Management
 *
 * Manages invite code generation for parents only.
 */

import React, { createContext, useState, useContext } from 'react';
import InviteCodeService from '../services/pairing/InviteCodeService';
import { useAuth } from './AuthContext';

const ParentPairingContext = createContext(null);

export const ParentPairingProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [inviteCode, setInviteCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generate invite code for parent
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
   * Load active invite code
   */
  const loadActiveInviteCode = async () => {
    if (!user || profile?.role !== 'parent') {
      console.log(
        '[ParentPairingContext] Skipping loadActiveInviteCode - user not authenticated or not a parent',
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(
        '[ParentPairingContext] Loading active invite code for user:',
        user.uid,
      );
      const activeCode = await InviteCodeService.getActiveInviteCode(user.uid);
      console.log(
        '[ParentPairingContext] Active invite code loaded:',
        activeCode ? 'found' : 'not found',
      );
      setInviteCode(activeCode);
    } catch (err) {
      console.error(
        '[ParentPairingContext] Failed to load active invite code:',
        err,
      );

      // Provide more specific error messages
      let errorMessage = 'Failed to load invite code';
      if (err.code === 'failed-precondition') {
        errorMessage =
          'Database index not ready. Please try again in a moment.';
      } else if (err.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account settings.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      // Don't throw - allow the UI to continue functioning
    } finally {
      setLoading(false);
    }
  };

  const value = {
    inviteCode,
    loading,
    error,
    generateInviteCode,
    loadActiveInviteCode,
  };

  return (
    <ParentPairingContext.Provider value={value}>
      {children}
    </ParentPairingContext.Provider>
  );
};

export const useParentPairing = () => {
  const context = useContext(ParentPairingContext);
  if (!context) {
    throw new Error(
      'useParentPairing must be used within a ParentPairingProvider',
    );
  }
  return context;
};

export default ParentPairingContext;
