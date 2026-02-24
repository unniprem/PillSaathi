/**
 * Tests for useProfileCompletionCheck Hook
 *
 * Requirements: 19.1, 19.2, 19.7
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProfileCompletionCheck } from './useProfileCompletionCheck';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { requiresProfileSetup } from '../utils/profileUtils';
import { RootScreens, AuthScreens } from '../types/navigation';

// Mock dependencies
jest.mock('../contexts/AuthContext');
jest.mock('@react-navigation/native');
jest.mock('../utils/profileUtils');

describe('useProfileCompletionCheck', () => {
  let mockNavigate;

  beforeEach(() => {
    mockNavigate = jest.fn();
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 19.1: Check if profile is complete', () => {
    it('should return needsProfileSetup as true when profile is incomplete', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: {
          uid: 'user123',
          role: 'parent',
          name: '',
          dateOfBirth: null,
        },
        initialized: true,
      });
      requiresProfileSetup.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useProfileCompletionCheck({ autoRedirect: false }),
      );

      // Assert
      expect(result.current.needsProfileSetup).toBe(true);
      expect(result.current.isProfileComplete).toBe(false);
    });

    it('should return needsProfileSetup as false when profile is complete', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: {
          uid: 'user123',
          role: 'parent',
          name: 'John Doe',
          dateOfBirth: new Date('1990-01-01'),
          profileCompleted: true,
        },
        initialized: true,
      });
      requiresProfileSetup.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useProfileCompletionCheck({ autoRedirect: false }),
      );

      // Assert
      expect(result.current.needsProfileSetup).toBe(false);
      expect(result.current.isProfileComplete).toBe(true);
    });

    it('should return isChecking as true when auth is not initialized', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: null,
        profile: null,
        initialized: false,
      });

      // Act
      const { result } = renderHook(() =>
        useProfileCompletionCheck({ autoRedirect: false }),
      );

      // Assert
      expect(result.current.isChecking).toBe(true);
    });

    it('should return isChecking as true when user exists but profile is not loaded', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: null,
        initialized: true,
      });

      // Act
      const { result } = renderHook(() =>
        useProfileCompletionCheck({ autoRedirect: false }),
      );

      // Assert
      expect(result.current.isChecking).toBe(true);
    });
  });

  describe('Requirement 19.2: Redirect to ProfileSetupScreen if incomplete', () => {
    it('should navigate to ProfileSetupScreen when profile is incomplete and autoRedirect is true', async () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: {
          uid: 'user123',
          role: 'parent',
          name: '',
          dateOfBirth: null,
        },
        initialized: true,
      });
      requiresProfileSetup.mockReturnValue(true);

      // Act
      renderHook(() => useProfileCompletionCheck({ autoRedirect: true }));

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(RootScreens.AUTH, {
          screen: AuthScreens.PROFILE_SETUP,
        });
      });
    });

    it('should not navigate when autoRedirect is false', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: {
          uid: 'user123',
          role: 'parent',
          name: '',
          dateOfBirth: null,
        },
        initialized: true,
      });
      requiresProfileSetup.mockReturnValue(true);

      // Act
      renderHook(() => useProfileCompletionCheck({ autoRedirect: false }));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when auth is not initialized', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: null,
        profile: null,
        initialized: false,
      });

      // Act
      renderHook(() => useProfileCompletionCheck({ autoRedirect: true }));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when user is not authenticated', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: null,
        profile: null,
        initialized: true,
      });

      // Act
      renderHook(() => useProfileCompletionCheck({ autoRedirect: true }));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when profile is not loaded', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: null,
        initialized: true,
      });

      // Act
      renderHook(() => useProfileCompletionCheck({ autoRedirect: true }));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 19.7: Allow direct navigation to dashboard if complete', () => {
    it('should not navigate when profile is complete', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: {
          uid: 'user123',
          role: 'parent',
          name: 'John Doe',
          dateOfBirth: new Date('1990-01-01'),
          profileCompleted: true,
        },
        initialized: true,
      });
      requiresProfileSetup.mockReturnValue(false);

      // Act
      renderHook(() => useProfileCompletionCheck({ autoRedirect: true }));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should return isProfileComplete as true when profile is complete', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: {
          uid: 'user123',
          role: 'parent',
          name: 'John Doe',
          dateOfBirth: new Date('1990-01-01'),
          profileCompleted: true,
        },
        initialized: true,
      });
      requiresProfileSetup.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useProfileCompletionCheck({ autoRedirect: false }),
      );

      // Assert
      expect(result.current.isProfileComplete).toBe(true);
      expect(result.current.needsProfileSetup).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing profile gracefully', () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: null,
        initialized: true,
      });

      // Act
      const { result } = renderHook(() =>
        useProfileCompletionCheck({ autoRedirect: false }),
      );

      // Assert
      expect(result.current.isProfileComplete).toBe(false);
      expect(result.current.needsProfileSetup).toBe(false);
      expect(result.current.isChecking).toBe(true);
    });

    it('should use default autoRedirect value of true when not specified', async () => {
      // Arrange
      useAuth.mockReturnValue({
        user: { uid: 'user123' },
        profile: {
          uid: 'user123',
          role: 'parent',
          name: '',
          dateOfBirth: null,
        },
        initialized: true,
      });
      requiresProfileSetup.mockReturnValue(true);

      // Act
      renderHook(() => useProfileCompletionCheck());

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(RootScreens.AUTH, {
          screen: AuthScreens.PROFILE_SETUP,
        });
      });
    });
  });
});
