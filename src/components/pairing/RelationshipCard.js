/**
 * RelationshipCard Component
 *
 * Displays a relationship between a parent and caregiver with user information
 * and removal functionality.
 *
 * Requirements: 4.2, 5.2, 6.1, 9.3
 *
 * @format
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

/**
 * Format date for display
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = date => {
  if (!date) {
    return 'Unknown';
  }

  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
};

/**
 * RelationshipCard Component
 *
 * Displays relationship information including user name, phone number,
 * and creation date. Provides a remove button with confirmation dialog.
 *
 * Requirements: 4.2 - Display user name and profile information
 * Requirements: 5.2 - Display caregiver name and profile information
 * Requirements: 6.1 - Display confirmation dialog for removal
 *
 * @param {Object} props
 * @param {string} props.relationshipId - Unique relationship ID
 * @param {string} props.userName - Name of the other user in the relationship
 * @param {string} props.userPhone - Phone number of the other user
 * @param {Date} props.createdAt - Relationship creation date
 * @param {Function} props.onRemove - Callback when remove is confirmed
 * @param {boolean} [props.loading] - Whether removal is in progress
 * @param {string} [props.userRole] - Role label for the user (e.g., 'Caregiver', 'Parent')
 * @returns {JSX.Element}
 *
 * @example
 * <RelationshipCard
 *   relationshipId="rel123"
 *   userName="John Doe"
 *   userPhone="+1234567890"
 *   createdAt={new Date()}
 *   onRemove={handleRemove}
 *   loading={false}
 *   userRole="Caregiver"
 * />
 */
const RelationshipCard = ({
  relationshipId,
  userName,
  userPhone,
  createdAt,
  onRemove,
  loading = false,
  userRole = 'User',
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  /**
   * Handle remove button press
   * Shows confirmation dialog before calling onRemove
   * Shows success confirmation after successful removal
   * Requirements: 6.1 - Display confirmation dialog
   * Requirements: 9.3 - Show success confirmation
   */
  const handleRemovePress = () => {
    Alert.alert(
      'Remove Relationship',
      `Are you sure you want to remove ${userName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsRemoving(true);
            try {
              await onRemove(relationshipId);
              // Show success confirmation
              Alert.alert(
                'Success',
                `${userName} has been removed from your connections.`,
                [{ text: 'OK' }],
              );
            } catch (error) {
              // Error handling is done by parent component
              console.error('Error removing relationship:', error);
              // Show error alert
              Alert.alert(
                'Error',
                error.message ||
                  'Failed to remove relationship. Please try again.',
                [{ text: 'OK' }],
              );
            } finally {
              setIsRemoving(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const isLoading = loading || isRemoving;

  return (
    <View
      style={styles.container}
      accessibilityRole="region"
      accessibilityLabel={`Relationship with ${userName}`}
    >
      <View style={styles.contentContainer}>
        <View style={styles.infoContainer}>
          {/* User Name */}
          <Text
            style={styles.userName}
            accessibilityRole="text"
            accessibilityLabel={`Name: ${userName}`}
          >
            {userName}
          </Text>

          {/* User Phone */}
          {userPhone && (
            <Text
              style={styles.userPhone}
              accessibilityRole="text"
              accessibilityLabel={`Phone: ${userPhone}`}
            >
              {userPhone}
            </Text>
          )}

          {/* User Role (optional) */}
          {userRole && (
            <Text
              style={styles.userRole}
              accessibilityRole="text"
              accessibilityLabel={`Role: ${userRole}`}
            >
              {userRole}
            </Text>
          )}

          {/* Creation Date */}
          <Text
            style={styles.createdDate}
            accessibilityRole="text"
            accessibilityLabel={`Connected since ${formatDate(createdAt)}`}
          >
            Connected: {formatDate(createdAt)}
          </Text>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={[
            styles.removeButton,
            isLoading && styles.removeButtonDisabled,
          ]}
          onPress={handleRemovePress}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Remove relationship"
          accessibilityHint={`Remove ${userName} from your connections`}
          accessibilityState={{ disabled: isLoading }}
        >
          <Text style={styles.removeButtonText}>
            {isLoading ? 'Removing...' : 'Remove'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  createdDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RelationshipCard;
