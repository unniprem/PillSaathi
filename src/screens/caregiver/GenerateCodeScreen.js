/**
 * Generate Code Screen
 *
 * Allows caregivers to generate invite codes for parents to pair with them.
 * Also displays a list of all caregivers paired with a specific parent.
 *
 * Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3
 *
 * @format
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { usePairing } from '../../contexts/PairingContext';
import { useAuth } from '../../contexts/AuthContext';
import usePairedCaregivers from '../../hooks/usePairedCaregivers';
import CaregiverCard from '../../components/CaregiverCard';

/**
 * Generate Code Screen Component
 *
 * Requirements:
 * - 8.1: Display generate code button at bottom of screen
 * - 8.2: Create new invite code when button is tapped
 * - 8.3: Display generated code prominently
 * - 9.1: Display list of all paired caregivers
 * - 9.2: Show caregiver name and status
 * - 9.3: Show appropriate message if no caregivers
 *
 * @returns {React.ReactElement} Generate code screen
 */
function GenerateCodeScreen() {
  const { inviteCode, loading, generateInviteCode } = usePairing();
  const { user } = useAuth();
  const {
    caregivers,
    loading: caregiversLoading,
    error: caregiversError,
    refetch: refetchCaregivers,
  } = usePairedCaregivers(user?.uid);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Handle generate code button press
   * Requirements: 8.2 - Create new invite code
   */
  const handleGenerateCode = async () => {
    setIsGenerating(true);

    try {
      await generateInviteCode();
      Alert.alert(
        'Code Generated',
        'Your invite code has been generated successfully. Share it with a parent to connect.',
        [{ text: 'OK' }],
      );
    } catch (error) {
      console.error('[GenerateCodeScreen] Error generating code:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to generate invite code. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Generate Invite Code</Text>
        <Text style={styles.subtitle}>
          Create a code that parents can use to connect with you
        </Text>
      </View>

      {/* Code Display Section */}
      {inviteCode && (
        <View style={styles.codeSection}>
          <Text style={styles.codeSectionTitle}>Your Invite Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{inviteCode.code}</Text>
          </View>
          <Text style={styles.codeHint}>
            Share this code with a parent to connect
          </Text>
          {inviteCode.expiresAt && (
            <Text style={styles.expiryText}>
              Expires: {new Date(inviteCode.expiresAt).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      {/* Empty State */}
      {!inviteCode && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔑</Text>
          <Text style={styles.emptyTitle}>No Active Code</Text>
          <Text style={styles.emptyMessage}>
            Generate a new invite code to allow parents to connect with you
          </Text>
        </View>
      )}

      {/* Loading State */}
      {loading && !inviteCode && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Paired Caregivers Section - Requirement 9.1, 9.2, 9.3 */}
      <View style={styles.caregiversSection}>
        <Text style={styles.sectionTitle}>Paired Caregivers</Text>

        {/* Caregivers Loading State */}
        {caregiversLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading caregivers...</Text>
          </View>
        )}

        {/* Caregivers Error State */}
        {caregiversError && !caregiversLoading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Failed to load caregivers. Please try again.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={refetchCaregivers}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Caregivers List - Requirement 9.1, 9.2 */}
        {!caregiversLoading && !caregiversError && caregivers.length > 0 && (
          <View style={styles.caregiversList}>
            {caregivers.map(caregiver => (
              <CaregiverCard key={caregiver.id} caregiver={caregiver} />
            ))}
          </View>
        )}

        {/* Empty State - No Caregivers - Requirement 9.3 */}
        {!caregiversLoading && !caregiversError && caregivers.length === 0 && (
          <View style={styles.emptyCaregiversState}>
            <Text style={styles.emptyCaregiversIcon}>👥</Text>
            <Text style={styles.emptyCaregiversTitle}>No Caregivers Yet</Text>
            <Text style={styles.emptyCaregiversMessage}>
              Share your invite code with caregivers to connect with them.
              They'll appear here once they redeem the code.
            </Text>
          </View>
        )}
      </View>

      {/* Generate Button - Fixed at bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            (isGenerating || loading) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerateCode}
          disabled={isGenerating || loading}
          accessibilityRole="button"
          accessibilityLabel="Generate invite code"
          accessibilityHint="Create a new invite code for parents to connect"
          accessibilityState={{ disabled: isGenerating || loading }}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.generateButtonText}>
              {inviteCode ? 'Generate New Code' : 'Generate Code'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for fixed button
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
  codeSection: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  expiryText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  caregiversSection: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  caregiversList: {
    marginTop: 8,
  },
  emptyCaregiversState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyCaregiversIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyCaregiversTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  emptyCaregiversMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E53E3E',
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default GenerateCodeScreen;
