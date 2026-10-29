import React from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { act, render } from '@testing-library/react-native';
import * as family from '../../src/native/family';
import { useCheckIn } from '../../src/hooks/useCheckIn';
import { mockFamilyDefaults } from '../helpers/nativeMocks';

function Probe() {
  useCheckIn();
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFamilyDefaults();
});

afterEach(() => jest.restoreAllMocks());

test('useCheckIn checks in on start and when the app comes back, and watches only while in front', async () => {
  let onChange: (state: AppStateStatus) => void = () => {};
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
    onChange = handler as (state: AppStateStatus) => void;
    return { remove };
  });
  const view = await render(<Probe />);
  expect(family.checkIn).toHaveBeenCalledTimes(1);
  expect(family.watchChanges).toHaveBeenLastCalledWith(true);

  await act(async () => onChange('background'));
  expect(family.watchChanges).toHaveBeenLastCalledWith(false);
  expect(family.checkIn).toHaveBeenCalledTimes(1);

  await act(async () => onChange('active'));
  expect(family.checkIn).toHaveBeenCalledTimes(2);
  expect(family.watchChanges).toHaveBeenLastCalledWith(true);

  await view.unmount();
  expect(remove).toHaveBeenCalled();
  expect(family.watchChanges).toHaveBeenLastCalledWith(false);
});

test('a failed check-in is only logged', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(family.checkIn).mockRejectedValue(new Error('OFFLINE'));
  await render(<Probe />);
  await act(async () => {});
  expect(console.warn).toHaveBeenCalled();
});
