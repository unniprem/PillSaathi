/**
 * TimePicker Component
 *
 * A reusable time picker component for selecting times in HH:MM format.
 * Uses React Native DateTimePicker for native time selection experience.
 *
 * Requirements: 3.3 - Store times in 24-hour format (HH:MM)
 *
 * @format
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

/**
 * Format a Date object to HH:MM string
 *
 * @param {Date} date - Date object to format
 * @returns {string} Time in HH:MM format
 */
export const formatTime = date => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '00:00';
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * TimePicker Component
 *
 * Displays a button that opens a native time picker when pressed.
 * Calls onChange callback with the selected time in HH:MM format.
 *
 * @param {Object} props
 * @param {string} [props.value] - Current time value in HH:MM format
 * @param {Function} props.onChange - Callback function called with selected time (HH:MM string)
 * @param {string} [props.label] - Optional label to display above the picker
 * @param {boolean} [props.disabled] - Whether the picker is disabled
 * @returns {JSX.Element}
 */
const TimePicker = ({ value, onChange, label, disabled = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    return new Date();
  });

  /**
   * Handle time change from the picker
   * Note: This will be used when DateTimePicker is installed
   *
   * @param {Object} event - Event object from DateTimePicker
   * @param {Date} date - Selected date/time
   */
  // eslint-disable-next-line no-unused-vars
  const handleTimeChange = (event, date) => {
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (date) {
      setSelectedTime(date);
      const timeString = formatTime(date);
      onChange(timeString);
    }
  };

  /**
   * Handle press on the time display button
   */
  const handlePress = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  /**
   * Handle iOS picker done button
   */
  const handleDone = () => {
    setShowPicker(false);
  };

  const displayValue = value || formatTime(selectedTime);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          label ? `${label}: ${displayValue}` : `Time: ${displayValue}`
        }
        accessibilityHint="Tap to select a time"
        accessibilityState={{ disabled }}
      >
        <Text
          style={[styles.buttonText, disabled && styles.buttonTextDisabled]}
        >
          {displayValue}
        </Text>
      </TouchableOpacity>

      {/* Note: DateTimePicker would be rendered here when installed */}
      {/* For now, this is a placeholder that shows the time format */}
      {/* To complete implementation, install: npm install @react-native-community/datetimepicker */}
      {showPicker && (
        <View style={styles.pickerPlaceholder}>
          <Text style={styles.placeholderText}>
            DateTimePicker will appear here
          </Text>
          <Text style={styles.placeholderSubtext}>
            Install @react-native-community/datetimepicker
          </Text>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#F9F9F9',
    borderColor: '#E5E5E5',
  },
  buttonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999999',
  },
  pickerPlaceholder: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE066',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  doneButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TimePicker;
