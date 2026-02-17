/**
 * Retry Helper Tests
 *
 * Tests for retry logic with exponential backoff
 *
 * Requirements: 9.2
 */

import { retryOperation, isRetryableError, withRetry } from './retryHelper';

describe('retryHelper', () => {
  describe('isRetryableError', () => {
    test('returns true for retryable error codes', () => {
      const retryableCodes = [
        'network-error',
        'timeout',
        'service-unavailable',
        'unavailable',
        'deadline-exceeded',
        'auth/network-request-failed',
        'firestore/unavailable',
      ];

      retryableCodes.forEach(code => {
        const error = new Error('Test error');
        error.code = code;
        expect(isRetryableError(error)).toBe(true);
      });
    });

    test('returns false for non-retryable error codes', () => {
      const error = new Error('Test error');
      error.code = 'permission-denied';
      expect(isRetryableError(error)).toBe(false);
    });

    test('returns false for null or undefined error', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });

    test('returns false for error without code', () => {
      const error = new Error('Test error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('retryOperation', () => {
    test('succeeds on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryOperation(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('retries on retryable error and succeeds', async () => {
      const error = new Error('Network error');
      error.code = 'network-error';

      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await retryOperation(operation, { maxRetries: 2 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('throws immediately on non-retryable error', async () => {
      const error = new Error('Permission denied');
      error.code = 'permission-denied';

      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryOperation(operation, { maxRetries: 3 }),
      ).rejects.toThrow('Permission denied');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('throws after max retries exhausted', async () => {
      const error = new Error('Network error');
      error.code = 'network-error';

      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryOperation(operation, { maxRetries: 2, initialDelay: 10 }),
      ).rejects.toThrow('Network error');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('calls onRetry callback before each retry', async () => {
      const error = new Error('Network error');
      error.code = 'network-error';

      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retryOperation(operation, {
        maxRetries: 3,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, error);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, error);
    });

    test('respects maxDelay cap', async () => {
      const error = new Error('Network error');
      error.code = 'network-error';

      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryOperation(operation, {
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 150,
      });
      const duration = Date.now() - startTime;

      // Should wait ~100ms (not 200ms due to maxDelay cap)
      expect(duration).toBeLessThan(200);
    });
  });

  describe('withRetry', () => {
    test('wraps function with retry logic', async () => {
      const error = new Error('Network error');
      error.code = 'network-error';

      const fn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const wrappedFn = withRetry(fn, { maxRetries: 2 });

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('passes arguments correctly', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrappedFn = withRetry(fn);

      await wrappedFn('test', 123, { key: 'value' });

      expect(fn).toHaveBeenCalledWith('test', 123, { key: 'value' });
    });
  });
});
