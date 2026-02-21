/**
 * Missed Doses List Screen
 *
 * Displays a list of all missed doses for caregivers to monitor.
 * Supports filtering by parent, medicine, and date range.
 *
 * Requirements: Phase 5 - Escalation (5.6)
 *
 * @format
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { usePairedParents } from '../../hooks/usePairedParents';
import { CaregiverScreens } from '../../types/navigation';

// Collection names
const DOSES_COLLECTION = 'doses';
const MEDICINES_COLLECTION = 'medicines';

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date) {
  if (!date || !(date instanceof Date)) {
    return 'Unknown';
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

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
 * Missed Doses List Screen Component
 *
 * Requirements:
 * - 5.6.1: Basic layout with header
 * - 5.6.2: Filters (parent, medicine, date range)
 * - 5.6.3: List of missed doses with relative time
 * - 5.6.4: Empty state
 * - 5.6.5: Dose detail navigation
 */
function MissedDosesListScreen() {
  const navigation = useNavigation();
  const {
    parents,
    loading: parentsLoading,
    error: parentsError,
  } = usePairedParents();

  // State
  const [missedDoses, setMissedDoses] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [dateRange, setDateRange] = useState(30); // 7, 30, or 0 (all time)

  // Modal states
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showMedicinePicker, setShowMedicinePicker] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const PAGE_SIZE = 20;

  // Set default parent when parents are loaded
  useEffect(() => {
    if (parents && parents.length > 0 && !selectedParent) {
      setSelectedParent(parents[0]);
    }
  }, [parents, selectedParent]);

  /**
   * Calculate date range based on filter
   */
  const getDateRange = useCallback(() => {
    const endDate = new Date();
    let startDate;

    if (dateRange === 0) {
      // All time - go back 1 year
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else {
      // 7 or 30 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }, [dateRange]);

  /**
   * Fetch medicines for the selected parent
   */
  const fetchMedicines = useCallback(async () => {
    if (!selectedParent?.id) {
      setMedicines([]);
      return;
    }

    try {
      const snapshot = await firestore()
        .collection(MEDICINES_COLLECTION)
        .where('parentId', '==', selectedParent.id)
        .where('isActive', '==', true)
        .get();

      const fetchedMedicines = [];
      snapshot.forEach(doc => {
        fetchedMedicines.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setMedicines(fetchedMedicines);
    } catch (err) {
      console.error('Error fetching medicines:', err);
    }
  }, [selectedParent]);

  /**
   * Fetch missed doses
   */
  const fetchMissedDoses = useCallback(
    async (isRefreshing = false, loadMore = false) => {
      if (!selectedParent?.id) {
        setMissedDoses([]);
        setLoading(false);
        return;
      }

      try {
        if (!isRefreshing && !loadMore) {
          setLoading(true);
        }
        setError(null);

        const { startDate, endDate } = getDateRange();

        // Build query - note: we filter by medicine client-side to avoid
        // needing a composite index for parentId + status + scheduledTime + medicineId
        let query = firestore()
          .collection(DOSES_COLLECTION)
          .where('parentId', '==', selectedParent.id)
          .where('status', '==', 'missed')
          .where('scheduledTime', '>=', startDate)
          .where('scheduledTime', '<=', endDate)
          .orderBy('scheduledTime', 'desc');

        // Pagination
        if (loadMore && lastDoc) {
          query = query.startAfter(lastDoc);
        }

        query = query.limit(PAGE_SIZE);

        const snapshot = await query.get();

        const fetchedDoses = [];
        snapshot.forEach(doc => {
          const doseData = doc.data();

          // Apply medicine filter client-side
          if (selectedMedicine && doseData.medicineId !== selectedMedicine.id) {
            return; // Skip this dose
          }

          fetchedDoses.push({
            id: doc.id,
            ...doseData,
            scheduledTime:
              doseData.scheduledTime?.toDate?.() || doseData.scheduledTime,
            missedAt: doseData.missedAt?.toDate?.() || doseData.missedAt,
          });
        });

        if (loadMore) {
          setMissedDoses(prev => [...prev, ...fetchedDoses]);
        } else {
          setMissedDoses(fetchedDoses);
        }

        // Update pagination state
        setHasMore(fetchedDoses.length === PAGE_SIZE);
        setLastDoc(
          fetchedDoses.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null,
        );
      } catch (err) {
        console.error('Error fetching missed doses:', err);
        setError('Failed to load missed doses');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedParent, selectedMedicine, getDateRange, lastDoc],
  );

  /**
   * Fetch data when filters change
   */
  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  useEffect(() => {
    // Reset pagination when filters change
    setLastDoc(null);
    setHasMore(true);
    fetchMissedDoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParent, selectedMedicine, dateRange]);

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLastDoc(null);
    setHasMore(true);
    await fetchMissedDoses(true);
  }, [fetchMissedDoses]);

  /**
   * Handle load more
   */
  const onLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMissedDoses(false, true);
    }
  }, [loading, hasMore, fetchMissedDoses]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setSelectedMedicine(null);
    setDateRange(30);
  }, []);

  /**
   * Get active filter count
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedMedicine) {
      count++;
    }
    if (dateRange !== 30) {
      count++;
    }
    return count;
  }, [selectedMedicine, dateRange]);

  /**
   * Handle dose press - navigate to dose history with this dose highlighted
   */
  const handleDosePress = useCallback(
    dose => {
      // Navigate to dose history screen with the missed dose highlighted
      if (dose.medicineId && dose.medicineName) {
        navigation.navigate(CaregiverScreens.UPCOMING, {
          medicineId: dose.medicineId,
          medicineName: dose.medicineName,
          initialStatusFilter: ['missed'],
          highlightDoseId: dose.id,
        });
      }
    },
    [navigation],
  );

  /**
   * Render missed dose item
   */
  const renderDoseItem = ({ item }) => {
    const relativeTime = formatRelativeTime(
      item.missedAt || item.scheduledTime,
    );

    return (
      <TouchableOpacity
        style={styles.doseItem}
        onPress={() => handleDosePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.doseItemLeft}>
          {/* Medicine icon */}
          <View style={styles.medicineIcon}>
            <Text style={styles.medicineIconText}>💊</Text>
          </View>

          {/* Dose info */}
          <View style={styles.doseItemContent}>
            <Text style={styles.medicineName} numberOfLines={2}>
              {item.medicineName || 'Unknown Medicine'}
            </Text>
            <Text style={styles.scheduledTime}>
              Scheduled: {formatDate(item.scheduledTime)} at{' '}
              {formatTime(item.scheduledTime)}
            </Text>
            <Text style={styles.missedTime}>
              Missed: {item.missedAt ? formatDate(item.missedAt) : 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Relative time */}
        <View style={styles.doseItemRight}>
          <Text style={styles.relativeTime}>{relativeTime}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎉</Text>
      <Text style={styles.emptyTitle}>Great Adherence!</Text>
      <Text style={styles.emptySubtext}>
        {selectedMedicine
          ? `No missed doses for ${selectedMedicine.name}`
          : 'No missed doses in the selected time period'}
      </Text>
    </View>
  );

  /**
   * Render footer (loading indicator for pagination)
   */
  const renderFooter = () => {
    if (!loading || refreshing) {
      return null;
    }

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
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
                  styles.pickerItem,
                  selectedParent?.id === item.id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedParent(item);
                  setShowParentPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item.name}</Text>
                {selectedParent?.id === item.id && (
                  <Text style={styles.pickerItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  /**
   * Render medicine picker modal
   */
  const renderMedicinePicker = () => (
    <Modal
      visible={showMedicinePicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMedicinePicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowMedicinePicker(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Medicine</Text>
            <TouchableOpacity
              onPress={() => setShowMedicinePicker(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: null, name: 'All Medicines' }, ...medicines]}
            keyExtractor={item => item.id || 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  ((!selectedMedicine && !item.id) ||
                    selectedMedicine?.id === item.id) &&
                    styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedMedicine(item.id ? item : null);
                  setShowMedicinePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item.name}</Text>
                {((!selectedMedicine && !item.id) ||
                  selectedMedicine?.id === item.id) && (
                  <Text style={styles.pickerItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  /**
   * Render date range picker modal
   */
  const renderDateRangePicker = () => (
    <Modal
      visible={showDateRangePicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDateRangePicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDateRangePicker(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <TouchableOpacity
              onPress={() => setShowDateRangePicker(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateRangeOptions}>
            <TouchableOpacity
              style={[
                styles.dateRangeOption,
                dateRange === 7 && styles.dateRangeOptionSelected,
              ]}
              onPress={() => {
                setDateRange(7);
                setShowDateRangePicker(false);
              }}
            >
              <Text
                style={[
                  styles.dateRangeOptionText,
                  dateRange === 7 && styles.dateRangeOptionTextSelected,
                ]}
              >
                Last 7 Days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateRangeOption,
                dateRange === 30 && styles.dateRangeOptionSelected,
              ]}
              onPress={() => {
                setDateRange(30);
                setShowDateRangePicker(false);
              }}
            >
              <Text
                style={[
                  styles.dateRangeOptionText,
                  dateRange === 30 && styles.dateRangeOptionTextSelected,
                ]}
              >
                Last 30 Days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateRangeOption,
                dateRange === 0 && styles.dateRangeOptionSelected,
              ]}
              onPress={() => {
                setDateRange(0);
                setShowDateRangePicker(false);
              }}
            >
              <Text
                style={[
                  styles.dateRangeOptionText,
                  dateRange === 0 && styles.dateRangeOptionTextSelected,
                ]}
              >
                All Time
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Loading state
  if (parentsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
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
          You need to be paired with a parent to view missed doses.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Missed Doses</Text>
        <Text style={styles.headerSubtitle}>
          Monitor missed medication doses
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Parent filter (if multiple parents) */}
        {parents.length > 1 && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowParentPicker(true)}
          >
            <Text style={styles.filterButtonLabel}>Parent:</Text>
            <Text style={styles.filterButtonValue} numberOfLines={1}>
              {selectedParent?.name || 'Select'}
            </Text>
            <Text style={styles.filterButtonIcon}>▼</Text>
          </TouchableOpacity>
        )}

        {/* Medicine filter */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowMedicinePicker(true)}
        >
          <Text style={styles.filterButtonLabel}>Medicine:</Text>
          <Text style={styles.filterButtonValue} numberOfLines={1}>
            {selectedMedicine?.name || 'All'}
          </Text>
          <Text style={styles.filterButtonIcon}>▼</Text>
        </TouchableOpacity>

        {/* Date range filter */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowDateRangePicker(true)}
        >
          <Text style={styles.filterButtonLabel}>Period:</Text>
          <Text style={styles.filterButtonValue}>
            {dateRange === 7
              ? '7 Days'
              : dateRange === 30
              ? '30 Days'
              : 'All Time'}
          </Text>
          <Text style={styles.filterButtonIcon}>▼</Text>
        </TouchableOpacity>

        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFiltersText}>
              Clear ({activeFilterCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Missed doses list */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading missed doses...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load data</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchMissedDoses()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={missedDoses}
          renderItem={renderDoseItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          contentContainerStyle={
            missedDoses.length === 0 ? styles.emptyListContainer : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Modals */}
      {renderParentPicker()}
      {renderMedicinePicker()}
      {renderDateRangePicker()}
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
    marginBottom: 16,
  },
  retryButton: {
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
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    flex: 1,
    minWidth: 120,
  },
  filterButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginRight: 4,
  },
  filterButtonValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  filterButtonIcon: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  clearFiltersButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  doseItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  doseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  medicineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineIconText: {
    fontSize: 24,
  },
  doseItemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  medicineName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
    lineHeight: 22,
  },
  scheduledTime: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  missedTime: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  doseItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  relativeTime: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'right',
  },
  chevron: {
    fontSize: 24,
    color: '#C7C7CC',
    fontWeight: '300',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 76,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    backgroundColor: '#F5F5F5',
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 17,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
    fontWeight: '400',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
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
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 56,
  },
  pickerItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  pickerItemCheck: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 12,
  },
  dateRangeOptions: {
    padding: 16,
  },
  dateRangeOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  dateRangeOptionSelected: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  dateRangeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  dateRangeOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default MissedDosesListScreen;
