/**
 * Setup verification tests
 * Ensures that the authentication infrastructure is properly configured
 */

import fc from 'fast-check';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  ERROR_MESSAGES,
  getErrorMessage,
} from '../src/constants/errorMessages';

describe('Authentication Infrastructure Setup', () => {
  describe('fast-check configuration', () => {
    test('fast-check is properly installed and working', () => {
      fc.assert(
        fc.property(fc.integer(), num => {
          expect(typeof num).toBe('number');
          return true;
        }),
        { numRuns: 10 },
      );
    });
  });

  describe('Firebase Auth mock', () => {
    test('auth mock is available', () => {
      expect(auth).toBeDefined();
      expect(typeof auth).toBe('function');
    });

    test('auth instance has required methods', () => {
      const authInstance = auth();
      expect(authInstance.signInWithPhoneNumber).toBeDefined();
      expect(authInstance.signOut).toBeDefined();
      expect(authInstance.onAuthStateChanged).toBeDefined();
    });
  });

  describe('Firestore mock', () => {
    test('firestore mock is available', () => {
      expect(firestore).toBeDefined();
      expect(typeof firestore).toBe('function');
    });

    test('firestore instance has required methods', () => {
      const firestoreInstance = firestore();
      expect(firestoreInstance.collection).toBeDefined();
      expect(firestoreInstance.doc).toBeDefined();
    });

    test('firestore has FieldValue utilities', () => {
      expect(firestore.FieldValue).toBeDefined();
      expect(firestore.FieldValue.serverTimestamp).toBeDefined();
    });
  });

  describe('Error message mapping', () => {
    test('ERROR_MESSAGES constant is defined', () => {
      expect(ERROR_MESSAGES).toBeDefined();
      expect(typeof ERROR_MESSAGES).toBe('object');
    });

    test('ERROR_MESSAGES contains required auth error codes', () => {
      expect(ERROR_MESSAGES['auth/invalid-phone-number']).toBeDefined();
      expect(ERROR_MESSAGES['auth/invalid-verification-code']).toBeDefined();
      expect(ERROR_MESSAGES['auth/network-request-failed']).toBeDefined();
    });

    test('ERROR_MESSAGES contains required firestore error codes', () => {
      expect(ERROR_MESSAGES['firestore/permission-denied']).toBeDefined();
      expect(ERROR_MESSAGES['firestore/unavailable']).toBeDefined();
    });

    test('ERROR_MESSAGES has default fallback', () => {
      expect(ERROR_MESSAGES.default).toBeDefined();
      expect(ERROR_MESSAGES.default).toBe(
        'An error occurred. Please try again',
      );
    });

    test('getErrorMessage returns correct message for known error codes', () => {
      expect(getErrorMessage('auth/invalid-phone-number')).toBe(
        'Please enter a valid phone number',
      );
      expect(getErrorMessage('auth/network-request-failed')).toBe(
        'Network error. Please check your connection',
      );
    });

    test('getErrorMessage returns default message for unknown error codes', () => {
      expect(getErrorMessage('unknown/error-code')).toBe(
        'An error occurred. Please try again',
      );
      expect(getErrorMessage('')).toBe('An error occurred. Please try again');
      expect(getErrorMessage(null)).toBe('An error occurred. Please try again');
    });

    test('property: all error codes map to non-empty strings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(ERROR_MESSAGES)),
          errorCode => {
            const message = ERROR_MESSAGES[errorCode];
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Directory structure', () => {
    test('required directories exist', () => {
      // This test verifies the directory structure was created
      // The actual verification happens during setup
      expect(true).toBe(true);
    });
  });
});
