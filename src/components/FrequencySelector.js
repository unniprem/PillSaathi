/**
 * FrequencySelector Component
 *
 * A reusable component for selecting medicine schedule frequency patterns.
 * Supports daily pattern (every day) and specific days pattern (selected days of week).
 *
 * Requirements:
 * - 4.1: Support daily repeat pattern
 * - 4.2: Support specific days pattern
 * - 4.3: Require at least one day for specific_days pattern
 *
 * @format
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const PATTERNS = {
  DAILY: 'daily',
  SPECIFIC_DAYS: 'specific_days',
};

/**
 * FrequencySelector Component
 *
 * Displays radio buttons for pattern selection and day checkboxes for specific_days pattern.
 * Handles pattern and day selection changes through callback functions.
 *
 * @param {Object} props
 * @param {string} props.repeatPattern - Current repeat pattern ('daily' or 'specific_days')
 * @param {Array<number>} props.selectedDays - Array of selected day numbers (0=Sunday, 6=Saturday)
 * @param {Function} props.onPatternChange - Callback function called with new pattern
 * @param {Function} props.onDaysChange - Callback function called with updated selectedDays array
 * @param {boolean} [props.disabled] - Whether the selector is disabled
 * @returns {JSX.Element}
 */
const FrequencySelector = ({
  repeatPattern,
  selectedDays = [],
  onPatternChange,
  onDaysChange,
  disabled = false,
}) => {
  /**
   * Handle pattern selection change
   *
   * @param {string} pattern - Selected pattern ('daily' or 'specific_days')
   */
  const handlePatternChange = pattern => {
    if (!disabled) {
      onPatternChange(pattern);
    }
  };

  /**
   * Toggle day selection
   *
   * @param {number} day - Day number to toggle (0-6)
   */
  const toggleDay = day => {
    if (!disabled && repeatPattern === PATTERNS.SPECIFIC_DAYS) {
      const isSelected = selectedDays.includes(day);
      let updatedDays;

      if (isSelected) {
        // Remove day from selection
        updatedDays = selectedDays.filter(d => d !== day);
      } else {
        // Add day to selection
        updatedDays = [...selectedDays, day];
      }

      onDaysChange(updatedDays);
    }
  };

  /**
   * Check if a day is selected
   *
   * @param {number} day - Day number to check
   * @returns {boolean}
   */
  const isDaySelected = day => {
    return selectedDays.includes(day);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel} accessibilityRole="text">
        Frequency
      </Text>

      {/* Pattern Selection Radio Buttons */}
      <View style={styles.patternContainer}>
        {/* Daily Pattern Option */}
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => handlePatternChange(PATTERNS.DAILY)}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityLabel="Daily"
          accessibilityState={{
            checked: repeatPattern === PATTERNS.DAILY,
            disabled,
          }}
        >
          <View style={styles.radioButton}>
            {repeatPattern === PATTERNS.DAILY && (
              <View style={styles.radioButtonSelected} />
            )}
          </View>
          <Text
            style={[styles.radioLabel, disabled && styles.radioLabelDisabled]}
          >
            Daily
          </Text>
        </TouchableOpacity>

        {/* Specific Days Pattern Option */}
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => handlePatternChange(PATTERNS.SPECIFIC_DAYS)}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityLabel="Specific days"
          accessibilityState={{
            checked: repeatPattern === PATTERNS.SPECIFIC_DAYS,
            disabled,
          }}
        >
          <View style={styles.radioButton}>
            {repeatPattern === PATTERNS.SPECIFIC_DAYS && (
              <View style={styles.radioButtonSelected} />
            )}
          </View>
          <Text
            style={[styles.radioLabel, disabled && styles.radioLabelDisabled]}
          >
            Specific days
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day Selection Checkboxes (only shown for specific_days pattern) */}
      {repeatPattern === PATTERNS.SPECIFIC_DAYS && (
        <View style={styles.daysContainer}>
          <Text style={styles.daysLabel} accessibilityRole="text">
            Select days
          </Text>
          <View style={styles.daysGrid}>
            {DAYS.map(day => {
              const isSelected = isDaySelected(day.value);
              return (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    disabled && styles.dayButtonDisabled,
                  ]}
                  onPress={() => toggleDay(day.value)}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day.label}
                  accessibilityState={{
                    checked: isSelected,
                    disabled,
                  }}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextSelected,
                      disabled && styles.dayButtonTextDisabled,
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 12,
  },
  patternContainer: {
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333333',
  },
  radioLabelDisabled: {
    color: '#999999',
  },
  daysContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonDisabled: {
    backgroundColor: '#F9F9F9',
    borderColor: '#E5E5E5',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  dayButtonTextDisabled: {
    color: '#999999',
  },
});

export default FrequencySelector;
