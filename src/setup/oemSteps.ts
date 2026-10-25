import { Platform } from 'react-native';
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

const lockRecents = (): SetupStep => ({
  key: 'lockRecents',
  title: 'Lock PillSaathi in recent apps',
  body: 'Open recent apps, then touch and hold the PillSaathi card and tap Lock.',
});

const BATTERY_STEP: SetupStep = {
  key: 'battery',
  title: 'Allow unrestricted battery use',
  body: 'Battery saving can delay or stop alarms.',
  setting: 'batteryOptimization',
  autoDone: 'batteryOptimization',
};

const STEPS: Record<MakerKey, SetupStep[]> = {
  xiaomi: [
    {
      key: 'autostart',
      title: 'Turn on Autostart',
      body: 'Find PillSaathi in the list and switch it on.',
      setting: 'oemAutostart',
    },
    {
      key: 'oemBattery',
      title: 'Set Battery saver to No restrictions',
      body: 'Tap PillSaathi, then choose No restrictions.',
      setting: 'oemBattery',
    },
    lockRecents(),
  ],
  oppo: [
    {
      key: 'autostart',
      title: 'Allow auto-launch',
      body: 'Find PillSaathi in the list and switch it on.',
      setting: 'oemAutostart',
    },
    {
      key: 'oemBattery',
      title: 'Allow background activity',
      body: 'Open Battery for PillSaathi and switch on Allow background activity.',
      setting: 'oemBattery',
    },
    lockRecents(),
  ],
  vivo: [
    {
      key: 'autostart',
      title: 'Allow background start (Autostart)',
      body: 'Find PillSaathi in the list and switch it on.',
      setting: 'oemAutostart',
    },
    {
      key: 'oemBattery',
      title: 'Allow high background power use',
      body: 'Open Battery for PillSaathi and allow high background power use.',
      setting: 'oemBattery',
    },
    lockRecents(),
  ],
  samsung: [
    {
      key: 'samsungSleeping',
      title: 'Remove PillSaathi from Sleeping and Deep sleeping apps',
      body: 'Open Sleeping apps and Deep sleeping apps, and remove PillSaathi from both lists.',
      setting: 'oemBattery',
    },
  ],
  huawei: [
    {
      key: 'autostart',
      title: 'Set App launch to Manage manually and allow all',
      body: 'Tap PillSaathi, choose Manage manually, and switch on all three options.',
      setting: 'oemAutostart',
    },
  ],
  other: [],
};

export function stepsFor(manufacturer: string): SetupStep[] {
  return [...STEPS[makerKey(manufacturer)], BATTERY_STEP];
}
