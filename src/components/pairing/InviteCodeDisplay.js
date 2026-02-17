/**
 * InviteCodeDisplay Component
 *
 * Displays an invite code with expiration countdown, copy, and share functionality.
 * Handles expired code state with regeneration option.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Clipboard,
  Share,
  Alert,
} from 'react-native';

/**
 * Calculate time remaining until expiration
 *
 * @param {Date} expiresAt - Expiration timestamp
 * @returns {Object} Time remaining object with hours, minutes, seconds, and isExpired flag
 */
const calculateTimeRemaining = expiresAt => {
  const now = new Date();
  const expiration = new Date(expiresAt);
  const diff = expiration - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: false };
};

/**
 * Format time remaining as string
 *
 * @param {Object} timeRemaining - Time remaining object
 * @returns {string} Formatted time string
 */
const formatTimeRemaining = ({ hours, minutes, seconds }) => {
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);

  return parts.join(' ');
};

/**
 * InviteCodeDisplay Component
 *
 * Displays an invite code with expiration countdown, copy to clipboard,
 * and share functionality. Shows regenerate button when code expires.
 *
 * Requirements: 2.1 - Display code in readable format
 * Requirements: 2.2 - Provide native sharing options
 * Requirements: 2.3 - Show remaining time until expiration
 * Requirements: 2.4 - Display expiration message and offer to generate new code
 *
 * @param {Object} props
 * @param {string} props.code - The invite code to display
 * @param {Date} props.expiresAt - Expiration timestamp
 * @param {Function} props.onRegenerate - Callback when regenerate button is pressed
 * @param {boolean} [props.loading] - Whether regeneration is in progress
 * @returns {JSX.Element}
 *
 * @example
 * <InviteCodeDisplay
 *   code="ABC12345"
 *   expiresAt={new Date(Date.now() + 24 * 60 * 60 * 1000)}
 *   onRegenerate={handleRegenerate}
 *   loading={false}
 * />
 */
const InviteCodeDisplay = ({ code, expiresAt, onRegenerate, loading }) => {
  const [timeRemaining, setTimeRemaining] = useState(
    calculateTimeRemaining(expiresAt),
  );

  /**
   * Update countdown timer every second
   * Requirements: 2.3 - Show remaining time until expiration
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  /**
   * Copy code to clipboard
   * Requirements: 2.1 - Copy to clipboard functionality
   */
  const handleCopyToClipboard = () => {
    Clipboard.setString(code);
    Alert.alert('Copied!', 'Invite code copied to clipboard', [{ text: 'OK' }]);
  };

  /**
   * Share code using native share sheet
   * Requirements: 2.2 - Provide native sharing options
   */
  const handleShare = async () => {
    try {
      const message = `Join me on PillSathi! Use this invite code: ${code}\n\nThis code expires in ${formatTimeRemaining(
        timeRemaining,
      )}.`;

      await Share.share({
        message,
        title: 'PillSathi Invite Code',
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
      Alert.alert('Error', 'Failed to share invite code. Please try again.', [
        { text: 'OK' },
      ]);
    }
  };

  /**
   * Handle expired code state
   * Requirements: 2.4 - Display expiration message and offer to generate new code
   */
  if (timeRemaining.isExpired) {
    return (
      <View
        style={styles.container}
        accessibilityRole="alert"
        accessibilityLabel="Invite code expired"
      >
        <View style={styles.expiredContainer}>
          <Text
            style={styles.expiredTitle}
            accessibilityRole="text"
            accessibilityLabel="Code expired"
          >
            Code Expired
          </Text>
          <Text
            style={styles.expiredMessage}
            accessibilityRole="text"
            accessibilityLabel="This invite code has expired. Generate a new code to share with caregivers."
          >
            This invite code has expired. Generate a new code to share with
            caregivers.
          </Text>
          <TouchableOpacity
            style={[styles.regenerateButton, loading && styles.buttonDisabled]}
            onPress={onRegenerate}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Generate new code"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={styles.regenerateButtonText}>
              {loading ? 'Generating...' : 'Generate New Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Display active code with countdown and actions
   * Requirements: 2.1 - Display code in readable format
   * Requirements: 2.3 - Show remaining time until expiration
   */
  return (
    <View style={styles.container} accessibilityLabel="Invite code display">
      <Text
        style={styles.label}
        accessibilityRole="text"
        accessibilityLabel="Your invite code"
      >
        Your Invite Code
      </Text>

      <View
        style={styles.codeContainer}
        accessibilityRole="text"
        accessibilityLabel={`Invite code ${code}`}
      >
        <Text style={styles.code}>{code}</Text>
      </View>

      <View style={styles.expirationContainer}>
        <Text
          style={styles.expirationLabel}
          accessibilityRole="text"
          accessibilityLabel="Expires in"
        >
          Expires in:
        </Text>
        <Text
          style={styles.expirationTime}
          accessibilityRole="timer"
          accessibilityLabel={`${formatTimeRemaining(timeRemaining)} remaining`}
          accessibilityLiveRegion="polite"
        >
          {formatTimeRemaining(timeRemaining)}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopyToClipboard}
          accessibilityRole="button"
          accessibilityLabel="Copy code to clipboard"
          accessibilityHint="Copies the invite code to your clipboard"
        >
          <Text style={styles.actionButtonText}>Copy Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share code"
          accessibilityHint="Opens share menu to send the invite code"
        >
          <Text style={styles.actionButtonText}>Share Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  codeContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  expirationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  expirationLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  expirationTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  expiredContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  expiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  expiredMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  regenerateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  regenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InviteCodeDisplay;
