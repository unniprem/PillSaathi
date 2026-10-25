import {
  isAggressiveMaker,
  makerKey,
  stepsFor,
} from '../../src/setup/oemSteps';

test('maps makers to their skin family', () => {
  expect(makerKey('Xiaomi')).toBe('xiaomi');
  expect(makerKey('POCO')).toBe('xiaomi');
  expect(makerKey('Redmi')).toBe('xiaomi');
  expect(makerKey('realme')).toBe('oppo');
  expect(makerKey('OnePlus')).toBe('oppo');
  expect(makerKey('OPPO')).toBe('oppo');
  expect(makerKey('vivo')).toBe('vivo');
  expect(makerKey('iQOO')).toBe('vivo');
  expect(makerKey('samsung')).toBe('samsung');
  expect(makerKey('HONOR')).toBe('huawei');
  expect(makerKey('HUAWEI')).toBe('huawei');
  expect(makerKey('Google')).toBe('other');
  expect(makerKey('')).toBe('other');
});

test('only "other" is not an aggressive maker', () => {
  expect(isAggressiveMaker('Xiaomi')).toBe(true);
  expect(isAggressiveMaker('samsung')).toBe(true);
  expect(isAggressiveMaker('Google')).toBe(false);
});

test('steps per maker always end with the battery step', () => {
  expect(stepsFor('Xiaomi').map(s => s.key)).toEqual([
    'autostart',
    'oemBattery',
    'lockRecents',
    'battery',
  ]);
  expect(stepsFor('vivo').map(s => s.key)).toEqual([
    'autostart',
    'oemBattery',
    'lockRecents',
    'battery',
  ]);
  expect(stepsFor('samsung').map(s => s.key)).toEqual([
    'samsungSleeping',
    'battery',
  ]);
  expect(stepsFor('huawei').map(s => s.key)).toEqual(['autostart', 'battery']);
  expect(stepsFor('Google').map(s => s.key)).toEqual(['battery']);
  expect(stepsFor('Google')[0]).toEqual({
    key: 'battery',
    title: 'Allow unrestricted battery use',
    body: 'Battery saving can delay or stop alarms.',
    setting: 'batteryOptimization',
    autoDone: 'batteryOptimization',
  });
});

test('settings per step follow the table', () => {
  const byKey = (m: string) =>
    Object.fromEntries(stepsFor(m).map(s => [s.key, s.setting]));
  expect(byKey('Xiaomi')).toMatchObject({
    autostart: 'oemAutostart',
    oemBattery: 'oemBattery',
    lockRecents: undefined,
  });
  expect(byKey('samsung').samsungSleeping).toBe('oemBattery');
  expect(byKey('huawei').autostart).toBe('oemAutostart');
  expect(stepsFor('oppo')[0].title).toBe('Allow auto-launch');
  expect(stepsFor('vivo')[1].title).toBe('Allow high background power use');
});
