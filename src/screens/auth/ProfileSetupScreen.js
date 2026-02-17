/**
 * ProfileSetupScreen - Profile Setup Screen
 *
 * Allows users to enter their name and complete their profile after role selection.
 * Includes name validation, error handling, and navigation to main app.
 *
 * Requirements: 3.4, 7.3, 8.1, 8.4
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import LoadingOverlay from '../../components/LoadingOverlay';

/**
 * ProfileSetupScreen Component
 *
 * Requirements:
 * - 3.4: Update user profile with name
 * - 7.3: Display loading indicator during profile update
 * - 8.1: Provide accessible labels for input fields
 * - 8.4: Ensure touch targets are at least 44x44 points
 *
 * @param {Object} props
 * @param {AuthNavigationProp} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const ProfileSetupScreen = ({ navigation: _navigation }) => {
  const { user, updateProfile, loading, error: contextError } = useAuth();

  // State
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate name input
   * Requirements: 3.4 - Validate name (non-empty, reasonable length)
   *
   * @param {string} nameValue - Name to validate
   * @returns {boolean} True if valid, false otherwise
   */
  const validateName = nameValue => {
    setValidationError('');

    if (!nameValue || nameValue.trim() === '') {
      setValidationError('Name is required');
      return false;
    }

    if (nameValue.trim().length < 2) {
      setValidationError('Name must be at least 2 characters');
      return false;
    }

    if (nameValue.trim().length > 50) {
      setValidationError('Name must be less than 50 characters');
      return false;
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(nameValue.trim())) {
      setValidationError(
        'Name can only contain letters, spaces, hyphens, and apostrophes',
      );
      return false;
    }

    return true;
  };

  /**
   * Handle name input change
   */
  const handleNameChange = text => {
    setName(text);
    setValidationError('');
  };

  /**
   * Handle Save button press
   * Requirements: 3.4 - Update profile with name
   * Requirements: 7.3 - Show loading indicator
   */
  const handleSave = async () => {
    if (!validateName(name)) {
      return;
    }

    if (!user) {
      setValidationError(
        'User not authenticated. Please try logging in again.',
      );
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      // Update profile with name
      await updateProfile(user.uid, {
        name: name.trim(),
      });

      // Profile updated successfully
      // Navigation will be handled by root navigator based on auth state
      // The user now has a complete profile and will be routed to the main app
    } catch (err) {
      // Requirements: 3.4 - Display error messages
      setValidationError(
        err.message || 'Failed to save your profile. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loading || isSubmitting;
  const displayError = validationError || contextError;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LoadingOverlay visible={isLoading} message="Saving your profile..." />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Tell us your name to get started
            </Text>
          </View>

          {/* Name Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Your Name</Text>

            <TextInput
              style={[styles.nameInput, isLoading && styles.nameInputDisabled]}
              value={name}
              onChangeText={handleNameChange}
              placeholder="Enter your full name"
              placeholderTextColor="#999999"
              maxLength={50}
              editable={!isLoading}
              accessibilityLabel="Name input"
              accessibilityHint="Enter your full name"
              accessibilityRole="none"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoCapitalize="words"
              autoCorrect={false}
              importantForAccessibility="yes"
            />

            {/* Error Message */}
            {displayError && (
              <View
                style={styles.errorContainer}
                accessibilityRole="alert"
                accessibilityLive="polite"
              >
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
            accessibilityLabel="Save profile"
            accessibilityRole="button"
            accessibilityHint="Save your name and continue to the app"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            You can update your name later in settings
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 40,
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
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333333',
    minHeight: 52, // Ensures 44pt+ touch target
    outlineStyle: 'none', // Remove default outline
  },
  nameInputDisabled: {
    opacity: 0.6,
    backgroundColor: '#F0F0F0',
  },
  errorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#E53E3E',
  },
  errorText: {
    fontSize: 14,
    color: '#E53E3E',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 52, // Ensures 44pt+ touch target
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  saveButtonText: {
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

export default ProfileSetupScreen;
