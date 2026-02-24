/**
 * Platform Firebase Test Script
 *
 * This script tests Firebase connectivity on actual devices/emulators.
 * Run this from the React Native app to verify Firebase works on both platforms.
 *
 * Usage:
 *   Import and call from a screen or component:
 *   import { runPlatformFirebaseTests } from './scripts/test-firebase-platform';
 *   runPlatformFirebaseTests();
 */

import { Platform, Alert } from 'react-native';
import { runFirestoreTests } from '../src/utils/firebaseTest';

/**
 * Run Firebase tests on the current platform
 * Shows results in an alert dialog
 */
export const runPlatformFirebaseTests = async () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Running Firebase Tests on ${Platform.OS.toUpperCase()}`);
  console.log(`Platform Version: ${Platform.Version}`);
  console.log('='.repeat(60));

  try {
    const results = await runFirestoreTests({ verbose: true });

    const message = `
Platform: ${Platform.OS} ${Platform.Version}
Environment: ${results.environment}
Project: ${results.projectId}

Tests Run: ${results.summary.total}
Passed: ${results.summary.passed} ✅
Failed: ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : ''}
Duration: ${results.summary.totalDuration}ms

Status: ${results.summary.failed === 0 ? '✅ ALL PASSED' : '❌ SOME FAILED'}
    `.trim();

    Alert.alert(
      results.summary.failed === 0
        ? '✅ Firebase Tests Passed'
        : '❌ Firebase Tests Failed',
      message,
      [{ text: 'OK' }],
    );

    return results;
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    Alert.alert('❌ Test Error', `Failed to run tests: ${error.message}`, [
      { text: 'OK' },
    ]);
    throw error;
  }
};

export default runPlatformFirebaseTests;
