/**
 * MedicineForm Component
 *
 * A comprehensive form component for adding and editing medicines with schedules.
 * Integrates TimePicker and FrequencySelector for schedule configuration.
 * Handles form state management, validation, and submission.
 *
 * Requirements:
 * - 1.1, 1.2: Medicine creation with required fields
 * - 2.1, 2.2, 2.3, 2.4: Medicine data management
 * - 3.1, 3.2: Schedule creation with times
 * - 4.1, 4.2: Repeat pattern selection
 * - 14.1-14.5: Form validation
 * - 16.1-16.3: Data persistence and error handling
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import TimePicker from './TimePicker';
import FrequencySelector from './FrequencySelector';
import medicineService from '../services/medicineService';
import scheduleService from '../services/scheduleService';
import { getErrorMessage, logError } from '../utils/errorHandler';

/**
 * MedicineForm Component
 *
 * @param {Object} props
 * @param {string} props.parentId - Parent's Firebase Auth UID (required)
 * @param {string} props.caregiverId - Caregiver's Firebase Auth UID (required)
 * @param {string} [props.medicineId] - Medicine ID for edit mode (optional)
 * @param {Function} props.onSuccess - Callback called on successful submission
 * @param {Function} props.onCancel - Callback called when user cancels
 * @returns {JSX.Element}
 */
