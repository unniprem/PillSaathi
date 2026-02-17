/* eslint-disable no-console */
/* eslint-disable prefer-template */
/**
 * Firebase Test Utilities
 *
 * Utility functions for testing Firebase Firestore read and write operations.
 * These functions are useful for verifying Firebase connectivity and
 * database access during development and testing.
 *
 * Usage:
 *   import { testFirestoreWrite, testFirestoreRead } from './utils/firebaseTest';
 *
 *   // Test write operation
 *   const writeResult = await testFirestoreWrite();
 *   console.log('Write test:', writeResult.success ? 'PASSED' : 'FAILED');
 *
 *   // Test read operation
 *   const readResult = await testFirestoreRead();
 *   console.log('Read test:', readResult.success ? 'PASSED' : 'FAILED');
 */

import firebase from '../config/firebase';

/**
 * Test Firestore write operation
 *
 * Creates a test document in the _firebase_tests collection,
 * then deletes it to clean up.
 *
 * @param {Object} options - Test options
 * @param {boolean} options.cleanup - Whether to delete test document after write (default: true)
 * @param {boolean} options.verbose - Whether to log detailed output (default: true)
 * @returns {Promise<Object>} Test result object
 */
export const testFirestoreWrite = async (options = {}) => {
  const { cleanup = true, verbose = true } = options;

  const result = {
    success: false,
    operation: 'write',
    timestamp: new Date().toISOString(),
    documentId: null,
    error: null,
    duration: 0,
  };

  const startTime = Date.now();

  try {
    if (verbose) {
      console.log('🔍 Testing Firestore write operation...');
    }

    // Generate unique document ID
    const docId = `test_write_${Date.now()}`;
    result.documentId = docId;

    // Create test document reference
    const testDocRef = firebase.firestore
      .collection('_firebase_tests')
      .doc(docId);

    // Test data
    const testData = {
      timestamp: new Date().toISOString(),
      testType: 'write',
      environment: firebase.getEnvironment(),
      projectId: firebase.getFirebaseConfig().projectId,
      platform: 'react-native',
    };

    // Attempt write
    await testDocRef.set(testData);

    result.success = true;
    result.duration = Date.now() - startTime;

    if (verbose) {
      console.log(`✅ Firestore write successful (${result.duration}ms)`);
      console.log(`   Document ID: ${docId}`);
    }

    // Clean up test document if requested
    if (cleanup) {
      try {
        await testDocRef.delete();
        if (verbose) {
          console.log('✅ Test document cleaned up');
        }
      } catch (cleanupError) {
        if (verbose) {
          console.warn(
            '⚠️  Failed to clean up test document:',
            cleanupError.message,
          );
        }
      }
    }

    return result;
  } catch (error) {
    result.success = false;
    result.error = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
    };
    result.duration = Date.now() - startTime;

    if (verbose) {
      console.error(`❌ Firestore write failed (${result.duration}ms)`);
      console.error(`   Error: ${error.message}`);
      if (error.code) {
        console.error(`   Code: ${error.code}`);
      }
    }

    return result;
  }
};

/**
 * Test Firestore read operation
 *
 * Attempts to read from the _firebase_tests collection.
 * If no documents exist, creates a temporary one for testing.
 *
 * @param {Object} options - Test options
 * @param {boolean} options.verbose - Whether to log detailed output (default: true)
 * @returns {Promise<Object>} Test result object
 */
export const testFirestoreRead = async (options = {}) => {
  const { verbose = true } = options;

  const result = {
    success: false,
    operation: 'read',
    timestamp: new Date().toISOString(),
    documentsRead: 0,
    error: null,
    duration: 0,
  };

  const startTime = Date.now();

  try {
    if (verbose) {
      console.log('🔍 Testing Firestore read operation...');
    }

    // Attempt to read from test collection
    const testCollectionRef = firebase.firestore.collection('_firebase_tests');
    const snapshot = await testCollectionRef.limit(5).get();

    result.success = true;
    result.documentsRead = snapshot.size;
    result.duration = Date.now() - startTime;

    if (verbose) {
      console.log(`✅ Firestore read successful (${result.duration}ms)`);
      console.log(`   Documents read: ${snapshot.size}`);
    }

    // If no documents exist, create a temporary one for future tests
    if (snapshot.empty && verbose) {
      console.log(
        'ℹ️  Collection is empty, creating test document for future reads...',
      );
      try {
        await testFirestoreWrite({ cleanup: false, verbose: false });
        console.log('✅ Test document created');
      } catch (writeError) {
        console.warn('⚠️  Could not create test document:', writeError.message);
      }
    }

    return result;
  } catch (error) {
    result.success = false;
    result.error = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
    };
    result.duration = Date.now() - startTime;

    if (verbose) {
      console.error(`❌ Firestore read failed (${result.duration}ms)`);
      console.error(`   Error: ${error.message}`);
      if (error.code) {
        console.error(`   Code: ${error.code}`);
      }
    }

    return result;
  }
};

