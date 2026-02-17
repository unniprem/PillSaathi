/**
 * ParentPairingScreen - Parent Pairing & Relationships Screen
 *
 * Allows parents to generate invite codes and manage caregiver relationships.
 * Displays active invite code with sharing options and lists linked caregivers.
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 5.1, 5.2, 5.4, 9.2, 9.3, 9.4
 *
 * @format
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { usePairing } from '../../contexts/PairingContext';
import InviteCodeDisplay from '../../components/pairing/InviteCodeDisplay';
import RelationshipCard from '../../components/pairing/RelationshipCard';

/**
 * ParentPairingScreen Component
 *
 * Requirements:
 * - 1.1: Display active invite code or generate button
 * - 2.1: Display code in readable format
 * - 2.2: Provide native sharing options
 * - 2.3: Show remaining time until expiration
 * - 5.1: Query and display relationships
 * - 5.2: Display caregiver name and profile information
 * - 5.4: Display empty state when no caregivers
 * - 9.2: Display loading indicator
 * - 9.3: Display success confirmation
 * - 9.4: Display error states with retry option
 *
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const ParentPairingScreen = ({ navigation: _navigation }) => {
  const {
    inviteCode,
    relationships,
    loading,
    error,
    generateInviteCode,
    removeRelationship,
    refreshRelationships,
  } = usePairing();

  // Local state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localError, setLocalError] = useState(null);

  /**
   * Handle generate invite code button press
   * Requirements: 1.1 - Generate invite code
   * Requirements: 9.2 - Show loading indicator
   * Requirements: 9.4 - Handle errors with retry option
   */
  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setLocalError(null);

    try {
      await generateInviteCode();
      // Requirements: 9.3 - Display success confirmation
      Alert.alert(
        'Code Generated',
        'Your invite code has been generated successfully. Share it with caregivers to connect.',
        [{ text: 'OK' }],
      );
    } catch (err) {
      // Requirements: 9.4 - Display error with retry option
      setLocalError(err.message || 'Failed to generate invite code');
      Alert.alert(
        'Error',
        err.message || 'Failed to generate invite code. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle invite code regeneration
   * Requirements: 2.4 - Offer to generate new code when expired
   */
  const handleRegenerateCode = async () => {
    await handleGenerateCode();
  };

  /**
   * Handle relationship removal
   * Requirements: 6.1 - Remove relationship
   * Requirements: 9.3 - Display success confirmation
   * Requirements: 9.4 - Handle errors
   */
  const handleRemoveRelationship = async relationshipId => {
    try {
      await removeRelationship(relationshipId);
      // Requirements: 9.3 - Display success confirmation
      Alert.alert(
        'Relationship Removed',
        'The caregiver has been removed successfully.',
        [{ text: 'OK' }],
      );
    } catch (err) {
      // Requirements: 9.4 - Display error
      Alert.alert(
        'Error',
        err.message || 'Failed to remove relationship. Please try again.',
        [{ text: 'OK' }],
      );
    }
  };

  /**
   * Handle pull-to-refresh
   * Requirements: 9.2 - Manual refresh capability
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLocalError(null);

    try {
      await refreshRelationships();
    } catch (err) {
      setLocalError(err.message || 'Failed to refresh relationships');
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle retry after error
   * Requirements: 9.4 - Retry option for errors
   */
  const handleRetry = () => {
    setLocalError(null);
    if (!inviteCode) {
      handleGenerateCode();
    } else {
      handleRefresh();
    }
  };

  // Get caregiver relationships
  const caregivers = relationships || [];

  // Determine display error
  const displayError = localError || error;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
        />
      }
      accessibilityRole="scrollview"
      accessibilityLabel="Parent pairing screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel="Manage Caregivers"
        >
          Manage Caregivers
        </Text>
        <Text
          style={styles.subtitle}
          accessibilityRole="text"
          accessibilityLabel="Share your invite code with caregivers to connect"
        >
          Share your invite code with caregivers to connect
        </Text>
      </View>

      {/* Error Display */}
      {displayError && (
        <View
          style={styles.errorContainer}
          accessibilityRole="alert"
          accessibilityLive="polite"
        >
          <Text style={styles.errorText}>{displayError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            disabled={loading || isGenerating}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            accessibilityHint="Try the operation again"
            accessibilityState={{ disabled: loading || isGenerating }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Invite Code Section */}
      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
          accessibilityRole="header"
          accessibilityLabel="Invite Code"
        >
          Invite Code
        </Text>

        {/* Loading State */}
        {loading && !inviteCode && !isGenerating && (
          <View
            style={styles.loadingContainer}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading invite code"
          >
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Generate Button - Show when no active code */}
        {!loading && !inviteCode && !isGenerating && (
          <View style={styles.generateContainer}>
            <Text
              style={styles.generateMessage}
              accessibilityRole="text"
              accessibilityLabel="You don't have an active invite code"
            >
              You don't have an active invite code. Generate one to share with
              caregivers.
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateCode}
              disabled={isGenerating}
              accessibilityRole="button"
              accessibilityLabel="Generate invite code"
              accessibilityHint="Creates a new invite code to share with caregivers"
              accessibilityState={{ disabled: isGenerating }}
            >
              <Text style={styles.generateButtonText}>
                Generate Invite Code
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generating State */}
        {isGenerating && (
          <View
            style={styles.loadingContainer}
            accessibilityRole="progressbar"
            accessibilityLabel="Generating invite code"
          >
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Generating code...</Text>
          </View>
        )}

        {/* Invite Code Display - Show when code exists */}
        {inviteCode && !isGenerating && (
          <InviteCodeDisplay
            code={inviteCode.code}
            expiresAt={inviteCode.expiresAt}
            onRegenerate={handleRegenerateCode}
            loading={isGenerating}
          />
        )}
      </View>

      {/* Caregivers Section */}
      <View style={styles.section}>
        <Text
          style={styles.sectionTitle}
          accessibilityRole="header"
          accessibilityLabel="Linked Caregivers"
        >
          Linked Caregivers
        </Text>

        {/* Loading State */}
        {loading && caregivers.length === 0 && (
          <View
            style={styles.loadingContainer}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading caregivers"
          >
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading caregivers...</Text>
          </View>
        )}

        {/* Empty State - No caregivers */}
        {!loading && caregivers.length === 0 && (
          <View
            style={styles.emptyContainer}
            accessibilityRole="text"
            accessibilityLabel="No caregivers connected yet"
          >
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Caregivers Yet</Text>
            <Text style={styles.emptyMessage}>
              Share your invite code with caregivers to connect. They'll appear
              here once they redeem the code.
            </Text>
          </View>
        )}

        {/* Caregiver List */}
        {caregivers.length > 0 && (
          <View
            style={styles.relationshipsList}
            accessibilityRole="list"
            accessibilityLabel={`${caregivers.length} caregiver${
              caregivers.length === 1 ? '' : 's'
            } connected`}
          >
            {caregivers.map(relationship => (
              <RelationshipCard
                key={relationship.id}
                relationshipId={relationship.id}
                userName={relationship.caregiverName || 'Unknown Caregiver'}
                userPhone={relationship.caregiverPhone || ''}
                createdAt={relationship.createdAt}
                onRemove={handleRemoveRelationship}
                loading={loading}
                userRole="Caregiver"
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
  },
  errorText: {
    fontSize: 14,
    color: '#E53E3E',
    marginBottom: 12,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#E53E3E',
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  generateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minHeight: 52,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  relationshipsList: {
    marginTop: 8,
  },
});

export default ParentPairingScreen;
