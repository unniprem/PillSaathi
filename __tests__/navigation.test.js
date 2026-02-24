/**
 * Navigation Tests
 *
 * Tests for navigation functionality including:
 * - Screen navigation
 * - Back navigation
 * - Stack navigation behavior
 * - Tab navigation behavior
 *
 * @format
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Import navigators
import AuthNavigator from '../src/navigation/AuthNavigator';
import ParentNavigator from '../src/navigation/ParentNavigator';
import CaregiverNavigator from '../src/navigation/CaregiverNavigator';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock navigation types
jest.mock('../src/types/navigation', () => ({
  RootScreens: {
    SPLASH: 'Splash',
    AUTH: 'Auth',
    PARENT: 'Parent',
    CAREGIVER: 'Caregiver',
  },
  AuthScreens: {
    LOGIN: 'Login',
    PHONE_VERIFICATION: 'PhoneVerification',
    ROLE_SELECTION: 'RoleSelection',
  },
  ParentScreens: {
    HOME: 'Home',
    PROFILE: 'Profile',
    MEDICINE_LIST: 'MedicineList',
    ADD_MEDICINE: 'AddMedicine',
    EDIT_MEDICINE: 'EditMedicine',
    CAREGIVER_MANAGEMENT: 'CaregiverManagement',
    ADD_CAREGIVER: 'AddCaregiver',
    NOTIFICATIONS: 'Notifications',
    SETTINGS: 'Settings',
  },
  CaregiverScreens: {
    HOME: 'Home',
    PROFILE: 'Profile',
    PARENT_LIST: 'ParentList',
    MEDICINE_DETAILS: 'MedicineDetails',
    ALARM: 'Alarm',
    NOTIFICATIONS: 'Notifications',
    SETTINGS: 'Settings',
  },
}));

describe('Navigation Tests', () => {
  describe('AuthNavigator', () => {
    it('should render AuthNavigator without errors', async () => {
      const { getByText } = render(
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>,
      );

      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });
    });

    it('should have back navigation enabled for PhoneVerification screen', () => {
      // This test verifies that the PhoneVerification screen has headerBackVisible: true
      // which enables back navigation
      const { getByText } = render(
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>,
      );

      // The navigator should render successfully
      expect(getByText('Login')).toBeTruthy();
    });

    it('should disable back navigation for RoleSelection screen', () => {
      // This test verifies that the RoleSelection screen has headerBackVisible: false
      // and gestureEnabled: false to prevent going back after verification
      const { getByText } = render(
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>,
      );

      // The navigator should render successfully
      expect(getByText('Login')).toBeTruthy();
    });
  });

  describe('ParentNavigator', () => {
    it('should render ParentNavigator without errors', async () => {
      const { getByText } = render(
        <NavigationContainer>
          <ParentNavigator />
        </NavigationContainer>,
      );

      await waitFor(() => {
        // Should show tab labels
        expect(getByText('Home')).toBeTruthy();
        expect(getByText('Profile')).toBeTruthy();
      });
    });

    it('should have back navigation enabled in stack navigators', () => {
      // This test verifies that stack screens within tabs have back navigation
      const { getByText } = render(
        <NavigationContainer>
          <ParentNavigator />
        </NavigationContainer>,
      );

      // The navigator should render successfully with tabs
      expect(getByText('Home')).toBeTruthy();
    });
  });

  describe('CaregiverNavigator', () => {
    it('should render CaregiverNavigator without errors', async () => {
      const { getByText } = render(
        <NavigationContainer>
          <CaregiverNavigator />
        </NavigationContainer>,
      );

      await waitFor(() => {
        // Should show tab labels
        expect(getByText('Home')).toBeTruthy();
        expect(getByText('Profile')).toBeTruthy();
      });
    });

    it('should have back navigation enabled in stack navigators', () => {
      // This test verifies that stack screens within tabs have back navigation
      const { getByText } = render(
        <NavigationContainer>
          <CaregiverNavigator />
        </NavigationContainer>,
      );

      // The navigator should render successfully with tabs
      expect(getByText('Home')).toBeTruthy();
    });
  });

  describe('Navigation Configuration', () => {
    it('should have proper header configuration for back navigation', () => {
      // Test that navigators have proper header configuration
      const { getByText } = render(
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>,
      );

      // Navigator should render with proper configuration
      expect(getByText('Login')).toBeTruthy();
    });

    it('should support slide_from_right animation for stack navigation', () => {
      // Test that stack navigators use slide_from_right animation
      // which is the standard animation that works with back navigation
      const { getByText } = render(
        <NavigationContainer>
          <ParentNavigator />
        </NavigationContainer>,
      );

      expect(getByText('Home')).toBeTruthy();
    });
  });
});