/**
 * Run both read and write tests
 *
 * Executes both Firestore read and write tests and returns
 * a combined result object.
 *
 * @param {Object} options - Test options
 * @param {boolean} options.verbose - Whether to log detailed output (default: true)
 * @returns {Promise<Object>} Combined test results
 */
export const runFirestoreTests = async (options = {}) => {
  const { verbose = true } = options;

  if (verbose) {
    console.log('\n' + '='.repeat(50));
    console.log('Firebase Firestore Tests');
    console.log('='.repeat(50));
    console.log(`Environment: ${firebase.getEnvironment()}`);
    console.log(`Project: ${firebase.getFirebaseConfig().projectId}`);
    console.log('='.repeat(50) + '\n');
  }

  const results = {
    timestamp: new Date().toISOString(),
    environment: firebase.getEnvironment(),
    projectId: firebase.getFirebaseConfig().projectId,
    tests: {
      write: null,
      read: null,
    },
    summary: {
      total: 2,
      passed: 0,
      failed: 0,
      totalDuration: 0,
    },
  };

  // Run write test
  results.tests.write = await testFirestoreWrite({ ...options, cleanup: true });
  if (results.tests.write.success) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
  }
  results.summary.totalDuration += results.tests.write.duration;

  // Run read test
  results.tests.read = await testFirestoreRead(options);
  if (results.tests.read.success) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
  }
  results.summary.totalDuration += results.tests.read.duration;

  // Print summary
  if (verbose) {
    console.log('\n' + '='.repeat(50));
    console.log('Test Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed} ✅`);
    console.log(
      `Failed: ${results.summary.failed} ${
        results.summary.failed > 0 ? '❌' : ''
      }`,
    );
    console.log(`Total Duration: ${results.summary.totalDuration}ms`);
    console.log(
      `Status: ${
        results.summary.failed === 0 ? '✅ ALL PASSED' : '❌ SOME FAILED'
      }`,
    );
    console.log('='.repeat(50) + '\n');
  }

  return results;
};

/**
 * Test Firestore query operation
 *
 * Tests more complex query operations including filtering and ordering.
 *
 * @param {Object} options - Test options
 * @param {boolean} options.verbose - Whether to log detailed output (default: true)
 * @returns {Promise<Object>} Test result object
 */
export const testFirestoreQuery = async (options = {}) => {
  const { verbose = true } = options;

  const result = {
    success: false,
    operation: 'query',
    timestamp: new Date().toISOString(),
    documentsQueried: 0,
    error: null,
    duration: 0,
  };

  const startTime = Date.now();

  try {
    if (verbose) {
      console.log('🔍 Testing Firestore query operation...');
    }

    // Create test collection reference with query
    const testCollectionRef = firebase.firestore
      .collection('_firebase_tests')
      .where('testType', '==', 'write')
      .orderBy('timestamp', 'desc')
      .limit(3);

    const snapshot = await testCollectionRef.get();

    result.success = true;
    result.documentsQueried = snapshot.size;
    result.duration = Date.now() - startTime;

    if (verbose) {
      console.log(`✅ Firestore query successful (${result.duration}ms)`);
      console.log(`   Documents queried: ${snapshot.size}`);
    }

    return result;
  } catch (error) {
    result.success = false;
    result.error = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
    };
    result.duration = Date.now() - startTime;

    if (verbose) {
      console.error(`❌ Firestore query failed (${result.duration}ms)`);
      console.error(`   Error: ${error.message}`);
      if (error.code) {
        console.error(`   Code: ${error.code}`);
      }
    }

    return result;
  }
};

// Export default object with all test functions
export default {
  testFirestoreWrite,
  testFirestoreRead,
  testFirestoreQuery,
  runFirestoreTests,
};
