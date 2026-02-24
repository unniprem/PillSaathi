/**
 * Environment Variable Loading Tests
 *
 * Tests that react-native-config properly loads environment variables
 */

import Config from 'react-native-config';
import {
  testEnvLoading,
  getCurrentEnvironment,
  isDevelopment,
  isProduction,
} from '../src/utils/envTest';

// Mock react-native-config for testing
jest.mock('react-native-config', () => ({
  ENV: 'development',
  FIREBASE_PROJECT_ID: 'pillsathi-dev',
  FIREBASE_ANDROID_APP_ID: '1:1054326980522:android:2b05aa3888748b513635d3',
  FIREBASE_ANDROID_API_KEY: 'AIzaSyAgVjBrS8Uz6QXqb6cLJOpcQkn9degehA8',
  APP_NAME: 'PillSathi Dev',
  API_BASE_URL: 'https://us-central1-pillsathi-dev.cloudfunctions.net',
  ENABLE_DEBUG_LOGS: 'true',
}));

describe('Environment Variable Loading', () => {
  describe('testEnvLoading', () => {
    it('should successfully load critical environment variables', () => {
      const results = testEnvLoading();

      expect(results.success).toBe(true);
      expect(results.errors).toHaveLength(0);
    });

    it('should load ENV variable', () => {
      const results = testEnvLoading();

      expect(results.variables.ENV).toBeDefined();
      expect(results.variables.ENV).toBe('development');
    });

    it('should load Firebase configuration variables', () => {
      const results = testEnvLoading();

      expect(results.variables.FIREBASE_PROJECT_ID).toBeDefined();
      expect(results.variables.FIREBASE_ANDROID_APP_ID).toBeDefined();
      expect(results.variables.FIREBASE_ANDROID_API_KEY).toBeDefined();
    });

    it('should load app configuration variables', () => {
      const results = testEnvLoading();

      expect(results.variables.APP_NAME).toBeDefined();
      expect(results.variables.APP_NAME).toBe('PillSathi Dev');
    });

    it('should warn about missing optional variables', () => {
      const results = testEnvLoading();

      // iOS variables should be missing in dev environment
      expect(results.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrentEnvironment', () => {
    it('should return the current environment', () => {
      const env = getCurrentEnvironment();

      expect(env).toBe('development');
    });
  });

  describe('isDevelopment', () => {
    it('should return true when ENV is development', () => {
      expect(isDevelopment()).toBe(true);
    });
  });

  describe('isProduction', () => {
    it('should return false when ENV is development', () => {
      expect(isProduction()).toBe(false);
    });
  });

  describe('Config object', () => {
    it('should have all critical variables defined', () => {
      expect(Config.ENV).toBeDefined();
      expect(Config.FIREBASE_PROJECT_ID).toBeDefined();
      expect(Config.FIREBASE_ANDROID_APP_ID).toBeDefined();
      expect(Config.FIREBASE_ANDROID_API_KEY).toBeDefined();
      expect(Config.APP_NAME).toBeDefined();
    });

    it('should have correct values for development environment', () => {
      expect(Config.ENV).toBe('development');
      expect(Config.FIREBASE_PROJECT_ID).toBe('pillsathi-dev');
      expect(Config.APP_NAME).toBe('PillSathi Dev');
    });
  });
});
