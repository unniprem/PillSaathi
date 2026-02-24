/**
 * MedicineCard Component
 *
 * Displays a medicine card with name, dosage, and frequency.
 * Handles tap to navigate to medicine details.
 *
 * Requirements: 10.2
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';

/**
 * Format frequency for display
 * @param {Object} frequency - Frequency object
 * @returns {string} Formatted frequency string
 */
function formatFrequency(frequency) {
  if (!frequency) {
    return 'As needed';
  }

  const { type, value, times } = frequency;

  if (type === 'daily') {
    return times && times.length > 0
      ? `${times.length} time${times.length > 1 ? 's' : ''} daily`
      : 'Daily';
  }

  if (type === 'interval') {
    return `Every ${value} hours`;
  }

  if (type === 'weekly') {
    return 'Weekly';
  }

  if (type === 'asNeeded') {
    return 'As needed';
  }

  return 'As needed';
}

/**
 * MedicineCard Component
 *
 * Displays medicine information in a card format with:
 * - Medicine name - Requirement 10.2
 * - Dosage - Requirement 10.2
 * - Frequency - Requirement 10.2
 * - Tap handler for navigation
 *
 * @param {Object} props
 * @param {Object} props.medicine - Medicine data object
 * @param {string} props.medicine.id - Medicine ID
 * @param {string} props.medicine.name - Medicine name
 * @param {string} props.medicine.dosage - Dosage information
 * @param {Object} props.medicine.frequency - Frequency object
 * @param {Function} props.onPress - Handler called when card is tapped
 * @returns {React.ReactElement}
 *
 * @example
 * <MedicineCard
 *   medicine={{
 *     id: 'med123',
 *     name: 'Aspirin',
 *     dosage: '100mg',
 *     frequency: { type: 'daily', times: ['08:00', '20:00'] }
 *   }}
 *   onPress={() => navigation.navigate('MedicineDetails', { medicineId: 'med123' })}
 * />
 */
function MedicineCard({ medicine, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${medicine.name}, ${medicine.dosage}`}
      accessibilityHint="Double tap to view medicine details"
    >
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💊</Text>
          </View>
        </View>

        <View style={styles.middleSection}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {medicine.name}
          </Text>
          <Text style={styles.dosage} numberOfLines={1}>
            {medicine.dosage}
          </Text>
          <Text style={styles.frequency} numberOfLines={1}>
            {formatFrequency(medicine.frequency)}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

MedicineCard.propTypes = {
  medicine: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    dosage: PropTypes.string.isRequired,
    frequency: PropTypes.object,
  }).isRequired,
  onPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  middleSection: {
    flex: 1,
    marginRight: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  dosage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  frequency: {
    fontSize: 13,
    color: '#999999',
  },
  rightSection: {
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 28,
    color: '#CCCCCC',
    fontWeight: '300',
  },
});

export default MedicineCard;
