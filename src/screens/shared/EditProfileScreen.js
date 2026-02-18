/**
 * EditProfileScreen - Edit Profile Screen
 *
 * Allows users to update their profile information including name, date of birth, and email.
 * Pre-fills form with current user data and validates input before saving.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.5
 */

import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import {
  validateName,
  validateDateOfBirth,
  validateEmail,
} from '../../models/User';

/**
 * EditProfileScreen Component
 *
 * Requirements:
 * - 18.1: Provide fields to enter or edit name and date of birth
 * - 18.2: Validate input before saving
 * - 18.3: Persist updated information to database
 * - 18.5: Display current values when editing existing information
 *
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const EditProfileScreen = ({ navigation }) => {
  const {
    user,
    profile,
    updateProfile,
    loading,
    error: contextError,
  } = useAuth();

  // State
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [email, setEmail] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Pre-fill form with current user profile data
   * Requirement 18.5: Display current values when editing
   */
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setDateOfBirth(
        profile.dateOfBirth
          ? new Date(profile.dateOfBirth.seconds * 1000)
          : null,
      );
      setEmail(profile.email || '');
    }
  }, [profile]);

  /**
   * Track if user has made changes
   */
  useEffect(() => {
    if (!profile) return;

    const originalDob = profile.dateOfBirth
      ? new Date(profile.dateOfBirth.seconds * 1000)
      : null;
    const dobChanged = dateOfBirth?.getTime() !== originalDob?.getTime();
    const nameChanged = name !== (profile.name || '');
    const emailChanged = email !== (profile.email || '');

    setHasChanges(dobChanged || nameChanged || emailChanged);
  }, [name, dateOfBirth, email, profile]);

  /**
   * Validate all form fields
   * Requirement 18.2: Validate input before saving
   *
   * @returns {boolean} True if all fields are valid, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate name (required)
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }

    // Validate date of birth (required)
    const dobValidation = validateDateOfBirth(dateOfBirth);
    if (!dobValidation.isValid) {
      newErrors.dateOfBirth = dobValidation.error;
    }

    // Validate email (optional)
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle name input change
   */
  const handleNameChange = text => {
    setName(text);
    // Clear name error when user types
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  /**
   * Handle email input change
   */
  const handleEmailChange = text => {
    setEmail(text);
    // Clear email error when user types
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  /**
   * Handle date picker change
   */
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(selectedDate);
      // Clear date of birth error when user selects a date
      if (errors.dateOfBirth) {
        setErrors(prev => ({ ...prev, dateOfBirth: undefined }));
      }
    }
  };

  /**
   * Format date for display
   */
  const formatDate = date => {
    if (!date) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  /**
   * Handle Save button press
   * Requirement 18.2: Validate input before saving
   * Requirement 18.3: Save updated profile to Firestore
   */
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      setErrors({
        general: 'User not authenticated. Please try logging in again.',
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Update profile with name, date of birth, and email
      await updateProfile(user.uid, {
        name: name.trim(),
        dateOfBirth: dateOfBirth,
        email: email.trim() || null,
      });

      // Show success message
      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (err) {
      setErrors({
        general:
          err.message || 'Failed to update your profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Cancel button press
   */
  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  };

  // Check if form is valid for save button
  const isFormValid = name.trim() !== '' && dateOfBirth !== null;

  const isLoading = loading || isSubmitting;
  const displayError = errors.general || contextError;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LoadingOverlay visible={isLoading} message="Updating your profile..." />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>
              Update your personal information
            </Text>
          </View>

          {/* Name Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              Name <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={[
                styles.input,
                isLoading && styles.inputDisabled,
                errors.name && styles.inputError,
              ]}
              value={name}
              onChangeText={handleNameChange}
              placeholder="Enter your full name"
              placeholderTextColor="#999999"
              maxLength={50}
              editable={!isLoading}
              accessibilityLabel="Name input"
              accessibilityHint="Enter your full name"
              accessibilityRole="none"
              returnKeyType="next"
              autoCapitalize="words"
              autoCorrect={false}
              importantForAccessibility="yes"
            />

            {errors.name && (
              <View
                style={styles.errorContainer}
                accessibilityRole="alert"
                accessibilityLive="polite"
              >
                <Text style={styles.errorText}>{errors.name}</Text>
              </View>
            )}
          </View>

          {/* Date of Birth Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              Date of Birth <Text style={styles.required}>*</Text>
            </Text>

            <TouchableOpacity
              style={[
                styles.input,
                styles.dateInput,
                isLoading && styles.inputDisabled,
                errors.dateOfBirth && styles.inputError,
              ]}
              onPress={() => !isLoading && setShowDatePicker(true)}
              disabled={isLoading}
              accessibilityLabel="Date of birth input"
              accessibilityHint="Select your date of birth"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.dateText,
                  !dateOfBirth && styles.placeholderText,
                ]}
              >
                {dateOfBirth
                  ? formatDate(dateOfBirth)
                  : 'Select your date of birth'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            {errors.dateOfBirth && (
              <View
                style={styles.errorContainer}
                accessibilityRole="alert"
                accessibilityLive="polite"
              >
                <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
              </View>
            )}
          </View>

          {/* Email Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Email (Optional)</Text>

            <TextInput
              style={[
                styles.input,
                isLoading && styles.inputDisabled,
                errors.email && styles.inputError,
              ]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Enter your email address"
              placeholderTextColor="#999999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              accessibilityLabel="Email input"
              accessibilityHint="Enter your email address (optional)"
              accessibilityRole="none"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              importantForAccessibility="yes"
            />

            {errors.email && (
              <View
                style={styles.errorContainer}
                accessibilityRole="alert"
                accessibilityLive="polite"
              >
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            )}
          </View>

          {/* General Error Message */}
          {displayError && (
            <View
              style={styles.errorContainer}
              accessibilityRole="alert"
              accessibilityLive="polite"
            >
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isFormValid || isLoading || !hasChanges) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isFormValid || isLoading || !hasChanges}
              accessibilityLabel="Save changes"
              accessibilityRole="button"
              accessibilityHint="Save your profile changes"
              accessibilityState={{
                disabled: !isFormValid || isLoading || !hasChanges,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isLoading}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              accessibilityHint="Cancel editing and go back"
              accessibilityState={{ disabled: isLoading }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  required: {
    color: '#E53E3E',
  },
  input: {
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
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: '#F0F0F0',
  },
  inputError: {
    borderColor: '#E53E3E',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333333',
  },
  placeholderText: {
    color: '#999999',
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
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    minHeight: 52, // Ensures 44pt+ touch target
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default EditProfileScreen;
