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
  add(
    !health.notificationsEnabled,
    'notifications',
    t.health.notifications,
  );
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
