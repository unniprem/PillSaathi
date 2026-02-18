/**
 * LogoutHeader Component Tests
 *
 * Tests for the reusable LogoutHeader component.
 * Validates Requirements 2.1, 2.2, 2.3, 2.4, 12.1, 12.2, 12.3, 12.4
 *
 * @format
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LogoutHeader from './LogoutHeader';
import { useAuth } from '../contexts/AuthContext';

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('LogoutHeader Component', () => {
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      signOut: mockSignOut,
      loading: false,
    });
  });

  describe('Rendering', () => {
    it('should render logout button', () => {
      const { getByText } = render(<LogoutHeader />);
      expect(getByText('Logout')).toBeTruthy();
    });

    it('should have proper accessibility attributes', () => {
      const { getByLabelText } = render(<LogoutHeader />);
      const logoutButton = getByLabelText('Logout');

      expect(logoutButton).toBeTruthy();
      expect(logoutButton.props.accessibilityRole).toBe('button');
      expect(logoutButton.props.accessibilityHint).toBe(
        'Double tap to logout from the app',
      );
    });
  });

  describe('Logout Confirmation Dialog', () => {
    it('should show confirmation dialog when logout button is pressed', () => {
      const { getByText } = render(<LogoutHeader />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Logout', style: 'destructive' }),
        ]),
        expect.objectContaining({ cancelable: true }),
      );
    });

    it('should not call signOut when cancel is pressed', () => {
      const { getByText } = render(<LogoutHeader />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Get the cancel handler and call it
      const alertCall = Alert.alert.mock.calls[0];
      const cancelButton = alertCall[2].find(btn => btn.text === 'Cancel');
      cancelButton.onPress();

      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe('SignOut Functionality', () => {
    it('should call signOut when logout is confirmed', async () => {
      mockSignOut.mockResolvedValue();
      const { getByText } = render(<LogoutHeader />);
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

    it('should disable logout button when loading', () => {
      useAuth.mockReturnValue({
        signOut: mockSignOut,
        loading: true,
      });

      const { getByLabelText } = render(<LogoutHeader />);
      const logoutButton = getByLabelText('Logout');

      expect(logoutButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should show error alert when logout fails', async () => {
      const error = new Error('Network error');
      mockSignOut.mockRejectedValue(error);
      const { getByText } = render(<LogoutHeader />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Confirm logout
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Logout Failed',
          'Network error',
          [{ text: 'OK' }],
        );
      });
    });

    it('should show generic error message when error has no message', async () => {
      const error = new Error();
      mockSignOut.mockRejectedValue(error);
      const { getByText } = render(<LogoutHeader />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Confirm logout
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find(btn => btn.text === 'Logout');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Logout Failed',
          'Failed to logout. Please try again.',
          [{ text: 'OK' }],
        );
      });
    });
  });
});
