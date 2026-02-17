/**
 * PhoneAuthScreen - Phone Number Authentication Screen
 *
 * Allows users to enter their phone number and request an OTP for authentication.
 * Includes phone number validation, formatting, country code selection, and error handling.
 *
 * Requirements: 1.1, 1.2, 1.3, 7.1, 8.1, 8.4
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
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { useAuth } from '../../contexts/AuthContext';
import { AuthScreens } from '../../types/navigation';

/**
 * PhoneAuthScreen Component
 *
 * Requirements:
 * - 1.1: Send OTP to valid phone number
 * - 1.2: Display validation error for invalid phone format
 * - 1.3: Navigate to OTP screen on success
 * - 7.1: Display loading indicator during OTP sending
 * - 8.1: Provide accessible labels for input fields
 * - 8.4: Ensure touch targets are at least 44x44 points
 *
 * @param {Object} props
 * @param {AuthNavigationProp} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const PhoneAuthScreen = ({ navigation }) => {
  const { sendOTP, loading, error: contextError } = useAuth();

  // State
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Format phone number as user types
   * Requirements: 1.2 - Format phone number for better UX
   */
  useEffect(() => {
    if (phoneNumber) {
      try {
        const fullNumber = countryCode + phoneNumber;
        if (fullNumber.length > countryCode.length) {
          const parsed = parsePhoneNumber(fullNumber);
          if (parsed) {
            setFormattedPhone(parsed.formatNational());
          } else {
            setFormattedPhone(phoneNumber);
          }
        } else {
          setFormattedPhone('');
        }
      } catch (err) {
        setFormattedPhone(phoneNumber);
      }
    } else {
      setFormattedPhone('');
    }
  }, [phoneNumber, countryCode]);

  /**
   * Validate phone number format
   * Requirements: 1.2 - Validate phone format before sending OTP
   *
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid, false otherwise
   */
  const validatePhone = phone => {
    setValidationError('');

    if (!phone || phone.trim() === '') {
      setValidationError('Phone number is required');
      return false;
    }

    const fullNumber = countryCode + phone;

    try {
      if (!isValidPhoneNumber(fullNumber)) {
        setValidationError('Please enter a valid phone number');
        return false;
      }
      return true;
    } catch (err) {
      setValidationError('Please enter a valid phone number');
      return false;
    }
  };

  /**
   * Handle phone number input change
   * Filters non-numeric characters and updates state
   */
  const handlePhoneChange = text => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);
    setValidationError('');
  };

  /**
   * Handle Send OTP button press
   * Requirements: 1.1 - Send OTP via Firebase Auth
   * Requirements: 1.3 - Navigate to OTP screen on success
   * Requirements: 7.1 - Show loading indicator
   */
  const handleSendOTP = async () => {
    if (!validatePhone(phoneNumber)) {
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      const fullNumber = countryCode + phoneNumber;
      const verificationId = await sendOTP(fullNumber);

      // Navigate to OTP verification screen
      navigation.navigate(AuthScreens.PHONE_VERIFICATION, {
        phoneNumber: fullNumber,
        verificationId,
      });
    } catch (err) {
      // Error is already set in context, but we can show an alert too
      setValidationError(
        err.message || 'Failed to send OTP. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle country code change
   * For MVP, we support common country codes
   */
  const handleCountryCodePress = () => {
    Alert.alert(
      'Select Country Code',
      'Choose your country code',
      [
        { text: 'United States (+1)', onPress: () => setCountryCode('+1') },
        { text: 'India (+91)', onPress: () => setCountryCode('+91') },
        { text: 'United Kingdom (+44)', onPress: () => setCountryCode('+44') },
        { text: 'Canada (+1)', onPress: () => setCountryCode('+1') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const isLoading = loading || isSubmitting;
  const displayError = validationError || contextError;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to PillSathi</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to get started
            </Text>
          </View>

          {/* Phone Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Phone Number</Text>

            <View style={styles.phoneInputContainer}>
              {/* Country Code Picker */}
              <TouchableOpacity
                style={styles.countryCodeButton}
                onPress={handleCountryCodePress}
                disabled={isLoading}
                accessibilityLabel="Select country code"
                accessibilityRole="button"
                accessibilityHint="Opens country code selector"
              >
                <Text style={styles.countryCodeText}>{countryCode}</Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>

              {/* Phone Number Input */}
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                placeholder="1234567890"
                placeholderTextColor="#999999"
                keyboardType="phone-pad"
                maxLength={15}
                editable={!isLoading}
                accessibilityLabel="Phone number input"
                accessibilityHint="Enter your phone number without country code"
                accessibilityRole="none"
                returnKeyType="done"
                onSubmitEditing={handleSendOTP}
              />
            </View>

            {/* Formatted Phone Display */}
            {formattedPhone && (
              <Text style={styles.formattedPhone}>{formattedPhone}</Text>
            )}

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

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendOTP}
            disabled={isLoading}
            accessibilityLabel="Send OTP"
            accessibilityRole="button"
            accessibilityHint="Sends one-time password to your phone"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            We'll send you a 6-digit verification code via SMS
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#DDDDDD',
    minHeight: 52, // Ensures 44pt+ touch target
  },
  countryCodeText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
    marginRight: 4,
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#666666',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333333',
    minHeight: 52, // Ensures 44pt+ touch target
  },
  formattedPhone: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
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
  sendButton: {
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
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
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

export default PhoneAuthScreen;
