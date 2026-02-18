/**
 * ParentDetailScreen Component
 *
 * Displays detailed information for a specific parent from the caregiver's perspective.
 * Shows parent information, upcoming doses (next 24 hours), and medicine list.
 * Allows editing parent alias and managing medicines.
 *
 * Requirements: 4.1, 5.1, 7.1, 16.1, 16.2
 *
 * @format
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CaregiverScreens } from '../../types/navigation';
import useParent from '../../hooks/useParent';
import useUpcomingDoses from '../../hooks/useUpcomingDoses';
import useParentMedicines from '../../hooks/useParentMedicines';
import EditAliasDialog from '../../components/EditAliasDialog';

/**
 * ParentDetailScreen Component
 *
 * Displays parent details including:
 * - Parent information section with edit alias button (Requirements 4.1, 16.1)
 * - Upcoming doses section for next 24 hours (Requirement 7.1)
 * - Medicine list section (Requirement 5.1)
 *
 * @param {Object} props
 * @param {Object} props.route - React Navigation route object
 * @param {Object} props.route.params - Route parameters
 * @param {string} props.route.params.parentId - Parent's Firebase Auth UID
 * @returns {React.ReactElement}
 *
 * @example
 * // Navigate to ParentDetailScreen
 * navigation.navigate(CaregiverScreens.PARENT_DETAIL, { parentId: 'parent123' });
 */
function ParentDetailScreen({ route }) {
  const { parentId } = route.params;
  const navigation = useNavigation();

  // State for edit alias dialog
  const [showEditAliasDialog, setShowEditAliasDialog] = useState(false);

  // Fetch parent data and alias
  const {
    parent,
    loading: parentLoading,
    error: parentError,
    refetch: refetchParent,
  } = useParent(parentId);

  // Fetch upcoming doses (next 24 hours)
  const {
    doses,
    loading: dosesLoading,
    error: dosesError,
    refetch: refetchDoses,
  } = useUpcomingDoses(parentId, 24);

  // Fetch medicines for this parent
  const {
    medicines,
    loading: medicinesLoading,
    error: medicinesError,
    refetch: refetchMedicines,
  } = useParentMedicines(parentId);

  // Combined loading state
  const loading = parentLoading || dosesLoading || medicinesLoading;

  // Combined error state
  const error = parentError || dosesError || medicinesError;

  /**
   * Handle refresh
   * Refetches all data when user pulls to refresh
   */
  const handleRefresh = () => {
    refetchParent();
    refetchDoses();
    refetchMedicines();
  };

  /**
   * Handle alias save
   * Updates parent name display when alias is saved
   * Requirement 16.2: Update parent name display when alias is saved
   */
  const handleAliasSave = () => {
    setShowEditAliasDialog(false);
    refetchParent();
  };

  /**
   * Handle navigate to medicine details
   * Requirement 6.1: Navigate to medicine details
   */
  const handleMedicinePress = medicineId => {
    navigation.navigate(CaregiverScreens.MEDICINE_DETAILS, {
      medicineId,
      parentId,
    });
  };

  /**
   * Handle add medicine
   * Requirement 4.2: Navigate to medicine form with parentId
   */
  const handleAddMedicine = () => {
    navigation.navigate(CaregiverScreens.MEDICINE_FORM, {
      parentId,
    });
  };

  // Loading state
  if (loading && !parent) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading parent details...</Text>
      </View>
    );
  }

  // Error state
  if (error && !parent) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load parent details</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
      }
    >
      {/* Parent Information Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parent Information</Text>
        </View>
        <View style={styles.parentInfoCard}>
          <View style={styles.parentInfoRow}>
            <Text style={styles.parentName}>{parent?.name}</Text>
            <TouchableOpacity
              style={styles.editAliasButton}
              onPress={() => setShowEditAliasDialog(true)}
              accessibilityLabel="Edit nickname"
              accessibilityRole="button"
            >
              <Text style={styles.editAliasButtonText}>Edit Nickname</Text>
            </TouchableOpacity>
          </View>
          {parent?.alias && (
            <Text style={styles.actualName}>
              Actual name: {parent.actualName}
            </Text>
          )}
          {parent?.phone && (
            <Text style={styles.parentInfo}>Phone: {parent.phone}</Text>
          )}
          {parent?.email && (
            <Text style={styles.parentInfo}>Email: {parent.email}</Text>
          )}
        </View>
      </View>

      {/* Upcoming Doses Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Medicines</Text>
          <Text style={styles.sectionSubtitle}>Next 24 hours</Text>
        </View>
        {dosesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : doses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No upcoming medicines in the next 24 hours
            </Text>
          </View>
        ) : (
          <View style={styles.dosesList}>
            {doses.map(dose => (
              <View key={dose.id} style={styles.doseCard}>
                <View style={styles.doseInfo}>
                  <Text style={styles.doseMedicineName}>
                    {dose.medicineName}
                  </Text>
                  <Text style={styles.doseTime}>
                    {dose.scheduledTime?.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                </View>
                <Text style={styles.doseDosage}>{dose.dosage}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Medicine List Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Medicines</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddMedicine}
            accessibilityLabel="Add medicine"
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {medicinesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No medicines yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap "Add" to create the first medicine
            </Text>
          </View>
        ) : (
          <View style={styles.medicinesList}>
            {medicines.map(medicine => (
              <TouchableOpacity
                key={medicine.id}
                style={styles.medicineCard}
                onPress={() => handleMedicinePress(medicine.id)}
                accessibilityLabel={`View details for ${medicine.name}`}
                accessibilityRole="button"
              >
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  <Text style={styles.medicineDosage}>
                    {medicine.dosageAmount} {medicine.dosageUnit}
                  </Text>
                </View>
                <Text style={styles.medicineArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Edit Alias Dialog */}
      {parent && (
        <EditAliasDialog
          visible={showEditAliasDialog}
          relationshipId={parent.relationshipId}
          currentAlias={parent.alias}
          parentName={parent.actualName}
          onSave={handleAliasSave}
          onCancel={() => setShowEditAliasDialog(false)}
        />
      )}
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
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
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
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  parentInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parentName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  editAliasButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  editAliasButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actualName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  parentInfo: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },
  dosesList: {
    marginHorizontal: 16,
  },
  doseCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doseInfo: {
    flex: 1,
  },
  doseMedicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  doseTime: {
    fontSize: 14,
    color: '#007AFF',
  },
  doseDosage: {
    fontSize: 14,
    color: '#666666',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  medicinesList: {
    marginHorizontal: 16,
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  medicineDosage: {
    fontSize: 14,
    color: '#666666',
  },
  medicineArrow: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: '300',
  },
});

export default ParentDetailScreen;
