/**
 * UpcomingDoseCard Component
 *
 * Displays an upcoming dose card with medicine name, scheduled time, dosage, and parent name.
 * Handles tap to navigate to medicine details.
 * Highlights overdue doses.
 *
 * Requirements: 15.3
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
 * Check if a dose is overdue
 * @param {Date} scheduledTime - Scheduled time of the dose
 * @returns {boolean} True if dose is overdue
 */
function isOverdue(scheduledTime) {
  if (!scheduledTime || !(scheduledTime instanceof Date)) {
    return false;
  }

  return scheduledTime < new Date();
}

/**
 * UpcomingDoseCard Component
 *
 * Displays upcoming dose information in a card format with:
 * - Medicine name - Requirement 15.3
 * - Scheduled time - Requirement 15.3
 * - Dosage - Requirement 15.3
 * - Parent name (uses alias if available) - Requirement 15.3
 * - Overdue highlighting - Requirement 15.3
 * - Tap handler for navigation - Requirement 15.3
 *
 * @param {Object} props
 * @param {Object} props.dose - Dose data object
 * @param {string} props.dose.id - Dose ID
 * @param {string} props.dose.medicineId - Medicine ID
 * @param {string} props.dose.medicineName - Medicine name
 * @param {string} props.dose.dosage - Dosage information
 * @param {Date} props.dose.scheduledTime - Scheduled time
 * @param {string} props.dose.parentId - Parent ID
 * @param {string} props.dose.parentName - Parent display name (alias or actual name)
 * @param {Function} props.onPress - Handler called when card is tapped
 * @returns {React.ReactElement}
 *
 * @example
 * <UpcomingDoseCard
 *   dose={{
 *     id: 'dose123',
 *     medicineId: 'med456',
 *     medicineName: 'Aspirin',
 *     dosage: '100mg',
 *     scheduledTime: new Date('2024-03-15T14:30:00'),
 *     parentId: 'parent789',
 *     parentName: 'Mom'
 *   }}
 *   onPress={() => navigation.navigate('MedicineDetails', {
 *     medicineId: 'med456',
 *     parentId: 'parent789'
 *   })}
 * />
 */
function UpcomingDoseCard({ dose, onPress }) {
  const overdueStatus = isOverdue(dose.scheduledTime);

  return (
    <TouchableOpacity
      style={[styles.card, overdueStatus && styles.cardOverdue]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${dose.medicineName} for ${
        dose.parentName
      } at ${formatTime(dose.scheduledTime)}`}
      accessibilityHint="Double tap to view medicine details"
    >
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, overdueStatus && styles.timeOverdue]}>
              {formatTime(dose.scheduledTime)}
            </Text>
            {overdueStatus && (
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
          <Text style={styles.parentName} numberOfLines={1}>
            For: {dose.parentName}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

UpcomingDoseCard.propTypes = {
  dose: PropTypes.shape({
    id: PropTypes.string.isRequired,
    medicineId: PropTypes.string.isRequired,
    medicineName: PropTypes.string.isRequired,
    dosage: PropTypes.string.isRequired,
    scheduledTime: PropTypes.instanceOf(Date).isRequired,
    parentId: PropTypes.string.isRequired,
    parentName: PropTypes.string.isRequired,
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
    color: '#4e8ea2',
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
    marginBottom: 4,
  },
  parentName: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
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

export default UpcomingDoseCard;
