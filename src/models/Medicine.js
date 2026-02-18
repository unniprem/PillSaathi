/**
 * Medicine Model
 * Defines the data structure and validation for medicine records
 */

/**
 * Validates medicine data according to requirements
 * @param {Object} data - Medicine data to validate
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export function validateMedicine(data) {
  const errors = {};

  // Requirement 2.1: Medicine name must be a non-empty string
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Medicine name is required';
  }

  // Requirement 2.2: Dosage amount must be a positive number
  if (
    !data.dosageAmount ||
    typeof data.dosageAmount !== 'number' ||
    data.dosageAmount <= 0
  ) {
    errors.dosageAmount = 'Dosage amount must be a positive number';
  }

  // Requirement 2.3: Dosage unit is required
  if (
    !data.dosageUnit ||
    typeof data.dosageUnit !== 'string' ||
    data.dosageUnit.trim() === ''
  ) {
    errors.dosageUnit = 'Dosage unit is required';
  }

  // Requirement 1.2: Parent ID is required
  if (
    !data.parentId ||
    typeof data.parentId !== 'string' ||
    data.parentId.trim() === ''
  ) {
    errors.parentId = 'Parent ID is required';
  }

  // Requirement 2.5: Validate all required fields are present
  // Instructions field is optional (Requirement 2.4)

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Creates a medicine data object with default values
 * @param {Object} data - Medicine data
 * @returns {Object} - Medicine object
 */
export function createMedicineData(data) {
  return {
    name: data.name || '',
    parentId: data.parentId || '',
    caregiverId: data.caregiverId || '',
    dosageAmount: data.dosageAmount || 0,
    dosageUnit: data.dosageUnit || '',
    instructions: data.instructions || '',
    status: data.status || 'active', // Requirement 1.3: Default to active
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  };
}
