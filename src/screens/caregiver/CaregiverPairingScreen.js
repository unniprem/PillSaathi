/**
 * CaregiverPairingScreen - Caregiver Pairing & Relationships Screen
 *
 * Allows caregivers to redeem invite codes and manage parent relationships.
 * Displays input for invite code redemption and lists linked parents.
 *
 * Requirements: 3.1, 4.1, 4.2, 4.4, 9.1, 9.2, 9.3, 9.4
 *
 * @format
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { usePairing } from '../../contexts/PairingContext';
import { useAuth } from '../../contexts/AuthContext';
import RelationshipCard from '../../components/pairing/RelationshipCard';
import { getErrorMessage } from '../../constants/errorMessages';

/**
 * Validate invite code format
 * Requirements: 3.1 - Validate code format (8 characters, alphanumeric)
 *
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid format
 */
const validateCodeFormat = code => {
  if (!code || typeof code !== 'string') {
    return false;
  }
  // Must be exactly 8 characters, alphanumeric (A-Z, 0-9)
  return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
};

/**
 * CaregiverPairingScreen Component
 *
 * Requirements:
 * - 3.1: Input field for invite code with format validation
 * - 4.1: Query and display relationships
 * - 4.2: Display parent name and profile information
 * - 4.4: Display empty state when no parents
 * - 9.1: Display specific error messages
 * - 9.2: Display loading indicator
 * - 9.3: Display success confirmation
 * - 9.4: Display error states with retry option
 *
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const CaregiverPairingScreen = ({ navigation: _navigation }) => {
  const {
    relationships,
    loading,
    error,
    redeemInviteCode,
    removeRelationship,
    refreshRelationships,
  } = usePairing();

  const { user, profile } = useAuth();

  // Local state
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  /**
   * Handle code input change
   * Requirements: 3.1 - Validate code format
   */
  const handleCodeChange = text => {
    // Convert to uppercase and remove non-alphanumeric characters
    const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Limit to 8 characters
    const limited = sanitized.slice(0, 8);
    setCode(limited);

    // Clear validation error when user types
    if (validationError) {
      setValidationError(null);
    }
    if (localError) {
      setLocalError(null);
    }
  };

  /**
   * Handle redeem button press
   * Requirements: 3.1 - Validate code format before submission
   * Requirements: 9.1 - Display specific error messages
   * Requirements: 9.2 - Show loading indicator
   * Requirements: 9.3 - Display success confirmation
   */
  const handleRedeemCode = async () => {
    // Validate code format
    if (!validateCodeFormat(code)) {
      setValidationError(
        'Please enter a valid 8-character code (letters and numbers only)',
      );
      return;
    }

    setIsRedeeming(true);
    setLocalError(null);
    setValidationError(null);

    try {
      // Client-side check: See if we're already connected with this parent
      const codeUppercase = code.toUpperCase();

      try {
        const inviteSnapshot = await firestore()
          .collection('inviteCodes')
          .where('code', '==', codeUppercase)
          .limit(1)
          .get();

        if (!inviteSnapshot.empty) {
          const inviteData = inviteSnapshot.docs[0].data();
          const parentUid = inviteData.parentUid;

          // Check 1: Local state (fast check)
          const existingRelationshipLocal = relationships.find(
            r => r.parentUid === parentUid,
          );

          if (existingRelationshipLocal) {
            const parentName =
              existingRelationshipLocal.parentName || 'this parent';
            Alert.alert(
              'Already Connected',
              `You are already connected with ${parentName}. Check your "Linked Parents" list below.`,
              [{ text: 'OK' }],
            );
            setCode('');
            setIsRedeeming(false);
            return;
          }

          // Check 2: Firestore direct (catches orphaned relationships)
          const relationshipId = `${parentUid}_${user.uid}`;
          const relationshipDoc = await firestore()
            .collection('relationships')
            .doc(relationshipId)
            .get();

          // Handle both function and property for exists (different Firebase versions)
          const docExists =
            typeof relationshipDoc.exists === 'function'
              ? relationshipDoc.exists()
              : relationshipDoc.exists;

          if (docExists) {
            Alert.alert(
              'Already Connected',
              'You are already connected with this parent, but they are not showing in your list. Try pulling down to refresh.',
              [{ text: 'Refresh Now', onPress: handleRefresh }, { text: 'OK' }],
            );
            setCode('');
            setIsRedeeming(false);
            return;
          }
        }
      } catch (checkError) {
        console.error(
          '[CaregiverPairingScreen] Client-side check error:',
          checkError,
        );
        // Continue with redemption - server will validate
      }
      await redeemInviteCode(code);

      Alert.alert(
        'Success',
        'You have successfully connected with the parent. They will now appear in your list.',
        [{ text: 'OK' }],
      );

      setCode('');
    } catch (err) {
      console.error('[CaregiverPairingScreen] Error redeeming code:', err);
      const errorMessage = getErrorMessage(err.code, err.message);
      setLocalError(errorMessage);
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsRedeeming(false);
    }
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
        'The parent has been removed successfully.',
        [{ text: 'OK' }],
      );
    } catch (err) {
      // Requirements: 9.4 - Display error
      const errorMessage = getErrorMessage(err.code, err.message);
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    }
  };

  /**
   * Handle pull-to-refresh
   * Requirements: 9.2 - Manual refresh capability
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLocalError(null);
    setValidationError(null);

    try {
      await refreshRelationships();
    } catch (err) {
      const errorMessage = getErrorMessage(err.code, err.message);
      setLocalError(errorMessage);
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
    setValidationError(null);
    handleRefresh();
  };

  // Get parent relationships
  const parents = relationships || [];

  // Determine display error
  const displayError = localError || error;

  // Check if redeem button should be disabled
  const isRedeemDisabled = isRedeeming || loading || code.length !== 8;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        accessibilityRole="scrollview"
        accessibilityLabel="Caregiver pairing screen"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLabel="Connect with Parents"
          >
            Connect with Parents
          </Text>
          <Text
            style={styles.subtitle}
            accessibilityRole="text"
            accessibilityLabel="Enter the invite code shared by a parent to connect"
          >
            Enter the invite code shared by a parent to connect
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
              disabled={loading || isRedeeming}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              accessibilityHint="Try the operation again"
              accessibilityState={{ disabled: loading || isRedeeming }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Invite Code Input Section */}
        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
            accessibilityLabel="Enter Invite Code"
          >
            Enter Invite Code
          </Text>

          <View style={styles.inputContainer}>
            {/* Code Input */}
            <TextInput
              style={[
                styles.codeInput,
                validationError && styles.codeInputError,
              ]}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="ABC12345"
              placeholderTextColor="#999999"
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isRedeeming && !loading}
              accessibilityRole="text"
              accessibilityLabel="Invite code input"
              accessibilityHint="Enter the 8-character invite code"
              accessibilityState={{ disabled: isRedeeming || loading }}
            />

            {/* Character Counter */}
            <Text
              style={styles.characterCounter}
              accessibilityRole="text"
              accessibilityLabel={`${code.length} of 8 characters entered`}
            >
              {code.length}/8
            </Text>

            {/* Validation Error */}
            {validationError && (
              <Text
                style={styles.validationError}
                accessibilityRole="alert"
                accessibilityLive="polite"
              >
                {validationError}
              </Text>
            )}

            {/* Redeem Button */}
            <TouchableOpacity
              style={[
                styles.redeemButton,
                isRedeemDisabled && styles.redeemButtonDisabled,
              ]}
              onPress={handleRedeemCode}
              disabled={isRedeemDisabled}
              accessibilityRole="button"
              accessibilityLabel="Redeem invite code"
              accessibilityHint="Connect with the parent using this code"
              accessibilityState={{ disabled: isRedeemDisabled }}
            >
              {isRedeeming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.redeemButtonText}>Redeem Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Parents Section */}
        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
            accessibilityLabel="Linked Parents"
          >
            Linked Parents
          </Text>

          {/* Loading State */}
          {loading && parents.length === 0 && (
            <View
              style={styles.loadingContainer}
              accessibilityRole="progressbar"
              accessibilityLabel="Loading parents"
            >
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading parents...</Text>
            </View>
          )}

          {/* Empty State - No parents */}
          {!loading && parents.length === 0 && (
            <View
              style={styles.emptyContainer}
              accessibilityRole="text"
              accessibilityLabel="No parents connected yet"
            >
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>No Parents Yet</Text>
              <Text style={styles.emptyMessage}>
                Enter an invite code above to connect with a parent. They'll
                appear here once you redeem the code.
              </Text>
            </View>
          )}

          {/* Parent List */}
          {parents.length > 0 && (
            <View
              style={styles.relationshipsList}
              accessibilityRole="list"
              accessibilityLabel={`${parents.length} parent${
                parents.length === 1 ? '' : 's'
              } connected`}
            >
              {parents.map(relationship => (
                <RelationshipCard
                  key={relationship.id}
                  relationshipId={relationship.id}
                  userName={relationship.parentName || 'Unknown Parent'}
                  userPhone={relationship.parentPhone || ''}
                  createdAt={relationship.createdAt}
                  onRemove={handleRemoveRelationship}
                  loading={loading}
                  userRole="Parent"
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
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
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    minHeight: 60,
  },
  codeInputError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
  },
  characterCounter: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 8,
  },
  validationError: {
    fontSize: 14,
    color: '#E53E3E',
    marginTop: 8,
    textAlign: 'center',
  },
  redeemButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  redeemButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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

export default CaregiverPairingScreen;
