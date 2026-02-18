/**
 * CaregiverCard Component
 *
 * Displays a caregiver card with name and pairing status.
 * Used in the paired caregivers list on the GenerateCodeScreen.
 *
 * Requirements: 9.2
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

/**
 * CaregiverCard Component
 *
 * Displays caregiver information in a card format with:
 * - Caregiver name - Requirement 9.2
 * - Pairing status - Requirement 9.2
 *
 * @param {Object} props
 * @param {Object} props.caregiver - Caregiver data object
 * @param {string} props.caregiver.id - Caregiver's Firebase Auth UID
 * @param {string} props.caregiver.name - Caregiver's name
 * @param {string} props.caregiver.status - Pairing status ('active')
 * @param {Date} [props.caregiver.createdAt] - When the relationship was created
 * @returns {React.ReactElement}
 *
 * @example
 * <CaregiverCard
 *   caregiver={{
 *     id: 'caregiver123',
 *     name: 'John Doe',
 *     status: 'active',
 *     createdAt: new Date()
 *   }}
 * />
 */
function CaregiverCard({ caregiver }) {
  const formatDate = date => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString();
  };

  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`Caregiver ${caregiver.name}, status ${caregiver.status}`}
    >
      <View style={styles.cardContent}>
        <View style={styles.headerSection}>
          <Text style={styles.caregiverName}>{caregiver.name}</Text>
          {caregiver.createdAt && (
            <Text style={styles.dateText}>
              Connected: {formatDate(caregiver.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              caregiver.status === 'active' && styles.statusBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                caregiver.status === 'active' && styles.statusTextActive,
              ]}
            >
              {caregiver.status === 'active' ? 'Active' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

CaregiverCard.propTypes = {
  caregiver: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    createdAt: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.string,
    ]),
  }).isRequired,
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSection: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#999999',
  },
  statusSection: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
});

export default CaregiverCard;
