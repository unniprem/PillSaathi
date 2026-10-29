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

test('passes the photo source to native', async () => {
  const picked = {
    name: '3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg',
    uri: 'file:///data/user_de/0/com.pillsaathi/files/photos/3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg',
  };
  const native = { pickPhoto: jest.fn().mockResolvedValue(picked) };
  jest.resetModules();
  jest.doMock('../../specs/NativeAlarms', () => ({
    __esModule: true,
    default: native,
  }));
  const alarms: typeof AlarmsModule = require('../../src/native/alarms');

  await expect(alarms.pickPhoto('camera')).resolves.toEqual(picked);
  expect(native.pickPhoto).toHaveBeenCalledWith('camera');
  expect(alarms.AlarmErrors.PhotoError).toBe('PHOTO_ERROR');
});

test('getSettings maps an unknown role to null', async () => {
  const settings = {
    language: 'en',
    readAloud: true,
    languages: [{ code: 'en', label: 'English', draft: false }],
  };
  const native = {
    getSettings: jest
      .fn()
      .mockResolvedValueOnce({ ...settings, role: 'boss' })
      .mockResolvedValueOnce({ ...settings, role: null })
      .mockResolvedValueOnce({ ...settings, role: 'carer' }),
  };
  jest.resetModules();
  jest.doMock('../../specs/NativeAlarms', () => ({
    __esModule: true,
    default: native,
  }));
  const alarms: typeof AlarmsModule = require('../../src/native/alarms');

  await expect(alarms.getSettings()).resolves.toEqual({
    ...settings,
    role: null,
  });
  await expect(alarms.getSettings()).resolves.toEqual({
    ...settings,
    role: null,
  });
  await expect(alarms.getSettings()).resolves.toEqual({
    ...settings,
    role: 'carer',
  });
});

test('setRole passes the role through', async () => {
  const native = { setRole: jest.fn().mockResolvedValue(undefined) };
  jest.resetModules();
  jest.doMock('../../specs/NativeAlarms', () => ({
    __esModule: true,
    default: native,
  }));
  const alarms: typeof AlarmsModule = require('../../src/native/alarms');

  await alarms.setRole('elder');
  expect(native.setRole).toHaveBeenCalledWith('elder');
});

test('passes getHistory through', async () => {
  const history = {
    today: '2026-10-26',
    oldest: '2026-09-10',
    firstDayOfWeek: 1,
    doses: [
      {
        date: '2026-10-06',
        hour: 21,
        minute: 0,
        outcome: 'missed',
        at: 1791300000000,
        marked: false,
        pills: [
          {
            pillId: 'p1',
            name: 'Telma 40',
            form: 'tablet',
            amount: 1,
            exists: true,
            photoUri: null,
          },
        ],
      },
    ],
  };
  const native = { getHistory: jest.fn().mockResolvedValue(history) };
  jest.resetModules();
  jest.doMock('../../specs/NativeAlarms', () => ({
    __esModule: true,
    default: native,
  }));
  const alarms: typeof AlarmsModule = require('../../src/native/alarms');

  await expect(alarms.getHistory('2026-10-01', '2026-10-31')).resolves.toEqual(
    history,
  );
  expect(native.getHistory).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
});
