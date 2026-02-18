/**
 * DoseCard Component
 *
 * Displays a dose card for parent view with medicine name, scheduled time, and dosage.
 * Highlights overdue doses.
 * Handles tap to navigate to medicine details.
 *
 * Requirements: 11.2
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';

/**
 * Format time for display
 * @param {Date} date - Date object
 * @returns {string} Formatted time string (e.g., "2:30 PM")
 */
function formatTime(date) {
  if (!date || !(date instanceof Date)) {
    return 'N/A';
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * DoseCard Component
 *
 * Displays dose information in a card format with:
 * - Medicine name - Requirement 11.2
 * - Scheduled time - Requirement 11.2
 * - Dosage - Requirement 11.2
 * - Overdue highlighting - Requirement 11.4
 * - Tap handler for navigation
 *
 * @param {Object} props
 * @param {Object} props.dose - Dose data object
 * @param {string} props.dose.id - Dose ID
 * @param {string} props.dose.medicineId - Medicine ID
 * @param {string} props.dose.medicineName - Medicine name
 * @param {string} props.dose.dosage - Dosage information
 * @param {Date} props.dose.scheduledTime - Scheduled time
 * @param {boolean} props.dose.isOverdue - Whether dose is overdue
 * @param {Function} props.onPress - Handler called when card is tapped
 * @returns {React.ReactElement}
 *
 * @example
 * <DoseCard
 *   dose={{
 *     id: 'dose123',
 *     medicineId: 'med456',
 *     medicineName: 'Aspirin',
 *     dosage: '100mg',
 *     scheduledTime: new Date('2024-03-15T14:30:00'),
 *     isOverdue: false
 *   }}
 *   onPress={() => navigation.navigate('MedicineDetails', { medicineId: 'med456' })}
 * />
 */
function DoseCard({ dose, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, dose.isOverdue && styles.cardOverdue]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${dose.medicineName} at ${formatTime(
        dose.scheduledTime,
      )}`}
      accessibilityHint="Double tap to view medicine details"
    >
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, dose.isOverdue && styles.timeOverdue]}>
              {formatTime(dose.scheduledTime)}
            </Text>
            {dose.isOverdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>OVERDUE</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.middleSection}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {dose.medicineName}
          </Text>
          <Text style={styles.dosage} numberOfLines={1}>
            {dose.dosage}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

DoseCard.propTypes = {
  dose: PropTypes.shape({
    id: PropTypes.string.isRequired,
    medicineId: PropTypes.string.isRequired,
    medicineName: PropTypes.string.isRequired,
    dosage: PropTypes.string.isRequired,
    scheduledTime: PropTypes.instanceOf(Date).isRequired,
    isOverdue: PropTypes.bool,
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
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    marginRight: 16,
    minWidth: 80,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  timeOverdue: {
    color: '#FF3B30',
  },
  overdueBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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

export default DoseCard;
