import { en } from '../i18n/en';
import type { Strings } from '../i18n/en';
import type { Health, SettingTarget, SetupState } from '../native/alarms';
import { isAggressiveMaker, stepsFor } from '../setup/oemSteps';

export type IssueKey =
  | 'notifications'
  | 'alarmChannel'
  | 'exactAlarm'
  | 'fullScreen'
  | 'backgroundRestricted'
  | 'alarmVolume'
  | 'batteryOptimization'
  | 'setup';

export type Issue = {
  key: IssueKey;
  message: string;
  action: SettingTarget | 'setup';
};

/** What is wrong, most important first, in [t]'s language. Empty when alarms should ring fine. */
export function healthIssues(
  health: Health,
  setup: SetupState,
  manufacturer: string,
  t: Strings = en,
): Issue[] {
  const issues: Issue[] = [];
  const add = (
    failing: boolean,
    key: IssueKey,
    message: string,
    action: Issue['action'] = key as SettingTarget,
  ) => {
    if (failing) {
      issues.push({ key, message, action });
    }
  };
  add(!health.notificationsEnabled, 'notifications', t.health.notifications);
  add(!health.alarmChannelEnabled, 'alarmChannel', t.health.alarmChannel);
  add(!health.exactAlarmAllowed, 'exactAlarm', t.health.exactAlarm);
  add(!health.fullScreenAllowed, 'fullScreen', t.health.fullScreen);
  add(
    health.backgroundRestricted,
    'backgroundRestricted',
    t.health.backgroundRestricted,
  );
  add(health.alarmVolumeLow, 'alarmVolume', t.health.alarmVolume);
  add(
    !health.ignoringBatteryOptimizations,
    'batteryOptimization',
    t.health.batteryOptimization,
  );
  add(
    isAggressiveMaker(manufacturer) &&
      stepsFor(manufacturer).some(
        s => !s.autoDone && !setup.doneSteps.includes(s.key),
      ),
    'setup',
    t.health.setup,
    'setup',
  );
  return issues;
}

type AlertKey = keyof Strings['health']['alerts'];
const ALERT_KEYS: AlertKey[] = [
  'notifications',
  'exactAlarm',
  'backgroundRestricted',
  'batteryOptimization',
  'setup',
];

/**
 * For a phone with no pills of its own that follows someone: it rings nothing, but its missed-dose
 * checks are alarms and the news comes as a notification. So only what can make those late is
 * kept, each said about them, with the same fix.
 */
export function alertIssues(issues: Issue[], t: Strings = en): Issue[] {
  return issues.flatMap(issue =>
    (ALERT_KEYS as IssueKey[]).includes(issue.key)
      ? [{ ...issue, message: t.health.alerts[issue.key as AlertKey] }]
      : [],
  );
}
