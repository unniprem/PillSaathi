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

/** What is wrong, most important first. Empty when alarms should ring fine. */
export function healthIssues(
  health: Health,
  setup: SetupState,
  manufacturer: string,
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
    "Notifications are off, so alarms can't show. Tap to turn them on.",
  );
  add(
    !health.alarmChannelEnabled,
    'alarmChannel',
    'Alarm notifications are turned off. Tap to turn them on.',
  );
  add(
    !health.exactAlarmAllowed,
    'exactAlarm',
    "PillSaathi isn't allowed to set alarms. Tap to allow it.",
  );
  add(
    !health.fullScreenAllowed,
    'fullScreen',
    "Alarms can't show on the lock screen. Tap to allow it.",
  );
  add(
    health.backgroundRestricted,
    'backgroundRestricted',
    'Background use is restricted, so alarms may not ring. Tap to fix.',
  );
  add(
    health.alarmVolumeLow,
    'alarmVolume',
    'Alarm volume is off. Tap to turn it up.',
  );
  add(
    !health.ignoringBatteryOptimizations,
    'batteryOptimization',
    'Battery saving may stop alarms. Tap to allow unrestricted battery use.',
  );
  add(
    isAggressiveMaker(manufacturer) &&
      stepsFor(manufacturer).some(
        s => !s.autoDone && !setup.doneSteps.includes(s.key),
      ),
    'setup',
    'Finish setting up so alarms ring reliably on this phone.',
    'setup',
  );
  return issues;
}
