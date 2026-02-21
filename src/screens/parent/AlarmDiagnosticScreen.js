/**
 * Alarm Diagnostic Screen
 * For testing and debugging alarms
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  createTestAlarm,
  runAlarmDiagnostics,
} from '../../utils/alarmDiagnostics';

function AlarmDiagnosticScreen() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  const handleTestAlarm = async () => {
    try {
      setTesting(true);
      console.log('Creating test alarm...');
      const testTime = await createTestAlarm(1);
      console.log('Test alarm created for:', testTime.toLocaleString());

      Alert.alert(
        'Test Alarm Created',
        `Alarm will trigger at ${testTime.toLocaleTimeString()}.\n\nWait 1 minute!`,
      );
    } catch (error) {
      console.error('Test alarm error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setTesting(true);
      console.log('Running diagnostics...');
      const result = await runAlarmDiagnostics(user?.uid);
      setDiagnosticResult(result);
      console.log('Diagnostic result:', result);
    } catch (error) {
      console.error('Diagnostic error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCheckAlarms = async () => {
    try {
      setTesting(true);
      const AlarmSchedulerService =
        require('../../services/AlarmSchedulerService').default;
      const allAlarms = await AlarmSchedulerService.getAllScheduledAlarms();

      console.log('=== ALL SCHEDULED ALARMS ===');
      console.log('Total:', allAlarms.length);

      const now = Date.now();
      const futureAlarms = allAlarms.filter(a => a.triggerTimestamp > now);
      const pastAlarms = allAlarms.filter(a => a.triggerTimestamp <= now);

      console.log('Future alarms:', futureAlarms.length);
      console.log('Past alarms:', pastAlarms.length);

      allAlarms.forEach(alarm => {
        const alarmTime = new Date(alarm.triggerTimestamp);
        const minutesUntil = Math.round((alarm.triggerTimestamp - now) / 60000);
        console.log(
          `- ${
            alarm.medicineName
          }: ${alarmTime.toLocaleString()} (${minutesUntil} min)`,
        );
      });

      Alert.alert(
        'Scheduled Alarms',
        `Total: ${allAlarms.length}\nFuture: ${futureAlarms.length}\nPast: ${pastAlarms.length}\n\nCheck console for details`,
      );
    } catch (error) {
      console.error('Check alarms error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Alarm Diagnostics</Text>
        <Text style={styles.subtitle}>Test and debug alarm system</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleTestAlarm}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Creating...' : '🔔 Test Alarm (1 min)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleCheckAlarms}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Checking...' : '📋 Check Scheduled Alarms'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRunDiagnostics}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Running...' : '🔍 Run Full Diagnostics'}
          </Text>
        </TouchableOpacity>
      </View>

      {diagnosticResult && (
        <View style={styles.section}>
          <Text style={styles.resultTitle}>Diagnostic Results</Text>
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>
              Issues: {diagnosticResult.issues.length}
            </Text>
            {diagnosticResult.issues.map((issue, i) => (
              <Text key={i} style={styles.issueText}>
                • {issue}
              </Text>
            ))}
            {diagnosticResult.recommendations.length > 0 && (
              <>
                <Text style={styles.resultText}>Recommendations:</Text>
                {diagnosticResult.recommendations.map((rec, i) => (
                  <Text key={i} style={styles.recText}>
                    • {rec}
                  </Text>
                ))}
              </>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  resultBox: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '600',
  },
  issueText: {
    fontSize: 14,
    color: '#D32F2F',
    marginLeft: 8,
    marginTop: 4,
  },
  recText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginTop: 4,
  },
});

export default AlarmDiagnosticScreen;
