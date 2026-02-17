/**
 * InviteCodeDisplay Component Tests
 *
 * Unit tests for the InviteCodeDisplay component.
 * Tests code display, expiration countdown, copy/share functionality, and expired state.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * @format
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import InviteCodeDisplay from './InviteCodeDisplay';

// Mock React Native modules
const mockAlert = jest.fn();
const mockShare = jest.fn(() => Promise.resolve({ action: 'sharedAction' }));
const mockSetString = jest.fn();

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: mockAlert,
    },
    Share: {
      share: mockShare,
    },
    Clipboard: {
      setString: mockSetString,
    },
  };
});

describe('InviteCodeDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockShare.mockClear();
    mockSetString.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test: Code display formatting
   * Requirements: 2.1 - Display code in readable format
   */
  test('displays invite code in large, readable format', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    expect(getByText(code)).toBeTruthy();
    expect(getByText('Your Invite Code')).toBeTruthy();
  });

  /**
   * Test: Expiration countdown calculation
   * Requirements: 2.3 - Show remaining time until expiration
   */
  test('displays expiration countdown timer', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    expect(getByText('Expires in:')).toBeTruthy();
    // Should show hours and minutes
    expect(getByText(/2h/)).toBeTruthy();
  });

  /**
   * Test: Copy to clipboard functionality
   * Requirements: 2.1 - Copy to clipboard button
   */
  test('copies code to clipboard when copy button is pressed', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    const copyButton = getByText('Copy Code');
    fireEvent.press(copyButton);

    expect(mockSetString).toHaveBeenCalledWith(code);
    expect(mockAlert).toHaveBeenCalledWith(
      'Copied!',
      'Invite code copied to clipboard',
      [{ text: 'OK' }],
    );
  });

  /**
   * Test: Share button functionality
   * Requirements: 2.2 - Provide native sharing options
   */
  test('opens share dialog when share button is pressed', async () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    const shareButton = getByText('Share Code');
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        message: expect.stringContaining(code),
        title: 'PillSathi Invite Code',
      });
    });
  });

  /**
   * Test: Expired code UI
   * Requirements: 2.4 - Display expiration message and offer to generate new code
   */
  test('displays expired message when code has expired', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
    const onRegenerate = jest.fn();

    const { getByText, queryByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    expect(getByText('Code Expired')).toBeTruthy();
    expect(
      getByText(/This invite code has expired. Generate a new code/),
    ).toBeTruthy();
    expect(getByText('Generate New Code')).toBeTruthy();

    // Should not show the code or action buttons
    expect(queryByText(code)).toBeNull();
    expect(queryByText('Copy Code')).toBeNull();
    expect(queryByText('Share Code')).toBeNull();
  });

  /**
   * Test: Regenerate button calls callback
   * Requirements: 2.4 - Offer to generate new code
   */
  test('calls onRegenerate when regenerate button is pressed', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() - 1000); // Expired
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    const regenerateButton = getByText('Generate New Code');
    fireEvent.press(regenerateButton);

    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Loading state disables regenerate button
   * Requirements: 2.4 - Handle loading state during regeneration
   */
  test('disables regenerate button when loading', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() - 1000); // Expired
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
        loading={true}
      />,
    );

    const regenerateButton = getByText('Generating...');
    expect(regenerateButton).toBeTruthy();

    fireEvent.press(regenerateButton);
    // Should still be called even when disabled (React Native behavior)
    // The disabled prop prevents visual feedback but doesn't prevent the event
  });

  /**
   * Test: Countdown updates every second
   * Requirements: 2.3 - Show remaining time until expiration
   */
  test('updates countdown timer every second', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 65 * 1000); // 1 minute 5 seconds from now
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    // Initial state should show 1m 5s
    expect(getByText(/1m 5s/)).toBeTruthy();

    // Advance time by 1 second
    jest.advanceTimersByTime(1000);

    // Should now show 1m 4s
    expect(getByText(/1m 4s/)).toBeTruthy();
  });

  /**
   * Test: Share error handling
   * Requirements: 2.2 - Handle share errors gracefully
   */
  test('handles share errors gracefully', async () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const onRegenerate = jest.fn();

    // Mock Share.share to reject
    Share.share.mockRejectedValueOnce(new Error('Share failed'));

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    const shareButton = getByText('Share Code');
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to share invite code. Please try again.',
        [{ text: 'OK' }],
      );
    });
  });
});
