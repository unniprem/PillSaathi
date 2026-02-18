/**
 * ProfileSetupScreen - Profile Setup Screen
 *
 * Allows users to enter their name, date of birth, and email to complete their profile after role selection.
 * Includes validation, error handling, and navigation to main app.
 *
 * Requirements: 19.2, 19.3, 19.4, 19.6
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import {
  validateName,
  validateDateOfBirth,
  validateEmail,
} from '../../models/User';

/**
 * ProfileSetupScreen Component
 *
 * Requirements:
 * - 19.2: Display profile completion screen for new users
 * - 19.3: Validate name (required, non-empty) and date of birth (required, valid date, age >= 13)
 * - 19.4: Allow email as optional field with valid format validation
 * - 19.6: Save profile data and navigate to dashboard
 *
 * @param {Object} props
 * @param {AuthNavigationProp} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const ProfileSetupScreen = ({ navigation: _navigation }) => {
  const { user, updateProfile, loading, error: contextError } = useAuth();

  // State
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [email, setEmail] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate all form fields
   * Requirements: 19.3, 19.4 - Validate required and optional fields
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
    if (!date) {return '';}
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  /**
   * Handle Continue button press
   * Requirements: 19.3 - Validate required fields before submission
   * Requirements: 19.6 - Save profile data to Firestore
   */
  const handleContinue = async () => {
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
      // Update profile with name, date of birth, email, and profileCompleted flag
      await updateProfile(user.uid, {
        name: name.trim(),
        dateOfBirth,
        email: email.trim() || null,
        profileCompleted: true,
      });

      // Profile updated successfully
      // Navigation will be handled by root navigator based on auth state
      // The user now has a complete profile and will be routed to the main app
    } catch (err) {
      setErrors({
        general:
          err.message || 'Failed to save your profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid for submit button
  const isFormValid = name.trim() !== '' && dateOfBirth !== null;

  const isLoading = loading || isSubmitting;
  const displayError = errors.general || contextError;

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
              Please provide your information to continue
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
              onSubmitEditing={handleContinue}
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

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!isFormValid || isLoading) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isFormValid || isLoading}
            accessibilityLabel="Continue"
            accessibilityRole="button"
            accessibilityHint="Save your profile and continue to the app"
            accessibilityState={{ disabled: !isFormValid || isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            You can update your profile later in settings
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
  continueButton: {
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

export default ProfileSetupScreen;
