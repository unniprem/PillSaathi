/**
 * Full Screen Alarm Screen
 *
 * Displays a full-screen alarm notification when a medicine dose is due.
 * Designed for elderly users with:
 * - Large touch targets (minimum 60px height)
 * - High contrast colors
 * - Large, readable fonts
 * - Simple, clear layout
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DoseTrackerService from '../../services/DoseTrackerService';
import notificationConfig from '../../services/notificationConfig';

/**
 * Format time for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted time (e.g., "8:00 AM")
 */
const formatTime = isoString => {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return '';
  }
};

/**
 * Full Screen Alarm Screen Component
 *
 * Displays medicine information and action buttons when alarm triggers.
 * Allows parent to mark dose as taken, skip, or snooze for 10 minutes.
 *
 * Requirements:
 * - 3.1: Display medicine name prominently
 * - 3.2: Display scheduled dose time
 * - 3.3: Display dosage information
 * - 3.4: Display special instructions if present
 * - 3.5: Provide large "Taken" button
 * - 3.6: Provide "Snooze" button (10 minutes)
 * - 3.7: Provide "Skip" button
 * - 3.8: Use high contrast colors and large fonts
 *
 * @param {Object} props
 * @param {Object} props.route - Navigation route with params
 * @param {Object} props.navigation - Navigation object
 */
const FullScreenAlarmScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);

  // Extract params from route
  const {
    doseId,
    medicineId,
    medicineName,
    dosageAmount,
    dosageUnit,
    scheduledTime,
    instructions,
    alarmId,
  } = route.params || {};

  // Validate required params
  useEffect(() => {
    if (!doseId || !medicineId || !medicineName) {
      console.error('Missing required alarm parameters');
      Alert.alert(
        'Error',
        'Unable to display alarm. Missing required information.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }
  }, [doseId, medicineId, medicineName, navigation]);

  /**
   * Handle "Taken" button press
   * Marks dose as taken and dismisses alarm
   *
   * Requirement 4.1: Mark dose as taken with timestamp
   */
  const handleTaken = async () => {
    if (actionTaken || loading) {
      return;
    }

    setLoading(true);
    setActionTaken(true);

    try {
      // Mark dose as taken
      await DoseTrackerService.markDoseAsTaken(doseId);

      // Cancel the notification
      if (alarmId) {
        await notificationConfig.cancelNotification(alarmId);
      }

      // Show success feedback
      Alert.alert('Success', 'Dose marked as taken', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Failed to mark dose as taken:', error);
      setActionTaken(false);
      Alert.alert('Error', 'Failed to mark dose as taken. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle "Skip" button press
   * Marks dose as skipped and dismisses alarm
   *
   * Requirement 4.2: Mark dose as skipped with timestamp
   */
  const handleSkip = async () => {
    if (actionTaken || loading) {
      return;
    }

    setLoading(true);
    setActionTaken(true);

    try {
      // Mark dose as skipped
      await DoseTrackerService.markDoseAsSkipped(doseId);

      // Cancel the notification
      if (alarmId) {
        await notificationConfig.cancelNotification(alarmId);
      }

      // Show success feedback
      Alert.alert('Skipped', 'Dose marked as skipped', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Failed to mark dose as skipped:', error);
      setActionTaken(false);
      Alert.alert(
        'Error',
        'Failed to mark dose as skipped. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle "Snooze" button press
   * Reschedules alarm for 10 minutes later
   *
   * Requirement 4.3: Snooze alarm for 10 minutes
   */
  const handleSnooze = async () => {
    if (actionTaken || loading) {
      return;
    }

    setLoading(true);
    setActionTaken(true);

    try {
      // Snooze the dose
      await DoseTrackerService.snoozeDose(doseId, medicineId);

      // Cancel the current notification
      if (alarmId) {
        await notificationConfig.cancelNotification(alarmId);
      }

      // Show success feedback
      Alert.alert('Snoozed', 'Alarm will remind you in 10 minutes', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Failed to snooze dose:', error);
      setActionTaken(false);
      Alert.alert('Error', 'Failed to snooze alarm. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle back button or dismiss without action
   * Requirement 3.9: Maintain scheduled status when dismissed without action
   */
  const handleDismiss = () => {
    if (loading) {
      return;
    }

    Alert.alert(
      'Dismiss Alarm',
      'Are you sure you want to dismiss this alarm without taking action?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Medicine Name - Requirement 3.1 */}
        <View style={styles.headerSection}>
          <Text style={styles.alarmIcon}>💊</Text>
          <Text style={styles.title}>{medicineName}</Text>
        </View>

        {/* Dosage Information - Requirement 3.3 */}
        <View style={styles.infoSection}>
          <Text style={styles.dosageLabel}>Dosage</Text>
          <Text style={styles.dosage}>
            {dosageAmount} {dosageUnit}
          </Text>
        </View>

        {/* Scheduled Time - Requirement 3.2 */}
        <View style={styles.infoSection}>
          <Text style={styles.timeLabel}>Scheduled Time</Text>
          <Text style={styles.time}>{formatTime(scheduledTime)}</Text>
        </View>

        {/* Instructions - Requirement 3.4 */}
        {instructions && instructions.trim() !== '' && (
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsLabel}>Instructions</Text>
            <Text style={styles.instructions}>{instructions}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Taken Button - Requirement 3.5 */}
          <TouchableOpacity
            style={[styles.button, styles.takenButton]}
            onPress={handleTaken}
            disabled={loading || actionTaken}
            activeOpacity={0.7}
          >
            {loading && actionTaken ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>✓</Text>
                <Text style={styles.buttonText}>Taken</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Snooze Button - Requirement 3.6 */}
          <TouchableOpacity
            style={[styles.button, styles.snoozeButton]}
            onPress={handleSnooze}
            disabled={loading || actionTaken}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>⏰</Text>
            <Text style={styles.buttonText}>Snooze (10 min)</Text>
          </TouchableOpacity>

          {/* Skip Button - Requirement 3.7 */}
          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
            disabled={loading || actionTaken}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>✕</Text>
            <Text style={styles.buttonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Dismiss Link */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          disabled={loading}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

/**
 * Styles
 * Requirement 3.8: High contrast colors and large fonts for elderly users
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  alarmIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSection: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  dosageLabel: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 8,
  },
  dosage: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
  },
  timeLabel: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 8,
  },
  time: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
  },
  instructionsSection: {
    backgroundColor: '#FFF9E6',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  instructionsLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 20,
    color: '#333333',
    lineHeight: 28,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  takenButton: {
    backgroundColor: '#34C759',
  },
  snoozeButton: {
    backgroundColor: '#FF9500',
  },
  skipButton: {
    backgroundColor: '#FF3B30',
  },
  buttonIcon: {
    fontSize: 28,
    marginRight: 12,
    color: '#FFFFFF',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 18,
    color: '#666666',
    textDecoration: 'underline',
  },
});

export default FullScreenAlarmScreen;
