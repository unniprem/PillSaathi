/**
 * Caregiver Dose History Screen
 *
 * Displays dose history in reverse chronological order with filtering and adherence tracking.
 * Supports date range filtering, status filtering, and real-time updates.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 5.1, 5.2, 5.3, 5.4, 5.5
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
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { usePairing } from '../../contexts/PairingContext';
import doseTrackerService from '../../services/DoseTrackerService';
import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

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
 *
 * Requirements:
 * - 6.1: Display dose history in reverse chronological order
 * - 6.2: Show scheduled time
 * - 6.3: Show actual time taken
 * - 6.4: Show dose status with visual indicators
 * - 6.5: Support filtering by date range
 * - 6.6: Support filtering by status
 * - 6.7: Calculate and display adherence percentage
 * - 5.1-5.5: Real-time updates via Firestore listeners
 */
function CaregiverDoseHistoryScreen({ route }) {
  const { medicineId, medicineName } = route?.params || {};
  const { user } = useAuth();
  const { relationships } = usePairing();
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [dateRange, setDateRange] = useState('7days'); // '7days', '30days', 'custom'
  const [statusFilter, setStatusFilter] = useState([]); // ['taken', 'missed', 'skipped']
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Date range for custom filter
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  // Adherence data
  const [adherencePercentage, setAdherencePercentage] = useState(0);

  // Firestore listener unsubscribe function
  const [unsubscribe, setUnsubscribe] = useState(null);

  /**
   * Calculate date range based on filter selection
   * Requirement 6.5: Support filtering by date range
   */
  const getDateRange = useCallback(() => {
    const endDate = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate };
        }
        // Fallback to 7 days if custom dates not set
        startDate.setDate(startDate.getDate() - 7);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate, endDate };
  }, [dateRange, customStartDate, customEndDate]);

  /**
   * Calculate adherence percentage
   * Requirement 6.7: Calculate and display adherence percentage
   */
  const calculateAdherence = useCallback(dosesList => {
    if (dosesList.length === 0) {
      setAdherencePercentage(0);
      return;
    }

    const takenCount = dosesList.filter(dose => dose.status === 'taken').length;
    const totalCount = dosesList.length;
    const percentage = (takenCount / totalCount) * 100;

    setAdherencePercentage(Math.round(percentage));
  }, []);

  /**
   * Set up real-time Firestore listener for dose updates
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 - Real-time updates
   */
  const setupRealtimeListener = useCallback(() => {
    if (!medicineId) {
      return null;
    }

    const firestore = getFirestore(getApp());
    const { startDate, endDate } = getDateRange();

    console.log('Setting up real-time listener for medicine:', medicineId);

    // Build query with filters
    let query = firestore
      .collection('doses')
      .where('medicineId', '==', medicineId)
      .where('scheduledTime', '>=', startDate)
      .where('scheduledTime', '<=', endDate)
      .orderBy('scheduledTime', 'desc');

    // Note: Firestore doesn't support 'in' with array filters in real-time listeners
    // We'll filter status in memory after receiving updates

    // Set up listener
    const unsubscribeFn = query.onSnapshot(
      snapshot => {
        console.log('Received real-time update:', snapshot.size, 'doses');

        const updatedDoses = [];
        snapshot.forEach(doc => {
          const doseData = doc.data();

          // Convert Firestore timestamps to Date objects
          const dose = {
            id: doc.id,
            ...doseData,
            scheduledTime:
              doseData.scheduledTime?.toDate?.() || doseData.scheduledTime,
            takenAt: doseData.takenAt?.toDate?.() || doseData.takenAt,
            createdAt: doseData.createdAt?.toDate?.() || doseData.createdAt,
            updatedAt: doseData.updatedAt?.toDate?.() || doseData.updatedAt,
          };

          // Apply status filter in memory
          if (statusFilter.length === 0 || statusFilter.includes(dose.status)) {
            updatedDoses.push(dose);
          }
        });

        // Update doses state (Requirement 5.3: Update UI when dose status changes)
        setDoses(updatedDoses);

        // Calculate adherence
        calculateAdherence(updatedDoses);

        setLoading(false);
        setRefreshing(false);
      },
      error => {
        console.error('Error in real-time listener:', error);
        setError('Failed to load dose updates');
        setLoading(false);
        setRefreshing(false);
      },
    );

    return unsubscribeFn;
  }, [medicineId, getDateRange, statusFilter, calculateAdherence]);

  /**
   * Load dose history using DoseTrackerService
   * Requirements: 6.1, 6.5, 6.6 - Query with filters and sorting
   */
  const loadDoseHistory = async (isRefreshing = false) => {
    if (!medicineId) {
      setError('Medicine ID is required');
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      await doseTrackerService.initialize();

      const { startDate, endDate } = getDateRange();

      console.log('Loading dose history:', {
        medicineId,
        startDate,
        endDate,
        statusFilter,
      });

      // Query dose history with filters (Requirement 6.5, 6.6)
      const result = await doseTrackerService.getDoseHistory(
        medicineId,
        startDate,
        endDate,
        statusFilter.length > 0 ? statusFilter : null,
        100, // Load up to 100 doses
      );

      // Requirement 6.1: Doses are already sorted by scheduledTime descending
      setDoses(result.doses);

      // Calculate adherence (Requirement 6.7)
      calculateAdherence(result.doses);
    } catch (err) {
      console.error('Error loading dose history:', err);
      setError('Failed to load dose history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Set up real-time listener on mount and when filters change
   * Requirement 5.4: Handle listener lifecycle (mount/unmount)
   */
  useEffect(() => {
    // Clean up previous listener if exists
    if (unsubscribe) {
      console.log('Cleaning up previous listener');
      unsubscribe();
    }

    // Set up new listener
    const newUnsubscribe = setupRealtimeListener();
    setUnsubscribe(() => newUnsubscribe);

    // If no real-time listener (no medicineId), load data manually
    if (!newUnsubscribe) {
      loadDoseHistory();
    }

    // Cleanup on unmount (Requirement 5.4)
    return () => {
      if (newUnsubscribe) {
        console.log('Cleaning up listener on unmount');
        newUnsubscribe();
      }
    };
  }, [medicineId, dateRange, statusFilter, customStartDate, customEndDate]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    if (medicineId) {
      // Real-time listener will handle the refresh
      setRefreshing(false);
    } else {
      loadDoseHistory(true);
    }
  };

  /**
   * Toggle status filter
   * Requirement 6.6: Support filtering by status
   */
  const toggleStatusFilter = status => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  /**
   * Apply date range filter
   * Requirement 6.5: Support filtering by date range
   */
  const applyDateRangeFilter = range => {
    setDateRange(range);
    setShowFilterModal(false);
  };

  /**
   * Get status badge style
   * Requirement 6.4: Show dose status with visual indicators
   */
  const getStatusStyle = status => {
    switch (status) {
      case 'taken':
        return { backgroundColor: '#34C759', text: 'Taken' };
      case 'missed':
        return { backgroundColor: '#FF3B30', text: 'Missed' };
      case 'skipped':
        return { backgroundColor: '#8E8E93', text: 'Skipped' };
      case 'scheduled':
        return { backgroundColor: '#007AFF', text: 'Scheduled' };
      default:
        return { backgroundColor: '#8E8E93', text: status };
    }
  };

  /**
   * Render dose row
   * Requirements: 6.2, 6.3, 6.4 - Show scheduled time, actual time taken, and status
   */
  const renderDoseRow = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <View style={styles.row}>
        <View style={styles.cellWide}>
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
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.backgroundColor },
            ]}
          >
            <Text style={styles.statusText}>{statusStyle.text}</Text>
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
      <View style={styles.cellWide}>
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
   * Render adherence card
   * Requirement 6.7: Display adherence percentage
   */
  const renderAdherenceCard = () => {
    const adherenceColor =
      adherencePercentage >= 80
        ? '#34C759'
        : adherencePercentage >= 60
        ? '#FF9500'
        : '#FF3B30';

    return (
      <View style={styles.adherenceCard}>
        <Text style={styles.adherenceLabel}>Adherence Rate</Text>
        <View style={styles.adherenceRow}>
          <Text style={[styles.adherencePercentage, { color: adherenceColor }]}>
            {adherencePercentage}%
          </Text>
          <Text style={styles.adherenceSubtext}>
            {doses.filter(d => d.status === 'taken').length} of {doses.length}{' '}
            doses taken
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render filter button
   */
  const renderFilterButton = () => {
    const activeFiltersCount =
      statusFilter.length + (dateRange !== '7days' ? 1 : 0);

    return (
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilterModal(true)}
      >
        <Text style={styles.filterButtonText}>
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render filter modal
   * Requirements: 6.5, 6.6 - Date range and status filtering
   */
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Dose History</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  dateRange === '7days' && styles.filterOptionActive,
                ]}
                onPress={() => applyDateRangeFilter('7days')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    dateRange === '7days' && styles.filterOptionTextActive,
                  ]}
                >
                  Last 7 Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  dateRange === '30days' && styles.filterOptionActive,
                ]}
                onPress={() => applyDateRangeFilter('30days')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    dateRange === '30days' && styles.filterOptionTextActive,
                  ]}
                >
                  Last 30 Days
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  statusFilter.includes('taken') && styles.filterOptionActive,
                ]}
                onPress={() => toggleStatusFilter('taken')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    statusFilter.includes('taken') &&
                      styles.filterOptionTextActive,
                  ]}
                >
                  Taken
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  statusFilter.includes('missed') && styles.filterOptionActive,
                ]}
                onPress={() => toggleStatusFilter('missed')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    statusFilter.includes('missed') &&
                      styles.filterOptionTextActive,
                  ]}
                >
                  Missed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  statusFilter.includes('skipped') && styles.filterOptionActive,
                ]}
                onPress={() => toggleStatusFilter('skipped')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    statusFilter.includes('skipped') &&
                      styles.filterOptionTextActive,
                  ]}
                >
                  Skipped
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  statusFilter.includes('scheduled') &&
                    styles.filterOptionActive,
                ]}
                onPress={() => toggleStatusFilter('scheduled')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    statusFilter.includes('scheduled') &&
                      styles.filterOptionTextActive,
                  ]}
                >
                  Scheduled
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clear Filters */}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setDateRange('7days');
                setStatusFilter([]);
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.clearFiltersButtonText}>
                Clear All Filters
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>No Dose History</Text>
      <Text style={styles.emptySubtitle}>
        {statusFilter.length > 0
          ? 'No doses match the selected filters.'
          : 'Dose history will appear here once doses are scheduled.'}
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
      {/* Medicine name header if provided */}
      {medicineName && (
        <View style={styles.medicineHeader}>
          <Text style={styles.medicineHeaderText}>{medicineName}</Text>
        </View>
      )}

      {/* Adherence card */}
      {doses.length > 0 && renderAdherenceCard()}

      {/* Filter button */}
      <View style={styles.filterContainer}>{renderFilterButton()}</View>

      {/* Dose history table */}
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

      {/* Filter modal */}
      {renderFilterModal()}
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
  medicineHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  medicineHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adherenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  adherencePercentage: {
    fontSize: 36,
    fontWeight: '700',
  },
  adherenceSubtext: {
    fontSize: 14,
    color: '#666666',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  cellWide: {
    flex: 1.5,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  filterOption: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  clearFiltersButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CaregiverDoseHistoryScreen;
