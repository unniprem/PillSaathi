/**
 * useProfileCompletionCheck Hook
 *
 * Custom hook to check if user profile is complete after authentication
 * and optionally redirect to ProfileSetupScreen if incomplete.
 *
 * Requirements: 19.1, 19.2, 19.7
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { requiresProfileSetup } from '../utils/profileUtils';
import { RootScreens, AuthScreens } from '../types/navigation';

/**
 * Hook to check profile completion and handle navigation
 *
 * Checks if the authenticated user's profile is complete:
 * - If incomplete: Can redirect to ProfileSetupScreen (Requirements 19.1, 19.2)
 * - If complete: Allows direct navigation to dashboard (Requirement 19.7)
 *
 * This hook should be called after authentication is confirmed.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoRedirect - Whether to automatically redirect if profile is incomplete (default: true)
 * @returns {Object} - { isProfileComplete: boolean, isChecking: boolean, needsProfileSetup: boolean }
 *
 * @example
 * // Auto-redirect to profile setup if incomplete
 * function RoleSelectionScreen() {
 *   const { isProfileComplete, isChecking } = useProfileCompletionCheck();
 *
 *   if (isChecking) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return <RoleSelection />;
 * }
 *
 * @example
 * // Check status without auto-redirect
 * function MyScreen() {
 *   const { isProfileComplete, needsProfileSetup } = useProfileCompletionCheck({ autoRedirect: false });
 *
 *   if (needsProfileSetup) {
 *     return <ProfileIncompleteMessage />;
 *   }
 *
 *   return <Dashboard />;
 * }
 */
export function useProfileCompletionCheck(options = {}) {
  const { autoRedirect = true } = options;
  const { user, profile, initialized } = useAuth();
  const navigation = useNavigation();

  // Requirement 19.1: Check if profile is complete
  const needsProfileSetup = profile ? requiresProfileSetup(profile) : false;
  const isProfileComplete = profile ? !requiresProfileSetup(profile) : false;
  const isChecking = !initialized || (user && !profile);

  useEffect(() => {
    // Only perform auto-redirect if enabled
    if (!autoRedirect) {
      return;
    }

    // Only check after auth is initialized
    if (!initialized) {
      return;
    }

    // Only check if user is authenticated
    if (!user) {
      return;
    }

    // Only check if profile data is loaded
    if (!profile) {
      return;
    }

    // Requirement 19.2: Redirect to ProfileSetupScreen if incomplete
    if (needsProfileSetup) {
      // Navigate to Auth navigator with ProfileSetup screen
      navigation.navigate(RootScreens.AUTH, {
        screen: AuthScreens.PROFILE_SETUP,
      });
    }
    // Requirement 19.7: If profile is complete, allow direct navigation to dashboard
    // (no action needed - user will proceed to their role-based navigator)
  }, [user, profile, initialized, navigation, needsProfileSetup, autoRedirect]);

  return {
    isProfileComplete,
    isChecking,
    needsProfileSetup,
  };
}

export default useProfileCompletionCheck;
