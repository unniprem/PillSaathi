/**
 * User Model Tests
 * Tests for user profile data model and validation utilities
 */

import {
  validateUserProfile,
  validateName,
  validateDateOfBirth,
  validateEmail,
  isProfileComplete,
  createUserProfileData,
} from './User';

describe('User Model', () => {
  describe('validateName', () => {
    it('should validate a valid name', () => {
      const result = validateName('John Doe');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty name', () => {
      const result = validateName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required and cannot be empty');
    });

    it('should reject null name', () => {
      const result = validateName(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required and cannot be empty');
    });

    it('should reject whitespace-only name', () => {
      const result = validateName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required and cannot be empty');
    });
  });

  describe('validateDateOfBirth', () => {
    it('should validate a valid date of birth for user >= 13 years old', () => {
      const fifteenYearsAgo = new Date();
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);

      const result = validateDateOfBirth(fifteenYearsAgo);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject date of birth for user < 13 years old', () => {
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      const result = validateDateOfBirth(tenYearsAgo);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('User must be at least 13 years old');
    });

    it('should reject invalid date', () => {
      const result = validateDateOfBirth('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date of birth must be a valid date');
    });

    it('should reject null date of birth', () => {
      const result = validateDateOfBirth(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date of birth is required');
    });
  });

  describe('validateEmail', () => {
    it('should validate a valid email', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept empty email (optional)', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept null email (optional)', () => {
      const result = validateEmail(null);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must be a valid email address');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must be a valid email address');
    });
  });

  describe('validateUserProfile', () => {
    it('should validate a complete profile with all fields', () => {
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);

      const result = validateUserProfile({
        name: 'John Doe',
        dateOfBirth: twentyYearsAgo,
        email: 'john@example.com',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should validate profile without optional email', () => {
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);

      const result = validateUserProfile({
        name: 'John Doe',
        dateOfBirth: twentyYearsAgo,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should reject profile with missing name', () => {
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);

      const result = validateUserProfile({
        dateOfBirth: twentyYearsAgo,
        email: 'john@example.com',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it('should reject profile with missing date of birth', () => {
      const result = validateUserProfile({
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.dateOfBirth).toBeDefined();
    });

    it('should reject profile with invalid email', () => {
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);

      const result = validateUserProfile({
        name: 'John Doe',
        dateOfBirth: twentyYearsAgo,
        email: 'invalid-email',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });
  });

  describe('isProfileComplete', () => {
    it('should return true for complete profile', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: true,
      };

      expect(isProfileComplete(user)).toBe(true);
    });

    it('should return false for profile with missing name', () => {
      const user = {
        name: '',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: true,
      };

      expect(isProfileComplete(user)).toBe(false);
    });

    it('should return false for profile with missing date of birth', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: null,
        profileCompleted: true,
      };

      expect(isProfileComplete(user)).toBe(false);
    });

    it('should return false when profileCompleted flag is false', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: false,
      };

      expect(isProfileComplete(user)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isProfileComplete(null)).toBe(false);
    });
  });

  describe('createUserProfileData', () => {
    it('should create user profile data with all fields', () => {
      const data = {
        uid: 'user123',
        phoneNumber: '+1234567890',
        role: 'parent',
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        email: 'john@example.com',
        profileCompleted: true,
      };

      const result = createUserProfileData(data);

      expect(result.uid).toBe('user123');
      expect(result.phoneNumber).toBe('+1234567890');
      expect(result.role).toBe('parent');
      expect(result.name).toBe('John Doe');
      expect(result.dateOfBirth).toEqual(new Date('1990-01-01'));
      expect(result.email).toBe('john@example.com');
      expect(result.profileCompleted).toBe(true);
    });

    it('should create user profile data with default values', () => {
      const result = createUserProfileData({});

      expect(result.uid).toBe('');
      expect(result.phoneNumber).toBe('');
      expect(result.role).toBe('');
      expect(result.name).toBe('');
      expect(result.dateOfBirth).toBeNull();
      expect(result.email).toBeNull();
      expect(result.profileCompleted).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.lastLoginAt).toBeInstanceOf(Date);
    });
  });
});
