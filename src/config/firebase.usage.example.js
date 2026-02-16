/**
 * Firebase Configuration Usage Examples
 *
 * This file demonstrates how to use the Firebase configuration module
 * in your React Native application.
 *
 * Note: In a real application, you would organize these examples
 * into separate files. This file combines them for demonstration.
 */

/* eslint-disable no-unused-vars */

// Import all Firebase exports at the top
import { useEffect } from 'react';
import firebaseDefault, {
  firebaseAuth,
  firebaseFirestore,
  firebaseMessaging,
  isDevelopment,
  isProduction,
  getEnvironment,
  getEnvironmentIndicator,
  getEnvironmentInfo,
  getFirebaseConfig,
} from './firebase';

// ============================================================================
// Example 1: Initialize Firebase in App.js
// ============================================================================

function App() {
  useEffect(() => {
    // Initialize Firebase when app starts
    const initialized = firebaseDefault.initializeFirebase();

    if (initialized) {
      // Firebase is ready to use
      console.warn('Firebase initialized successfully');
    } else {
      console.error('Failed to initialize Firebase');
    }
  }, []);

  return null; // Your app components
}

// ============================================================================
// Example 2: Using Firebase Auth
// ============================================================================

async function signInWithPhone(phoneNumber) {
  try {
    const confirmation = await firebaseAuth.signInWithPhoneNumber(phoneNumber);
    // Handle confirmation
    return confirmation;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

// ============================================================================
// Example 3: Using Firestore
// ============================================================================

async function getUserProfile(userId) {
  try {
    const userDoc = await firebaseFirestore
      .collection('users')
      .doc(userId)
      .get();

    if (userDoc.exists) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Firestore error:', error);
    throw error;
  }
}

// ============================================================================
// Example 4: Using Firebase Messaging
// ============================================================================

async function requestNotificationPermission() {
  try {
    const authStatus = await firebaseMessaging.requestPermission();
    // Check if permission was granted
    // Note: messaging.AuthorizationStatus is from @react-native-firebase/messaging
    const enabled = authStatus === 1 || authStatus === 2; // AUTHORIZED or PROVISIONAL

    if (enabled) {
      const token = await firebaseMessaging.getToken();
      console.warn('FCM Token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Messaging error:', error);
    throw error;
  }
}

// ============================================================================
// Example 5: Environment-Specific Logic
// ============================================================================

function setupAnalytics() {
  if (isDevelopment()) {
    console.warn('Running in development mode - analytics disabled');
    return;
  }

  if (isProduction()) {
    console.warn('Running in production mode - analytics enabled');
    // Initialize analytics
  }

  console.warn(`Current environment: ${getEnvironment()}`);
  console.warn(`Environment indicator: ${getEnvironmentIndicator()}`);
}

// ============================================================================
// Example 6: Getting Environment Information
// ============================================================================

function displayEnvironmentInfo() {
  const envInfo = getEnvironmentInfo();

  console.warn('Environment Information:');
  console.warn(`Environment: ${envInfo.environment}`);
  console.warn(`Indicator: ${envInfo.indicator}`);
  console.warn(`Is Development: ${envInfo.isDevelopment}`);
  console.warn(`Is Production: ${envInfo.isProduction}`);
  console.warn(`Project ID: ${envInfo.projectId}`);
  console.warn(`Auth Domain: ${envInfo.authDomain}`);
  console.warn(
    `Debug Logs: ${envInfo.debugLogsEnabled ? 'Enabled' : 'Disabled'}`,
  );
}

// ============================================================================
// Example 7: Getting Firebase Configuration
// ============================================================================

function displayFirebaseInfo() {
  const config = getFirebaseConfig();

  console.warn('Firebase Configuration:');
  console.warn(`Project ID: ${config.projectId}`);
  console.warn(`Auth Domain: ${config.authDomain}`);
  console.warn(`Storage Bucket: ${config.storageBucket}`);
}

// ============================================================================
// Example 8: Using Default Export
// ============================================================================

function useFirebase() {
  // Access all Firebase services from default export
  const auth = firebaseDefault.auth;
  const firestore = firebaseDefault.firestore;
  const messaging = firebaseDefault.messaging;

  // Access utility functions
  const env = firebaseDefault.getEnvironment();
  const envIndicator = firebaseDefault.getEnvironmentIndicator();
  const envInfo = firebaseDefault.getEnvironmentInfo();
  const isDev = firebaseDefault.isDevelopment();

  return { auth, firestore, messaging, env, envIndicator, envInfo, isDev };
}

// ============================================================================
// Example 9: Displaying Environment Badge in UI
// ============================================================================

function EnvironmentBadge() {
  const indicator = getEnvironmentIndicator();
  const isDev = isDevelopment();

  // Only show badge in development
  if (!isDev) {
    return null;
  }

  return {
    text: indicator,
    backgroundColor: isDev ? '#ff9800' : '#4caf50',
    color: '#ffffff',
  };
}

export {
  signInWithPhone,
  getUserProfile,
  requestNotificationPermission,
  setupAnalytics,
  displayEnvironmentInfo,
  displayFirebaseInfo,
  useFirebase,
  EnvironmentBadge,
};
