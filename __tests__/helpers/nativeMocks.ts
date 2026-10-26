import * as alarms from '../../src/native/alarms';
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

export const emptyToday: Today = { date: '2026-10-26', cards: [] };

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
