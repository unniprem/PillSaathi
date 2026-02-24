/**
 * User Model
 * Defines the data structure and validation for user profiles
 * Requirements: 18.1, 18.2, 19.1, 19.3, 19.4
 */

/**
 * Validates user profile data according to requirements
 * @param {Object} data - User profile data to validate
 * @param {string} data.name - User's name (required, non-empty)
 * @param {Date|string} data.dateOfBirth - User's date of birth (required, valid date, age >= 13)
 * @param {string} [data.email] - User's email (optional, valid format if provided)
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export function validateUserProfile(data) {
  const errors = {};

  // Requirement 18.2, 19.3: Name must be a non-empty string
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Name is required and cannot be empty';
  }

  // Requirement 18.2, 19.3: Date of birth must be a valid date
  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const dob =
      data.dateOfBirth instanceof Date
        ? data.dateOfBirth
        : new Date(data.dateOfBirth);

    // Check if date is valid
    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Date of birth must be a valid date';
    } else {
      // Requirement 19.3: User must be at least 13 years old
      const age = calculateAge(dob);
      if (age < 13) {
        errors.dateOfBirth = 'User must be at least 13 years old';
      }
    }
  }

  // Requirement 18.4, 19.4: Email is optional but must be valid format if provided
  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (typeof data.email !== 'string') {
      errors.email = 'Email must be a string';
    } else if (!isValidEmail(data.email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates name field
 * @param {string} name - Name to validate
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export function validateName(name) {
  // Requirement 18.2, 19.3: Name must be required and non-empty
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return {
      isValid: false,
      error: 'Name is required and cannot be empty',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Validates date of birth field
 * @param {Date|string} dateOfBirth - Date of birth to validate
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export function validateDateOfBirth(dateOfBirth) {
  // Requirement 18.2, 19.3: Date of birth must be required and valid
  if (!dateOfBirth) {
    return {
      isValid: false,
      error: 'Date of birth is required',
    };
  }

  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);

  // Check if date is valid
  if (isNaN(dob.getTime())) {
    return {
      isValid: false,
      error: 'Date of birth must be a valid date',
    };
  }

  // Requirement 19.3: User must be at least 13 years old
  const age = calculateAge(dob);
  if (age < 13) {
    return {
      isValid: false,
      error: 'User must be at least 13 years old',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Validates email field
 * @param {string} email - Email to validate
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export function validateEmail(email) {
  // Requirement 18.4, 19.4: Email is optional
  if (email === undefined || email === null || email === '') {
    return {
      isValid: true,
      error: null,
    };
  }

  if (typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email must be a string',
    };
  }

  // Requirement 18.4, 19.4: Email must be valid format if provided
  if (!isValidEmail(email)) {
    return {
      isValid: false,
      error: 'Email must be a valid email address',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Checks if user profile is complete
 * @param {Object} user - User object to check
 * @param {string} user.name - User's name
 * @param {Date|string} user.dateOfBirth - User's date of birth
 * @param {boolean} user.profileCompleted - Profile completion flag
 * @returns {boolean} - True if profile is complete, false otherwise
 */
export function isProfileComplete(user) {
  // Requirement 19.1: Check if profile has required fields
  if (!user) {
    return false;
  }

  // Check profileCompleted flag
  if (user.profileCompleted === false) {
    return false;
  }

  // Check required fields
  const hasName =
    user.name && typeof user.name === 'string' && user.name.trim() !== '';
  const hasDateOfBirth =
    user.dateOfBirth !== undefined && user.dateOfBirth !== null;

  return Boolean(hasName && hasDateOfBirth);
}

/**
 * Creates a user profile data object with default values
 * @param {Object} data - User profile data
 * @returns {Object} - User profile object
 */
export function createUserProfileData(data) {
  return {
    uid: data.uid || '',
    phoneNumber: data.phoneNumber || '',
    role: data.role || '',
    name: data.name || '',
    dateOfBirth: data.dateOfBirth || null,
    email: data.email || null,
    profileCompleted: data.profileCompleted || false,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    lastLoginAt: data.lastLoginAt || new Date(),
  };
}

// Helper functions

/**
 * Calculates age from date of birth
 * @param {Date} dateOfBirth - Date of birth
 * @returns {number} - Age in years
 */
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Validates email format using regex
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  // Basic email validation regex
  // Matches: user@domain.com, user.name@domain.co.uk, etc.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
