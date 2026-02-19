/**
 * Parent Upcoming Screen
 *
 * Displays all upcoming medicines for the current day (midnight to midnight).
 * Shows medicine name, scheduled time, and dosage.
 * Highlights overdue doses.
 * Provides quick action to mark doses as taken.
 *
 * @format
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useTodayDoses from '../../hooks/useTodayDoses';
import DoseCard from '../../components/DoseCard';
import { ParentScreens } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import doseGenerationService from '../../services/doseGenerationService';

/**
 * Parent Upcoming Screen Component
 *
 * Shows all medicines scheduled for today with quick actions.
 *
 * @returns {React.ReactElement} Parent upcoming screen
 */
function ParentUpcomingScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { doses, loading, error, markAsTaken } = useTodayDoses();
  const [cleaningUp, setCleaningUp] = useState(false);

  /**
   * Handle dose card press - navigate to medicine details
   * @param {Object} dose - Dose object
   */
  const handleDosePress = dose => {
    navigation.navigate(ParentScreens.MEDICINE_VIEW, {
      medicineId: dose.medicineId,
    });
  };

  /**
   * Handle mark as taken action
   * @param {string} doseId - Dose ID
   */
  const handleMarkAsTaken = async doseId => {
    try {
      await markAsTaken(doseId);
    } catch (err) {
      console.error('Error marking dose as taken:', err);
    }
  };

  /**
   * Handle cleanup old doses
   */
  const handleCleanupOldDoses = () => {
    Alert.alert(
      'Clean Up Old Doses',
      'This will delete dose records older than 30 days. This action cannot be undone. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clean Up',
          style: 'destructive',
          onPress: async () => {
            setCleaningUp(true);
            try {
              const deletedCount = await doseGenerationService.cleanupOldDoses(
                user.uid,
              );
              Alert.alert(
                'Cleanup Complete',
                `Successfully deleted ${deletedCount} old dose records.`,
              );
            } catch (err) {
              console.error('Error cleaning up doses:', err);
              Alert.alert(
                'Cleanup Failed',
                'Failed to clean up old doses. Please try again.',
              );
            } finally {
              setCleaningUp(false);
            }
          },
        },
      ],
    );
  };

  /**
   * Render empty state when no doses today
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyTitle}>No Medicines Today</Text>
      <Text style={styles.emptySubtitle}>
        You don't have any medicines scheduled for today.
      </Text>
    </View>
  );

  /**
   * Render error state
   */
  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>⚠️</Text>
      <Text style={styles.emptyTitle}>Error Loading Doses</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
    </View>
  );

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading today's medicines...</Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <DoseCard
            dose={item}
            onPress={() => handleDosePress(item)}
            onMarkTaken={() => handleMarkAsTaken(item.id)}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          doses.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
      />
      <View style={styles.cleanupButtonContainer}>
        <TouchableOpacity
          style={[
            styles.cleanupButton,
            cleaningUp && styles.cleanupButtonDisabled,
          ]}
          onPress={handleCleanupOldDoses}
          disabled={cleaningUp}
        >
          {cleaningUp ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.cleanupButtonText}>🗑️ Clean Up Old Doses</Text>
          )}
        </TouchableOpacity>
      </View>
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
  cleanupButtonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cleanupButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanupButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  cleanupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ParentUpcomingScreen;
