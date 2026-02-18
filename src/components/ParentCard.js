/**
 * ParentCard Component
 *
 * Displays a parent card with name (using alias if available) and summary information.
 * Handles tap to navigate to parent detail screen.
 *
 * Requirements: 1.2, 1.3
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';

/**
 * ParentCard Component
 *
 * Displays parent information in a card format with:
 * - Parent name (uses alias if available) - Requirement 1.2
 * - Summary information (upcoming medicine count) - Requirement 1.2
 * - Tap handler for navigation - Requirement 1.3
 *
 * @param {Object} props
 * @param {Object} props.parent - Parent data object
 * @param {string} props.parent.id - Parent's Firebase Auth UID
 * @param {string} props.parent.name - Parent's display name (alias or actual name)
 * @param {number} props.parent.upcomingMedicineCount - Count of upcoming medicines
 * @param {Function} props.onPress - Handler called when card is tapped
 * @returns {React.ReactElement}
 *
 * @example
 * <ParentCard
 *   parent={{
 *     id: 'parent123',
 *     name: 'Mom',
 *     upcomingMedicineCount: 3
 *   }}
 *   onPress={() => navigation.navigate('ParentDetail', { parentId: 'parent123' })}
 * />
 */
function ParentCard({ parent, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${parent.name}`}
      accessibilityHint="Double tap to view parent details and medicines"
    >
      <View style={styles.cardContent}>
        <View style={styles.headerSection}>
          <Text style={styles.parentName}>{parent.name}</Text>
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Upcoming Medicines</Text>
            <Text style={styles.summaryValue}>
              {parent.upcomingMedicineCount}
            </Text>
          </View>
        </View>

        <View style={styles.arrowSection}>
          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

ParentCard.propTypes = {
  parent: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    upcomingMedicineCount: PropTypes.number.isRequired,
  }).isRequired,
  onPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
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
  },
  headerSection: {
    flex: 1,
  },
  parentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  summarySection: {
    marginRight: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  arrowSection: {
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 32,
    color: '#CCCCCC',
    fontWeight: '300',
  },
});

export default ParentCard;
