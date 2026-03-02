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
  const { medicineId, medicineName, initialStatusFilter, highlightDoseId } =
    route?.params || {};
  const { relationships } = usePairing();
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [dateRange, setDateRange] = useState('7days'); // '7days', '30days', 'custom'
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || []); // ['taken', 'missed', 'skipped']
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Date range for custom filter
  const [customStartDate] = useState(null);
  const [customEndDate] = useState(null);

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
    const startDate = new Date();

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
    const firestore = getFirestore(getApp());
    const { startDate, endDate } = getDateRange();

    // Get parent IDs from relationships
    const parentIds = relationships.map(rel => rel.parentId).filter(Boolean);

    if (parentIds.length === 0 && !medicineId) {
      setDoses([]);
      setLoading(false);
      return null;
    }

    // Build query with filters
    let query = firestore.collection('doses');

    // If medicineId provided, filter by it (specific medicine view)
    if (medicineId) {
      query = query.where('medicineId', '==', medicineId);
    } else if (parentIds.length > 0) {
      // Otherwise, filter by parent IDs (all doses for caregiver's parents)
      // Note: Firestore 'in' queries support up to 10 values
      const limitedParentIds = parentIds.slice(0, 10);
      query = query.where('parentId', 'in', limitedParentIds);
    } else {
      // No valid query conditions, return null
      setDoses([]);
      setLoading(false);
      return null;
    }

    query = query
      .where('scheduledTime', '>=', startDate)
      .where('scheduledTime', '<=', endDate)
      .orderBy('scheduledTime', 'desc');

    // Note: Firestore doesn't support 'in' with array filters in real-time listeners
    // We'll filter status in memory after receiving updates

    // Set up listener
    const unsubscribeFn = query.onSnapshot(
      snapshot => {
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

        console.log('Processed doses:', updatedDoses.length);

        if (updatedDoses.length > 0) {
          console.log('Sample dose:', {
            id: updatedDoses[0].id,
            medicineName: updatedDoses[0].medicineName,
            status: updatedDoses[0].status,
            scheduledTime:
              updatedDoses[0].scheduledTime?.toISOString?.() ||
              updatedDoses[0].scheduledTime,
          });
        }

        console.log('Status breakdown:', {
          taken: updatedDoses.filter(d => d.status === 'taken').length,
          missed: updatedDoses.filter(d => d.status === 'missed').length,
          skipped: updatedDoses.filter(d => d.status === 'skipped').length,
          scheduled: updatedDoses.filter(d => d.status === 'scheduled').length,
          pending: updatedDoses.filter(d => d.status === 'pending').length,
        });

        // Update doses state (Requirement 5.3: Update UI when dose status changes)
        setDoses(updatedDoses);
        console.log('✓ Doses state updated');

        // Calculate adherence
        calculateAdherence(updatedDoses);

        setLoading(false);
        setRefreshing(false);
        console.log('=== REALTIME UPDATE COMPLETE ===');
      },
      error => {
        console.error('=== REALTIME LISTENER ERROR ===');
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
        setError('Failed to load dose updates');
        setLoading(false);
        setRefreshing(false);
      },
    );

    return unsubscribeFn;
  }, [
    medicineId,
    relationships,
    getDateRange,
    statusFilter,
    calculateAdherence,
  ]);

  /**
   * Load dose history using DoseTrackerService
   * Requirements: 6.1, 6.5, 6.6 - Query with filters and sorting
   */
  const loadDoseHistory = async (isRefreshing = false) => {
    console.log('=== LOAD DOSE HISTORY START ===');

    // Get parent IDs from relationships
    const parentIds = relationships.map(rel => rel.parentId).filter(Boolean);

    console.log('Load parameters:', {
      medicineId,
      parentIdsCount: parentIds.length,
      parentIds: parentIds.slice(0, 3), // Show first 3 for debugging
      dateRange,
      statusFilter,
      isRefreshing,
    });

    if (!medicineId && parentIds.length === 0) {
      console.log('⚠ No medicineId and no paired parents');
      setError(null); // Clear error
      setDoses([]); // Clear doses
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      console.log('Initializing DoseTrackerService...');
      await doseTrackerService.initialize();
      console.log('✓ DoseTrackerService initialized');

      const { startDate, endDate } = getDateRange();
      console.log('Date range:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      console.log('Loading dose history:', {
        medicineId,
        parentIds: parentIds.length,
        startDate,
        endDate,
        statusFilter,
      });

      let allDoses = [];

      if (medicineId) {
        console.log('Querying by medicineId:', medicineId);

        // Query dose history for specific medicine (Requirement 6.5, 6.6)
        const result = await doseTrackerService.getDoseHistory(
          medicineId,
          startDate,
          endDate,
          statusFilter.length > 0 ? statusFilter : null,
          100, // Load up to 100 doses
        );
        allDoses = result.doses;

        console.log(
          '✓ Received doses from DoseTrackerService:',
          allDoses.length,
        );
      } else if (parentIds.length > 0) {
        console.log('Querying by parentIds:', parentIds.length);

        // Query doses for all paired parents
        // Note: This is a fallback for when real-time listener isn't used
        const firestore = doseTrackerService.firestore;
        const limitedParentIds = parentIds.slice(0, 10); // Firestore 'in' limit

        console.log('Using parentIds:', limitedParentIds);

        const query = firestore
          .collection('doses')
          .where('parentId', 'in', limitedParentIds)
          .where('scheduledTime', '>=', startDate)
          .where('scheduledTime', '<=', endDate)
          .orderBy('scheduledTime', 'desc')
          .limit(100);

        console.log('Executing Firestore query...');
        const snapshot = await query.get();
        console.log('✓ Query complete. Documents:', snapshot.size);

        snapshot.forEach(doc => {
          const doseData = doc.data();
          const dose = {
            id: doc.id,
            ...doseData,
            scheduledTime:
              doseData.scheduledTime?.toDate?.() || doseData.scheduledTime,
            takenAt: doseData.takenAt?.toDate?.() || doseData.takenAt,
            createdAt: doseData.createdAt?.toDate?.() || doseData.createdAt,
            updatedAt: doseData.updatedAt?.toDate?.() || doseData.updatedAt,
          };

          // Apply status filter
          if (statusFilter.length === 0 || statusFilter.includes(dose.status)) {
            allDoses.push(dose);
          }
        });

        console.log('✓ Processed doses after filter:', allDoses.length);
      }

      // Log dose details
      if (allDoses.length > 0) {
        console.log('Sample dose:', {
          id: allDoses[0].id,
          medicineName: allDoses[0].medicineName,
          status: allDoses[0].status,
          scheduledTime:
            allDoses[0].scheduledTime?.toISOString?.() ||
            allDoses[0].scheduledTime,
        });

        const statusBreakdown = {
          scheduled: allDoses.filter(d => d.status === 'scheduled').length,
          taken: allDoses.filter(d => d.status === 'taken').length,
          missed: allDoses.filter(d => d.status === 'missed').length,
          skipped: allDoses.filter(d => d.status === 'skipped').length,
          pending: allDoses.filter(d => d.status === 'pending').length,
          other: allDoses.filter(
            d =>
              !['scheduled', 'taken', 'missed', 'skipped', 'pending'].includes(
                d.status,
              ),
          ).length,
        };

        console.log('Status breakdown:', statusBreakdown);
      } else {
        console.log('⚠ No doses found');
      }

      // Requirement 6.1: Doses are already sorted by scheduledTime descending
      setDoses(allDoses);
      console.log('✓ Doses state updated:', allDoses.length);

      // Calculate adherence (Requirement 6.7)
      calculateAdherence(allDoses);

      console.log('=== LOAD DOSE HISTORY COMPLETE ===');
    } catch (err) {
      console.error('=== LOAD DOSE HISTORY ERROR ===');
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
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
      setUnsubscribe(null);
    }

    // Set up new listener
    const newUnsubscribe = setupRealtimeListener();

    if (newUnsubscribe) {
      setUnsubscribe(() => newUnsubscribe);
    } else {
      // If no real-time listener, load data manually
      loadDoseHistory();
    }

    // Cleanup on unmount (Requirement 5.4)
    return () => {
      if (newUnsubscribe) {
        console.log('Cleaning up listener on unmount');
        newUnsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    medicineId,
    dateRange,
    statusFilter,
    customStartDate,
    customEndDate,
    relationships.length,
  ]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    if (medicineId || relationships.length > 0) {
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
   * Get parent display name from relationships
   * Uses parentAlias if available, otherwise parentName
   */
  const getParentDisplayName = useCallback(
    parentId => {
      const relationship = relationships.find(rel => rel.parentId === parentId);
      if (!relationship) {
        return 'Unknown';
      }
      // Use alias if available, otherwise use name
      return relationship.parentAlias || relationship.parentName || 'Unknown';
    },
    [relationships],
  );

  /**
   * Render dose row
   * Requirements: 6.2, 6.3, 6.4 - Show scheduled time, actual time taken, and status
   */
  const renderDoseRow = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const isHighlighted = highlightDoseId && item.id === highlightDoseId;
    const missedCount = item.missedCount || 0;

    return (
      <View style={[styles.row, isHighlighted && styles.highlightedRow]}>
        {!medicineId && (
          <View style={styles.cell}>
            <Text style={styles.cellText} numberOfLines={1}>
              {getParentDisplayName(item.parentId)}
            </Text>
          </View>
        )}
        <View style={styles.cellWide}>
          <Text style={styles.cellText} numberOfLines={1}>
            {item.medicineName}
          </Text>
          {/* Show retry count if dose is being retried */}
          {missedCount > 0 && missedCount < 3 && (
            <Text style={styles.retryText}>Retry {missedCount}/3</Text>
          )}
          {missedCount === 3 && (
            <Text style={styles.escalatedText}>Escalated (3 attempts)</Text>
          )}
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
      {!medicineId && (
        <View style={styles.cell}>
          <Text style={styles.headerText}>Parent</Text>
        </View>
      )}
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
        {relationships.length === 0
          ? 'Please pair with a parent to see dose history.'
          : statusFilter.length > 0
          ? 'No doses match the selected filters.'
          : 'Dose history will appear here once doses are scheduled.'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4e8ea2" />
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
            tintColor="#4e8ea2"
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
    backgroundColor: '#4e8ea2',
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
    backgroundColor: '#4e8ea2',
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
  highlightedRow: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
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
  retryText: {
    fontSize: 11,
    color: '#FFA500',
    fontWeight: '600',
    marginTop: 2,
  },
  escalatedText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '600',
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
    borderColor: '#4e8ea2',
  },
  filterOptionText: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#4e8ea2',
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
