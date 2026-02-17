/**
 * Firebase Configuration Module
 *
 * This module initializes Firebase services and exports instances
 * for use throughout the application. It uses environment variables
 * from react-native-config to switch between dev and prod environments.
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import Config from 'react-native-config';

/**
 * Get current environment
 * @returns {string} Current environment (development/production)
 */
export const getEnvironment = () => {
  return Config.ENV || 'development';
};

/**
 * Check if running in development mode
 * @returns {boolean} True if in development
 */
export const isDevelopment = () => {
  return getEnvironment() === 'development';
};

/**
 * Check if running in production mode
 * @returns {boolean} True if in production
 */
export const isProduction = () => {
  return getEnvironment() === 'production';
};

/**
 * Get Firebase project configuration
 * @returns {Object} Firebase configuration object
 */
export const getFirebaseConfig = () => {
  return {
    projectId: Config.FIREBASE_PROJECT_ID,
    storageBucket: Config.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID,
    appId: Config.FIREBASE_ANDROID_APP_ID,
    apiKey: Config.FIREBASE_ANDROID_API_KEY,
    authDomain: Config.FIREBASE_AUTH_DOMAIN,
  };
};

/**
 * Firebase Auth instance
 * Provides authentication services
 */
export const firebaseAuth = auth();

/**
 * Firestore instance
 * Provides database services
 */
export const firebaseFirestore = firestore();

/**
 * Firebase Messaging instance
 * Provides push notification services
 */
export const firebaseMessaging = messaging();

/**
 * Get environment indicator string
 * Returns a formatted string indicating the current environment
 * @returns {string} Environment indicator (e.g., "DEV" or "PROD")
 */
export const getEnvironmentIndicator = () => {
  return isDevelopment() ? 'DEV' : 'PROD';
};

/**
 * Get detailed environment information
 * @returns {Object} Environment metadata
 */
export const getEnvironmentInfo = () => {
  const config = getFirebaseConfig();
  return {
    environment: getEnvironment(),
    indicator: getEnvironmentIndicator(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    projectId: config.projectId,
    authDomain: config.authDomain,
    debugLogsEnabled: Config.ENABLE_DEBUG_LOGS === 'true',
  };
};

/**
 * Log Firebase initialization info
 * Only logs in development mode
 */
export const logFirebaseInfo = () => {
  if (isDevelopment() && Config.ENABLE_DEBUG_LOGS === 'true') {
    const config = getFirebaseConfig();
    console.warn('🔥 Firebase Initialized');
    console.warn(
      `📍 Environment: ${getEnvironment()} (${getEnvironmentIndicator()})`,
    );
    console.warn(`📦 Project ID: ${config.projectId}`);
    console.warn(`🔐 Auth Domain: ${config.authDomain}`);
  }
};

/**
 * Enable Firebase debug logging
 * Only works in development mode
 */
export const enableFirebaseDebugLogging = () => {
  if (__DEV__ && Config.ENABLE_DEBUG_LOGS === 'true') {
    // Note: React Native Firebase doesn't support setLogLevel
    // Debug logging is controlled via native configuration
    console.warn('🐛 Firebase debug logging enabled (via native config)');
  }
};

/**
 * Disable Firebase debug logging
 */
export const disableFirebaseDebugLogging = () => {
  if (__DEV__) {
    console.warn('🔇 Firebase debug logging disabled');
  }
};

/**
 * Initialize Firebase services
 * Call this early in your app lifecycle
 */
export const initializeFirebase = () => {
  try {
    // Firebase is automatically initialized by @react-native-firebase/app
    // based on google-services.json (Android) and GoogleService-Info.plist (iOS)

    // Configure Firestore settings
    firebaseFirestore.settings({
      persistence: true, // Enable offline persistence
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });

    // Enable debug logging if configured
    if (Config.ENABLE_DEBUG_LOGS === 'true') {
      enableFirebaseDebugLogging();
    }

    // Log initialization info
    logFirebaseInfo();

    return true;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return false;
  }
};

// Export default object with all Firebase services
export default {
  auth: firebaseAuth,
  firestore: firebaseFirestore,
  messaging: firebaseMessaging,
  getEnvironment,
  getEnvironmentIndicator,
  getEnvironmentInfo,
  isDevelopment,
  isProduction,
  getFirebaseConfig,
  initializeFirebase,
  logFirebaseInfo,
  enableFirebaseDebugLogging,
  disableFirebaseDebugLogging,
};
