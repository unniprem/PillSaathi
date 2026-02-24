/**
 * DoseCard Component
 *
 * Displays a dose card for parent view with medicine name, scheduled time, and dosage.
 * Highlights overdue doses.
 * Handles tap to navigate to medicine details.
 * Provides quick action button to mark dose as taken.
 *
 * Requirements: 17.3, 17.5
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
 * - Medicine name - Requirement 17.3
 * - Scheduled time - Requirement 17.3
 * - Dosage - Requirement 17.3
 * - Overdue highlighting - Requirement 17.5
 * - Tap handler for navigation
 * - Quick action to mark as taken - Requirement 17.5
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
 * @param {Function} [props.onMarkTaken] - Optional handler for marking dose as taken
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
 *   onMarkTaken={() => markDoseAsTaken('dose123')}
 * />
 */
function DoseCard({ dose, onPress, onMarkTaken }) {
  /**
   * Handle mark as taken button press
   * Prevents event propagation to avoid triggering card onPress
   */
  const handleMarkTaken = e => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (onMarkTaken) {
      onMarkTaken();
    }
  };
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
                <Text style={styles.overdueBadgeText}>MISSED</Text>
              </View>
            )}
            {/* Show retry count if dose is being retried */}
            {dose.missedCount > 0 && dose.missedCount < 3 && (
              <View style={styles.retryBadge}>
                <Text style={styles.retryBadgeText}>
                  Retry {dose.missedCount}/3
                </Text>
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
          {onMarkTaken && (
            <TouchableOpacity
              style={styles.markTakenButton}
              onPress={handleMarkTaken}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Mark as taken"
              accessibilityHint="Double tap to mark this dose as taken"
            >
              <Text style={styles.markTakenText}>Taken</Text>
            </TouchableOpacity>
          )}
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
    missedCount: PropTypes.number,
  }).isRequired,
  onPress: PropTypes.func.isRequired,
  onMarkTaken: PropTypes.func,
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
  retryBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  retryBadgeText: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markTakenButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    minHeight: 36,
  },
  markTakenText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  arrowIcon: {
    fontSize: 28,
    color: '#CCCCCC',
    fontWeight: '300',
  },
});

export default DoseCard;
