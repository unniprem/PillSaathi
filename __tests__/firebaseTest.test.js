/**
 * Firebase Test Utilities Tests
 *
 * Tests for the firebaseTest utility functions
 */

// Mock Firebase modules before importing
jest.mock('@react-native-firebase/firestore', () => {
  const mockDoc = jest.fn();
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    where: jest.fn(() => ({
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(() =>
            Promise.resolve({
              size: 0,
              empty: true,
            }),
          ),
        })),
      })),
    })),
    limit: jest.fn(() => ({
      get: jest.fn(() =>
        Promise.resolve({
          size: 0,
          empty: true,
        }),
      ),
    })),
  }));

  const firestoreMock = () => ({
    collection: mockCollection,
    settings: jest.fn(),
  });

  firestoreMock.CACHE_SIZE_UNLIMITED = -1;

  return firestoreMock;
});

import {
  testFirestoreWrite,
  testFirestoreRead,
  testFirestoreQuery,
  runFirestoreTests,
} from '../src/utils/firebaseTest';

describe('Firebase Test Utilities', () => {
  // Suppress console output for cleaner test results
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('testFirestoreWrite', () => {
    it('should return a result object with required properties', async () => {
      const result = await testFirestoreWrite({ verbose: false });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('operation');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('documentId');
      expect(result).toHaveProperty('duration');
      expect(result.operation).toBe('write');
    });

    it('should have a boolean success property', async () => {
      const result = await testFirestoreWrite({ verbose: false });
      expect(typeof result.success).toBe('boolean');
    });

    it('should have a timestamp in ISO format', async () => {
      const result = await testFirestoreWrite({ verbose: false });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should have a duration in milliseconds', async () => {
      const result = await testFirestoreWrite({ verbose: false });
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should accept cleanup option', async () => {
      const result = await testFirestoreWrite({
        cleanup: false,
        verbose: false,
      });
      expect(result).toHaveProperty('success');
    });

    it('should accept verbose option', async () => {
      const result = await testFirestoreWrite({ verbose: true });
      expect(result).toHaveProperty('success');
    });
  });

  describe('testFirestoreRead', () => {
    it('should return a result object with required properties', async () => {
      const result = await testFirestoreRead({ verbose: false });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('operation');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('documentsRead');
      expect(result).toHaveProperty('duration');
      expect(result.operation).toBe('read');
    });

    it('should have a boolean success property', async () => {
      const result = await testFirestoreRead({ verbose: false });
      expect(typeof result.success).toBe('boolean');
    });

    it('should have documentsRead as a number', async () => {
      const result = await testFirestoreRead({ verbose: false });
      expect(typeof result.documentsRead).toBe('number');
      expect(result.documentsRead).toBeGreaterThanOrEqual(0);
    });

    it('should have a timestamp in ISO format', async () => {
      const result = await testFirestoreRead({ verbose: false });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should have a duration in milliseconds', async () => {
      const result = await testFirestoreRead({ verbose: false });
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('testFirestoreQuery', () => {
    it('should return a result object with required properties', async () => {
      const result = await testFirestoreQuery({ verbose: false });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('operation');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('documentsQueried');
      expect(result).toHaveProperty('duration');
      expect(result.operation).toBe('query');
    });

    it('should have a boolean success property', async () => {
      const result = await testFirestoreQuery({ verbose: false });
      expect(typeof result.success).toBe('boolean');
    });

    it('should have documentsQueried as a number', async () => {
      const result = await testFirestoreQuery({ verbose: false });
      expect(typeof result.documentsQueried).toBe('number');
      expect(result.documentsQueried).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runFirestoreTests', () => {
    it('should return a combined result object', async () => {
      const result = await runFirestoreTests({ verbose: false });

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('projectId');
      expect(result).toHaveProperty('tests');
      expect(result).toHaveProperty('summary');
    });

    it('should have tests object with write and read results', async () => {
      const result = await runFirestoreTests({ verbose: false });

      expect(result.tests).toHaveProperty('write');
      expect(result.tests).toHaveProperty('read');
      expect(result.tests.write).toHaveProperty('success');
      expect(result.tests.read).toHaveProperty('success');
    });

    it('should have summary with test statistics', async () => {
      const result = await runFirestoreTests({ verbose: false });

      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('passed');
      expect(result.summary).toHaveProperty('failed');
      expect(result.summary).toHaveProperty('totalDuration');
      expect(result.summary.total).toBe(2);
    });

    it('should calculate passed and failed counts correctly', async () => {
      const result = await runFirestoreTests({ verbose: false });

      expect(result.summary.passed + result.summary.failed).toBe(
        result.summary.total,
      );
    });

    it('should have environment information', async () => {
      const result = await runFirestoreTests({ verbose: false });

      expect(result.environment).toBeDefined();
      expect(result.projectId).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in write test', async () => {
      const result = await testFirestoreWrite({ verbose: false });

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).toHaveProperty('message');
      }
    });

    it('should handle errors gracefully in read test', async () => {
      const result = await testFirestoreRead({ verbose: false });

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).toHaveProperty('message');
      }
    });

    it('should include error details when operation fails', async () => {
      const result = await testFirestoreWrite({ verbose: false });

      if (!result.success && result.error) {
        expect(result.error).toHaveProperty('message');
        expect(result.error).toHaveProperty('code');
      }
    });
  });

  describe('Options Handling', () => {
    it('should use default options when none provided', async () => {
      const result = await testFirestoreWrite();
      expect(result).toHaveProperty('success');
    });

    it('should respect verbose option', async () => {
      const verboseResult = await testFirestoreWrite({ verbose: true });
      const quietResult = await testFirestoreWrite({ verbose: false });

      expect(verboseResult).toHaveProperty('success');
      expect(quietResult).toHaveProperty('success');
    });

    it('should respect cleanup option', async () => {
      const withCleanup = await testFirestoreWrite({
        cleanup: true,
        verbose: false,
      });
      const withoutCleanup = await testFirestoreWrite({
        cleanup: false,
        verbose: false,
      });

      expect(withCleanup).toHaveProperty('success');
      expect(withoutCleanup).toHaveProperty('success');
    });
  });
});
