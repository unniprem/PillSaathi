import { getToday, listPills, openSetting } from '../../src/native/alarms';
import type * as AlarmsModule from '../../src/native/alarms';

jest.mock('../../specs/NativeAlarms', () => ({
  __esModule: true,
  default: null,
}));

test('rejects when the native module is missing (iOS)', async () => {
  await expect(listPills()).rejects.toThrow(
    'PillSaathi alarms are Android-only for now',
  );
  await expect(getToday()).rejects.toThrow(
    'PillSaathi alarms are Android-only for now',
  );
  await expect(openSetting('appInfo')).rejects.toThrow(
    'PillSaathi alarms are Android-only for now',
  );
});

test('passes calls and results through to the native module', async () => {
  const today = {
    date: '2026-10-26',
    cards: [
      {
        alarmId: 'c8',
        hour: 8,
        minute: 0,
        soundId: null,
        status: 'upcoming',
        statusAt: null,
        pills: [
          {
            pillId: 'p1',
            name: 'Telma 40',
            form: 'tablet',
            amount: 0.5,
            startDate: '2026-10-26',
            days: null,
            exists: true,
            fromTomorrow: false,
          },
        ],
      },
    ],
  };
  const native = {
    getToday: jest.fn().mockResolvedValue(today),
    markDoseTaken: jest.fn().mockResolvedValue(undefined),
    openSetting: jest.fn().mockResolvedValue(false),
    is24HourFormat: jest.fn().mockReturnValue(true),
  };
  jest.resetModules();
  jest.doMock('../../specs/NativeAlarms', () => ({
    __esModule: true,
    default: native,
  }));
  const alarms: typeof AlarmsModule = require('../../src/native/alarms');

  await expect(alarms.getToday()).resolves.toEqual(today);
  await alarms.markDoseTaken('2026-10-26', 14, 0);
  expect(native.markDoseTaken).toHaveBeenCalledWith('2026-10-26', 14, 0);
  await expect(alarms.openSetting('exactAlarm')).resolves.toBe(false);
  expect(native.openSetting).toHaveBeenCalledWith('exactAlarm');
  expect(alarms.is24HourFormat()).toBe(true);
});
