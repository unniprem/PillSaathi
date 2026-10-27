import { AppState } from 'react-native';
import { act, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import { en } from '../../src/i18n/en';
import { hi } from '../../src/i18n/hi';
import { ml } from '../../src/i18n/ml';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

/** Every key path in [table], with each function's arity, so a missing or extra key shows. */
function shape(table: object, prefix = ''): string[] {
  return Object.entries(table).flatMap(([key, value]) => {
    const path = `${prefix}${key}`;
    if (typeof value === 'function') {
      return [`${path}(${value.length})`];
    }
    if (Array.isArray(value)) {
      return [`${path}[${value.length}]`];
    }
    if (value !== null && typeof value === 'object') {
      return shape(value, `${path}.`);
    }
    return [path];
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('has every key in every language', () => {
  expect(shape(ml)).toEqual(shape(en));
  expect(shape(hi)).toEqual(shape(en));
  for (const t of [en, ml, hi]) {
    expect(t.days).toHaveLength(7);
    expect(t.months).toHaveLength(12);
  }
});

test('starts in the language native reports', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('hi');
  await renderApp();
  expect(await screen.findByText(hi.today.addPill)).toBeTruthy();
  expect(headerTitles()).toEqual(['आज · सोम 26 अक्टू']);
});

// A language chosen on a debug build is hidden in a release build: native then reports the
// phone's language or English, and anything it can't name is English too.
test('starts in English when native reports an unlisted language', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('ta');
  await renderApp();
  expect(await screen.findByText('+ Add pill')).toBeTruthy();
  expect(headerTitles()).toEqual(['Today · Mon 26 Oct']);
});

test('starts in English when native cannot say', async () => {
  jest.mocked(alarms.currentLanguage).mockImplementation(() => {
    throw new Error('no module');
  });
  await renderApp();
  expect(await screen.findByText('+ Add pill')).toBeTruthy();
  expect(headerTitles()).toEqual(['Today · Mon 26 Oct']);
});

// Following the phone: the ringing process reads the phone's language at every ring, so the app
// reads it again whenever it comes back, or the two could differ.
test('reads the language again when the app comes back', async () => {
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, cb) => {
    listeners.push(cb as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
  await renderApp();
  expect(await screen.findByText('+ Add pill')).toBeTruthy();
  jest.mocked(alarms.currentLanguage).mockReturnValue('hi');
  await act(async () => listeners.forEach(l => l('active')));
  await waitFor(() => expect(screen.getByText(hi.today.addPill)).toBeTruthy());
  expect(headerTitles()).toEqual(['आज · सोम 26 अक्टू']);
});
