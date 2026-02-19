/**
 * Parent Home Screen
 *
 * Main dashboard for parent users.
 * Displays upcoming medicines for the next 4 hours.
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
import useUpcomingDoses from '../../hooks/useUpcomingDoses';
import DoseCard from '../../components/DoseCard';
import doseService from '../../services/doseService';

/**
 * Parent Home Screen Component
 *
 * Displays:
 * - Upcoming Medicines section (next 4 hours) - Requirements 11.1, 11.2
 *
 * @returns {React.ReactElement} Parent home screen component
 */
function ParentHomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Fetch upcoming doses for next 4 hours
  const {
    doses,
    loading: dosesLoading,
    error: dosesError,
    refetch,
  } = useUpcomingDoses(user?.uid, 4);

  /**
   * Navigate to medicine details from dose
   */
  const handleDosePress = dose => {
    // Navigate to medicine view in HomeTab stack
    navigation.navigate('HomeTab', {
      screen: ParentScreens.MEDICINE_VIEW,
      params: { userId: user?.uid },
    });
  };

  /**
   * Navigate to pairing screen
   */
  const handleManageCaregivers = () => {
    navigation.navigate('ManageTab', {
      screen: ParentScreens.PAIRING,
    });
  };

  /**
   * Handle mark as taken
   */
  const handleMarkAsTaken = async doseId => {
    try {
      await doseService.markDoseAsTaken(doseId);
      refetch();
    } catch (err) {
      console.error('Error marking dose as taken:', err);
    }
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
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No medicines in the next 4 hours</Text>
          <Text style={styles.emptySubtext}>
            You're all caught up! Check the Medicines tab for your full
            schedule.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={doses}
        renderItem={({ item }) => (
          <DoseCard
            dose={item}
            onPress={() => handleDosePress(item)}
            onMarkTaken={() => handleMarkAsTaken(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Upcoming Medicines Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Medicines</Text>
        <Text style={styles.sectionSubtitle}>Next 4 hours</Text>
        {renderUpcomingSection()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
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
