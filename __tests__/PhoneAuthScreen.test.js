/**
 * PhoneAuthScreen Unit Tests
 *
 * Tests for PhoneAuthScreen component functionality including:
 * - Phone number input and formatting
 * - Validation error display
 * - Send OTP button behavior
 * - Loading state display
 * - Navigation on success
 * - Accessibility attributes
 *
 * Requirements: 1.1, 1.2, 1.3, 7.1, 8.1
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PhoneAuthScreen from '../src/screens/auth/PhoneAuthScreen';
import { useAuth } from '../src/contexts/AuthContext';
import { AuthScreens } from '../src/types/navigation';

// Mock the AuthContext
jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

describe('PhoneAuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      sendOTP: jest.fn(),
      loading: false,
      error: null,
    });
  });

  describe('Phone Number Input and Formatting', () => {
    it('should render phone number input field', () => {
      const { getByPlaceholderText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      expect(input).toBeTruthy();
    });

    it('should filter non-numeric characters from phone input', () => {
      const { getByPlaceholderText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, 'abc123def456');

      expect(input.props.value).toBe('123456');
    });

    it('should display formatted phone number', async () => {
      const { getByPlaceholderText, findByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, '2025551234');

      // Wait for formatting to occur
      await waitFor(() => {
        const formatted = findByText(/\(202\) 555-1234/);
        expect(formatted).toBeTruthy();
      });
    });
  });

  describe('Validation Error Display', () => {
    it('should show error when phone number is empty', async () => {
      const { getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText('Phone number is required')).toBeTruthy();
      });
    });

    it('should show error for invalid phone number', async () => {
      const { getByPlaceholderText, getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, '123'); // Too short

      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText('Please enter a valid phone number')).toBeTruthy();
      });
    });

    it('should clear validation error when user types', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      // Trigger validation error
      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      expect(getByText('Phone number is required')).toBeTruthy();

      // Type in input
      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, '2025551234');

      // Error should be cleared
      expect(queryByText('Phone number is required')).toBeNull();
    });
  });

  describe('Send OTP Button Behavior', () => {
    it('should call sendOTP with correct phone number', async () => {
      const mockSendOTP = jest.fn().mockResolvedValue('verification-id-123');
      useAuth.mockReturnValue({
        sendOTP: mockSendOTP,
        loading: false,
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, '2025551234');

      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockSendOTP).toHaveBeenCalledWith('+12025551234');
      });
    });

    it('should not call sendOTP when phone is invalid', async () => {
      const mockSendOTP = jest.fn();
      useAuth.mockReturnValue({
        sendOTP: mockSendOTP,
        loading: false,
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, '123'); // Invalid

      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockSendOTP).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State Display', () => {
    it('should show loading indicator when sending OTP', () => {
      useAuth.mockReturnValue({
        sendOTP: jest.fn(),
        loading: true,
        error: null,
      });

      const { getByTestId, queryByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      // ActivityIndicator should be visible
      expect(queryByText('Send OTP')).toBeNull();
    });

    it('should disable button during loading', () => {
      useAuth.mockReturnValue({
        sendOTP: jest.fn(),
        loading: true,
        error: null,
      });

      const { getByLabelText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const sendButton = getByLabelText('Send OTP');
      expect(sendButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should disable input during loading', () => {
      useAuth.mockReturnValue({
        sendOTP: jest.fn(),
        loading: true,
        error: null,
      });

      const { getByPlaceholderText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Navigation on Success', () => {
    it('should navigate to OTP screen after successful OTP send', async () => {
      const mockSendOTP = jest.fn().mockResolvedValue('verification-id-123');
      useAuth.mockReturnValue({
        sendOTP: mockSendOTP,
        loading: false,
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, '2025551234');

      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          AuthScreens.PHONE_VERIFICATION,
          {
            phoneNumber: '+12025551234',
            verificationId: 'verification-id-123',
          },
        );
      });
    });
  });

  describe('Accessibility Attributes', () => {
    it('should have accessibility label on phone input', () => {
      const { getByPlaceholderText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      expect(input.props.accessibilityLabel).toBe('Phone number input');
    });

    it('should have accessibility label on send button', () => {
      const { getByLabelText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const sendButton = getByLabelText('Send OTP');
      expect(sendButton.props.accessibilityLabel).toBe('Send OTP');
      expect(sendButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility label on country code button', () => {
      const { getByLabelText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const countryButton = getByLabelText('Select country code');
      expect(countryButton.props.accessibilityLabel).toBe(
        'Select country code',
      );
      expect(countryButton.props.accessibilityRole).toBe('button');
    });

    it('should announce errors to screen readers', async () => {
      const { getByText, UNSAFE_getByProps } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      await waitFor(() => {
        const errorContainer = UNSAFE_getByProps({
          accessibilityRole: 'alert',
        });
        expect(errorContainer).toBeTruthy();
        expect(errorContainer.props.accessibilityLive).toBe('polite');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display context error from AuthContext', () => {
      useAuth.mockReturnValue({
        sendOTP: jest.fn(),
        loading: false,
        error: 'Network error. Please check your connection',
      });

      const { getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      expect(
        getByText('Network error. Please check your connection'),
      ).toBeTruthy();
    });

    it('should display error when sendOTP fails', async () => {
      const mockSendOTP = jest
        .fn()
        .mockRejectedValue(new Error('Too many requests'));
      useAuth.mockReturnValue({
        sendOTP: mockSendOTP,
        loading: false,
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      const input = getByPlaceholderText('1234567890');
      fireEvent.changeText(input, '2025551234');

      const sendButton = getByText('Send OTP');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText(/Too many requests/)).toBeTruthy();
      });
    });
  });

  describe('Country Code Selection', () => {
    it('should display default country code', () => {
      const { getByText } = render(
        <PhoneAuthScreen navigation={mockNavigation} />,
      );

      expect(getByText('+1')).toBeTruthy();
    });
  });
});
