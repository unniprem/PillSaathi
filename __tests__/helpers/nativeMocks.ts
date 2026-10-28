import * as alarms from '../../src/native/alarms';
import * as family from '../../src/native/family';
import { familyDefaults } from './familyDefaults';
import type { Health, Today } from '../../src/native/alarms';

/** A phone with nothing in the way of alarms ringing. */
export const healthy: Health = {
  notificationsEnabled: true,
  alarmChannelEnabled: true,
  exactAlarmAllowed: true,
  fullScreenAllowed: true,
  ignoringBatteryOptimizations: true,
  backgroundRestricted: false,
  alarmVolumeLow: false,
};

export const emptyToday: Today = {
  date: '2026-10-26',
  cards: [],
  refills: [],
};

/** Defaults for a mocked `src/native/alarms`: no pills, nothing missed, healthy. */
export function mockAlarmsDefaults() {
  jest.mocked(alarms.getToday).mockResolvedValue(emptyToday);
  jest.mocked(alarms.listPills).mockResolvedValue([]);
  jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([]);
  jest.mocked(alarms.is24HourFormat).mockReturnValue(false);
  jest.mocked(alarms.getHealth).mockResolvedValue(healthy);
  jest.mocked(alarms.getSetupState).mockResolvedValue({
    seen: true,
    doneSteps: [],
  });
  jest.mocked(alarms.setCardSound).mockResolvedValue();
  jest.mocked(alarms.markDoseTaken).mockResolvedValue();
  jest.mocked(alarms.getHistory).mockResolvedValue({
    today: '2026-10-26',
    oldest: null,
    firstDayOfWeek: 0,
    doses: [],
  });
  jest.mocked(alarms.currentLanguage).mockReturnValue('en');
  jest.mocked(alarms.getSettings).mockResolvedValue({
    language: 'en',
    readAloud: true,
    languages: [{ code: 'en', label: 'English', draft: false }],
  });
  jest.mocked(alarms.setLanguage).mockResolvedValue();
  jest.mocked(alarms.setReadAloud).mockResolvedValue();
  jest.mocked(alarms.tryReadAloud).mockResolvedValue('spoken');
}

/** Puts the mocked `src/native/family` back to a phone that has never used Family. */
export function mockFamilyDefaults() {
  for (const [name, value] of Object.entries(familyDefaults)) {
    const fn = (family as unknown as Record<string, jest.Mock>)[name];
    fn.mockReset();
    fn.mockImplementation(() => Promise.resolve(value));
  }
}
