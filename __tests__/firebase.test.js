/**
 * Firebase Configuration Tests
 *
 * Tests for the Firebase configuration module
 */

// Mock react-native-config
jest.mock('react-native-config', () => ({
  ENV: 'development',
  FIREBASE_PROJECT_ID: 'pillsathi-dev',
  FIREBASE_STORAGE_BUCKET: 'pillsathi-dev.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '1054326980522',
  FIREBASE_ANDROID_APP_ID: '1:1054326980522:android:test',
  FIREBASE_ANDROID_API_KEY: 'test-api-key',
  FIREBASE_AUTH_DOMAIN: 'pillsathi-dev.firebaseapp.com',
  ENABLE_DEBUG_LOGS: 'true',
}));

// Mock Firebase modules
jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    signInWithPhoneNumber: jest.fn(),
  });
});

jest.mock('@react-native-firebase/firestore', () => {
  const firestoreMock = () => ({
    collection: jest.fn(),
    settings: jest.fn(),
  });
  firestoreMock.CACHE_SIZE_UNLIMITED = -1;
  return firestoreMock;
});

jest.mock('@react-native-firebase/messaging', () => {
  return () => ({
    requestPermission: jest.fn(),
  });
});

describe('Firebase Configuration', () => {
  let firebase;

  beforeEach(() => {
    // Clear module cache to get fresh imports
    jest.resetModules();
    firebase = require('../src/config/firebase').default;
  });

  describe('Environment Detection', () => {
    it('should detect development environment', () => {
      expect(firebase.getEnvironment()).toBe('development');
      expect(firebase.isDevelopment()).toBe(true);
      expect(firebase.isProduction()).toBe(false);
    });

    it('should return correct environment indicator', () => {
      expect(firebase.getEnvironmentIndicator()).toBe('DEV');
    });

    it('should return detailed environment info', () => {
      const info = firebase.getEnvironmentInfo();
      expect(info).toHaveProperty('environment', 'development');
      expect(info).toHaveProperty('indicator', 'DEV');
      expect(info).toHaveProperty('isDevelopment', true);
      expect(info).toHaveProperty('isProduction', false);
      expect(info).toHaveProperty('projectId', 'pillsathi-dev');
      expect(info).toHaveProperty(
        'authDomain',
        'pillsathi-dev.firebaseapp.com',
      );
      expect(info).toHaveProperty('debugLogsEnabled', true);
    });

    it('should return correct Firebase config', () => {
      const config = firebase.getFirebaseConfig();
      expect(config.projectId).toBe('pillsathi-dev');
      expect(config.storageBucket).toBe('pillsathi-dev.firebasestorage.app');
      expect(config.messagingSenderId).toBe('1054326980522');
    });
  });

  describe('Firebase Instances', () => {
    it('should export auth instance', () => {
      expect(firebase.auth).toBeDefined();
    });

    it('should export firestore instance', () => {
      expect(firebase.firestore).toBeDefined();
    });

    it('should export messaging instance', () => {
      expect(firebase.messaging).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should initialize Firebase successfully', () => {
      const result = firebase.initializeFirebase();
      expect(result).toBe(true);
    });

    it('should configure Firestore settings', () => {
      firebase.initializeFirebase();
      expect(firebase.firestore.settings).toHaveBeenCalled();
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      // Mock production environment
      jest.resetModules();
      jest.doMock('react-native-config', () => ({
        ENV: 'production',
        FIREBASE_PROJECT_ID: 'pillsathi-prod',
        FIREBASE_STORAGE_BUCKET: 'pillsathi-prod.firebasestorage.app',
        FIREBASE_MESSAGING_SENDER_ID: '9876543210',
        FIREBASE_ANDROID_APP_ID: '1:9876543210:android:prod',
        FIREBASE_ANDROID_API_KEY: 'prod-api-key',
        FIREBASE_AUTH_DOMAIN: 'pillsathi-prod.firebaseapp.com',
        ENABLE_DEBUG_LOGS: 'false',
      }));
    });

    afterEach(() => {
      jest.resetModules();
    });

    it('should detect production environment', () => {
      const prodFirebase = require('../src/config/firebase').default;
      expect(prodFirebase.getEnvironment()).toBe('production');
      expect(prodFirebase.isDevelopment()).toBe(false);
      expect(prodFirebase.isProduction()).toBe(true);
    });

    it('should return PROD indicator in production', () => {
      const prodFirebase = require('../src/config/firebase').default;
      expect(prodFirebase.getEnvironmentIndicator()).toBe('PROD');
    });

    it('should return production environment info', () => {
      const prodFirebase = require('../src/config/firebase').default;
      const info = prodFirebase.getEnvironmentInfo();
      expect(info.environment).toBe('production');
      expect(info.indicator).toBe('PROD');
      expect(info.isDevelopment).toBe(false);
      expect(info.isProduction).toBe(true);
      expect(info.projectId).toBe('pillsathi-prod');
      expect(info.debugLogsEnabled).toBe(false);
    });
  });
});
