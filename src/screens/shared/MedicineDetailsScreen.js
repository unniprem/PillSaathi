/**
 * Medicine Details Screen
 *
 * Displays detailed information about a specific medicine.
 * Shows medicine name, dosage, instructions, schedule, and other details.
 * Can be used by both caregivers and parents.
 *
 * Requirements: 6.2, 11.2
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
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import medicineService from '../../services/medicineService';
import scheduleService from '../../services/scheduleService';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Medicine Details Screen Component
 *
 * Displays complete information about a medicine including:
 * - Name, dosage, instructions
 * - Schedule times and repeat pattern
 * - Edit and delete options (for caregivers)
 *
 * @param {Object} props
 * @param {Object} props.route - Navigation route
 * @param {string} props.route.params.medicineId - Medicine ID
 * @param {string} props.route.params.parentId - Parent ID (optional, for caregivers)
 * @returns {React.ReactElement}
 */
function MedicineDetailsScreen({ route }) {
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const { medicineId, parentId } = route.params || {};

  const [medicine, setMedicine] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isCaregiver = profile?.role === 'caregiver';

  // Debug logging
  useEffect(() => {
    console.log('MedicineDetailsScreen - User:', user);
    console.log('MedicineDetailsScreen - Profile:', profile);
    console.log('MedicineDetailsScreen - Profile role:', profile?.role);
    console.log('MedicineDetailsScreen - isCaregiver:', isCaregiver);
    console.log('MedicineDetailsScreen - parentId:', parentId);
  }, [user, profile, isCaregiver, parentId]);

  /**
   * Load medicine and schedule data
   */
  useEffect(() => {
    loadMedicineDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicineId]);

  /**
   * Fetch medicine and schedule details
   */
  const loadMedicineDetails = async () => {
    if (!medicineId) {
      setError('Medicine ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch medicine details
      const medicineData = await medicineService.getMedicineById(medicineId);
      setMedicine(medicineData);

      // Fetch schedule if exists
      try {
        const scheduleData = await scheduleService.getScheduleForMedicine(
          medicineId,
        );
        setSchedule(scheduleData);
      } catch (scheduleError) {
        // Schedule might not exist, that's okay
        console.log('No schedule found for medicine:', medicineId);
      }
    } catch (err) {
      console.error('Error loading medicine details:', err);
      setError(err.message || 'Failed to load medicine details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format schedule times for display
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
   */
  const formatRepeatPattern = () => {
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
   * Handle edit medicine
   */
  const handleEdit = () => {
    if (isCaregiver && parentId) {
      navigation.navigate('MedicineForm', {
        medicineId,
        parentId,
      });
    }
  };

  /**
   * Handle toggle medicine status
   */
  const handleToggleStatus = async () => {
    if (!isCaregiver || !user?.uid) {
      return;
    }

    try {
      const newStatus = await medicineService.toggleMedicineStatus(
        medicineId,
        user.uid,
      );

      // Update local state
      setMedicine(prev => ({
        ...prev,
        status: newStatus,
        isActive: newStatus === 'active',
      }));

      Alert.alert(
        'Success',
        `Medicine ${
          newStatus === 'active' ? 'activated' : 'deactivated'
        } successfully`,
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to update medicine status');
      console.error('Error toggling medicine status:', err);
    }
  };

  /**
   * Handle delete medicine
   */
  const handleDelete = () => {
    if (!isCaregiver || !user?.uid) {
      return;
    }

    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete ${medicine?.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicineService.deleteMedicine(medicineId, user.uid);
              Alert.alert('Success', 'Medicine deleted successfully');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete medicine');
              console.error('Error deleting medicine:', err);
            }
          },
        },
      ],
    );
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading medicine details...</Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error || !medicine) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Medicine not found'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadMedicineDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Render main content
   */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Medicine Name */}
      <View style={styles.section}>
        <Text style={styles.medicineName}>{medicine.name}</Text>
      </View>

      {/* Dosage Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dosage</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount:</Text>
          <Text style={styles.infoValue}>
            {medicine.dosageAmount} {medicine.dosageUnit}
          </Text>
        </View>
      </View>

      {/* Instructions */}
      {medicine.instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructionsText}>{medicine.instructions}</Text>
        </View>
      )}

      {/* Schedule Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        {schedule ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Times:</Text>
              <Text style={styles.infoValue}>
                {formatScheduleTimes(schedule.times)}
              </Text>
            </View>
            {schedule.repeatPattern && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Repeat:</Text>
                <Text style={styles.infoValue}>{formatRepeatPattern()}</Text>
              </View>
            )}
            {schedule.startDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(schedule.startDate).toLocaleDateString()}
                </Text>
              </View>
            )}
            {schedule.endDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(schedule.endDate).toLocaleDateString()}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noScheduleText}>
            No schedule set for this medicine
          </Text>
        )}
      </View>

      {/* Additional Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>

        {/* Status with Toggle (Caregiver only) */}
        {isCaregiver ? (
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text
                style={[
                  styles.infoValue,
                  medicine.status === 'active'
                    ? styles.activeStatus
                    : styles.inactiveStatus,
                ]}
              >
                {medicine.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Switch
              value={medicine.status === 'active'}
              onValueChange={handleToggleStatus}
              trackColor={{ false: '#CCCCCC', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text
              style={[
                styles.infoValue,
                medicine.status === 'active'
                  ? styles.activeStatus
                  : styles.inactiveStatus,
              ]}
            >
              {medicine.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        )}

        {medicine.createdAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Added:</Text>
            <Text style={styles.infoValue}>
              {new Date(medicine.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons (Caregiver only) */}
      {isCaregiver && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={handleEdit}
          >
            <Text style={styles.buttonText}>Edit Medicine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={[styles.buttonText, styles.deleteButtonText]}>
              Delete Medicine
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
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
    marginBottom: 20,
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
  },
  sectionTitle: {
    fontSize: 18,
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
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  activeStatus: {
    color: '#34C759',
    fontWeight: '600',
  },
  inactiveStatus: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  noScheduleText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
});

export default MedicineDetailsScreen;
