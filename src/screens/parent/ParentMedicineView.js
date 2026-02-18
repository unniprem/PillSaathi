/**
 * ParentMedicineView Screen
 *
 * Displays a read-only list of active medicines for a parent user.
 * Shows medicine details including name, dosage, instructions, and schedule times.
 * Does not provide edit or delete functionality (parent view only).
 *
 * Requirements:
 * - 11.1: Display only active medicines
 * - 11.2: Show medicine name, dosage, and instructions
 * - 11.3: Show schedule times
 * - 11.4: Handle empty state with appropriate message
 * - 11.5: Do not show edit or delete options
 *
 * @format
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import medicineService from '../../services/medicineService';
import scheduleService from '../../services/scheduleService';

/**
 * ParentMedicineView Component
 *
 * @param {Object} props
 * @param {Object} props.route - Navigation route object
 * @param {string} props.route.params.userId - Parent's Firebase Auth UID (optional, can use auth context)
 * @returns {JSX.Element}
 */
const ParentMedicineView = ({ route }) => {
  // In a real app, userId would come from auth context or route params
  const { userId } = route.params || {};

  // State
  const [medicines, setMedicines] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load active medicines and their schedules
   * Requirements: 11.1 - Display only active medicines
   * Requirements: 11.3 - Show schedule times
   */
  const loadMedicinesAndSchedules = async (isRefreshing = false) => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      // Load active medicines only (Requirement 11.1)
      const medicinesList = await medicineService.getActiveMedicinesForParent(
        userId,
      );
      setMedicines(medicinesList);

      // Load schedules for each medicine (Requirement 11.3)
      const schedulesMap = {};
      await Promise.all(
        medicinesList.map(async medicine => {
          try {
            const schedule = await scheduleService.getScheduleForMedicine(
              medicine.id,
            );
            if (schedule) {
              schedulesMap[medicine.id] = schedule;
            }
          } catch (err) {
            console.error(
              `Error loading schedule for medicine ${medicine.id}:`,
              err,
            );
            // Continue loading other schedules even if one fails
          }
        }),
      );
      setSchedules(schedulesMap);
    } catch (err) {
      console.error('Error loading medicines:', err);
      setError('Failed to load medicines. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load medicines on mount
  useEffect(() => {
    loadMedicinesAndSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reload medicines when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMedicinesAndSchedules();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]),
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadMedicinesAndSchedules(true);
  };

  /**
   * Format schedule times for display
   * Converts 24-hour format times to 12-hour format with AM/PM
   *
   * @param {Array<string>} times - Array of times in "HH:MM" format
   * @returns {string} Formatted times string
   */
  const formatScheduleTimes = times => {
    if (!times || times.length === 0) {
      return 'No schedule times';
    }

    return times
      .map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes
          .toString()
          .padStart(2, '0')} ${period}`;
      })
      .join(', ');
  };

  /**
   * Format repeat pattern for display
   *
   * @param {Object} schedule - Schedule object
   * @returns {string} Formatted pattern string
   */
  const formatRepeatPattern = schedule => {
    if (!schedule) {
      return '';
    }

    if (schedule.repeatPattern === 'daily') {
      return 'Daily';
    }

    if (schedule.repeatPattern === 'specific_days' && schedule.selectedDays) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const selectedDayNames = schedule.selectedDays
        .sort((a, b) => a - b)
        .map(day => dayNames[day]);
      return selectedDayNames.join(', ');
    }

    return '';
  };

  /**
   * Render a single medicine card
   * Requirements: 11.2 - Show medicine name, dosage, and instructions
   * Requirements: 11.3 - Show schedule times
   * Requirements: 11.5 - Do not show edit or delete options
   *
   * @param {Object} item - Medicine object
   * @returns {JSX.Element}
   */
  const renderMedicineCard = ({ item }) => {
    const schedule = schedules[item.id];

    return (
      <View style={styles.medicineCard}>
        {/* Medicine Name */}
        <Text style={styles.medicineName}>{item.name}</Text>

        {/* Dosage */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dosage:</Text>
          <Text style={styles.infoValue}>
            {item.dosageAmount} {item.dosageUnit}
          </Text>
        </View>

        {/* Instructions */}
        {item.instructions && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Instructions:</Text>
            <Text style={styles.infoValue}>{item.instructions}</Text>
          </View>
        )}

        {/* Schedule Times */}
        {schedule && (
          <View style={styles.scheduleSection}>
            <Text style={styles.scheduleLabel}>Schedule:</Text>
            <Text style={styles.scheduleTime}>
              {formatScheduleTimes(schedule.times)}
            </Text>
            {schedule.repeatPattern && (
              <Text style={styles.schedulePattern}>
                {formatRepeatPattern(schedule)}
              </Text>
            )}
          </View>
        )}

        {/* No Schedule Message */}
        {!schedule && (
          <View style={styles.scheduleSection}>
            <Text style={styles.noScheduleText}>
              No schedule set for this medicine
            </Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render empty state
   * Requirements: 11.4 - Handle empty state with appropriate message
   *
   * @returns {JSX.Element}
   */
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💊</Text>
        <Text style={styles.emptyTitle}>No Active Medicines</Text>
        <Text style={styles.emptyMessage}>
          You don't have any active medicines at the moment. Your caregiver can
          add medicines for you.
        </Text>
      </View>
    );
  };

  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your medicines...</Text>
      </View>
    );
  }

  // Show error state
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={medicines}
        renderItem={renderMedicineCard}
        keyExtractor={item => item.id}
        contentContainerStyle={
          medicines.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        accessibilityLabel="Your medicines list"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginRight: 8,
    minWidth: 90,
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  scheduleSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  schedulePattern: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  noScheduleText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ParentMedicineView;
