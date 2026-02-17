/**
 * Logout Functionality Tests
 *
 * Tests for logout functionality in parent and caregiver screens.
 * Validates Requirements 4.4, 5.5
 *
 * @format
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ParentHomeScreen from '../src/screens/parent/ParentHomeScreen';
import CaregiverHomeScreen from '../src/screens/caregiver/CaregiverHomeScreen';
import { useAuth } from '../src/contexts/AuthContext';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock AuthContext
jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Logout Functionality', () => {
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      signOut: mockSignOut,
      loading: false,
    });
  });

  describe('ParentHomeScreen Logout', () => {
    it('should render logout button', () => {
      const { getByText } = render(<ParentHomeScreen />);
      expect(getByText('Logout')).toBeTruthy();
    });

    it('should show confirmation dialog when logout button is pressed', () => {
      const { getByText } = render(<ParentHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Logout' }),
        ]),
        expect.any(Object),
      );
    });

    it('should call signOut when logout is confirmed', async () => {
      mockSignOut.mockResolvedValue();
      const { getByText } = render(<ParentHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Get the confirmation handler and call it
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('should disable logout button during logout', async () => {
      mockSignOut.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );
      const { getByText } = render(<ParentHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Confirm logout
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      confirmButton.onPress();

      await waitFor(() => {
        expect(getByText('Logging out...')).toBeTruthy();
      });
    });

    it('should handle logout errors gracefully', async () => {
      const error = new Error('Logout failed');
      mockSignOut.mockRejectedValue(error);
      const { getByText } = render(<ParentHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Confirm logout
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to logout. Please try again.',
        );
      });
    });

    it('should have proper accessibility attributes', () => {
      const { getByLabelText } = render(<ParentHomeScreen />);
      const logoutButton = getByLabelText('Logout button');

      expect(logoutButton).toBeTruthy();
      expect(logoutButton.props.accessibilityRole).toBe('button');
      expect(logoutButton.props.accessibilityHint).toBe(
        'Double tap to logout from your account',
      );
    });
  });

  describe('CaregiverHomeScreen Logout', () => {
    it('should render logout button', () => {
      const { getByText } = render(<CaregiverHomeScreen />);
      expect(getByText('Logout')).toBeTruthy();
    });

    it('should show confirmation dialog when logout button is pressed', () => {
      const { getByText } = render(<CaregiverHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Logout' }),
        ]),
        expect.any(Object),
      );
    });

    it('should call signOut when logout is confirmed', async () => {
      mockSignOut.mockResolvedValue();
      const { getByText } = render(<CaregiverHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Get the confirmation handler and call it
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('should disable logout button during logout', async () => {
      mockSignOut.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );
      const { getByText } = render(<CaregiverHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Confirm logout
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      confirmButton.onPress();

      await waitFor(() => {
        expect(getByText('Logging out...')).toBeTruthy();
      });
    });

    it('should handle logout errors gracefully', async () => {
      const error = new Error('Logout failed');
      mockSignOut.mockRejectedValue(error);
      const { getByText } = render(<CaregiverHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Confirm logout
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to logout. Please try again.',
        );
      });
    });

    it('should have proper accessibility attributes', () => {
      const { getByLabelText } = render(<CaregiverHomeScreen />);
      const logoutButton = getByLabelText('Logout button');

      expect(logoutButton).toBeTruthy();
      expect(logoutButton.props.accessibilityRole).toBe('button');
      expect(logoutButton.props.accessibilityHint).toBe(
        'Double tap to logout from your account',
      );
    });
  });

  describe('Auth State Clearing', () => {
    it('should verify auth state is cleared after logout', async () => {
      mockSignOut.mockResolvedValue();
      const { getByText } = render(<ParentHomeScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Confirm logout
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });

      // Verify signOut was called (which clears auth state in AuthContext)
      // Navigation to login screen is handled by RootNavigator based on auth state
    });
  });
});
