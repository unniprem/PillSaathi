/**
 * Caregiver Home Screen
 *
 * Main dashboard for caregiver users.
 * Displays a list of all paired parents with summary information.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
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
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CaregiverScreens } from '../../types/navigation';
import { usePairedParents } from '../../hooks/usePairedParents';
import ParentCard from '../../components/ParentCard';

/**
 * Caregiver Home Screen Component
 *
 * Displays all parents the caregiver is paired with.
 * Requirements:
 * - 1.1: Display list of all paired parents
 * - 1.2: Show parent name and summary information
 * - 1.3: Navigate to parent detail on tap
 * - 1.4: Display empty state for no paired parents
 *
 * @returns {React.ReactElement} Caregiver home screen component
 */
function CaregiverHomeScreen() {
  const navigation = useNavigation();
  const { parents, loading, error, refetch } = usePairedParents();

  /**
   * Handle parent card press
   * Requirement 1.3: Navigate to parent detail screen
   */
  const handleParentPress = parent => {
    navigation.navigate(CaregiverScreens.PARENT_DETAIL, {
      parentId: parent.id,
    });
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading parents...</Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load parents</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Render empty state
   * Requirement 1.4: Display empty state for no paired parents
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>No Parents Yet</Text>
      <Text style={styles.emptySubtitle}>
        You haven't paired with any parents yet.
      </Text>
      <Text style={styles.emptySubtitle}>
        Go to the Pairing tab to connect with a parent.
      </Text>
    </View>
  );

  /**
   * Render parent card
   * Requirements 1.2, 1.3: Display parent info and handle navigation
   */
  const renderParentCard = ({ item }) => (
    <ParentCard parent={item} onPress={() => handleParentPress(item)} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={parents}
        renderItem={renderParentCard}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          parents.length === 0 ? styles.emptyListContent : styles.listContent
        }
        refreshing={loading}
        onRefresh={refetch}
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
    padding: 20,
    backgroundColor: '#F5F5F5',
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});

export default CaregiverHomeScreen;
