/**
 * OTPVerificationScreen - OTP Verification Screen
 *
 * Allows users to enter the 6-digit OTP code sent to their phone number.
 * Includes auto-focus, auto-advance, resend functionality with countdown timer,
 * and error handling.
 *
 * Requirements: 1.5, 1.6, 1.7, 1.8, 7.2, 8.1, 8.4
 */

import React, { useState, useRef, useEffect } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { AuthScreens } from '../../types/navigation';
import LoadingOverlay from '../../components/LoadingOverlay';

// OTP timeout duration in seconds
const OTP_TIMEOUT_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds

/**
 * OTPVerificationScreen Component
 *
 * Requirements:
 * - 1.5: Authenticate user with correct OTP
 * - 1.6: Display error for incorrect OTP and allow retry
 * - 1.7: Provide OTP resend functionality
 * - 1.8: Handle OTP timeout scenarios
 * - 7.2: Display loading indicator during verification
 * - 8.1: Provide accessible labels for input fields
 * - 8.4: Ensure touch targets are at least 44x44 points
 *
 * @param {Object} props
 * @param {AuthNavigationProp} props.navigation - Navigation prop
 * @param {RouteProp<AuthParamList, 'PhoneVerification'>} props.route - Route prop with params
 * @returns {JSX.Element}
 */
