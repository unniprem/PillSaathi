import { Platform } from 'react-native';
import { en } from '../i18n/en';
import type { Strings } from '../i18n/en';
import type { SettingTarget } from '../native/alarms';

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
