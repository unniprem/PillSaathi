/**
 * RoleSelectionScreen - Role Selection Screen
 *
 * Allows users to select their role (Parent or Caregiver) after authentication.
 * Creates user profile with selected role and navigates to profile setup or main app.
 *
 * Requirements: 2.1, 2.2, 2.4, 7.3, 8.1, 8.4
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, AuthScreens } from '../../types/navigation';
import LoadingOverlay from '../../components/LoadingOverlay';

/**
 * RoleSelectionScreen Component
 *
 * Requirements:
 * - 2.1: Display role options (Parent and Caregiver)
 * - 2.2: Store selected role in user profile
 * - 2.4: Display error and allow retry on profile creation failure
 * - 7.3: Display loading indicator during profile creation
 * - 8.1: Provide accessible labels for interactive elements
 * - 8.4: Ensure touch targets are at least 44x44 points
 *
 * @param {Object} props
 * @param {AuthNavigationProp} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const RoleSelectionScreen = ({ navigation }) => {
  const { user, createProfile, loading, error: contextError } = useAuth();

  // State
  const [selectedRole, setSelectedRole] = useState(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Handle role selection
   * Requirements: 2.1 - Handle role selection
   *
   * @param {string} role - Selected role ('parent' or 'caregiver')
   */
  const handleRoleSelect = role => {
    setSelectedRole(role);
    setErrorMessage('');
  };

  /**
   * Handle continue button press
   * Requirements: 2.2 - Store role in profile
   * Requirements: 2.4 - Handle profile creation errors
   * Requirements: 7.3 - Show loading indicator
   */
  const handleContinue = async () => {
    if (!selectedRole) {
      setErrorMessage('Please select a role to continue');
      return;
    }

    if (!user) {
      setErrorMessage('User not authenticated. Please try logging in again.');
      return;
    }

    setIsCreatingProfile(true);
    setErrorMessage('');

    try {
      // Create profile with selected role
      await createProfile(user.uid, {
        role: selectedRole,
        phone: user.phoneNumber,
        name: '', // Will be set in ProfileSetupScreen
      });

      // Profile created successfully, navigate to profile setup
      navigation.navigate(AuthScreens.PROFILE_SETUP);
    } catch (err) {
      // Requirements: 2.4 - Display error and allow retry
      setErrorMessage(
        err.message || 'Failed to save your role. Please try again.',
      );
    } finally {
      setIsCreatingProfile(false);
    }
  };

  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    setErrorMessage('');
    handleContinue();
  };

  const isLoading = loading || isCreatingProfile;
  const displayError = errorMessage || contextError;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <LoadingOverlay visible={isLoading} message="Creating your profile..." />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Select how you'll be using PillSathi
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {/* Parent Role Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === UserRole.PARENT && styles.roleCardSelected,
              isLoading && styles.roleCardDisabled,
            ]}
            onPress={() => handleRoleSelect(UserRole.PARENT)}
            disabled={isLoading}
            accessibilityLabel="Parent role"
            accessibilityRole="button"
            accessibilityHint="Select parent role to manage medications for your loved ones"
            accessibilityState={{
              selected: selectedRole === UserRole.PARENT,
              disabled: isLoading,
            }}
          >
            <View style={styles.roleIconContainer}>
              <Text style={styles.roleIcon}>👨‍👩‍👧‍👦</Text>
            </View>
            <Text style={styles.roleTitle}>Parent</Text>
            <Text style={styles.roleDescription}>
              Manage medications for your loved ones. Add medicines, set
              reminders, and coordinate with caregivers.
            </Text>
            {selectedRole === UserRole.PARENT && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedCheckmark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Caregiver Role Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === UserRole.CAREGIVER && styles.roleCardSelected,
              isLoading && styles.roleCardDisabled,
            ]}
            onPress={() => handleRoleSelect(UserRole.CAREGIVER)}
            disabled={isLoading}
            accessibilityLabel="Caregiver role"
            accessibilityRole="button"
            accessibilityHint="Select caregiver role to help manage medications for others"
            accessibilityState={{
              selected: selectedRole === UserRole.CAREGIVER,
              disabled: isLoading,
            }}
          >
            <View style={styles.roleIconContainer}>
              <Text style={styles.roleIcon}>🤝</Text>
            </View>
            <Text style={styles.roleTitle}>Caregiver</Text>
            <Text style={styles.roleDescription}>
              Help manage medications for others. Receive reminders, confirm
              doses, and stay connected with families.
            </Text>
            {selectedRole === UserRole.CAREGIVER && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedCheckmark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {displayError && (
          <View
            style={styles.errorContainer}
            accessibilityRole="alert"
            accessibilityLive="polite"
          >
            <Text style={styles.errorText}>{displayError}</Text>
            {errorMessage && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                disabled={isLoading}
                accessibilityLabel="Retry"
                accessibilityRole="button"
                accessibilityHint="Try saving your role again"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedRole || isLoading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || isLoading}
          accessibilityLabel="Continue"
          accessibilityRole="button"
          accessibilityHint="Continue with selected role"
          accessibilityState={{
            disabled: !selectedRole || isLoading,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          You can update your role later in settings if needed
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  rolesContainer: {
    marginBottom: 24,
  },
  roleCard: {
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  roleCardDisabled: {
    opacity: 0.6,
  },
  roleIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIcon: {
    fontSize: 48,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckmark: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#E53E3E',
  },
  errorText: {
    fontSize: 14,
    color: '#E53E3E',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E53E3E',
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  continueButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default RoleSelectionScreen;
