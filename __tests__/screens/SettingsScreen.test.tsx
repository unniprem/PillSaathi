import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as alarms from '../../src/native/alarms';
import type { AppSettings } from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { ml } from '../../src/i18n/ml';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
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
  expect(screen.getByText('മലയാളം (draft)')).toBeTruthy();
  expect(
    screen.getByRole('radio', { name: 'English' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ checked: true }));
  expect(screen.getByText('Read the pill names aloud')).toBeTruthy();
  expect(
    screen.getByText("PillSaathi follows your phone's text size."),
  ).toBeTruthy();
  expect(headerTitles()).toEqual(['Settings']);
});

test('switches to Malayalam and redraws', async () => {
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText('മലയാളം (draft)'));
  expect(alarms.setLanguage).toHaveBeenCalledWith('ml');
  await waitFor(() => expect(headerTitles()).toEqual(['ക്രമീകരണങ്ങൾ']));
  expect(screen.getByText(ml.settings.readAloud)).toBeTruthy();
  expect(screen.getByText(`മലയാളം${ml.settings.draft}`)).toBeTruthy();
});

test('keeps the language when saving it fails', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.setLanguage).mockRejectedValue(new Error('disk'));
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText('മലയാളം (draft)'));
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
  await fireEvent.press(await screen.findByText('Try it'));
  expect(alarms.tryReadAloud).toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});

test('opens Setup from Make alarms reliable', async () => {
  await renderApp('Settings');
  await fireEvent.press(await screen.findByText('Make alarms reliable'));
  await waitFor(() =>
    expect(headerTitles()).toEqual(['Settings', 'Make alarms ring every time']),
  );
});
