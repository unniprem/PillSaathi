import { Alert, Platform } from 'react-native';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type { AppSettings } from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { ml } from '../../src/i18n/ml';
import { healthy, mockAlarmsDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const debugLanguages: AppSettings = {
  language: 'en',
  readAloud: true,
  role: 'elder',
  languages: [
    { code: 'en', label: 'English', draft: false },
    { code: 'ml', label: 'മലയാളം', draft: true },
  ],
};

/** A Xiaomi phone, whose setup has four steps: three she ticks, then battery, which health ticks. */
function xiaomi(doneSteps: string[], ignoringBattery: boolean) {
  jest
    .spyOn(Platform, 'constants', 'get')
    .mockReturnValue({ Manufacturer: 'Xiaomi' } as never);
  setupDone(doneSteps, ignoringBattery);
}

function setupDone(doneSteps: string[], ignoringBattery: boolean) {
  jest
    .mocked(alarms.getSetupState)
    .mockResolvedValue({ seen: true, doneSteps });
  jest.mocked(alarms.getHealth).mockResolvedValue({
    ...healthy,
    ignoringBatteryOptimizations: ignoringBattery,
  });
}

const tile = (name: string) => screen.getByRole('radio', { name });

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  jest.mocked(alarms.getSettings).mockResolvedValue(debugLanguages);
  jest.mocked(alarms.tryReadAloud).mockResolvedValue('spoken');
  jest.mocked(alarms.openSetting).mockResolvedValue(true);
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('lists the languages from native, marking drafts', async () => {
  await renderApp('Settings');
  expect(await screen.findByText('English')).toBeTruthy();
  expect(within(tile('മലയാളം')).getByText('draft')).toBeTruthy();
  expect(within(tile('English')).queryByText('draft')).toBeNull();
  expect(tile('English').props.accessibilityState).toEqual(
    expect.objectContaining({ checked: true }),
  );
  expect(screen.getByText('Read pill names aloud')).toBeTruthy();
  expect(screen.getByText('When an alarm rings')).toBeTruthy();
  expect(screen.getByText("Follows the phone's text size")).toBeTruthy();
  expect(headerTitles()).toEqual(['Settings']);
});

test('switches to Malayalam and redraws', async () => {
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText('മലയാളം'));
  expect(alarms.setLanguage).toHaveBeenCalledWith('ml');
  await waitFor(() => expect(headerTitles()).toEqual(['ക്രമീകരണങ്ങൾ']));
  expect(screen.getByText(ml.settings.readAloud)).toBeTruthy();
  expect(within(tile('മലയാളം')).getByText(ml.settings.draft)).toBeTruthy();
  expect(tile('മലയാളം').props.accessibilityState).toEqual(
    expect.objectContaining({ checked: true }),
  );
});

test('keeps the language when saving it fails', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.setLanguage).mockRejectedValue(new Error('disk'));
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText('മലയാളം'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Could not save'));
  expect(headerTitles()).toEqual(['Settings']);
});

test('turns read aloud off', async () => {
  await renderApp('Settings');
  await screen.findByText('English');
  await fireEvent(screen.getByRole('switch'), 'valueChange', false);
  expect(alarms.setReadAloud).toHaveBeenCalledWith(false);
  expect(screen.getByRole('switch').props.value).toBe(false);
});

test('a failed read aloud change says so and keeps the switch', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.setReadAloud).mockRejectedValue(new Error('disk'));
  await renderApp('Settings');
  await screen.findByText('English');
  await fireEvent(screen.getByRole('switch'), 'valueChange', false);
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Could not save'));
  expect(screen.getByRole('switch').props.value).toBe(true);
});

test('offers voice settings when there is no Malayalam voice', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(alarms.getSettings)
    .mockResolvedValue({ ...debugLanguages, language: 'ml' });
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  jest.mocked(alarms.tryReadAloud).mockResolvedValue('english');
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText(ml.settings.tryIt));
  await waitFor(() => expect(alert).toHaveBeenCalled());
  const [message, , buttons] = alert.mock.calls[0];
  expect(message).toBe(ml.settings.noVoice('മലയാളം'));
  const open = buttons!.find(b => b.text === ml.settings.openVoiceSettings);
  open!.onPress!();
  expect(alarms.openSetting).toHaveBeenCalledWith('tts');
});

test('says when the phone cannot read aloud at all', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.tryReadAloud).mockResolvedValue('none');
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText('Try it'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      "Your phone can't read aloud. Add a text-to-speech voice in your phone's settings.",
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Open voice settings' }),
      ]),
    ),
  );
});

test('Try it says nothing when the voice spoke', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('Settings');
  expect(await screen.findByText('Hear how it sounds')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Try it' }));
  expect(alarms.tryReadAloud).toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});

test('opens Setup from Alarm setup', async () => {
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText('Alarm setup'));
  await waitFor(() =>
    expect(headerTitles()).toEqual(['Settings', 'Make alarms ring every time']),
  );
});

test("text size opens the phone's display settings", async () => {
  await renderApp('Settings');
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Text size' }),
  );
  expect(alarms.openSetting).toHaveBeenCalledWith('display');
});

test('alarm setup says how many steps are left', async () => {
  xiaomi(['autostart', 'lockRecents'], false);
  await renderApp('Settings');
  expect(await screen.findByText('2 steps left')).toBeTruthy();
  expect(screen.queryByText('All set')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Alarm setup' }).props.accessibilityHint,
  ).toBe('2 steps left');
});

test('alarm setup says All set when nothing is left', async () => {
  xiaomi(['autostart', 'oemBattery', 'lockRecents'], true);
  await renderApp('Settings');
  expect(await screen.findByText('All set')).toBeTruthy();
  expect(screen.queryByText(/left$/)).toBeNull();
});

test('alarm setup counts again on coming back from Setup', async () => {
  xiaomi(['autostart'], false);
  await renderApp('Settings');
  expect(await screen.findByText('3 steps left')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Alarm setup')));
  // She ticked one more there, and the phone now allows the battery use.
  setupDone(['autostart', 'oemBattery'], true);
  await act(async () => fireEvent.press(screen.getByText('Finish')));
  await waitFor(() => expect(headerTitles()).toEqual(['Settings']));
  expect(await screen.findByText('1 step left')).toBeTruthy();
});
