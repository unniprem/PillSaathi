/**
 * @format
 */

import { render, screen } from '@testing-library/react-native';
import App from '../App';

jest.mock('../src/native/alarms');
jest.mock('../src/native/sounds');

test('renders the empty alarm list', async () => {
  const alarms = require('../src/native/alarms');
  const sounds = require('../src/native/sounds');
  alarms.listAlarms.mockResolvedValue([]);
  alarms.reconcileOnAppOpen.mockResolvedValue([]);
  alarms.getHealth.mockResolvedValue({});
  alarms.getSetupState.mockResolvedValue({ seen: true, doneSteps: [] });
  alarms.is24HourFormat.mockReturnValue(false);
  sounds.listSounds.mockResolvedValue([]);
  await render(<App />);
  expect(
    await screen.findByText('No alarms yet. Tap + to add one.'),
  ).toBeTruthy();
});