const MedicineForm = ({
  parentId,
  caregiverId,
  medicineId,
  onSuccess,
  onCancel,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [dosageAmount, setDosageAmount] = useState('');
  const [dosageUnit, setDosageUnit] = useState('');
  const [instructions, setInstructions] = useState('');
  const [times, setTimes] = useState([]);
  const [repeatPattern, setRepeatPattern] = useState('daily');
  const [selectedDays, setSelectedDays] = useState([]);

  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Edit mode: Load existing medicine and schedule data
  useEffect(() => {
    if (medicineId) {
      loadMedicineData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicineId]);

  /**
   * Load existing medicine and schedule data for edit mode
   */
  const loadMedicineData = async () => {
    setIsLoading(true);
    try {
      // Load medicine data
      const medicines = await medicineService.getMedicinesForParent(parentId);
      const medicine = medicines.find(m => m.id === medicineId);

      if (medicine) {
        setName(medicine.name);
        setDosageAmount(medicine.dosageAmount.toString());
        setDosageUnit(medicine.dosageUnit);
        setInstructions(medicine.instructions || '');
      }

      // Load schedule data
      const schedule = await scheduleService.getScheduleForMedicine(medicineId);
      if (schedule) {
        setTimes(schedule.times || []);
        setRepeatPattern(schedule.repeatPattern || 'daily');
        setSelectedDays(schedule.selectedDays || []);
      }
    } catch (error) {
      logError(error, 'MedicineForm.loadMedicineData', { medicineId });
      const errorMessage = getErrorMessage(
        error,
        'Failed to load medicine data',
      );
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add a time to the times list
   * Requirements: 15.1 - Adding time updates list
   * Requirements: 15.4 - Duplicate times are prevented
   *
   * @param {string} time - Time in HH:MM format
   */
  const addTime = time => {
    if (!time) {
      return;
    }

    // Check for duplicates (Requirement 15.4)
    if (times.includes(time)) {
      Alert.alert('Duplicate Time', 'This time has already been added');
      return;
    }

    // Check maximum times limit
    if (times.length >= 10) {
      Alert.alert('Maximum Times', 'You can add up to 10 times per schedule');
      return;
    }

    // Add time and sort chronologically (Requirement 15.3)
    const updatedTimes = [...times, time].sort();
    setTimes(updatedTimes);
    setCurrentTime('');

    // Clear time-related errors
    if (errors.times) {
      setErrors(prev => ({ ...prev, times: null }));
    }
  };

  /**
   * Remove a time from the times list
   * Requirements: 15.2 - Removing time updates list
   *
   * @param {number} index - Index of time to remove
   */
  const removeTime = index => {
    const updatedTimes = times.filter((_, i) => i !== index);
    setTimes(updatedTimes);
  };

  /**
   * Handle repeat pattern change
   *
   * @param {string} pattern - New pattern ('daily' or 'specific_days')
   */
  const handlePatternChange = pattern => {
    setRepeatPattern(pattern);
    // Clear selectedDays if switching to daily
    if (pattern === 'daily') {
      setSelectedDays([]);
    }
    // Clear pattern-related errors
    if (errors.selectedDays) {
      setErrors(prev => ({ ...prev, selectedDays: null }));
    }
  };

  /**
   * Handle selected days change
   *
   * @param {Array<number>} days - Updated array of selected days
   */
  const handleDaysChange = days => {
    setSelectedDays(days);
    // Clear day-related errors
    if (errors.selectedDays) {
      setErrors(prev => ({ ...prev, selectedDays: null }));
    }
  };

  /**
   * Validate form fields
   * Requirements: 14.1 - Validate required fields
   * Requirements: 14.2 - Validate dosageAmount is positive number
   * Requirements: 14.3 - Validate at least one time is added
   *
   * @returns {boolean} True if form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate name (Requirement 14.1)
    if (!name || name.trim() === '') {
      newErrors.name = 'Medicine name is required';
    }

    // Validate dosageAmount (Requirement 14.2)
    if (!dosageAmount || dosageAmount.trim() === '') {
      newErrors.dosageAmount = 'Dosage amount is required';
    } else {
      const amount = parseFloat(dosageAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.dosageAmount = 'Dosage amount must be a positive number';
      }
    }

    // Validate dosageUnit (Requirement 14.1)
    if (!dosageUnit || dosageUnit.trim() === '') {
      newErrors.dosageUnit = 'Dosage unit is required';
    }

    // Validate times (Requirement 14.3)
    if (times.length === 0) {
      newErrors.times = 'At least one time is required';
    }

    // Validate selectedDays for specific_days pattern (Requirement 4.3)
    if (repeatPattern === 'specific_days' && selectedDays.length === 0) {
      newErrors.selectedDays = 'At least one day must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle field blur for validation
   *
   * @param {string} field - Field name to validate
   */
  const handleBlur = field => {
    const newErrors = { ...errors };

    switch (field) {
      case 'name':
        if (!name || name.trim() === '') {
          newErrors.name = 'Medicine name is required';
        } else {
          delete newErrors.name;
        }
        break;
      case 'dosageAmount':
        if (!dosageAmount || dosageAmount.trim() === '') {
          newErrors.dosageAmount = 'Dosage amount is required';
        } else {
          const amount = parseFloat(dosageAmount);
          if (isNaN(amount) || amount <= 0) {
            newErrors.dosageAmount = 'Dosage amount must be a positive number';
          } else {
            delete newErrors.dosageAmount;
          }
        }
        break;
      case 'dosageUnit':
        if (!dosageUnit || dosageUnit.trim() === '') {
          newErrors.dosageUnit = 'Dosage unit is required';
        } else {
          delete newErrors.dosageUnit;
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
  };

  /**
   * Handle form submission
   * Requirements: 16.1 - Write to Firestore before showing success
   * Requirements: 16.2 - Display error message on failure
   * Requirements: 16.3 - Write medicine and schedule atomically
   *
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    // Validate form (Requirement 14.4)
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const medicineData = {
        name: name.trim(),
        parentId,
        caregiverId,
        dosageAmount: parseFloat(dosageAmount),
        dosageUnit: dosageUnit.trim(),
        instructions: instructions.trim(),
      };

      const scheduleData = {
        times,
        repeatPattern,
        selectedDays: repeatPattern === 'specific_days' ? selectedDays : [],
      };

      let resultMedicineId;

      if (medicineId) {
        // Edit mode: Update existing medicine and schedule
        await medicineService.updateMedicine(
          medicineId,
          medicineData,
          caregiverId,
        );

        // Update schedule
        const existingSchedule = await scheduleService.getScheduleForMedicine(
          medicineId,
        );
        if (existingSchedule) {
          await scheduleService.updateSchedule(
            existingSchedule.id,
            scheduleData,
            caregiverId,
          );
        } else {
          await scheduleService.createSchedule(
            medicineId,
            scheduleData,
            caregiverId,
          );
        }

        resultMedicineId = medicineId;
      } else {
        // Create mode: Create new medicine and schedule
        // Requirement 16.1: Write to Firestore before showing success
        resultMedicineId = await medicineService.createMedicine(medicineData);

        // Create schedule linked to medicine
        await scheduleService.createSchedule(
          resultMedicineId,
          scheduleData,
          caregiverId,
        );
      }

      // Success callback
      if (onSuccess) {
        onSuccess(resultMedicineId);
      }
    } catch (error) {
      logError(error, 'MedicineForm.handleSubmit', {
        medicineId,
        isEditMode: !!medicineId,
      });

      // Requirement 16.2: Display error message on failure
      const errorMessage = getErrorMessage(error, 'Failed to save medicine');
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading indicator while loading data in edit mode
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading medicine data...</Text>
      </View>
    );
  }

  // Requirement 14.5: Disable submit button when validation fails
  const isFormValid = () => {
    return (
      name.trim() !== '' &&
      dosageAmount.trim() !== '' &&
      parseFloat(dosageAmount) > 0 &&
      dosageUnit.trim() !== '' &&
      times.length > 0 &&
      (repeatPattern === 'daily' ||
        (repeatPattern === 'specific_days' && selectedDays.length > 0))
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formContent}>
        {/* Medicine Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            onBlur={() => handleBlur('name')}
            placeholder="Enter medicine name"
            accessibilityLabel="Medicine name"
            accessibilityHint="Enter the name of the medicine"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Dosage Amount */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Dosage Amount *</Text>
          <TextInput
            style={[styles.input, errors.dosageAmount && styles.inputError]}
            value={dosageAmount}
            onChangeText={setDosageAmount}
            onBlur={() => handleBlur('dosageAmount')}
            placeholder="Enter dosage amount"
            keyboardType="numeric"
            accessibilityLabel="Dosage amount"
            accessibilityHint="Enter the dosage amount as a number"
          />
          {errors.dosageAmount && (
            <Text style={styles.errorText}>{errors.dosageAmount}</Text>
          )}
        </View>

        {/* Dosage Unit */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Dosage Unit *</Text>
          <TextInput
            style={[styles.input, errors.dosageUnit && styles.inputError]}
            value={dosageUnit}
            onChangeText={setDosageUnit}
            onBlur={() => handleBlur('dosageUnit')}
            placeholder="e.g., mg, ml, tablets"
            accessibilityLabel="Dosage unit"
            accessibilityHint="Enter the unit of measurement"
          />
          {errors.dosageUnit && (
            <Text style={styles.errorText}>{errors.dosageUnit}</Text>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Instructions (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Enter any special instructions"
            multiline
            numberOfLines={3}
            accessibilityLabel="Instructions"
            accessibilityHint="Enter optional instructions for taking the medicine"
          />
        </View>

        {/* Times List */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Schedule Times *</Text>

          {/* Time Picker */}
          <TimePicker
            value={currentTime}
            onChange={time => setCurrentTime(time)}
            label="Add Time"
          />

          <TouchableOpacity
            style={[
              styles.addButton,
              times.length >= 10 && styles.addButtonDisabled,
            ]}
            onPress={() => addTime(currentTime)}
            disabled={times.length >= 10}
            accessibilityRole="button"
            accessibilityLabel="Add time"
            accessibilityHint="Add the selected time to the schedule"
          >
            <Text
              style={[
                styles.addButtonText,
                times.length >= 10 && styles.addButtonTextDisabled,
              ]}
            >
              Add Time
            </Text>
          </TouchableOpacity>

          {/* Times List Display */}
          {times.length > 0 && (
            <View style={styles.timesList}>
              {times.map((time, index) => (
                <View key={`time-${time}-${index}`} style={styles.timeItem}>
                  <Text style={styles.timeText}>{time}</Text>
                  <TouchableOpacity
                    onPress={() => removeTime(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove time ${time}`}
                  >
                    <Text style={styles.removeButton}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {errors.times && <Text style={styles.errorText}>{errors.times}</Text>}
        </View>

        {/* Frequency Selector */}
        <View style={styles.fieldContainer}>
          <FrequencySelector
            repeatPattern={repeatPattern}
            selectedDays={selectedDays}
            onPatternChange={handlePatternChange}
            onDaysChange={handleDaysChange}
          />
          {errors.selectedDays && (
            <Text style={styles.errorText}>{errors.selectedDays}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              (!isFormValid() || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={
              medicineId ? 'Update medicine' : 'Save medicine'
            }
            accessibilityState={{ disabled: !isFormValid() || isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {medicineId ? 'Update' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  formContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF3B30',
  },
  addButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#999999',
  },
  timesList: {
    marginTop: 16,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  removeButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  cancelButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicineForm;
