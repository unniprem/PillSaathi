/**
 * Error Logger Unit Tests
 *
 * Tests for error logging utility functions
 * Requirements: 6.6
 */

import {
  logError,
  logAuthError,
  logProfileError,
  logNetworkError,
  logValidationError,
  logStorageError,
  LogLevel,
  ErrorCategory,
} from './errorLogger';

describe('errorLogger', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('logError', () => {
    it('should log error with all context information', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';

      const logEntry = logError({
        operation: 'testOperation',
        error,
        userId: 'user123',
        category: ErrorCategory.AUTH,
        level: LogLevel.ERROR,
        additionalContext: { test: 'value' },
      });

      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        category: ErrorCategory.AUTH,
        operation: 'testOperation',
        userId: 'user123',
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
        },
        additionalContext: { test: 'value' },
      });

      expect(logEntry.timestamp).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle errors without code', () => {
      const error = new Error('Test error without code');

      const logEntry = logError({
        operation: 'testOperation',
        error,
      });

      expect(logEntry.error.code).toBe('UNKNOWN');
    });

    it('should handle errors with originalError', () => {
      const originalError = new Error('Original error');
      originalError.code = 'ORIGINAL_CODE';

      const error = new Error('Wrapped error');
      error.originalError = originalError;

      const logEntry = logError({
        operation: 'testOperation',
        error,
      });

      expect(logEntry.error.originalError).toMatchObject({
        message: 'Original error',
        code: 'ORIGINAL_CODE',
      });
    });

    it('should use console.warn for WARNING level', () => {
      const error = new Error('Warning error');

      logError({
        operation: 'testOperation',
        error,
        level: LogLevel.WARNING,
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should use console.info for INFO level', () => {
      const error = new Error('Info error');

      logError({
        operation: 'testOperation',
        error,
        level: LogLevel.INFO,
      });

      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('logAuthError', () => {
    it('should log auth error with correct category', () => {
      const error = new Error('Auth error');

      const logEntry = logAuthError('sendOTP', error, 'user123', {
        phoneNumber: '+1234***',
      });

      expect(logEntry.category).toBe(ErrorCategory.AUTH);
      expect(logEntry.operation).toBe('sendOTP');
      expect(logEntry.userId).toBe('user123');
      expect(logEntry.additionalContext.phoneNumber).toBe('+1234***');
    });
  });

  describe('logProfileError', () => {
    it('should log profile error with correct category', () => {
      const error = new Error('Profile error');

      const logEntry = logProfileError('createProfile', error, 'user123', {
        role: 'parent',
      });

      expect(logEntry.category).toBe(ErrorCategory.PROFILE);
      expect(logEntry.operation).toBe('createProfile');
      expect(logEntry.userId).toBe('user123');
      expect(logEntry.additionalContext.role).toBe('parent');
    });
  });

  describe('logNetworkError', () => {
    it('should log network error with correct category', () => {
      const error = new Error('Network error');

      const logEntry = logNetworkError('sendOTP', error, null, {
        endpoint: 'Firebase Auth',
      });

      expect(logEntry.category).toBe(ErrorCategory.NETWORK);
      expect(logEntry.operation).toBe('sendOTP');
      expect(logEntry.additionalContext.endpoint).toBe('Firebase Auth');
    });
  });

  describe('logValidationError', () => {
    it('should log validation error with WARNING level', () => {
      const error = new Error('Validation error');

      const logEntry = logValidationError(
        'validateProfileData',
        error,
        'user123',
        { field: 'name' },
      );

      expect(logEntry.category).toBe(ErrorCategory.VALIDATION);
      expect(logEntry.level).toBe(LogLevel.WARNING);
      expect(logEntry.operation).toBe('validateProfileData');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('logStorageError', () => {
    it('should log storage error with WARNING level', () => {
      const error = new Error('Storage error');

      const logEntry = logStorageError('persistAuthState', error, 'user123');

      expect(logEntry.category).toBe(ErrorCategory.STORAGE);
      expect(logEntry.level).toBe(LogLevel.WARNING);
      expect(logEntry.operation).toBe('persistAuthState');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('default parameters', () => {
    it('should use default values when optional parameters are omitted', () => {
      const error = new Error('Test error');

      const logEntry = logError({
        operation: 'testOperation',
        error,
      });

      expect(logEntry.userId).toBeNull();
      expect(logEntry.category).toBe(ErrorCategory.UNKNOWN);
      expect(logEntry.level).toBe(LogLevel.ERROR);
      expect(logEntry.additionalContext).toEqual({});
    });
  });
});
