/**
 * Profile Utilities
 * Helper functions for profile management and validation
 * Requirements: 18.1, 18.2, 19.1, 19.2, 19.7
 */

import { isProfileComplete } from '../models/User';

/**
 * Checks if a user needs to complete their profile
 * @param {Object} user - User object
 * @returns {boolean} - True if profile setup is required
 */
export function requiresProfileSetup(user) {
  // Requirement 19.1, 19.2: Check if profile completion is needed
  if (!user) {
    return false;
  }

  return !isProfileComplete(user);
}

/**
 * Gets the profile completion status with details
 * @param {Object} user - User object
 * @returns {Object} - { isComplete: boolean, missingFields: string[] }
 */
export function getProfileCompletionStatus(user) {
  if (!user) {
    return {
      isComplete: false,
      missingFields: ['user'],
    };
  }

  const missingFields = [];

  // Check required fields
  if (!user.name || typeof user.name !== 'string' || user.name.trim() === '') {
    missingFields.push('name');
  }

  if (!user.dateOfBirth) {
    missingFields.push('dateOfBirth');
  }

  return {
    isComplete: missingFields.length === 0 && user.profileCompleted !== false,
    missingFields,
  };
}

/**
 * Prepares profile data for Firestore update
 * @param {Object} profileData - Profile data to prepare
 * @returns {Object} - Prepared profile data
 */
export function prepareProfileUpdate(profileData) {
  const update = {};

  if (profileData.name !== undefined) {
    update.name = profileData.name;
  }

  if (profileData.dateOfBirth !== undefined) {
    update.dateOfBirth = profileData.dateOfBirth;
  }

  if (profileData.email !== undefined) {
    update.email = profileData.email || null;
  }

  if (profileData.profileCompleted !== undefined) {
    update.profileCompleted = profileData.profileCompleted;
  }

  return update;
}
