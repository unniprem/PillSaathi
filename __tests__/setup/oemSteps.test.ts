import {
  autoChecked,
  isAggressiveMaker,
  makerKey,
  makerName,
  setupProgress,
  stepsFor,
} from '../../src/setup/oemSteps';
import { hi } from '../../src/i18n/hi';

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
    body: "Battery saving can delay or stop alarms. On the next screen, switch to All apps, find PillSaathi and choose Don't optimise.",
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

test('gives each step in the app language', () => {
  const steps = stepsFor('Xiaomi', hi);
  expect(steps.map(s => s.title)).toEqual([
    hi.setup.steps.xiaomiAutostart.title,
    hi.setup.steps.xiaomiBattery.title,
    hi.setup.steps.lockRecents.title,
    hi.setup.steps.battery.title,
  ]);
  expect(stepsFor('oppo', hi)[0].body).toBe(hi.setup.steps.oppoAutostart.body);
  expect(stepsFor('huawei', hi)[0].title).toBe(
    hi.setup.steps.huaweiLaunch.title,
  );
  expect(stepsFor('samsung', hi)[0].title).toBe(
    hi.setup.steps.samsungSleeping.title,
  );
});

test('setupProgress counts auto-checked steps as done', () => {
  const steps = stepsFor('Xiaomi');
  const allowed = (check: string) => check === 'batteryOptimization';
  expect(setupProgress(steps, [], allowed)).toEqual({
    done: 1,
    total: 4,
    current: 'autostart',
  });
  expect(setupProgress(steps, ['autostart'], () => false)).toEqual({
    done: 1,
    total: 4,
    current: 'oemBattery',
  });
  expect(
    setupProgress(steps, ['autostart', 'oemBattery', 'lockRecents'], allowed),
  ).toEqual({ done: 4, total: 4, current: null });
});

test('setupProgress: the current step is the first not done, whatever comes after', () => {
  const steps = stepsFor('Xiaomi');
  expect(setupProgress(steps, ['lockRecents'], () => false)).toEqual({
    done: 1,
    total: 4,
    current: 'autostart',
  });
  expect(
    setupProgress(
      steps,
      ['autostart', 'oemBattery', 'lockRecents'],
      () => false,
    ),
  ).toEqual({ done: 3, total: 4, current: 'battery' });
});

test('setupProgress: only the phone can tick an auto-checked step', () => {
  // A stray mark for the battery step, from before the phone checked it itself.
  expect(setupProgress(stepsFor('Google'), ['battery'], () => false)).toEqual({
    done: 0,
    total: 1,
    current: 'battery',
  });
});

test("names the phone's maker as a person would", () => {
  expect(makerName('Xiaomi')).toBe('Xiaomi');
  expect(makerName('samsung')).toBe('Samsung');
  expect(makerName(' realme ')).toBe('Realme');
  expect(makerName('HUAWEI')).toBe('HUAWEI');
  expect(makerName('')).toBe('');
});

test('the battery check passes when the phone ignores battery saving for the app', () => {
  const health = {
    notificationsEnabled: true,
    alarmChannelEnabled: true,
    exactAlarmAllowed: true,
    fullScreenAllowed: true,
    ignoringBatteryOptimizations: true,
    backgroundRestricted: false,
    alarmVolumeLow: false,
  };
  expect(autoChecked(health)('batteryOptimization')).toBe(true);
  expect(
    autoChecked({ ...health, ignoringBatteryOptimizations: false })(
      'batteryOptimization',
    ),
  ).toBe(false);
  expect(autoChecked(null)('batteryOptimization')).toBe(false);
  expect(
    setupProgress(stepsFor('Google'), [], autoChecked(health)).current,
  ).toBeNull();
});
