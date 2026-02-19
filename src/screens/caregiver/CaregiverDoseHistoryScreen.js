/**
 * Caregiver Dose History Screen
 *
 * Displays a table of all doses (taken and missed) across all paired parents.
 * Shows parent name, medicine name, scheduled time, and actual taken time.
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { usePairing } from '../../contexts/PairingContext';
import doseService from '../../services/doseService';

/**
 * Format time for display
 */
function formatTime(date) {
  if (!date || !(date instanceof Date)) {
    return 'N/A';
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Format date for display
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) {
    return 'N/A';
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Caregiver Dose History Screen Component
 */
function CaregiverDoseHistoryScreen() {
  const { user } = useAuth();
  const { relationships } = usePairing();
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load all doses for all paired parents
   */
  const loadDoses = async (isRefreshing = false) => {
    if (!user || relationships.length === 0) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      // Get all parent IDs from relationships
      const parentIds = relationships.map(rel => rel.parentUid);

      // Fetch doses for all parents (last 7 days)
      const allDoses = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const parentId of parentIds) {
        try {
          // Get parent info from relationship
          const relationship = relationships.find(
            rel => rel.parentUid === parentId,
          );
          const parentName = relationship?.parentName || 'Unknown Parent';

          // Get doses for this parent (last 7 days)
          const parentDoses = await doseService.getDosesForDateRange(
            parentId,
            sevenDaysAgo,
            new Date(),
          );

          // Add parent name to each dose
          const dosesWithParent = parentDoses.map(dose => ({
            ...dose,
            parentName,
          }));

          allDoses.push(...dosesWithParent);
        } catch (err) {
          console.error(`Error loading doses for parent ${parentId}:`, err);
        }
      }

      // Sort by scheduled time (most recent first)
      allDoses.sort((a, b) => b.scheduledTime - a.scheduledTime);

      setDoses(allDoses);
    } catch (err) {
      console.error('Error loading doses:', err);
      setError('Failed to load dose history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, relationships]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadDoses(true);
  };

  /**
   * Render dose row
   */
  const renderDoseRow = ({ item }) => {
    const now = new Date();
    const isMissed = item.scheduledTime < now && item.status !== 'taken';
    const statusText =
      item.status === 'taken' ? 'Taken' : isMissed ? 'Missed' : 'Pending';
    const statusColor =
      item.status === 'taken' ? '#34C759' : isMissed ? '#FF3B30' : '#FF9500';

    return (
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.cellText} numberOfLines={1}>
            {item.parentName}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellText} numberOfLines={1}>
            {item.medicineName}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellText}>{formatDate(item.scheduledTime)}</Text>
          <Text style={styles.cellSubtext}>
            {formatTime(item.scheduledTime)}
          </Text>
        </View>
        <View style={styles.cell}>
          {item.takenAt ? (
            <>
              <Text style={styles.cellText}>{formatDate(item.takenAt)}</Text>
              <Text style={styles.cellSubtext}>{formatTime(item.takenAt)}</Text>
            </>
          ) : (
            <Text style={styles.cellText}>-</Text>
          )}
        </View>
        <View style={[styles.cell, styles.statusCell]}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Render header
   */
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={styles.cell}>
        <Text style={styles.headerText}>Parent</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.headerText}>Medicine</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.headerText}>Scheduled</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.headerText}>Taken At</Text>
      </View>
      <View style={[styles.cell, styles.statusCell]}>
        <Text style={styles.headerText}>Status</Text>
      </View>
    </View>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>No Dose History</Text>
      <Text style={styles.emptySubtitle}>
        Dose history for the last 7 days will appear here.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dose history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={doses}
        renderItem={renderDoseRow}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          doses.length === 0 ? styles.emptyListContainer : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      />
    </View>
  );
}

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
  loadingText: {
    marginTop: 12,
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
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#0051D5',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statusCell: {
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  cellSubtext: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyListContainer: {
    flexGrow: 1,
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
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default CaregiverDoseHistoryScreen;
