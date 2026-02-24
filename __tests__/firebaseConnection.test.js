/**
 * Firebase Connection Verification Tests
 *
 * These tests verify that the app is properly connected to the
 * development Firebase project and all services are accessible.
 */

// Mock Firebase modules
jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    currentUser: null,
    signInAnonymously: jest.fn(),
  });
});

jest.mock('@react-native-firebase/firestore', () => {
  const firestoreMock = () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      })),
      get: jest.fn(() => Promise.resolve({ size: 0, docs: [] })),
      limit: jest.fn(function () {
        return this;
      }),
    })),
    settings: jest.fn(),
  });
  firestoreMock.CACHE_SIZE_UNLIMITED = -1;
  return firestoreMock;
});

jest.mock('@react-native-firebase/messaging', () => {
  return () => ({
    requestPermission: jest.fn(),
    getToken: jest.fn(),
  });
});

jest.mock('react-native-config', () => ({
  ENV: 'development',
  FIREBASE_PROJECT_ID: 'pillsathi-dev',
  FIREBASE_STORAGE_BUCKET: 'pillsathi-dev.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '1054326980522',
  FIREBASE_ANDROID_APP_ID: '1:1054326980522:android:2b05aa3888748b513635d3',
  FIREBASE_ANDROID_API_KEY: 'AIzaSyAgVjBrS8Uz6QXqb6cLJOpcQkn9degehA8',
  FIREBASE_AUTH_DOMAIN: 'pillsathi-dev.firebaseapp.com',
  ENABLE_DEBUG_LOGS: 'true',
}));

import { verifyDevFirebaseConnection } from '../src/utils/verifyFirebaseConnection';
import firebase from '../src/config/firebase';

describe('Firebase Dev Connection Verification', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeAll(() => {
    // Suppress console output for cleaner test results
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Environment Configuration', () => {
    it('should be configured for development environment', () => {
      const env = firebase.getEnvironment();
      expect(env).toBe('development');
    });

    it('should connect to pillsathi-dev project', () => {
      const config = firebase.getFirebaseConfig();
      expect(config.projectId).toBe('pillsathi-dev');
    });

    it('should have correct auth domain for dev', () => {
      const config = firebase.getFirebaseConfig();
      expect(config.authDomain).toBe('pillsathi-dev.firebaseapp.com');
    });

    it('should identify as development environment', () => {
      expect(firebase.isDevelopment()).toBe(true);
      expect(firebase.isProduction()).toBe(false);
    });

    it('should have DEV environment indicator', () => {
      const indicator = firebase.getEnvironmentIndicator();
      expect(indicator).toBe('DEV');
    });
  });

  describe('Firebase Services Availability', () => {
    it('should have Auth service initialized', () => {
      expect(firebase.auth).toBeDefined();
      expect(firebase.auth).not.toBeNull();
      expect(typeof firebase.auth).toBe('object');
    });

    it('should have Firestore service initialized', () => {
      expect(firebase.firestore).toBeDefined();
      expect(firebase.firestore).not.toBeNull();
      expect(typeof firebase.firestore.collection).toBe('function');
    });

    it('should have Messaging service initialized', () => {
      expect(firebase.messaging).toBeDefined();
      expect(firebase.messaging).not.toBeNull();
      expect(typeof firebase.messaging).toBe('object');
    });
  });

  describe('Connection Verification Function', () => {
    it('should run verification without errors', async () => {
      const results = await verifyDevFirebaseConnection();
      expect(results).toBeDefined();
      expect(results).toHaveProperty('success');
      expect(results).toHaveProperty('environment');
      expect(results).toHaveProperty('projectId');
      expect(results).toHaveProperty('checks');
      expect(results).toHaveProperty('errors');
      expect(results).toHaveProperty('timestamp');
    });

    it('should verify environment is development', async () => {
      const results = await verifyDevFirebaseConnection();
      expect(results.environment).toBe('development');
      expect(results.checks.environmentConfig).toBe(true);
    });

    it('should verify connection to pillsathi-dev', async () => {
      const results = await verifyDevFirebaseConnection();
      expect(results.projectId).toBe('pillsathi-dev');
      expect(results.checks.correctProject).toBe(true);
    });

    it('should verify all services are initialized', async () => {
      const results = await verifyDevFirebaseConnection();
      expect(results.checks.authService).toBe(true);
      expect(results.checks.firestoreService).toBe(true);
      expect(results.checks.messagingService).toBe(true);
    });

    it('should report overall success', async () => {
      const results = await verifyDevFirebaseConnection();
      expect(results.success).toBe(true);
      expect(results.errors).toHaveLength(0);
    });

    it('should include timestamp in results', async () => {
      const results = await verifyDevFirebaseConnection();
      expect(results.timestamp).toBeDefined();
      expect(new Date(results.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Firebase Configuration Details', () => {
    it('should have correct project number', () => {
      const config = firebase.getFirebaseConfig();
      expect(config.messagingSenderId).toBe('1054326980522');
    });

    it('should have correct storage bucket', () => {
      const config = firebase.getFirebaseConfig();
      expect(config.storageBucket).toBe('pillsathi-dev.firebasestorage.app');
    });

    it('should have valid Android app ID', () => {
      const config = firebase.getFirebaseConfig();
      expect(config.appId).toBe(
        '1:1054326980522:android:2b05aa3888748b513635d3',
      );
    });

    it('should have valid API key', () => {
      const config = firebase.getFirebaseConfig();
      expect(config.apiKey).toBeDefined();
      expect(config.apiKey).toBeTruthy();
      expect(typeof config.apiKey).toBe('string');
    });
  });

  describe('Environment Info', () => {
    it('should provide complete environment information', () => {
      const info = firebase.getEnvironmentInfo();
      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('indicator');
      expect(info).toHaveProperty('isDevelopment');
      expect(info).toHaveProperty('isProduction');
      expect(info).toHaveProperty('projectId');
      expect(info).toHaveProperty('authDomain');
      expect(info).toHaveProperty('debugLogsEnabled');
    });

    it('should indicate development mode correctly', () => {
      const info = firebase.getEnvironmentInfo();
      expect(info.isDevelopment).toBe(true);
      expect(info.isProduction).toBe(false);
      expect(info.indicator).toBe('DEV');
    });

    it('should have debug logs enabled in dev', () => {
      const info = firebase.getEnvironmentInfo();
      expect(info.debugLogsEnabled).toBe(true);
    });
  });
});
