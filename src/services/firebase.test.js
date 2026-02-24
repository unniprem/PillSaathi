/**
 * Firebase Service Integration Tests
 *
 * Tests for Firebase service connectivity and initialization.
 * These tests verify that Firebase services (Auth, Firestore) are properly
 * initialized and can connect without errors.
 */

// Mock Firebase modules before importing firebase config
jest.mock('@react-native-firebase/firestore', () => {
  const firestoreMock = () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(),
      get: jest.fn(),
    })),
    settings: jest.fn(),
  });
  firestoreMock.CACHE_SIZE_UNLIMITED = -1;
  return firestoreMock;
});

import firebase from '../config/firebase';

describe('Firebase Service Integration', () => {
  // Suppress console errors for cleaner test output
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Firebase Initialization', () => {
    it('should initialize Firebase without throwing errors', () => {
      expect(() => {
        firebase.initializeFirebase();
      }).not.toThrow();
    });

    it('should return a boolean result from initialization', () => {
      const result = firebase.initializeFirebase();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Firestore Connection', () => {
    it('should have Firestore instance available', () => {
      expect(firebase.firestore).toBeDefined();
      expect(firebase.firestore).not.toBeNull();
    });

    it('should be able to reference a collection', () => {
      expect(() => {
        firebase.firestore.collection('test');
      }).not.toThrow();
    });

    it('should have collection method available', () => {
      expect(firebase.firestore.collection).toBeDefined();
      expect(typeof firebase.firestore.collection).toBe('function');
    });

    it('should be able to call Firestore methods', () => {
      const collection = firebase.firestore.collection('users');
      expect(collection).toBeDefined();
    });
  });

  describe('Auth Initialization', () => {
    it('should have Auth instance available', () => {
      expect(firebase.auth).toBeDefined();
      expect(firebase.auth).not.toBeNull();
    });

    it('should have auth instance as an object', () => {
      expect(typeof firebase.auth).toBe('object');
    });

    it('should be able to access auth instance without errors', () => {
      expect(() => {
        const auth = firebase.auth;
        expect(auth).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Messaging Service', () => {
    it('should have Messaging instance available', () => {
      expect(firebase.messaging).toBeDefined();
      expect(firebase.messaging).not.toBeNull();
    });

    it('should have messaging instance as an object', () => {
      expect(typeof firebase.messaging).toBe('object');
    });

    it('should be able to access messaging instance without errors', () => {
      expect(() => {
        const messaging = firebase.messaging;
        expect(messaging).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Connection Verification', () => {
    it('should have valid environment configuration', () => {
      const config = firebase.getFirebaseConfig();

      expect(config.projectId).toBeDefined();
      expect(config.projectId).not.toBe('');
      expect(config.authDomain).toBeDefined();
      expect(config.authDomain).not.toBe('');
    });

    it('should have all required Firebase config properties', () => {
      const config = firebase.getFirebaseConfig();

      expect(config).toHaveProperty('projectId');
      expect(config).toHaveProperty('storageBucket');
      expect(config).toHaveProperty('messagingSenderId');
      expect(config).toHaveProperty('appId');
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('authDomain');
    });

    it('should not have empty critical config values', () => {
      const config = firebase.getFirebaseConfig();

      expect(config.projectId).toBeTruthy();
      expect(config.apiKey).toBeTruthy();
      expect(config.appId).toBeTruthy();
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should connect to correct Firebase project based on environment', () => {
      const env = firebase.getEnvironment();
      const config = firebase.getFirebaseConfig();

      if (env === 'development') {
        expect(config.projectId).toContain('dev');
      } else if (env === 'production') {
        expect(config.projectId).toContain('prod');
      }
    });

    it('should have environment info available', () => {
      const info = firebase.getEnvironmentInfo();

      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('projectId');
      expect(info).toHaveProperty('isDevelopment');
      expect(info).toHaveProperty('isProduction');
    });

    it('should correctly identify development environment', () => {
      const env = firebase.getEnvironment();
      const isDev = firebase.isDevelopment();

      if (env === 'development') {
        expect(isDev).toBe(true);
      }
    });

    it('should have correct environment indicator', () => {
      const indicator = firebase.getEnvironmentIndicator();
      expect(['DEV', 'PROD']).toContain(indicator);
    });
  });

  describe('Service Availability', () => {
    it('should export all required Firebase services', () => {
      expect(firebase).toHaveProperty('auth');
      expect(firebase).toHaveProperty('firestore');
      expect(firebase).toHaveProperty('messaging');
    });

    it('should export all utility functions', () => {
      expect(firebase).toHaveProperty('getEnvironment');
      expect(firebase).toHaveProperty('getEnvironmentIndicator');
      expect(firebase).toHaveProperty('getEnvironmentInfo');
      expect(firebase).toHaveProperty('isDevelopment');
      expect(firebase).toHaveProperty('isProduction');
      expect(firebase).toHaveProperty('getFirebaseConfig');
      expect(firebase).toHaveProperty('initializeFirebase');
    });

    it('should have all utility functions as functions', () => {
      expect(typeof firebase.getEnvironment).toBe('function');
      expect(typeof firebase.getEnvironmentIndicator).toBe('function');
      expect(typeof firebase.getEnvironmentInfo).toBe('function');
      expect(typeof firebase.isDevelopment).toBe('function');
      expect(typeof firebase.isProduction).toBe('function');
      expect(typeof firebase.getFirebaseConfig).toBe('function');
      expect(typeof firebase.initializeFirebase).toBe('function');
    });
  });
});
