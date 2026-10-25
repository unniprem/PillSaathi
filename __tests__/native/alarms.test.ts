import { listAlarms, openSetting } from '../../src/native/alarms';
import type * as AlarmsModule from '../../src/native/alarms';

jest.mock('../../specs/NativeAlarms', () => ({
  __esModule: true,
  default: null,
}));

test('rejects when the native module is missing (iOS)', async () => {
  await expect(listAlarms()).rejects.toThrow(
    'PillSaathi alarms are Android-only for now',
  );
  await expect(openSetting('appInfo')).rejects.toThrow(
    'PillSaathi alarms are Android-only for now',
  );
});

test('passes calls and results through to the native module', async () => {
  const alarm = {
    id: 'a1',
    hour: 7,
    minute: 0,
    days: [1],
    name: 'Tablet',
    soundId: null,
    enabled: true,
    nextTriggerAt: 5,
    snoozeUntil: null,
  };
  const native = {
    listAlarms: jest.fn().mockResolvedValue([alarm]),
    openSetting: jest.fn().mockResolvedValue(false),
    is24HourFormat: jest.fn().mockReturnValue(true),
  };
  jest.resetModules();
  jest.doMock('../../specs/NativeAlarms', () => ({
    __esModule: true,
    default: native,
  }));
  const alarms: typeof AlarmsModule = require('../../src/native/alarms');

  await expect(alarms.listAlarms()).resolves.toEqual([alarm]);
  await expect(alarms.openSetting('exactAlarm')).resolves.toBe(false);
  expect(native.openSetting).toHaveBeenCalledWith('exactAlarm');
  expect(alarms.is24HourFormat()).toBe(true);
});
