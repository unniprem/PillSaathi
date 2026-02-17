/**
 * Firebase Connection Verification Utility
 *
 * This utility provides runtime verification that the app is connected
 * to the correct Firebase project (dev or prod) and that all services
 * are functioning correctly.
 */

import firebase from '../config/firebase';

/**
 * Verify Firebase connection to dev environment
 * @returns {Promise<Object>} Verification results
 */
export const verifyDevFirebaseConnection = async () => {
  const results = {
    success: false,
    environment: null,
    projectId: null,
    checks: {
      environmentConfig: false,
      authService: false,
      firestoreService: false,
      messagingService: false,
      correctProject: false,
    },
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    // Check 1: Verify environment configuration
    console.log('🔍 Checking environment configuration...');
    const envInfo = firebase.getEnvironmentInfo();
    results.environment = envInfo.environment;
    results.projectId = envInfo.projectId;

    if (envInfo.environment === 'development') {
      results.checks.environmentConfig = true;
      console.log('✅ Environment: development');
    } else {
      results.errors.push(
        `Expected development environment, got: ${envInfo.environment}`,
      );
      console.log(
        `❌ Environment: ${envInfo.environment} (expected: development)`,
      );
    }

    // Check 2: Verify correct Firebase project
    console.log('🔍 Checking Firebase project ID...');
    if (envInfo.projectId === 'pillsathi-dev') {
      results.checks.correctProject = true;
      console.log('✅ Connected to pillsathi-dev');
    } else {
      results.errors.push(
        `Expected pillsathi-dev project, got: ${envInfo.projectId}`,
      );
      console.log(
        `❌ Project ID: ${envInfo.projectId} (expected: pillsathi-dev)`,
      );
    }

    // Check 3: Verify Auth service
    console.log('🔍 Checking Firebase Auth service...');
    try {
      const authInstance = firebase.auth;
      if (authInstance && typeof authInstance === 'object') {
        results.checks.authService = true;
        console.log('✅ Auth service initialized');
      } else {
        results.errors.push('Auth service not properly initialized');
        console.log('❌ Auth service not available');
      }
    } catch (error) {
      results.errors.push(`Auth service error: ${error.message}`);
      console.log(`❌ Auth service error: ${error.message}`);
    }

    // Check 4: Verify Firestore service
    console.log('🔍 Checking Firestore service...');
    try {
      const firestoreInstance = firebase.firestore;
      if (
        firestoreInstance &&
        typeof firestoreInstance.collection === 'function'
      ) {
        // Try to reference a collection (doesn't make network call)
        const testCollection = firestoreInstance.collection('_connection_test');
        if (testCollection) {
          results.checks.firestoreService = true;
          console.log('✅ Firestore service initialized');
        }
      } else {
        results.errors.push('Firestore service not properly initialized');
        console.log('❌ Firestore service not available');
      }
    } catch (error) {
      results.errors.push(`Firestore service error: ${error.message}`);
      console.log(`❌ Firestore service error: ${error.message}`);
    }

    // Check 5: Verify Messaging service
    console.log('🔍 Checking Firebase Messaging service...');
    try {
      const messagingInstance = firebase.messaging;
      if (messagingInstance && typeof messagingInstance === 'object') {
        results.checks.messagingService = true;
        console.log('✅ Messaging service initialized');
      } else {
        results.errors.push('Messaging service not properly initialized');
        console.log('❌ Messaging service not available');
      }
    } catch (error) {
      results.errors.push(`Messaging service error: ${error.message}`);
      console.log(`❌ Messaging service error: ${error.message}`);
    }

    // Determine overall success
    results.success =
      results.checks.environmentConfig &&
      results.checks.correctProject &&
      results.checks.authService &&
      results.checks.firestoreService &&
      results.checks.messagingService;

    // Print summary
    console.log(`\n${  '='.repeat(50)}`);
    console.log('Firebase Dev Connection Verification Summary');
    console.log('='.repeat(50));
    console.log(`Environment: ${results.environment}`);
    console.log(`Project ID: ${results.projectId}`);
    console.log(`Status: ${results.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log('='.repeat(50));

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('\n');

    return results;
  } catch (error) {
    results.errors.push(`Verification failed: ${error.message}`);
    console.error('❌ Verification error:', error);
    return results;
  }
};

/**
 * Verify Firestore write capability (optional, requires network)
 * @returns {Promise<boolean>} True if write succeeds
 */
export const verifyFirestoreWrite = async () => {
  try {
    console.log('🔍 Testing Firestore write capability...');
    const testDoc = firebase.firestore
      .collection('_connection_test')
      .doc(`test_${  Date.now()}`);

    await testDoc.set({
      timestamp: new Date().toISOString(),
      test: true,
    });

    console.log('✅ Firestore write successful');

    // Clean up test document
    await testDoc.delete();
    console.log('✅ Test document cleaned up');

    return true;
  } catch (error) {
    console.log(`❌ Firestore write failed: ${error.message}`);
    return false;
  }
};

/**
 * Verify Firestore read capability (optional, requires network)
 * @returns {Promise<boolean>} True if read succeeds
 */
export const verifyFirestoreRead = async () => {
  try {
    console.log('🔍 Testing Firestore read capability...');
    const testCollection = firebase.firestore.collection('_connection_test');
    const snapshot = await testCollection.limit(1).get();

    console.log(`✅ Firestore read successful (${snapshot.size} documents)`);
    return true;
  } catch (error) {
    console.log(`❌ Firestore read failed: ${error.message}`);
    return false;
  }
};

/**
 * Run complete Firebase connection verification
 * Includes optional network tests if enabled
 * @param {boolean} includeNetworkTests - Whether to run network-dependent tests
 * @returns {Promise<Object>} Complete verification results
 */
export const runCompleteVerification = async (includeNetworkTests = false) => {
  console.log('\n🚀 Starting Firebase Connection Verification...\n');

  const results = await verifyDevFirebaseConnection();

  if (includeNetworkTests && results.success) {
    console.log('\n📡 Running network-dependent tests...\n');

    const writeSuccess = await verifyFirestoreWrite();
    const readSuccess = await verifyFirestoreRead();

    results.networkTests = {
      write: writeSuccess,
      read: readSuccess,
    };

    console.log(`\n${  '='.repeat(50)}`);
    console.log('Network Tests Summary');
    console.log('='.repeat(50));
    console.log(`Firestore Write: ${writeSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Firestore Read: ${readSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`${'='.repeat(50)  }\n`);
  }

  return results;
};

export default {
  verifyDevFirebaseConnection,
  verifyFirestoreWrite,
  verifyFirestoreRead,
  runCompleteVerification,
};
