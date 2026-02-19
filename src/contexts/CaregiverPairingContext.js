/**
 * CaregiverPairingContext - Caregiver-specific Pairing State Management
 *
 * Manages invite code redemption for caregivers only.
 */

import React, { createContext, useState, useContext } from 'react';
import PairingService from '../services/pairing/PairingService';
import { useAuth } from './AuthContext';

const CaregiverPairingContext = createContext(null);

export const CaregiverPairingProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Redeem invite code for caregiver
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
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    loading,
    error,
    redeemInviteCode,
  };

  return (
    <CaregiverPairingContext.Provider value={value}>
      {children}
    </CaregiverPairingContext.Provider>
  );
};

export const useCaregiverPairing = () => {
  const context = useContext(CaregiverPairingContext);
  if (!context) {
    throw new Error(
      'useCaregiverPairing must be used within a CaregiverPairingProvider',
    );
  }
  return context;
};

export default CaregiverPairingContext;