const OTPVerificationScreen = ({ navigation, route }) => {
  const { phoneNumber, verificationId: initialVerificationId } = route.params;
  const { verifyOTP, resendOTP, loading, error: contextError } = useAuth();

  // State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationId, setVerificationId] = useState(initialVerificationId);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTimeout, setOtpTimeout] = useState(OTP_TIMEOUT_SECONDS);
  const [isResending, setIsResending] = useState(false);

  // Refs for OTP inputs
  const inputRefs = useRef([]);

  /**
   * Initialize input refs
   */
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  /**
   * Auto-focus first input on mount
   * Requirements: 1.5 - Auto-focus for better UX
   */
  useEffect(() => {
    if (inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, []);

  /**
   * Resend cooldown timer
   * Requirements: 1.7 - Countdown timer for resend button
   */
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  /**
   * OTP timeout timer
   * Requirements: 1.8 - Handle OTP timeout
   */
  useEffect(() => {
    if (otpTimeout > 0) {
      const timer = setTimeout(() => {
        setOtpTimeout(otpTimeout - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (otpTimeout === 0) {
      setValidationError(
        'Verification code has expired. Please request a new code.',
      );
    }
  }, [otpTimeout]);

  /**
   * Handle OTP digit input
   * Requirements: 1.5 - Auto-advance between digits
   *
   * @param {string} value - Input value
   * @param {number} index - Input index (0-5)
   */
  const handleOtpChange = (value, index) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length > 1) {
      // Handle paste of multiple digits
      const digits = numericValue.slice(0, 6).split('');
      const newOtp = [...otp];

      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });

      setOtp(newOtp);
      setValidationError('');

      // Focus the next empty input or the last input
      const nextEmptyIndex = newOtp.findIndex(
        (digit, i) => i > index && !digit,
      );
      const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5;
      inputRefs.current[focusIndex]?.focus();

      return;
    }

    // Single digit input
    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);
    setValidationError('');

    // Auto-advance to next input
    if (numericValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handle backspace key
   * Auto-focus previous input when current is empty
   *
   * @param {Object} e - Key press event
   * @param {number} index - Input index
   */
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Validate OTP completeness
   *
   * @returns {boolean} True if OTP is complete and valid
   */
  const validateOtp = () => {
    setValidationError('');

    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setValidationError('Please enter the complete 6-digit code');
      return false;
    }

    if (!/^\d{6}$/.test(otpString)) {
      setValidationError('Please enter a valid 6-digit code');
      return false;
    }

    if (otpTimeout === 0) {
      setValidationError(
        'Verification code has expired. Please request a new code.',
      );
      return false;
    }

    return true;
  };

  /**
   * Handle Verify button press
   * Requirements: 1.5 - Authenticate with correct OTP
   * Requirements: 1.6 - Handle incorrect OTP
   * Requirements: 7.2 - Show loading indicator
   */
  const handleVerifyOTP = async () => {
    if (!validateOtp()) {
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      const otpString = otp.join('');
      const result = await verifyOTP(verificationId, otpString);

      // Check if user has a profile (role selected)
      if (result.profile && result.profile.role) {
        // User has completed setup, navigate to main app
        // Navigation will be handled by root navigator based on auth state
      } else {
        // New user, navigate to role selection
        navigation.navigate(AuthScreens.ROLE_SELECTION);
      }
    } catch (err) {
      // Requirements: 1.6 - Display error for incorrect OTP
      setValidationError(
        err.message || 'Invalid verification code. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Resend OTP button press
   * Requirements: 1.7 - Resend OTP functionality
   */
  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setIsResending(true);
    setValidationError('');

    try {
      const newVerificationId = await resendOTP(phoneNumber);
      setVerificationId(newVerificationId);

      // Reset OTP inputs
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      // Reset timers
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpTimeout(OTP_TIMEOUT_SECONDS);

      Alert.alert(
        'Success',
        'A new verification code has been sent to your phone.',
      );
    } catch (err) {
      setValidationError(
        err.message || 'Failed to resend code. Please try again.',
      );
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Format time in MM:SS format
   *
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle back navigation
   */
  const handleGoBack = () => {
    navigation.goBack();
  };

  const isLoading = loading || isSubmitting || isResending;
  const displayError = validationError || contextError;
  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LoadingOverlay visible={isSubmitting} message="Verifying code..." />
      <LoadingOverlay visible={isResending} message="Sending new code..." />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Verify Your Phone</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phoneNumber}>{phoneNumber}</Text>
            </Text>
          </View>

          {/* OTP Input Section */}
          <View style={styles.otpSection}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={`otp-input-${index}`}
                  ref={ref => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    displayError && styles.otpInputError,
                    (isLoading || otpTimeout === 0) && styles.otpInputDisabled,
                  ]}
                  value={digit}
                  onChangeText={value => handleOtpChange(value, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isLoading && otpTimeout > 0}
                  accessibilityLabel={`OTP digit ${index + 1}`}
                  accessibilityHint={`Enter digit ${index + 1} of 6`}
                  accessibilityRole="none"
                  returnKeyType={index === 5 ? 'done' : 'next'}
                  onSubmitEditing={
                    index === 5 && isOtpComplete ? handleVerifyOTP : undefined
                  }
                />
              ))}
            </View>

            {/* Timeout Warning */}
            {otpTimeout > 0 && otpTimeout <= 60 && (
              <Text style={styles.timeoutWarning}>
                Code expires in {formatTime(otpTimeout)}
              </Text>
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

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (isLoading || !isOtpComplete || otpTimeout === 0) &&
                styles.verifyButtonDisabled,
            ]}
            onPress={handleVerifyOTP}
            disabled={isLoading || !isOtpComplete || otpTimeout === 0}
            accessibilityLabel="Verify OTP"
            accessibilityRole="button"
            accessibilityHint="Verifies the one-time password"
            accessibilityState={{
              disabled: isLoading || !isOtpComplete || otpTimeout === 0,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              style={[
                styles.resendButton,
                (resendCooldown > 0 || isResending) &&
                  styles.resendButtonDisabled,
              ]}
              onPress={handleResendOTP}
              disabled={resendCooldown > 0 || isResending}
              accessibilityLabel="Resend OTP"
              accessibilityRole="button"
              accessibilityHint="Sends a new verification code to your phone"
              accessibilityState={{
                disabled: resendCooldown > 0 || isResending,
              }}
            >
              {isResending ? (
                <ActivityIndicator color="#007AFF" size="small" />
              ) : (
                <Text
                  style={[
                    styles.resendButtonText,
                    resendCooldown > 0 && styles.resendButtonTextDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            disabled={isLoading}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Returns to phone number entry screen"
          >
            <Text style={styles.backButtonText}>Change Phone Number</Text>
          </TouchableOpacity>
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
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#333333',
  },
  otpSection: {
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    minHeight: 56, // Ensures 44pt+ touch target
  },
  otpInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  otpInputError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
  },
  otpInputDisabled: {
    opacity: 0.5,
    backgroundColor: '#F0F0F0',
  },
  timeoutWarning: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorContainer: {
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
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 52, // Ensures 44pt+ touch target
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transition: 'all 0.3s ease',
  },
  verifyButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44, // Ensures 44pt+ touch target
    justifyContent: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  resendButtonTextDisabled: {
    color: '#999999',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44, // Ensures 44pt+ touch target
  },
  backButtonText: {
    fontSize: 14,
    color: '#666666',
    textDecoration: 'underline',
  },
});

export default OTPVerificationScreen;
