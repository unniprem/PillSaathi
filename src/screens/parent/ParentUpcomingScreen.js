/**
 * Parent Medicines Screen
 *
 * Displays all medicines for the parent (active and inactive).
 * Shows medicine name, dosage, status, and schedule.
 * Provides navigation to detailed medicine view.
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ParentScreens } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import medicineService from '../../services/medicineService';
import scheduleService from '../../services/scheduleService';

/**
 * Format schedule times for display
 */
function formatScheduleTimes(times) {
  if (!times || times.length === 0) {
    return 'No schedule';
  }

  return times
    .map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    })
    .join(', ');
}

/**
 * Parent Medicines Screen Component
 *
 * Shows all medicines (active and inactive) for the parent.
 *
 * @returns {React.ReactElement} Parent medicines screen
 */
function ParentUpcomingScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load all medicines for the parent
   */
  const loadMedicines = async (isRefreshing = false) => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      // Load ALL medicines (active and inactive)
      const medicinesList = await medicineService.getMedicinesForParent(
        user.uid,
      );
      setMedicines(medicinesList);

      // Load schedules for each medicine
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
            console.error(`Error loading schedule for ${medicine.id}:`, err);
          }
        }),
      );
      setSchedules(schedulesMap);
    } catch (err) {
      console.error('Error loading medicines:', err);
      setError('Failed to load medicines');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadMedicines(true);
  };

  /**
   * Handle medicine card press
   */
  const handleMedicinePress = medicine => {
    // Navigate to medicine detail screen
    navigation.navigate(ParentScreens.MEDICINE_DETAILS, {
      medicineId: medicine.id,
    });
  };

  /**
   * Render medicine card
   */
  const renderMedicineCard = ({ item }) => {
    const schedule = schedules[item.id];
    const isActive = item.status === 'active';

    return (
      <TouchableOpacity
        style={[styles.medicineCard, !isActive && styles.inactiveMedicineCard]}
        onPress={() => handleMedicinePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isActive ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dosage:</Text>
            <Text style={styles.infoValue}>
              {item.dosageAmount} {item.dosageUnit}
            </Text>
          </View>

          {schedule && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Schedule:</Text>
              <Text style={styles.infoValue}>
                {formatScheduleTimes(schedule.times)}
              </Text>
            </View>
          )}

          {item.instructions && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Instructions:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {item.instructions}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>View Details ›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💊</Text>
      <Text style={styles.emptyTitle}>No Medicines</Text>
      <Text style={styles.emptySubtitle}>
        You don't have any medicines yet. Ask your caregiver to add medicines
        for you.
      </Text>
    </View>
  );

  /**
   * Render loading state
   */
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading medicines...</Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyTitle}>Error Loading Medicines</Text>
        <Text style={styles.emptySubtitle}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={medicines}
        keyExtractor={item => item.id}
        renderItem={renderMedicineCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          medicines.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  inactiveMedicineCard: {
    opacity: 0.7,
    backgroundColor: '#F9F9F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#34C759',
  },
  inactiveBadge: {
    backgroundColor: '#8E8E93',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: 16,
    paddingTop: 12,
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
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default ParentUpcomingScreen;
