/**
 * CaregiverMedicineList Screen
 *
 * Displays a list of all medicines for a specific parent.
 * Allows caregivers to view, edit, delete, and toggle medicine status.
 *
 * Requirements:
 * - 10.1: Display all medicines for parent
 * - 10.2: Show medicine name, dosage, and status
 * - 10.3: Show edit and delete options
 * - 10.4: Show activation toggle
 * - 10.5: Handle empty state with "Add Medicine" prompt
 * - 6.1, 6.2: Medicine deletion
 * - 7.1, 7.3: Status toggle
 *
 * @format
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import medicineService from '../../services/medicineService';
import { getErrorMessage, logError } from '../../utils/errorHandler';
import { CaregiverScreens } from '../../types/navigation';

/**
 * CaregiverMedicineList Component
 *
 * @param {Object} props
 * @param {Object} props.route - Navigation route object
 * @param {string} props.route.params.parentId - Parent's Firebase Auth UID
 * @param {string} props.route.params.caregiverId - Caregiver's Firebase Auth UID
 * @returns {JSX.Element}
 */
const CaregiverMedicineList = ({ route }) => {
  const navigation = useNavigation();
  const { parentId, caregiverId } = route.params || {};

  // State
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load medicines for the parent
   * Requirements: 10.1 - Display all medicines for parent
   */
  const loadMedicines = async (isRefreshing = false) => {
    if (!parentId) {
      setError('Parent ID is required');
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      const medicinesList = await medicineService.getMedicinesForParent(
        parentId,
      );
      setMedicines(medicinesList);
    } catch (err) {
      logError(err, 'CaregiverMedicineList.loadMedicines', { parentId });
      const errorMessage = getErrorMessage(
        err,
        'Failed to load medicines. Please try again.',
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load medicines on mount
  useEffect(() => {
    loadMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  // Reload medicines when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMedicines();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parentId]),
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadMedicines(true);
  };

  /**
   * Navigate to edit medicine form
   * Requirements: 10.3 - Show edit options
   *
   * @param {string} medicineId - Medicine document ID
   */
  const handleEdit = medicineId => {
    navigation.navigate(CaregiverScreens.MEDICINE_FORM, {
      parentId,
      medicineId,
    });
  };

  /**
   * Delete a medicine with confirmation
   * Requirements: 6.1 - Medicine deletion removes record
   * Requirements: 6.2 - Medicine deletion cascades to schedules
   * Requirements: 6.3 - Validate caregiver is authorized
   * Requirements: 10.3 - Show delete options
   *
   * @param {string} medicineId - Medicine document ID
   * @param {string} medicineName - Medicine name for confirmation dialog
   */
  const handleDelete = (medicineId, medicineName) => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete "${medicineName}"? This will also delete all associated schedules and future doses.`,
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
              await medicineService.deleteMedicine(medicineId, caregiverId);
              // Reload medicines list
              await loadMedicines();
              Alert.alert('Success', 'Medicine deleted successfully');
            } catch (err) {
              logError(err, 'CaregiverMedicineList.handleDelete', {
                medicineId,
                caregiverId,
              });
              const errorMessage = getErrorMessage(
                err,
                'Failed to delete medicine. Please try again.',
              );
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  /**
   * Toggle medicine status (active/inactive)
   * Requirements: 7.1 - Set status to inactive
   * Requirements: 7.3 - Set status to active
   * Requirements: 7.5 - Validate caregiver authorization
   * Requirements: 10.4 - Show activation toggle
   *
   * @param {string} medicineId - Medicine document ID
   * @param {string} _currentStatus - Current status ('active' or 'inactive') - unused but kept for clarity
   */
  const handleToggleStatus = async (medicineId, _currentStatus) => {
    try {
      const newStatus = await medicineService.toggleMedicineStatus(
        medicineId,
        caregiverId,
      );

      // Update local state
      setMedicines(prevMedicines =>
        prevMedicines.map(med =>
          med.id === medicineId ? { ...med, status: newStatus } : med,
        ),
      );

      const statusText = newStatus === 'active' ? 'activated' : 'deactivated';
      Alert.alert('Success', `Medicine ${statusText} successfully`);
    } catch (err) {
      logError(err, 'CaregiverMedicineList.handleToggleStatus', {
        medicineId,
        caregiverId,
      });
      const errorMessage = getErrorMessage(
        err,
        'Failed to update medicine status. Please try again.',
      );
      Alert.alert('Error', errorMessage);
    }
  };

  /**
   * Render a single medicine card
   * Requirements: 10.2 - Show medicine name, dosage, and status
   *
   * @param {Object} item - Medicine object
   * @returns {JSX.Element}
   */
  const renderMedicineCard = ({ item }) => {
    const isActive = item.status === 'active';

    return (
      <View style={styles.medicineCard}>
        <View style={styles.medicineHeader}>
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{item.name}</Text>
            <Text style={styles.medicineDosage}>
              {item.dosageAmount} {item.dosageUnit}
            </Text>
            {item.instructions && (
              <Text style={styles.medicineInstructions} numberOfLines={2}>
                {item.instructions}
              </Text>
            )}
          </View>

          {/* Status Toggle */}
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, isActive && styles.statusActive]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
            <Switch
              value={isActive}
              onValueChange={() => handleToggleStatus(item.id, item.status)}
              trackColor={{ false: '#CCCCCC', true: '#34C759' }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`Toggle medicine status, currently ${item.status}`}
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id, item.name)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * Render empty state
   * Requirements: 10.5 - Handle empty state with "Add Medicine" prompt
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
        <Text style={styles.emptyTitle}>No Medicines Yet</Text>
        <Text style={styles.emptyMessage}>
          Get started by adding the first medicine for this parent.
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            navigation.navigate(CaregiverScreens.MEDICINE_FORM, {
              parentId,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Add first medicine"
        >
          <Text style={styles.addButtonText}>Add Medicine</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading medicines...</Text>
      </View>
    );
  }

  // Show error state
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadMedicines()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading medicines"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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
        refreshing={refreshing}
        onRefresh={handleRefresh}
        accessibilityLabel="Medicines list"
      />

      {/* Floating Add Button (shown when medicines exist) */}
      {medicines.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => {
            navigation.navigate(CaregiverScreens.MEDICINE_FORM, {
              parentId,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Add new medicine"
        >
          <Text style={styles.floatingButtonText}>+</Text>
        </TouchableOpacity>
      )}
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
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
    marginRight: 12,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  medicineDosage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  medicineInstructions: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
    marginBottom: 4,
  },
  statusActive: {
    color: '#34C759',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
});

export default CaregiverMedicineList;
