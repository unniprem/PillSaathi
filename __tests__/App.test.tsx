/**
 * @format
 */

import { render, screen } from '@testing-library/react-native';
import App from '../App';

jest.mock('../src/native/alarms');
jest.mock('../src/native/sounds');

test('opens on the empty Today screen', async () => {
  const alarms = require('../src/native/alarms');
  const sounds = require('../src/native/sounds');
  alarms.getToday.mockResolvedValue({ date: '2026-10-26', cards: [] });
  alarms.reconcileOnAppOpen.mockResolvedValue([]);
  alarms.getHealth.mockResolvedValue({});
  alarms.getSetupState.mockResolvedValue({ seen: true, doneSteps: [] });
  alarms.is24HourFormat.mockReturnValue(false);
  sounds.listSounds.mockResolvedValue([]);
  await render(<App />);
  expect(
    await screen.findByText('No pills yet. Tap + Add pill to add one.'),
  ).toBeTruthy();
});
