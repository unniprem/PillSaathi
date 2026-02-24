/**
 * Profile Utilities Tests
 * Tests for profile management helper functions
 */

import {
  requiresProfileSetup,
  getProfileCompletionStatus,
  prepareProfileUpdate,
} from './profileUtils';

describe('Profile Utilities', () => {
  describe('requiresProfileSetup', () => {
    it('should return false for complete profile', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: true,
      };

      expect(requiresProfileSetup(user)).toBe(false);
    });

    it('should return true for incomplete profile (missing name)', () => {
      const user = {
        name: '',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: true,
      };

      expect(requiresProfileSetup(user)).toBe(true);
    });

    it('should return true for incomplete profile (missing date of birth)', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: null,
        profileCompleted: true,
      };

      expect(requiresProfileSetup(user)).toBe(true);
    });

    it('should return true when profileCompleted flag is false', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: false,
      };

      expect(requiresProfileSetup(user)).toBe(true);
    });

    it('should return false for null user', () => {
      expect(requiresProfileSetup(null)).toBe(false);
    });
  });

  describe('getProfileCompletionStatus', () => {
    it('should return complete status for valid profile', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: true,
      };

      const result = getProfileCompletionStatus(user);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should identify missing name', () => {
      const user = {
        name: '',
        dateOfBirth: new Date('1990-01-01'),
        profileCompleted: true,
      };

      const result = getProfileCompletionStatus(user);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('name');
    });

    it('should identify missing date of birth', () => {
      const user = {
        name: 'John Doe',
        dateOfBirth: null,
        profileCompleted: true,
      };

      const result = getProfileCompletionStatus(user);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('dateOfBirth');
    });

    it('should identify multiple missing fields', () => {
      const user = {
        name: '',
        dateOfBirth: null,
        profileCompleted: true,
      };

      const result = getProfileCompletionStatus(user);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('name');
      expect(result.missingFields).toContain('dateOfBirth');
    });

    it('should handle null user', () => {
      const result = getProfileCompletionStatus(null);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('user');
    });
  });

  describe('prepareProfileUpdate', () => {
    it('should prepare update with all fields', () => {
      const profileData = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        email: 'john@example.com',
        profileCompleted: true,
      };

      const result = prepareProfileUpdate(profileData);

      expect(result.name).toBe('John Doe');
      expect(result.dateOfBirth).toEqual(new Date('1990-01-01'));
      expect(result.email).toBe('john@example.com');
      expect(result.profileCompleted).toBe(true);
    });

    it('should prepare update with only name', () => {
      const profileData = {
        name: 'Jane Doe',
      };

      const result = prepareProfileUpdate(profileData);

      expect(result.name).toBe('Jane Doe');
      expect(result.dateOfBirth).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.profileCompleted).toBeUndefined();
    });

    it('should convert empty email to null', () => {
      const profileData = {
        name: 'John Doe',
        email: '',
      };

      const result = prepareProfileUpdate(profileData);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBeNull();
    });

    it('should handle empty profile data', () => {
      const result = prepareProfileUpdate({});

      expect(Object.keys(result).length).toBe(0);
    });
  });
});
