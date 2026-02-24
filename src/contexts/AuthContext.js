/**
 * AuthContext - Authentication State Management
 *
 * Provides authentication state and methods throughout the app using React Context.
 * Manages user authentication, profile data, and persistence across app sessions.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.6, 4.7
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/auth/AuthService';
import ProfileService from '../services/auth/ProfileService';
import {
  logAuthError,
  logProfileError,
  logStorageError,
} from '../utils/errorLogger';

/**
 * Auth state shape:
 * {
 *   user: {
 *     uid: string,
 *     phoneNumber: string,
 *     emailVerified: boolean,
 *     metadata: {
 *       creationTime: string,
 *       lastSignInTime: string
 *     }
 *   } | null,
 *   profile: {
 *     uid: string,
 *     phoneNumber: string,
 *     role: 'parent' | 'caregiver',
 *     name: string,
 *     createdAt: Date,
 *     updatedAt: Date,
 *     lastLoginAt: Date
 *   } | null,
 *   loading: boolean,
 *   initialized: boolean,
 *   error: string | null
 * }
 */

// Create the context
const AuthContext = createContext(null);

// AsyncStorage key for auth state persistence
const AUTH_STATE_KEY = '@pillsathi_auth_state';

/**
 * AuthProvider Component
 * Wraps the app and provides authentication state and methods to all children
 *
 * Requirements: 4.1 - Persist authentication state
 * Requirements: 4.2 - Check for existing authentication state on launch
 * Requirements: 4.3 - Restore user session from valid state
 * Requirements: 4.6 - Provide auth state via context
 * Requirements: 4.7 - Notify components of auth state changes
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element}
 *
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Persist auth state to AsyncStorage
   * Requirements: 4.1 - Persist authentication state locally
   */
  const persistAuthState = async (userData, profileData) => {
    try {
      const stateToSave = {
        user: userData,
        profile: profileData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.error('Failed to persist auth state:', err);
      logStorageError('persistAuthState', err, userData?.uid || null);
    }
  };

  /**
   * Clear persisted auth state from AsyncStorage
   */
  const clearPersistedAuthState = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
    } catch (err) {
      console.error('Failed to clear auth state:', err);
      logStorageError('clearPersistedAuthState', err);
    }
  };

  /**
   * Restore auth state from AsyncStorage
   * Requirements: 4.2 - Check for existing authentication state
   * Requirements: 4.3 - Restore user session from valid state
   */
  const restoreAuthState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(AUTH_STATE_KEY);
      if (savedState) {
        const { user: savedUser, profile: savedProfile } =
          JSON.parse(savedState);

        // Verify the user is still authenticated with Firebase
        const currentUser = AuthService.getCurrentUser();
        if (currentUser && currentUser.uid === savedUser?.uid) {
          setUser(savedUser);
          setProfile(savedProfile);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Failed to restore auth state:', err);
      logStorageError('restoreAuthState', err);
      return false;
    }
  };

  /**
   * Load user profile from Firestore
   */
  const loadUserProfile = async uid => {
    try {
      const userProfile = await ProfileService.getProfile(uid);
      setProfile(userProfile);
      return userProfile;
    } catch (err) {
      console.error('Failed to load user profile:', err);
      logProfileError('loadUserProfile', err, uid);
      setError(err.message);
      return null;
    }
  };

  /**
   * Initialize authentication state
   * Sets up Firebase auth listener and restores persisted state
   * Requirements: 4.2, 4.3, 4.7
   */
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Try to restore persisted state first
        await restoreAuthState();

        // Set up Firebase auth state listener
        const unsubscribe = AuthService.initAuthListener(async firebaseUser => {
          if (!isMounted) {
            return;
          }

          if (firebaseUser) {
            // User is authenticated
            const userData = {
              uid: firebaseUser.uid,
              phoneNumber: firebaseUser.phoneNumber,
              emailVerified: firebaseUser.emailVerified,
              metadata: {
                creationTime: firebaseUser.metadata.creationTime,
                lastSignInTime: firebaseUser.metadata.lastSignInTime,
              },
            };

            setUser(userData);

            // Load user profile
            const userProfile = await loadUserProfile(firebaseUser.uid);

            // Persist the complete auth state
            await persistAuthState(userData, userProfile);
          } else {
            // User is not authenticated
            setUser(null);
            setProfile(null);
            await clearPersistedAuthState();
          }

          if (isMounted) {
            setInitialized(true);
          }
        });

        return unsubscribe;
      } catch (err) {
        console.error('Auth initialization error:', err);
        logAuthError('initAuth', err);
        if (isMounted) {
          setError(err.message);
          setInitialized(true);
        }
      }
    };

    const unsubscribePromise = initAuth();

    return () => {
      isMounted = false;
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  /**
   * Send OTP to phone number
   * Requirements: 1.1 - Send OTP via SMS
   *
   * @param {string} phoneNumber - Phone number with country code (e.g., +1234567890)
   * @returns {Promise<string>} verificationId for OTP confirmation
   * @throws {Error} If phone number is invalid or SMS sending fails
   *
   * @example
   * try {
   *   const verificationId = await sendOTP('+1234567890');
   *   // Navigate to OTP screen with verificationId
   * } catch (error) {
   *   console.error('Failed to send OTP:', error.message);
   * }
   */
  const sendOTP = async phoneNumber => {
    setLoading(true);
    setError(null);

    try {
      const { verificationId } = await AuthService.sendPhoneOTP(phoneNumber);
      return verificationId;
    } catch (err) {
      logAuthError('sendOTP', err, null, {
        phoneNumber: `${phoneNumber.substring(0, 5)}***`,
      });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify OTP code
   * Requirements: 1.5 - Authenticate user with correct OTP
   * Requirements: 1.6 - Handle incorrect OTP
   *
   * @param {string} verificationId - ID from sendOTP
   * @param {string} code - 6-digit OTP code
   * @returns {Promise<Object>} User credential with user and profile data
   * @throws {Error} If code is invalid or expired
   *
   * @example
   * try {
   *   const result = await verifyOTP(verificationId, '123456');
   *   // User is now authenticated, navigate to next screen
   * } catch (error) {
   *   console.error('Invalid OTP:', error.message);
   * }
   */
  const verifyOTP = async (verificationId, code) => {
    setLoading(true);
    setError(null);

    try {
      const userCredential = await AuthService.verifyPhoneOTP(
        verificationId,
        code,
      );

      const userData = {
        uid: userCredential.user.uid,
        phoneNumber: userCredential.user.phoneNumber,
        emailVerified: userCredential.user.emailVerified,
        metadata: {
          creationTime: userCredential.user.metadata.creationTime,
          lastSignInTime: userCredential.user.metadata.lastSignInTime,
        },
      };

      setUser(userData);

      // Check if profile exists
      const userProfile = await loadUserProfile(userCredential.user.uid);

      // Persist auth state
      await persistAuthState(userData, userProfile);

      return {
        user: userData,
        profile: userProfile,
      };
    } catch (err) {
      logAuthError('verifyOTP', err, null, {
        codeLength: code?.length,
      });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resend OTP to the same phone number
   * Requirements: 1.7 - Resend OTP and reset verification state
   *
   * @param {string} phoneNumber - Phone number with country code
   * @returns {Promise<string>} New verificationId
   * @throws {Error} If resend fails or rate limited
   *
   * @example
   * try {
   *   const newVerificationId = await resendOTP('+1234567890');
   *   // Update state with new verificationId
   * } catch (error) {
   *   console.error('Failed to resend OTP:', error.message);
   * }
   */
  const resendOTP = async phoneNumber => {
    setLoading(true);
    setError(null);

    try {
      const { verificationId } = await AuthService.sendPhoneOTP(phoneNumber);
      return verificationId;
    } catch (err) {
      logAuthError('resendOTP', err, null, {
        phoneNumber: `${phoneNumber.substring(0, 5)}***`,
      });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create user profile after authentication
   * Requirements: 3.1 - Create user profile in Firestore
   *
   * @param {string} uid - Firebase Auth UID
   * @param {Object} profileData - Profile data {name, role, phone}
   * @returns {Promise<void>}
   * @throws {Error} If profile creation fails
   *
   * @example
   * try {
   *   await createProfile(user.uid, {
   *     name: 'John Doe',
   *     role: 'parent',
   *     phone: '+1234567890'
   *   });
   * } catch (error) {
   *   console.error('Failed to create profile:', error.message);
   * }
   */
  const createProfile = async (uid, profileData) => {
    setLoading(true);
    setError(null);

    try {
      await ProfileService.createProfile(uid, profileData);

      // Reload profile to get the complete data with timestamps
      const userProfile = await loadUserProfile(uid);

      // Update persisted state
      await persistAuthState(user, userProfile);
    } catch (err) {
      logProfileError('createProfile', err, uid, {
        role: profileData?.role,
      });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update existing user profile
   * Requirements: 3.4 - Update user profile information
   *
   * @param {string} uid - Firebase Auth UID
   * @param {Object} updates - Partial profile data to update
   * @returns {Promise<void>}
   * @throws {Error} If update fails
   *
   * @example
   * try {
   *   await updateProfile(user.uid, { name: 'Jane Doe' });
   * } catch (error) {
   *   console.error('Failed to update profile:', error.message);
   * }
   */
  const updateProfile = async (uid, updates) => {
    setLoading(true);
    setError(null);

    try {
      await ProfileService.updateProfile(uid, updates);

      // Reload profile to get updated data
      const userProfile = await loadUserProfile(uid);

      // Update persisted state
      await persistAuthState(user, userProfile);
    } catch (err) {
      logProfileError('updateProfile', err, uid, {
        updateFields: Object.keys(updates),
      });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out current user
   * Requirements: 4.4 - Clear authentication state on logout
   *
   * @returns {Promise<void>}
   *
   * @example
   * try {
   *   await signOut();
   *   // User is signed out, navigate to login screen
   * } catch (error) {
   *   console.error('Sign out failed:', error.message);
   * }
   */
  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await AuthService.signOut();

      // Clear local state
      setUser(null);
      setProfile(null);

      // Clear persisted state
      await clearPersistedAuthState();
    } catch (err) {
      logAuthError('signOut', err, user?.uid || null);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    profile,
    loading,
    initialized,
    error,
    sendOTP,
    verifyOTP,
    resendOTP,
    createProfile,
    updateProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth Hook
 * Custom hook to access auth context
 *
 * @returns {Object} Auth context value
 * @throws {Error} If used outside AuthProvider
 *
 * @example
 * const { user, profile, loading, sendOTP, signOut } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
