import { hi } from '../../src/i18n/hi';
import { alertIssues, healthIssues } from '../../src/lib/health';
import type { Health } from '../../src/native/alarms';

const ok: Health = {
  notificationsEnabled: true,
  alarmChannelEnabled: true,
  exactAlarmAllowed: true,
  fullScreenAllowed: true,
  ignoringBatteryOptimizations: true,
  backgroundRestricted: false,
  alarmVolumeLow: false,
};

test('no issues on a healthy, non-aggressive phone', () => {
  expect(healthIssues(ok, { seen: true, doneSteps: [] }, 'Google')).toEqual([]);
});

test('aggressive makers need their manual steps done', () => {
  expect(
    healthIssues(ok, { seen: true, doneSteps: [] }, 'Xiaomi').map(i => i.key),
  ).toEqual(['setup']);
  expect(
    healthIssues(
      ok,
      { seen: true, doneSteps: ['autostart', 'oemBattery'] },
      'Xiaomi',
    ).map(i => i.key),
  ).toEqual(['setup']);
  expect(
    healthIssues(
      ok,
      { seen: true, doneSteps: ['autostart', 'oemBattery', 'lockRecents'] },
      'Xiaomi',
    ),
  ).toEqual([]);
});

test('issues come in the specified order', () => {
  expect(
    healthIssues(
      {
        ...ok,
        notificationsEnabled: false,
        alarmVolumeLow: true,
        ignoringBatteryOptimizations: false,
      },
      { seen: true, doneSteps: [] },
      'Google',
    ).map(i => i.key),
  ).toEqual(['notifications', 'alarmVolume', 'batteryOptimization']);
});

test('every issue has its exact message and action', () => {
  const all = healthIssues(
    {
      notificationsEnabled: false,
      alarmChannelEnabled: false,
      exactAlarmAllowed: false,
      fullScreenAllowed: false,
      ignoringBatteryOptimizations: false,
      backgroundRestricted: true,
      alarmVolumeLow: true,
    },
    { seen: true, doneSteps: [] },
    'Xiaomi',
  );
  expect(all.map(i => [i.key, i.action, i.message])).toEqual([
    [
      'notifications',
      'notifications',
      "Notifications are off, so alarms can't show. Tap to turn them on.",
    ],
    [
      'alarmChannel',
      'alarmChannel',
      'Alarm notifications are turned off. Tap to turn them on.',
    ],
    [
      'exactAlarm',
      'exactAlarm',
      "PillSaathi isn't allowed to set alarms. Tap to allow it.",
    ],
    [
      'fullScreen',
      'fullScreen',
      "Alarms can't show on the lock screen. Tap to allow it.",
    ],
    [
      'backgroundRestricted',
      'backgroundRestricted',
      'Background use is restricted, so alarms may not ring. Tap to fix.',
    ],
    ['alarmVolume', 'alarmVolume', 'Alarm volume is off. Tap to turn it up.'],
    [
      'batteryOptimization',
      'batteryOptimization',
      'Battery saving may stop alarms. Tap to allow unrestricted battery use.',
    ],
    [
      'setup',
      'setup',
      'Finish setting up so alarms ring reliably on this phone.',
    ],
  ]);
});

test('says what is wrong in the app language', () => {
  const issues = healthIssues(
    { ...ok, notificationsEnabled: false },
    { seen: true, doneSteps: [] },
    'Xiaomi',
    hi,
  );
  expect(issues.map(i => i.message)).toEqual([
    hi.health.notifications,
    hi.health.setup,
  ]);
});

// A phone with no pills of its own rings nothing, but its missed-dose checks are alarms and the
// news is a notification: only what can make those late is kept, said about them.
test('alertIssues keeps what can delay his missed-dose alerts, in their words', () => {
  const all = healthIssues(
    {
      notificationsEnabled: false,
      alarmChannelEnabled: false,
      exactAlarmAllowed: false,
      fullScreenAllowed: false,
      ignoringBatteryOptimizations: false,
      backgroundRestricted: true,
      alarmVolumeLow: true,
    },
    { seen: true, doneSteps: [] },
    'Xiaomi',
  );
  const alerts = alertIssues(all);
  expect(alerts.map(i => [i.key, i.action])).toEqual([
    ['notifications', 'notifications'],
    ['exactAlarm', 'exactAlarm'],
    ['backgroundRestricted', 'backgroundRestricted'],
    ['batteryOptimization', 'batteryOptimization'],
    ['setup', 'setup'],
  ]);
  expect(alerts[0].message).toBe(
    "Notifications are off, so you won't hear about a missed dose. Tap to turn them on.",
  );
  expect(alertIssues(all, hi)[3].message).toBe(
    hi.health.alerts.batteryOptimization,
  );
  expect(alertIssues([])).toEqual([]);
});
