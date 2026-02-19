/**
 * Parent Home Screen
 *
 * Main dashboard for parent users.
 * Displays upcoming medicines and all medicines list.
 *
 * Requirements: 10.1, 10.2, 10.3, 11.1, 11.2
 *
 * @format
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ParentScreens } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import useMyMedicines from '../../hooks/useMyMedicines';
import useUpcomingDoses from '../../hooks/useUpcomingDoses';
import MedicineCard from '../../components/MedicineCard';
import DoseCard from '../../components/DoseCard';

/**
 * Parent Home Screen Component
 *
 * Displays:
 * - Upcoming Medicines section (next 24 hours) - Requirements 11.1, 11.2
 * - All Medicines section - Requirements 10.1, 10.2, 10.3
 *
 * @returns {React.ReactElement} Parent home screen component
 */
function ParentHomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Fetch medicines and upcoming doses
  const {
    medicines,
    loading: medicinesLoading,
    error: medicinesError,
  } = useMyMedicines(user?.uid);

  const {
    doses,
    loading: dosesLoading,
    error: dosesError,
  } = useUpcomingDoses(user?.uid, 24);

  /**
   * Navigate to medicine details
   */
  const handleMedicinePress = medicineId => {
    navigation.navigate(ParentScreens.MEDICINE_DETAILS, { medicineId });
  };

  /**
   * Navigate to medicine details from dose
   */
  const handleDosePress = dose => {
    navigation.navigate(ParentScreens.MEDICINE_DETAILS, {
      medicineId: dose.medicineId,
    });
  };

  /**
   * Navigate to pairing screen
   */
  const handleManageCaregivers = () => {
    navigation.navigate(ParentScreens.PAIRING);
  };

  /**
   * Render upcoming medicines section
   */
  const renderUpcomingSection = () => {
    if (dosesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }

    if (dosesError) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Failed to load upcoming medicines
          </Text>
        </View>
      );
    }

    if (doses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No upcoming medicines in the next 24 hours
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={doses}
        renderItem={({ item }) => (
          <DoseCard dose={item} onPress={() => handleDosePress(item)} />
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    );
  };

  /**
   * Render all medicines section
   */
  const renderMedicinesSection = () => {
    if (medicinesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }

    if (medicinesError) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Failed to load medicines</Text>
        </View>
      );
    }

    if (medicines.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No medicines added yet</Text>
          <Text style={styles.emptySubtext}>
            Ask your caregiver to add medicines for you
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={medicines}
        renderItem={({ item }) => (
          <MedicineCard
            medicine={item}
            onPress={() => handleMedicinePress(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Manage Caregivers Button */}
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.manageCaregiverButton}
          onPress={handleManageCaregivers}
          accessibilityRole="button"
          accessibilityLabel="Manage caregivers"
          accessibilityHint="Navigate to caregiver management screen"
        >
          <Text style={styles.manageCaregiverIcon}>👥</Text>
          <View style={styles.manageCaregiverTextContainer}>
            <Text style={styles.manageCaregiverTitle}>Manage Caregivers</Text>
            <Text style={styles.manageCaregiverSubtitle}>
              Generate invite codes and view connected caregivers
            </Text>
          </View>
          <Text style={styles.manageCaregiverArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Medicines Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Medicines</Text>
        <Text style={styles.sectionSubtitle}>Next 24 hours</Text>
        {renderUpcomingSection()}
      </View>

      {/* All Medicines Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Medicines</Text>
        {renderMedicinesSection()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  manageCaregiverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manageCaregiverIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  manageCaregiverTextContainer: {
    flex: 1,
  },
  manageCaregiverTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  manageCaregiverSubtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  manageCaregiverArrow: {
    fontSize: 28,
    color: '#007AFF',
    fontWeight: '300',
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});

export default ParentHomeScreen;
