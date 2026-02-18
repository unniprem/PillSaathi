/**
 * Caregiver Upcoming Screen
 *
 * Shows all upcoming medicines across all paired parents for a caregiver.
 * Displays medicine name, scheduled time, dosage, and parent name.
 *
 * Requirements: 15.2
 *
 * @format
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAllUpcomingDoses from '../../hooks/useAllUpcomingDoses';
import UpcomingDoseCard from '../../components/UpcomingDoseCard';
import { CaregiverScreens } from '../../navigation/screenNames';

/**
 * Empty State Component
 *
 * Displayed when there are no upcoming doses
 */
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyTitle}>No Upcoming Medicines</Text>
      <Text style={styles.emptySubtitle}>
        There are no medicines scheduled in the next 24 hours for any of your
        parents.
      </Text>
    </View>
  );
}

/**
 * Error State Component
 *
 * Displayed when there's an error loading doses
 */
function ErrorState({ error, onRetry }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Unable to Load Medicines</Text>
      <Text style={styles.errorMessage}>
        {error?.message ||
          'An error occurred while loading upcoming medicines.'}
      </Text>
      <Text style={styles.retryButton} onPress={onRetry}>
        Tap to Retry
      </Text>
    </View>
  );
}

/**
 * Caregiver Upcoming Screen Component
 *
 * Displays all upcoming medicines across all paired parents.
 * Uses FlatList to display UpcomingDoseCard components.
 * Shows empty state if no upcoming doses.
 *
 * Requirements: 15.2
 *
 * @returns {React.ReactElement} Caregiver upcoming screen
 */
function CaregiverUpcomingScreen() {
  const navigation = useNavigation();
  const { doses, loading, error, refetch } = useAllUpcomingDoses(24);
  const [refreshing, setRefreshing] = React.useState(false);

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  /**
   * Handle dose card press
   * Navigate to medicine details screen
   */
  const handleDosePress = dose => {
    navigation.navigate(CaregiverScreens.MEDICINE_DETAILS, {
      medicineId: dose.medicineId,
      parentId: dose.parentId,
    });
  };

  /**
   * Render loading state
   */
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading upcoming medicines...</Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error && !refreshing) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  /**
   * Render main content
   */
  return (
    <View style={styles.container}>
      <FlatList
        data={doses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <UpcomingDoseCard dose={item} onPress={() => handleDosePress(item)} />
        )}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={
          doses.length === 0 ? styles.emptyListContainer : styles.listContainer
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
  centerContainer: {
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
    paddingVertical: 12,
  },
  emptyListContainer: {
    flexGrow: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F5F5',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});

export default CaregiverUpcomingScreen;
