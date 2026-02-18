/**
 * UpcomingDoses Screen
 *
 * Displays upcoming doses for a parent user within the next 24 hours.
 * Shows dose details including medicine name, dosage, and scheduled time.
 * Groups doses that share the same scheduled time.
 *
 * Requirements:
 * - 12.1: Display doses for next 24 hours
 * - 12.2: Show medicine name, dosage, and scheduled time
 * - 12.3: Sort by scheduled time (earliest first)
 * - 12.4: Handle empty state with appropriate message
 * - 12.5: Group doses by time when shared
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
import doseService from '../../services/doseService';
import { getErrorMessage, logError } from '../../utils/errorHandler';

/**
 * UpcomingDoses Component
 *
 * @param {Object} props
 * @param {Object} props.route - Navigation route object
 * @param {string} props.route.params.userId - Parent's Firebase Auth UID (optional, can use auth context)
 * @returns {JSX.Element}
 */
const UpcomingDoses = ({ route }) => {
  // In a real app, userId would come from auth context or route params
  const { userId } = route.params || {};

  // State
  const [groupedDoses, setGroupedDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Group doses by scheduled time
   * Groups doses that have the same scheduledTime together.
   *
   * Requirements: 12.5 - Group doses by time when shared
   *
   * @param {Array<Object>} dosesList - Array of dose objects
   * @returns {Array<Object>} Array of grouped dose objects
   */
  const groupDosesByTime = dosesList => {
    if (!dosesList || dosesList.length === 0) {
      return [];
    }

    // Create a map to group doses by time
    const timeMap = new Map();

    dosesList.forEach(dose => {
      if (!dose.scheduledTime) {
        return;
      }

      // Use ISO string as key for grouping
      const timeKey = dose.scheduledTime.toISOString();

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, {
          scheduledTime: dose.scheduledTime,
          doses: [],
        });
      }

      timeMap.get(timeKey).doses.push(dose);
    });

    // Convert map to array and sort by time
    return Array.from(timeMap.values()).sort(
      (a, b) => a.scheduledTime - b.scheduledTime,
    );
  };

  /**
   * Load upcoming doses
   * Requirements: 12.1 - Display doses for next 24 hours
   * Requirements: 12.3 - Sort by scheduled time
   */
  const loadUpcomingDoses = async (isRefreshing = false) => {
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

      // Load doses for next 24 hours (Requirement 12.1)
      // Doses are already sorted by scheduledTime (Requirement 12.3)
      const dosesList = await doseService.getUpcomingDoses(userId, 24);

      // Group doses by time (Requirement 12.5)
      const grouped = groupDosesByTime(dosesList);
      setGroupedDoses(grouped);
    } catch (err) {
      logError(err, 'UpcomingDoses.loadUpcomingDoses', { userId });
      const errorMessage = getErrorMessage(
        err,
        'Failed to load upcoming doses. Please try again.',
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load doses on mount
  useEffect(() => {
    loadUpcomingDoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reload doses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUpcomingDoses();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]),
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadUpcomingDoses(true);
  };

  /**
   * Format time for display
   * Converts Date object to 12-hour format with AM/PM
   *
   * @param {Date} date - Date object
   * @returns {string} Formatted time string
   */
  const formatTime = date => {
    if (!date || !(date instanceof Date)) {
      return 'Invalid time';
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  /**
   * Format date for display
   * Shows relative date (Today, Tomorrow) or full date
   *
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  const formatDate = date => {
    if (!date || !(date instanceof Date)) {
      return 'Invalid date';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const doseDate = new Date(date);
    doseDate.setHours(0, 0, 0, 0);

    if (doseDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (doseDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      // Format as "Mon, Jan 15"
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
  };

  /**
   * Get time until dose
   * Calculates and formats the time remaining until the dose
   *
   * @param {Date} scheduledTime - Scheduled time
   * @returns {string} Formatted time remaining string
   */
  const getTimeUntil = scheduledTime => {
    if (!scheduledTime || !(scheduledTime instanceof Date)) {
      return '';
    }

    const now = new Date();
    const diffMs = scheduledTime - now;

    if (diffMs < 0) {
      return 'Overdue';
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours === 0) {
      return `in ${diffMinutes} min`;
    } else if (diffHours < 24) {
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes === 0) {
        return `in ${diffHours}h`;
      }
      return `in ${diffHours}h ${remainingMinutes}m`;
    }

    return '';
  };

  /**
   * Render a single dose item within a group
   * Requirements: 12.2 - Show medicine name, dosage, and scheduled time
   *
   * @param {Object} dose - Dose object
   * @returns {JSX.Element}
   */
  const renderDoseItem = dose => {
    return (
      <View key={dose.id} style={styles.doseItem}>
        <View style={styles.doseIcon}>
          <Text style={styles.doseIconText}>💊</Text>
        </View>
        <View style={styles.doseInfo}>
          <Text style={styles.medicineName}>{dose.medicineName}</Text>
          <Text style={styles.dosageText}>
            {dose.dosageAmount} {dose.dosageUnit}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render a grouped dose card
   * Shows all doses scheduled for the same time together
   * Requirements: 12.5 - Group doses by time when shared
   *
   * @param {Object} item - Grouped dose object
   * @returns {JSX.Element}
   */
  const renderGroupedDoseCard = ({ item }) => {
    const { scheduledTime, doses: dosesInGroup } = item;

    return (
      <View style={styles.doseCard}>
        {/* Time Header */}
        <View style={styles.timeHeader}>
          <View style={styles.timeHeaderLeft}>
            <Text style={styles.timeText}>{formatTime(scheduledTime)}</Text>
            <Text style={styles.dateText}>{formatDate(scheduledTime)}</Text>
          </View>
          <View style={styles.timeHeaderRight}>
            <Text style={styles.timeUntilText}>
              {getTimeUntil(scheduledTime)}
            </Text>
          </View>
        </View>

        {/* Doses List */}
        <View style={styles.dosesContainer}>
          {dosesInGroup.map(dose => renderDoseItem(dose))}
        </View>

        {/* Dose Count Badge (if multiple doses) */}
        {dosesInGroup.length > 1 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {dosesInGroup.length} medicines
            </Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render empty state
   * Requirements: 12.4 - Handle empty state with appropriate message
   *
   * @returns {JSX.Element}
   */
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No Upcoming Doses</Text>
        <Text style={styles.emptyMessage}>
          You don't have any doses scheduled for the next 24 hours. Check back
          later or contact your caregiver if you think this is incorrect.
        </Text>
      </View>
    );
  };

  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your doses...</Text>
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
        data={groupedDoses}
        renderItem={renderGroupedDoseCard}
        keyExtractor={(item, index) => `group-${index}`}
        contentContainerStyle={
          groupedDoses.length === 0
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
        accessibilityLabel="Upcoming doses list"
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
  doseCard: {
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
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  timeHeaderLeft: {
    flex: 1,
  },
  timeHeaderRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#666666',
  },
  timeUntilText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9500',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dosesContainer: {
    marginTop: 4,
  },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  doseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doseIconText: {
    fontSize: 20,
  },
  doseInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  dosageText: {
    fontSize: 14,
    color: '#666666',
  },
  countBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
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

export default UpcomingDoses;
