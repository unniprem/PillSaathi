/**
 * Adherence Dashboard Screen
 *
 * Displays adherence metrics for caregivers to monitor parent medication adherence.
 * Shows overall adherence percentage, breakdown by status, and per-medicine adherence.
 *
 * Requirements: Phase 5 - Escalation (5.5)
 *
 * @format
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { usePairedParents } from '../../hooks/usePairedParents';

// Collection names
const DOSES_COLLECTION = 'doses';

/**
 * Adherence Dashboard Screen Component
 *
 * Requirements:
 * - 5.5.1: Basic layout with header
 * - 5.5.2: Parent selector for multiple parents
 * - 5.5.3: Time period selector (7 days, 30 days, All time)
 * - 5.5.4: Adherence summary card with percentage and breakdown
 * - 5.5.5: Per-medicine adherence list
 * - 5.5.6: Loading and error states
 */
function AdherenceDashboardScreen() {
  const {
    parents,
    loading: parentsLoading,
    error: parentsError,
  } = usePairedParents();

  // Parent selector state
  const [selectedParent, setSelectedParent] = useState(null);
  const [showParentPicker, setShowParentPicker] = useState(false);

  // Dose data state
  const [doses, setDoses] = useState([]);
  const [dosesLoading, setDosesLoading] = useState(false);
  const [dosesError, setDosesError] = useState(null);

  // Time period state (default to 7 days)
  const [timePeriod, setTimePeriod] = useState(7); // 7, 30, or 0 (all time)

  // Set default parent when parents are loaded
  useEffect(() => {
    if (parents && parents.length > 0 && !selectedParent) {
      setSelectedParent(parents[0]);
    }
  }, [parents, selectedParent]);

  /**
   * Calculate date range based on time period
   */
  const getDateRange = useCallback(() => {
    const endDate = new Date();
    let startDate;

    if (timePeriod === 0) {
      // All time - go back 1 year (reasonable limit)
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else {
      // 7 or 30 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - timePeriod);
    }

    // Set to start of day
    startDate.setHours(0, 0, 0, 0);
    // Set end to end of day
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }, [timePeriod]);

  /**
   * Fetch doses for selected parent and time period
   */
  const fetchDoses = useCallback(async () => {
    if (!selectedParent?.id) {
      setDoses([]);
      setDosesLoading(false);
      return;
    }

    try {
      setDosesLoading(true);
      setDosesError(null);

      const { startDate, endDate } = getDateRange();

      // Query doses for the selected parent within the date range
      const snapshot = await firestore()
        .collection(DOSES_COLLECTION)
        .where('parentId', '==', selectedParent.id)
        .where('scheduledTime', '>=', startDate)
        .where('scheduledTime', '<=', endDate)
        .orderBy('scheduledTime', 'desc')
        .get();

      const fetchedDoses = [];

      snapshot.forEach(doc => {
        const doseData = doc.data();
        fetchedDoses.push({
          id: doc.id,
          ...doseData,
          scheduledTime:
            doseData.scheduledTime?.toDate?.() || doseData.scheduledTime,
          takenAt: doseData.takenAt?.toDate?.() || doseData.takenAt,
          missedAt: doseData.missedAt?.toDate?.() || doseData.missedAt,
          snoozedUntil:
            doseData.snoozedUntil?.toDate?.() || doseData.snoozedUntil,
        });
      });

      setDoses(fetchedDoses);
    } catch (err) {
      console.error('Error fetching doses:', err);
      setDosesError(err.message || 'Failed to load adherence data');
    } finally {
      setDosesLoading(false);
    }
  }, [selectedParent, getDateRange]);

  /**
   * Fetch doses when selected parent or time period changes
   */
  useEffect(() => {
    fetchDoses();
  }, [fetchDoses]);

  /**
   * Calculate adherence metrics from doses
   */
  const calculateAdherence = useCallback(() => {
    if (!doses || doses.length === 0) {
      return {
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        total: 0,
      };
    }

    const taken = doses.filter(d => d.status === 'taken').length;
    const missed = doses.filter(d => d.status === 'missed').length;
    const snoozed = doses.filter(d => d.status === 'snoozed').length;
    const total = doses.length;

    // Calculate percentage: (taken / total) * 100
    const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

    return {
      percentage,
      taken,
      missed,
      snoozed,
      total,
    };
  }, [doses]);

  const adherenceMetrics = calculateAdherence();

  /**
   * Handle parent selection from dropdown
   */
  const handleParentSelect = parent => {
    setSelectedParent(parent);
    setShowParentPicker(false);
  };

  /**
   * Get initials from name for avatar placeholder
   */
  const getInitials = name => {
    if (!name) {
      return '?';
    }
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  };

  /**
   * Render avatar with initials
   */
  const renderAvatar = (name, size = 40) => {
    const initials = getInitials(name);
    const fontSize = size === 40 ? 16 : size === 32 ? 14 : 12;

    return (
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize }]}>{initials}</Text>
      </View>
    );
  };

  /**
   * Render parent picker modal
   */
  const renderParentPicker = () => (
    <Modal
      visible={showParentPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowParentPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowParentPicker(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Parent</Text>
            <TouchableOpacity
              onPress={() => setShowParentPicker(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={parents}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.parentPickerItem,
                  selectedParent?.id === item.id &&
                    styles.parentPickerItemSelected,
                ]}
                onPress={() => handleParentSelect(item)}
              >
                {renderAvatar(item.name, 40)}
                <View style={styles.parentPickerItemContent}>
                  <Text style={styles.parentPickerItemName}>{item.name}</Text>
                  {item.actualName && item.actualName !== item.name && (
                    <Text style={styles.parentPickerItemActualName}>
                      ({item.actualName})
                    </Text>
                  )}
                </View>
                {selectedParent?.id === item.id && (
                  <Text style={styles.parentPickerItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Loading state
  if (parentsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading adherence data...</Text>
      </View>
    );
  }

  // Error state
  if (parentsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load parents</Text>
        <Text style={styles.errorSubtext}>{parentsError.message}</Text>
      </View>
    );
  }

  // No parents state
  if (!parents || parents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={styles.emptyTitle}>No Parents Found</Text>
        <Text style={styles.emptySubtext}>
          You need to be paired with a parent to view adherence data.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Adherence Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Monitor medication adherence
          </Text>
        </View>
      </View>

      {/* Parent Selector */}
      {parents.length > 1 && (
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Parent</Text>
          <TouchableOpacity
            style={styles.parentSelector}
            onPress={() => setShowParentPicker(true)}
          >
            <View style={styles.parentSelectorContent}>
              <View style={styles.parentSelectorLeft}>
                {selectedParent && renderAvatar(selectedParent.name, 32)}
                <Text style={styles.parentSelectorText}>
                  {selectedParent?.name || 'Select Parent'}
                </Text>
              </View>
              <Text style={styles.parentSelectorIcon}>▼</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Single parent display */}
      {parents.length === 1 && selectedParent && (
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Parent</Text>
          <View style={styles.singleParentDisplay}>
            <View style={styles.singleParentContent}>
              {renderAvatar(selectedParent.name, 32)}
              <Text style={styles.singleParentText}>{selectedParent.name}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Time Period Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Time Period</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              styles.segmentButtonLeft,
              timePeriod === 7 && styles.segmentButtonActive,
            ]}
            onPress={() => setTimePeriod(7)}
          >
            <Text
              style={[
                styles.segmentButtonText,
                timePeriod === 7 && styles.segmentButtonTextActive,
              ]}
            >
              7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              styles.segmentButtonMiddle,
              timePeriod === 30 && styles.segmentButtonActive,
            ]}
            onPress={() => setTimePeriod(30)}
          >
            <Text
              style={[
                styles.segmentButtonText,
                timePeriod === 30 && styles.segmentButtonTextActive,
              ]}
            >
              30 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              styles.segmentButtonRight,
              timePeriod === 0 && styles.segmentButtonActive,
            ]}
            onPress={() => setTimePeriod(0)}
          >
            <Text
              style={[
                styles.segmentButtonText,
                timePeriod === 0 && styles.segmentButtonTextActive,
              ]}
            >
              All Time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          {dosesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading adherence data...</Text>
            </View>
          ) : dosesError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load data</Text>
              <Text style={styles.errorSubtext}>{dosesError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchDoses}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : doses.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateTitle}>No Doses Yet</Text>
              <Text style={styles.emptyStateSubtext}>
                No doses scheduled for the selected time period.
              </Text>
            </View>
          ) : (
            <>
              {/* Adherence Summary Card */}
              <View style={styles.adherenceCard}>
                <Text style={styles.adherenceCardTitle}>Overall Adherence</Text>
                <View style={styles.adherencePercentageContainer}>
                  <Text style={styles.adherencePercentage}>
                    {adherenceMetrics.percentage}%
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Parent Picker Modal */}
      {renderParentPicker()}
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
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
  },
  selectorContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  parentSelector: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 44,
  },
  parentSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  parentSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  parentSelectorText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  parentSelectorIcon: {
    fontSize: 12,
    color: '#666666',
  },
  singleParentDisplay: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  singleParentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  singleParentText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  // Segmented control styles
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    padding: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    backgroundColor: 'transparent',
    borderRadius: 7,
    marginHorizontal: 1,
  },
  segmentButtonLeft: {
    marginLeft: 0,
  },
  segmentButtonMiddle: {
    // No additional styles needed
  },
  segmentButtonRight: {
    marginRight: 0,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666666',
  },
  segmentButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Adherence Card Styles
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  adherenceCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  adherencePercentageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  adherencePercentage: {
    fontSize: 72,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: -2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  modalCloseButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '300',
  },
  parentPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 64,
    gap: 12,
  },
  parentPickerItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  parentPickerItemContent: {
    flex: 1,
  },
  parentPickerItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  parentPickerItemActualName: {
    fontSize: 14,
    color: '#666666',
  },
  parentPickerItemCheck: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 12,
  },
  // Avatar styles
  avatar: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AdherenceDashboardScreen;
