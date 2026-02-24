/**
 * Schedule Model
 * Defines the data structure and validation for schedule records
 */

/**
 * Validates schedule data according to requirements
 * @param {Object} data - Schedule data to validate
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export function validateSchedule(data) {
  const errors = {};

  // Requirement 3.1: At least one time is required
  if (!data.times || !Array.isArray(data.times) || data.times.length === 0) {
    errors.times = 'At least one time is required';
  }

  // Requirement 3.5: Maximum 10 times allowed per schedule
  if (data.times && Array.isArray(data.times) && data.times.length > 10) {
    errors.times = 'Maximum 10 times allowed per schedule';
  }

  // Requirement 3.3: Validate time format (HH:MM)
  if (data.times && Array.isArray(data.times)) {
    const timeFormatRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    const invalidTimes = data.times.filter(time => !timeFormatRegex.test(time));
    if (invalidTimes.length > 0) {
      errors.times = 'All times must be in HH:MM format (24-hour)';
    }
  }

  // Requirement 4.5: Repeat pattern must be valid
  if (
    !data.repeatPattern ||
    !['daily', 'specific_days'].includes(data.repeatPattern)
  ) {
    errors.repeatPattern =
      'Repeat pattern must be either "daily" or "specific_days"';
  }

  // Requirement 4.3: Specific days pattern requires at least one day
  if (data.repeatPattern === 'specific_days') {
    if (
      !data.selectedDays ||
      !Array.isArray(data.selectedDays) ||
      data.selectedDays.length === 0
    ) {
      errors.selectedDays =
        'At least one day must be selected for specific_days pattern';
    }
  }

  // Requirement 4.4: Day numbers must be in valid range (0-6)
  if (data.selectedDays && Array.isArray(data.selectedDays)) {
    const invalidDays = data.selectedDays.filter(day => {
      return (
        typeof day !== 'number' || day < 0 || day > 6 || !Number.isInteger(day)
      );
    });
    if (invalidDays.length > 0) {
      errors.selectedDays =
        'Day numbers must be integers between 0 (Sunday) and 6 (Saturday)';
    }
  }

  // Medicine ID is required for linking
  if (
    !data.medicineId ||
    typeof data.medicineId !== 'string' ||
    data.medicineId.trim() === ''
  ) {
    errors.medicineId = 'Medicine ID is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Creates a schedule data object with default values
 * @param {Object} data - Schedule data
 * @returns {Object} - Schedule object
 */
export function createScheduleData(data) {
  return {
    medicineId: data.medicineId || '',
    times: data.times || [],
    repeatPattern: data.repeatPattern || 'daily',
    selectedDays: data.selectedDays || [],
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  };
}
