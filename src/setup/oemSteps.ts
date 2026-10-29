import { Platform } from 'react-native';
import { en } from '../i18n/en';
import type { Strings } from '../i18n/en';
import type { Health, SettingTarget } from '../native/alarms';

export type SetupStep = {
  key: string;
  title: string;
  body: string;
  setting?: SettingTarget;
  autoDone?: 'batteryOptimization';
};

export type MakerKey =
  | 'xiaomi'
  | 'oppo'
  | 'vivo'
  | 'samsung'
  | 'huawei'
  | 'other';

const MAKERS: Record<string, MakerKey> = {
  xiaomi: 'xiaomi',
  redmi: 'xiaomi',
  poco: 'xiaomi',
  oppo: 'oppo',
  realme: 'oppo',
  oneplus: 'oppo',
  vivo: 'vivo',
  iqoo: 'vivo',
  samsung: 'samsung',
  huawei: 'huawei',
  honor: 'huawei',
};

/** The phone's manufacturer as Android reports it ('' where unknown). */
export function currentManufacturer(): string {
  const constants = Platform.constants as { Manufacturer?: string };
  return constants?.Manufacturer ?? '';
}

export function makerKey(manufacturer: string): MakerKey {
  return MAKERS[manufacturer.trim().toLowerCase()] ?? 'other';
}

export function isAggressiveMaker(manufacturer: string): boolean {
  return makerKey(manufacturer) !== 'other';
}

/** The maker as a person would write it: "Samsung" for "samsung" ('' where unknown). */
export function makerName(manufacturer: string): string {
  const name = manufacturer.trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A step before its words: [copy] names them in `t.setup.steps`. */
type StepDef = Omit<SetupStep, 'title' | 'body'> & { copy: StepCopy };
type StepCopy = keyof Strings['setup']['steps'];

const LOCK_RECENTS: StepDef = { key: 'lockRecents', copy: 'lockRecents' };

const BATTERY_STEP: StepDef = {
  key: 'battery',
  copy: 'battery',
  setting: 'batteryOptimization',
  autoDone: 'batteryOptimization',
};

const STEPS: Record<MakerKey, StepDef[]> = {
  xiaomi: [
    { key: 'autostart', copy: 'xiaomiAutostart', setting: 'oemAutostart' },
    { key: 'oemBattery', copy: 'xiaomiBattery', setting: 'oemBattery' },
    LOCK_RECENTS,
  ],
  oppo: [
    { key: 'autostart', copy: 'oppoAutostart', setting: 'oemAutostart' },
    { key: 'oemBattery', copy: 'oppoBattery', setting: 'oemBattery' },
    LOCK_RECENTS,
  ],
  vivo: [
    { key: 'autostart', copy: 'vivoAutostart', setting: 'oemAutostart' },
    { key: 'oemBattery', copy: 'vivoBattery', setting: 'oemBattery' },
    LOCK_RECENTS,
  ],
  samsung: [
    { key: 'samsungSleeping', copy: 'samsungSleeping', setting: 'oemBattery' },
  ],
  huawei: [{ key: 'autostart', copy: 'huaweiLaunch', setting: 'oemAutostart' }],
  other: [],
};

/** The maker's steps, then the battery step, in [t]'s language. */
export function stepsFor(manufacturer: string, t: Strings = en): SetupStep[] {
  return [...STEPS[makerKey(manufacturer)], BATTERY_STEP].map(
    ({ copy, ...step }) => ({ ...step, ...t.setup.steps[copy] }),
  );
}

/** Whether the phone itself reports a step's check as passed, from [health] (false unread). */
export function autoChecked(health: Health | null): (key: string) => boolean {
  return key =>
    key === 'batteryOptimization' &&
    (health?.ignoringBatteryOptimizations ?? false);
}

/**
 * Whether [step] is done. A step the phone checks itself ([autoDone] answers for its check) is
 * done only when the phone says so; the others when she said she did them.
 */
export function stepDone(
  step: SetupStep,
  doneSteps: string[],
  autoDone: (key: string) => boolean,
): boolean {
  return step.autoDone ? autoDone(step.autoDone) : doneSteps.includes(step.key);
}

/** How far through [steps] the phone is, and the first step not done (null when all are). */
export function setupProgress(
  steps: SetupStep[],
  doneSteps: string[],
  autoDone: (key: string) => boolean,
): { done: number; total: number; current: string | null } {
  const left = steps.filter(s => !stepDone(s, doneSteps, autoDone));
  return {
    done: steps.length - left.length,
    total: steps.length,
    current: left[0]?.key ?? null,
  };
}
