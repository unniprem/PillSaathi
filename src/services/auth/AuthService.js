/**
 * AuthService - Firebase Authentication Service
 *
 * Handles all Firebase Authentication operations including phone OTP
 * authentication, user management, and error handling.
 *
 * Requirements: 1.1, 1.4, 1.5, 1.6
 */

import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signInWithCredential,
  PhoneAuthProvider,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';

/**
 * Error message mapping for Firebase Authentication error codes
 * Maps technical error codes to user-friendly messages
 */
const ERROR_MESSAGES = {
  'auth/invalid-phone-number': 'Please enter a valid phone number',
  'auth/missing-phone-number': 'Phone number is required',
  'auth/quota-exceeded': 'Too many requests. Please try again later',
  'auth/user-disabled': 'This account has been disabled',
  'auth/invalid-verification-code':
    'Invalid verification code. Please try again',
  'auth/invalid-verification-id':
    'Verification session expired. Please request a new code',
  'auth/code-expired':
    'Verification code has expired. Please request a new code',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Please check your connection',
  default: 'An error occurred. Please try again',
};

/**
 * AuthService class
 * Provides methods for Firebase phone authentication operations
 */
class AuthService {
  constructor(authInstance = null) {
    this.auth = authInstance || getAuth(getApp());
  }

  /**
   * Initialize Firebase Auth listener
   * Sets up a listener for authentication state changes
   *
   * @param {Function} onAuthStateChanged - Callback function called when auth state changes
   * @returns {Function} Unsubscribe function to stop listening to auth state changes
   *
   * @example
   * const unsubscribe = authService.initAuthListener((user) => {
   *   console.log('Auth state changed:', user);
   * });
   * // Later: unsubscribe();
   */
  initAuthListener(callback) {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Send OTP via Firebase Phone Authentication
   * Initiates phone number verification by sending an OTP via SMS
   *
   * Requirements: 1.1 - Send OTP to valid phone number
   *
   * @param {string} phoneNumber - Phone number with country code in E.164 format (e.g., +1234567890)
   * @returns {Promise<{verificationId: string}>} Object containing verification ID for OTP confirmation
   * @throws {Error} Authentication error with code and user-friendly message
   *
   * @example
   * try {
   *   const { verificationId } = await authService.sendPhoneOTP('+1234567890');
   *   // Navigate to OTP verification screen with verificationId
   * } catch (error) {
   *   console.error('Failed to send OTP:', error.message);
   * }
   */
  async sendPhoneOTP(phoneNumber) {
    try {
      const confirmation = await signInWithPhoneNumber(this.auth, phoneNumber);
      return {
        verificationId: confirmation.verificationId,
      };
    } catch (error) {
      const mappedError = new Error(this.getErrorMessage(error.code));
      mappedError.code = error.code;
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Verify OTP code
   * Confirms the OTP code sent to the user's phone number
   *
   * Requirements: 1.5 - Verify correct OTP and authenticate user
   * Requirements: 1.6 - Handle incorrect OTP with error message
   *
   * @param {string} verificationId - Verification ID from sendPhoneOTP
   * @param {string} code - 6-digit OTP code entered by user
   * @returns {Promise<UserCredential>} Firebase UserCredential object containing user information
   * @throws {Error} Authentication error if verification fails
   *
   * @example
   * try {
   *   const userCredential = await authService.verifyPhoneOTP(verificationId, '123456');
   *   console.log('User authenticated:', userCredential.user.uid);
   * } catch (error) {
   *   console.error('Invalid OTP:', error.message);
   * }
   */
  async verifyPhoneOTP(verificationId, code) {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await signInWithCredential(this.auth, credential);
      return userCredential;
    } catch (error) {
      const mappedError = new Error(this.getErrorMessage(error.code));
      mappedError.code = error.code;
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Sign out current user
   * Signs out the currently authenticated user and clears auth state
   *
   * @returns {Promise<void>}
   * @throws {Error} If sign out operation fails
   *
   * @example
   * try {
   *   await authService.signOut();
   *   // Navigate to login screen
   * } catch (error) {
   *   console.error('Sign out failed:', error.message);
   * }
   */
  async signOut() {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      const mappedError = new Error(this.getErrorMessage(error.code));
      mappedError.code = error.code;
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Get current authenticated user
   * Returns the currently authenticated Firebase user or null if not authenticated
   *
   * @returns {FirebaseAuthTypes.User | null} Current user object or null
   *
   * @example
   * const user = authService.getCurrentUser();
   * if (user) {
   *   console.log('Current user UID:', user.uid);
   *   console.log('Phone number:', user.phoneNumber);
   * } else {
   *   console.log('No user authenticated');
   * }
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Map Firebase error codes to user-friendly messages
   * Converts technical Firebase error codes into readable error messages
   *
   * Requirements: 1.4 - Display descriptive error messages
   *
   * @param {string} errorCode - Firebase error code (e.g., 'auth/invalid-phone-number')
   * @returns {string} User-friendly error message
   *
   * @example
   * const message = authService.getErrorMessage('auth/invalid-phone-number');
   * // Returns: 'Please enter a valid phone number'
   */
  getErrorMessage(errorCode) {
    return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
  }
}

// Export singleton instance
export default new AuthService();
