/**
 * AuthService Unit Tests
 *
 * Tests for Firebase Authentication service methods
 * Requirements: 1.1, 1.5, 1.6
 */

import auth from '@react-native-firebase/auth';
import AuthService from './AuthService';

// Mock Firebase Auth
jest.mock('@react-native-firebase/auth');

describe('AuthService', () => {
  let mockAuth;
  let mockConfirmation;
  let authService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock confirmation object
    mockConfirmation = {
      verificationId: 'test-verification-id-123',
      confirm: jest.fn(),
    };

    // Create mock auth instance
    mockAuth = {
      signInWithPhoneNumber: jest.fn(),
      signInWithCredential: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChanged: jest.fn(),
      currentUser: null,
    };

    // Mock the auth() function to return our mock instance
    auth.mockReturnValue(mockAuth);

    // Mock PhoneAuthProvider.credential
    auth.PhoneAuthProvider = {
      credential: jest.fn((verificationId, code) => ({
        verificationId,
        code,
        providerId: 'phone',
      })),
    };

    // Create a new AuthService instance with the mock
    const AuthServiceClass = require('./AuthService').default.constructor;
    authService = new AuthServiceClass(mockAuth);
  });

  describe('sendPhoneOTP', () => {
    it('should successfully send OTP for valid phone number', async () => {
      // Arrange
      const phoneNumber = '+1234567890';
      mockAuth.signInWithPhoneNumber.mockResolvedValue(mockConfirmation);

      // Act
      const result = await authService.sendPhoneOTP(phoneNumber);

      // Assert
      expect(mockAuth.signInWithPhoneNumber).toHaveBeenCalledWith(phoneNumber);
      expect(result).toEqual({
        verificationId: 'test-verification-id-123',
      });
    });

    it('should throw error with user-friendly message for invalid phone number', async () => {
      // Arrange
      const invalidPhone = 'invalid';
      const firebaseError = new Error('Invalid phone number');
      firebaseError.code = 'auth/invalid-phone-number';
      mockAuth.signInWithPhoneNumber.mockRejectedValue(firebaseError);

      // Act & Assert
      await expect(authService.sendPhoneOTP(invalidPhone)).rejects.toThrow(
        'Please enter a valid phone number',
      );
    });

    it('should throw error for network failures', async () => {
      // Arrange
      const phoneNumber = '+1234567890';
      const networkError = new Error('Network error');
      networkError.code = 'auth/network-request-failed';
      mockAuth.signInWithPhoneNumber.mockRejectedValue(networkError);

      // Act & Assert
      await expect(authService.sendPhoneOTP(phoneNumber)).rejects.toThrow(
        'Network error. Please check your connection',
      );
    });

    it('should throw error for quota exceeded', async () => {
      // Arrange
      const phoneNumber = '+1234567890';
      const quotaError = new Error('Quota exceeded');
      quotaError.code = 'auth/quota-exceeded';
      mockAuth.signInWithPhoneNumber.mockRejectedValue(quotaError);

      // Act & Assert
      await expect(authService.sendPhoneOTP(phoneNumber)).rejects.toThrow(
        'Too many requests. Please try again later',
      );
    });
  });

  describe('verifyPhoneOTP', () => {
    it('should successfully verify correct OTP', async () => {
      // Arrange
      const verificationId = 'test-verification-id-123';
      const code = '123456';
      const mockUserCredential = {
        user: {
          uid: 'test-uid',
          phoneNumber: '+1234567890',
        },
      };
      mockAuth.signInWithCredential.mockResolvedValue(mockUserCredential);

      // Act
      const result = await authService.verifyPhoneOTP(verificationId, code);

      // Assert
      expect(auth.PhoneAuthProvider.credential).toHaveBeenCalledWith(
        verificationId,
        code,
      );
      expect(mockAuth.signInWithCredential).toHaveBeenCalled();
      expect(result).toEqual(mockUserCredential);
    });

    it('should throw error for invalid OTP code', async () => {
      // Arrange
      const verificationId = 'test-verification-id-123';
      const invalidCode = '000000';
      const invalidCodeError = new Error('Invalid code');
      invalidCodeError.code = 'auth/invalid-verification-code';
      mockAuth.signInWithCredential.mockRejectedValue(invalidCodeError);

      // Act & Assert
      await expect(
        authService.verifyPhoneOTP(verificationId, invalidCode),
      ).rejects.toThrow('Invalid verification code. Please try again');
    });

    it('should throw error for expired verification session', async () => {
      // Arrange
      const verificationId = 'expired-id';
      const code = '123456';
      const expiredError = new Error('Session expired');
      expiredError.code = 'auth/invalid-verification-id';
      mockAuth.signInWithCredential.mockRejectedValue(expiredError);

      // Act & Assert
      await expect(
        authService.verifyPhoneOTP(verificationId, code),
      ).rejects.toThrow(
        'Verification session expired. Please request a new code',
      );
    });

    it('should throw error for expired OTP code', async () => {
      // Arrange
      const verificationId = 'test-verification-id-123';
      const code = '123456';
      const codeExpiredError = new Error('Code expired');
      codeExpiredError.code = 'auth/code-expired';
      mockAuth.signInWithCredential.mockRejectedValue(codeExpiredError);

      // Act & Assert
      await expect(
        authService.verifyPhoneOTP(verificationId, code),
      ).rejects.toThrow(
        'Verification code has expired. Please request a new code',
      );
    });
  });

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      // Arrange
      mockAuth.signOut.mockResolvedValue();

      // Act
      await authService.signOut();

      // Assert
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('should throw error if sign out fails', async () => {
      // Arrange
      const signOutError = new Error('Sign out failed');
      signOutError.code = 'auth/unknown';
      mockAuth.signOut.mockRejectedValue(signOutError);

      // Act & Assert
      await expect(authService.signOut()).rejects.toThrow(
        'An error occurred. Please try again',
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', () => {
      // Arrange
      const mockUser = {
        uid: 'test-uid',
        phoneNumber: '+1234567890',
        metadata: {
          creationTime: '2024-01-01',
          lastSignInTime: '2024-01-02',
        },
      };
      mockAuth.currentUser = mockUser;

      // Act
      const result = authService.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return null when not authenticated', () => {
      // Arrange
      mockAuth.currentUser = null;

      // Act
      const result = authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct message for invalid phone number', () => {
      // Act
      const message = authService.getErrorMessage('auth/invalid-phone-number');

      // Assert
      expect(message).toBe('Please enter a valid phone number');
    });

    it('should return correct message for invalid verification code', () => {
      // Act
      const message = authService.getErrorMessage(
        'auth/invalid-verification-code',
      );

      // Assert
      expect(message).toBe('Invalid verification code. Please try again');
    });

    it('should return correct message for network errors', () => {
      // Act
      const message = authService.getErrorMessage(
        'auth/network-request-failed',
      );

      // Assert
      expect(message).toBe('Network error. Please check your connection');
    });

    it('should return correct message for too many requests', () => {
      // Act
      const message = authService.getErrorMessage('auth/too-many-requests');

      // Assert
      expect(message).toBe('Too many attempts. Please try again later');
    });

    it('should return default message for unknown error codes', () => {
      // Act
      const message = authService.getErrorMessage('auth/unknown-error');

      // Assert
      expect(message).toBe('An error occurred. Please try again');
    });

    it('should return default message for undefined error code', () => {
      // Act
      const message = authService.getErrorMessage(undefined);

      // Assert
      expect(message).toBe('An error occurred. Please try again');
    });
  });

  describe('initAuthListener', () => {
    it('should initialize auth state listener', () => {
      // Arrange
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      mockAuth.onAuthStateChanged.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = authService.initAuthListener(mockCallback);

      // Assert
      expect(mockAuth.onAuthStateChanged).toHaveBeenCalledWith(mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});
