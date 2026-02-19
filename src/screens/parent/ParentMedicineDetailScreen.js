/**
 * Parent Medicine Detail Screen
 *
 * Displays detailed information for a specific medicine.
 * Shows medicine details, schedule, and all upcoming/past doses.
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import medicineService from '../../services/medicineService';
import scheduleService from '../../services/scheduleService';
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
 * Format schedule times
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
 * Parent Medicine Detail Screen Component
 */
function ParentMedicineDetailScreen({ route }) {
  const { medicineId } = route.params || {};
  const { user } = useAuth();
  const [medicine, setMedicine] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load medicine details, schedule, and doses
   */
  const loadMedicineDetails = async (isRefreshing = false) => {
    if (!medicineId || !user?.uid) {
      setError('Medicine ID or User ID is missing');
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      // Load medicine details
      const medicines = await medicineService.getMedicinesForParent(user.uid);
      const medicineData = medicines.find(m => m.id === medicineId);

      if (!medicineData) {
        setError('Medicine not found');
        setLoading(false);
        return;
      }

      setMedicine(medicineData);

      // Load schedule
      const scheduleData = await scheduleService.getScheduleForMedicine(
        medicineId,
      );
      setSchedule(scheduleData);

      // Load doses for the next 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const dosesList = await doseService.getDosesForDateRange(
        user.uid,
        new Date(),
        sevenDaysFromNow,
      );

      // Filter doses for this medicine only
      const medicineDoses = dosesList.filter(
        dose => dose.medicineId === medicineId,
      );

      // Sort by scheduled time (most recent first)
      medicineDoses.sort((a, b) => a.scheduledTime - b.scheduledTime);

      setDoses(medicineDoses);
    } catch (err) {
      console.error('Error loading medicine details:', err);
      setError('Failed to load medicine details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMedicineDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicineId, user?.uid]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadMedicineDetails(true);
  };

  /**
   * Handle mark as taken
   */
  const handleMarkAsTaken = async doseId => {
    try {
      await doseService.markDoseAsTaken(doseId);
      loadMedicineDetails(true);
      Alert.alert('Success', 'Dose marked as taken');
    } catch (err) {
      console.error('Error marking dose as taken:', err);
      Alert.alert('Error', 'Failed to mark dose as taken');
    }
  };

  /**
   * Render dose item
   */
  const renderDoseItem = dose => {
    const now = new Date();
    const isMissed = dose.scheduledTime < now && dose.status !== 'taken';
    const isTaken = dose.status === 'taken';
    const isPending = dose.scheduledTime >= now && dose.status !== 'taken';

    let statusColor = '#8E8E93';
    let statusText = 'Pending';
    let statusBgColor = '#F0F0F0';

    if (isTaken) {
      statusColor = '#34C759';
      statusText = 'Taken';
      statusBgColor = '#E8F5E9';
    } else if (isMissed) {
      statusColor = '#FF3B30';
      statusText = 'Missed';
      statusBgColor = '#FFEBEE';
    } else if (isPending) {
      statusColor = '#FF9500';
      statusText = 'Pending';
      statusBgColor = '#FFF3E0';
    }

    return (
      <View
        key={dose.id}
        style={[styles.doseItem, { backgroundColor: statusBgColor }]}
      >
        <View style={styles.doseInfo}>
          <Text style={styles.doseDate}>{formatDate(dose.scheduledTime)}</Text>
          <Text style={styles.doseTime}>{formatTime(dose.scheduledTime)}</Text>
        </View>
        <View style={styles.doseStatus}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
          {isPending && (
            <TouchableOpacity
              style={styles.takenButton}
              onPress={() => handleMarkAsTaken(dose.id)}
            >
              <Text style={styles.takenButtonText}>Mark Taken</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading medicine details...</Text>
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

  if (!medicine) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>💊</Text>
        <Text style={styles.errorText}>Medicine not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
        />
      }
    >
      {/* Medicine Details Section */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.medicineName}>{medicine.name}</Text>
          <View
            style={[
              styles.statusBadge,
              medicine.status === 'active'
                ? styles.activeBadge
                : styles.inactiveBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {medicine.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dosage:</Text>
            <Text style={styles.detailValue}>
              {medicine.dosageAmount} {medicine.dosageUnit}
            </Text>
          </View>

          {medicine.instructions && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Instructions:</Text>
              <Text style={styles.detailValue}>{medicine.instructions}</Text>
            </View>
          )}

          {schedule && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Schedule:</Text>
                <Text style={styles.detailValue}>
                  {formatScheduleTimes(schedule.times)}
                </Text>
              </View>

              {schedule.repeatPattern === 'specific_days' &&
                schedule.selectedDays && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Days:</Text>
                    <Text style={styles.detailValue}>
                      {schedule.selectedDays
                        .sort((a, b) => a - b)
                        .map(
                          day =>
                            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                              day
                            ],
                        )
                        .join(', ')}
                    </Text>
                  </View>
                )}
            </>
          )}
        </View>
      </View>

      {/* Doses Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Doses (Next 7 Days)</Text>
        {doses.length === 0 ? (
          <View style={styles.emptyDoses}>
            <Text style={styles.emptyDosesText}>
              No doses scheduled for the next 7 days
            </Text>
          </View>
        ) : (
          <View style={styles.dosesList}>
            {doses.map(dose => renderDoseItem(dose))}
          </View>
        )}
      </View>
    </ScrollView>
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
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
    marginRight: 12,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  dosesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  doseInfo: {
    flex: 1,
  },
  doseDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  doseTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  doseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  takenButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  takenButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyDoses: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyDosesText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default ParentMedicineDetailScreen;
