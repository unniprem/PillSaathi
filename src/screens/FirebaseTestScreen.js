/**
 * Firebase Test Screen
 *
 * A screen for testing Firebase connectivity on both Android and iOS platforms.
 * This screen provides buttons to run various Firebase tests and displays results.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { runPlatformFirebaseTests } from '../../scripts/test-firebase-platform';
import firebase from '../config/firebase';

const FirebaseTestScreen = () => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleRunTests = async () => {
    setTesting(true);
    setLastResult(null);

    try {
      const results = await runPlatformFirebaseTests();
      setLastResult(results);
    } catch (error) {
      setLastResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const envInfo = firebase.getEnvironmentInfo();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Firebase Platform Tests</Text>
        <Text style={styles.subtitle}>
          Test Firebase connectivity on {Platform.OS}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Environment Info</Text>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>Version: {Platform.Version}</Text>
        <Text style={styles.infoText}>
          Environment: {envInfo.environment} (
          {envInfo.isDevelopment ? 'DEV' : 'PROD'})
        </Text>
        <Text style={styles.infoText}>Project: {envInfo.projectId}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={handleRunTests}
        disabled={testing}
      >
        {testing ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.buttonText}>Running Tests...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Run Firebase Tests</Text>
        )}
      </TouchableOpacity>

      {lastResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            {lastResult.error ? '❌ Test Failed' : '✅ Test Results'}
          </Text>

          {lastResult.error ? (
            <Text style={styles.errorText}>{lastResult.error}</Text>
          ) : (
            <>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Tests:</Text>
                <Text style={styles.resultValue}>
                  {lastResult.summary.total}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Passed:</Text>
                <Text style={[styles.resultValue, styles.passedText]}>
                  {lastResult.summary.passed} ✅
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Failed:</Text>
                <Text
                  style={[
                    styles.resultValue,
                    lastResult.summary.failed > 0 && styles.failedText,
                  ]}
                >
                  {lastResult.summary.failed}{' '}
                  {lastResult.summary.failed > 0 ? '❌' : ''}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Duration:</Text>
                <Text style={styles.resultValue}>
                  {lastResult.summary.totalDuration}ms
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.testDetailsTitle}>Test Details:</Text>

              <View style={styles.testDetail}>
                <Text style={styles.testName}>Write Test:</Text>
                <Text
                  style={[
                    styles.testStatus,
                    lastResult.tests.write.success
                      ? styles.passedText
                      : styles.failedText,
                  ]}
                >
                  {lastResult.tests.write.success ? '✅ PASSED' : '❌ FAILED'}
                </Text>
                <Text style={styles.testDuration}>
                  {lastResult.tests.write.duration}ms
                </Text>
              </View>

              <View style={styles.testDetail}>
                <Text style={styles.testName}>Read Test:</Text>
                <Text
                  style={[
                    styles.testStatus,
                    lastResult.tests.read.success
                      ? styles.passedText
                      : styles.failedText,
                  ]}
                >
                  {lastResult.tests.read.success ? '✅ PASSED' : '❌ FAILED'}
                </Text>
                <Text style={styles.testDuration}>
                  {lastResult.tests.read.duration}ms
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Ensure you have an active internet connection
        </Text>
        <Text style={styles.instructionsText}>
          2. Verify Firebase is configured correctly
        </Text>
        <Text style={styles.instructionsText}>
          3. Tap "Run Firebase Tests" to test connectivity
        </Text>
        <Text style={styles.instructionsText}>
          4. Check console logs for detailed output
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4285F4',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#4285F4',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  passedText: {
    color: '#34A853',
  },
  failedText: {
    color: '#EA4335',
  },
  errorText: {
    color: '#EA4335',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  testDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  testDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 5,
  },
  testName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  testStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  testDuration: {
    fontSize: 12,
    color: '#999',
    flex: 1,
    textAlign: 'right',
  },
  instructions: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default FirebaseTestScreen;
