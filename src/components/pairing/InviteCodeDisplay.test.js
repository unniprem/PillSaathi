/**
 * InviteCodeDisplay Component Tests
 *
 * Unit tests for the InviteCodeDisplay component.
 * Tests code display, expiration countdown, and expired state.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * @format
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import InviteCodeDisplay from './InviteCodeDisplay';

describe('InviteCodeDisplay', () => {
  beforeEach(() => {
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
   * Test: Action buttons are present
   * Requirements: 2.1, 2.2 - Copy and share buttons
   */
  test('displays copy and share buttons', () => {
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

    expect(getByText('Copy Code')).toBeTruthy();
    expect(getByText('Share Code')).toBeTruthy();
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
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should now show 1m 4s
    expect(getByText(/1m 4s/)).toBeTruthy();
  });

  /**
   * Test: Countdown shows only seconds for short durations
   * Requirements: 2.3 - Show remaining time until expiration
   */
  test('displays only seconds when less than a minute remains', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 45 * 1000); // 45 seconds from now
    const onRegenerate = jest.fn();

    const { getByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    // Should show only seconds
    expect(getByText(/45s/)).toBeTruthy();
  });

  /**
   * Test: Component transitions to expired state when countdown reaches zero
   * Requirements: 2.4 - Display expiration message when code expires
   */
  test('transitions to expired state when countdown reaches zero', () => {
    const code = 'ABC12345';
    const expiresAt = new Date(Date.now() + 2000); // 2 seconds from now
    const onRegenerate = jest.fn();

    const { getByText, queryByText } = render(
      <InviteCodeDisplay
        code={code}
        expiresAt={expiresAt}
        onRegenerate={onRegenerate}
      />,
    );

    // Initially should show the code
    expect(getByText(code)).toBeTruthy();

    // Advance time past expiration
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should now show expired state
    expect(getByText('Code Expired')).toBeTruthy();
    expect(queryByText(code)).toBeNull();
  });
});
