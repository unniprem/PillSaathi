import { Alert, DeviceEventEmitter, StyleSheet } from 'react-native';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { ml } from '../../src/i18n/ml';
import * as alarms from '../../src/native/alarms';
import * as family from '../../src/native/family';
import type { Pill, Refill, Today, TodayCard } from '../../src/native/alarms';
import type {
  ChangeView,
  ElderSetup,
  FamilyCard,
} from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { colors } from '../../src/theme';
import {
  healthy,
  mockAlarmsDefaults,
  mockFamilyDefaults,
} from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const telma: Pill = {
  id: 'p1',
  name: 'Telma 40',
  form: 'tablet',
  amount: 0.5,
  times: [{ hour: 21, minute: 0 }],
  startDate: '2026-10-20',
  days: 12,
  photo: null,
  photoUri: null,
  remaining: null,
};

const PHOTO = '3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg';
const PHOTO_URI = `file:///photos/${PHOTO}`;

const voice = {
  id: 's1',
  name: "Amma's voice",
  kind: 'recorded' as const,
  durationMs: 12000,
  createdAt: 1,
  usedBy: [],
};

/** Her time card at hour:minute, with Telma 40 on it. */
const card = (
  hour: number,
  minute: number,
  soundId: string | null,
): TodayCard => ({
  alarmId: `c${hour}`,
  hour,
  minute,
  soundId,
  status: 'upcoming',
  statusAt: null,
  pills: [
    {
      pillId: 'p1',
      name: 'Telma 40',
      form: 'tablet',
      amount: 0.5,
      startDate: '2026-10-20',
      days: 12,
      exists: true,
      fromTomorrow: false,
      photoUri: null,
    },
  ],
});

const todayWith = (cards: TodayCard[], refills: Refill[] = []): Today => ({
  date: '2026-10-26',
  cards,
  refills,
});

// The pills as her phone stores them: a save changes what the next load reads.
let stored: Pill[];

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  stored = [telma];
  jest.mocked(alarms.listPills).mockImplementation(async () => stored);
  jest.mocked(alarms.savePill).mockImplementation(async input => {
    const before = stored.find(p => p.id === input.id)!;
    const saved: Pill = {
      id: before.id,
      name: input.name,
      form: input.form,
      amount: input.amount,
      times: input.times,
      startDate: before.startDate,
      days: input.days,
      photo: input.photo,
      photoUri: input.photo ? `file:///photos/${input.photo}` : null,
      remaining: input.remainingChanged ? input.remaining : before.remaining,
    };
    stored = stored.map(p => (p.id === saved.id ? saved : p));
    return saved;
  });
  jest.mocked(alarms.deletePill).mockResolvedValue();
  jest.mocked(alarms.pickTime).mockResolvedValue({ hour: 8, minute: 0 });
  jest.mocked(alarms.openSetting).mockResolvedValue(true);
  jest
    .mocked(alarms.getToday)
    .mockResolvedValue(todayWith([card(21, 0, 's1')]));
  jest.mocked(sounds.listSounds).mockResolvedValue([voice]);
  jest.mocked(sounds.stopPreview).mockResolvedValue();
  jest
    .mocked(sounds.onPreviewEnded)
    .mockReturnValue({ remove: jest.fn() } as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** The open sheet, to look inside it. */
const sheet = () => within(screen.getByTestId('sheet'));
const saveSheet = () =>
  fireEvent.press(sheet().getByRole('button', { name: 'Save' }));
const sheetSaveDisabled = () =>
  sheet().getByRole('button', { name: 'Save' }).props.accessibilityState
    .disabled;

/** Opens her pill p1 on her phone, once it has loaded. */
async function openPill(params: object = {}) {
  await renderApp('Pill', { pillId: 'p1', ...params });
  await screen.findByText('Delete this pill');
}

/** The input savePill took for Telma 40 as it was loaded, with [changes]. */
const telmaInput = (changes: object = {}) => ({
  id: 'p1',
  name: 'Telma 40',
  form: 'tablet',
  amount: 0.5,
  times: [{ hour: 21, minute: 0 }],
  startsTomorrow: false,
  days: 12,
  photo: null,
  remaining: null,
  remainingChanged: false,
  ...changes,
});

/** Whether [el] sits in the page's scrolling content. */
function scrollsWithPage(el: { parent: unknown }): boolean {
  for (let n = el.parent as { type?: unknown; parent: unknown } | null; n; ) {
    if (n.type === 'RCTScrollView') {
      return true;
    }
    n = n.parent as typeof n;
  }
  return false;
}

describe('the summary', () => {
  test('shows her pill on the sky, then one line for each part of it', async () => {
    await openPill();
    // On her phone the pill's name is the title, on the sky.
    expect(headerTitles()).toEqual([]);
    expect(screen.getByText('Telma 40')).toBeTruthy();
    expect(screen.getByText('Tablet · ½ each time')).toBeTruthy();
    expect(screen.getByTestId('pill-shape-tablet')).toBeTruthy();
    expect(screen.getByText('Rings at')).toBeTruthy();
    expect(screen.getByText('9:00 PM')).toBeTruthy();
    expect(screen.getByText('Sound')).toBeTruthy();
    expect(await screen.findByText("Amma's voice")).toBeTruthy();
    expect(screen.getByText('For how long')).toBeTruthy();
    expect(screen.getByText(/^12 days/)).toBeTruthy();
    expect(screen.getByText('Tablets left')).toBeTruthy();
    expect(screen.getByText('Optional')).toBeTruthy();
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  // Each part has its own sheet with its own Save. Review Focus 1 and 2: a long name at a large
  // text size makes the sky tall, so it scrolls with the page.
  test('has no Save of its own, and the whole page scrolls, to Delete this pill at its end', async () => {
    await openPill();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(scrollsWithPage(screen.getByText('Telma 40'))).toBe(true);
    expect(scrollsWithPage(screen.getByText('Delete this pill'))).toBe(true);
    const texts = within(screen.getByTestId('pill-page')).getAllByText(/./);
    expect(texts[texts.length - 1]).toHaveTextContent('Delete this pill');
  });

  test('loads an existing pill and saves it with its id', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('For how long'));
    expect(
      sheet().getByRole('button', { name: 'Other…' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(sheet().getByDisplayValue('12')).toBeTruthy();
    // An edit keeps its start date: no Today or Tomorrow to choose.
    expect(sheet().queryByText('Tomorrow')).toBeNull();
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(telmaInput());
  });

  test('each sheet saves its own change', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('For how long'));
    await fireEvent.press(sheet().getByText('30 days'));
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledTimes(1);
    expect(alarms.savePill).toHaveBeenCalledWith(telmaInput({ days: 30 }));
    // The sheet closes, and the summary shows the pill as saved.
    await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull());
    expect(await screen.findByText(/^30 days/)).toBeTruthy();
  });

  test('a duration sheet waits for valid other days', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('For how long'));
    await fireEvent.changeText(sheet().getByDisplayValue('12'), '0');
    expect(sheetSaveDisabled()).toBe(true);
    await fireEvent.press(sheet().getByText('No end'));
    expect(sheetSaveDisabled()).toBe(false);
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(telmaInput({ days: null }));
  });

  test('tapping the name changes the name, type and amount', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('Telma 40'));
    expect(sheet().getByLabelText('½ tablet')).toBeTruthy();
    await fireEvent.changeText(
      sheet().getByDisplayValue('Telma 40'),
      ' Telma 80 ',
    );
    // A new type starts at its own amount.
    await fireEvent.press(sheet().getByText('Capsule'));
    expect(sheet().getByLabelText('1 capsule')).toBeTruthy();
    await fireEvent.press(sheet().getByLabelText('More'));
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(
      telmaInput({ name: 'Telma 80', form: 'capsule', amount: 2 }),
    );
    expect(await screen.findByText('Capsule · 2 each time')).toBeTruthy();
  });

  test('the name sheet waits for a name', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('Telma 40'));
    await fireEvent.changeText(sheet().getByDisplayValue('Telma 40'), '  ');
    expect(sheetSaveDisabled()).toBe(true);
  });

  test('a failed save says so, and the sheet stays open', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(alarms.savePill).mockRejectedValue(new Error('disk'));
    await openPill();
    await fireEvent.press(screen.getByText('For how long'));
    await saveSheet();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Could not save the pill',
        'Please try again.',
      ),
    );
    expect(screen.getByTestId('sheet')).toBeTruthy();
  });

  test('asks for the exact alarm permission after a save when it is missing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest
      .mocked(alarms.getHealth)
      .mockResolvedValue({ ...healthy, exactAlarmAllowed: false });
    await openPill();
    await fireEvent.press(screen.getByText('For how long'));
    await saveSheet();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'PillSaathi needs permission to set alarms',
        'Without it, Android may not ring your medicines on time.',
        expect.any(Array),
        { cancelable: false },
      ),
    );
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => buttons.find(b => b.text === 'Allow')!.onPress!());
    expect(alarms.openSetting).toHaveBeenCalledWith('exactAlarm');
    await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull());
    expect(screen.getByText('Delete this pill')).toBeTruthy();
  });

  test('shows the pill page in Malayalam', async () => {
    jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
    await renderApp('Pill', { pillId: 'p1' });
    expect(await screen.findByText(ml.pill.deletePill)).toBeTruthy();
    expect(screen.getByText(ml.pill.ringsAt)).toBeTruthy();
    expect(
      screen.getByText(ml.addPill.eachTime(ml.forms.tablet, '½')),
    ).toBeTruthy();
    expect(screen.getByLabelText(ml.pill.changePhoto)).toBeTruthy();
    await fireEvent.press(screen.getByText('Telma 40'));
    expect(sheet().getByText('പേര്')).toBeTruthy();
    expect(sheet().getByLabelText('½ ഗുളിക')).toBeTruthy();
    expect(sheet().getByText(ml.common.save)).toBeTruthy();
    expect(sheet().getByText(ml.forms.capsule)).toBeTruthy();
  });

  test('a pill that cannot be loaded says so in the app language', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
    jest.mocked(alarms.listPills).mockRejectedValue(new Error('disk'));
    await renderApp('Pill', { pillId: 'p1' });
    await waitFor(() => expect(alert).toHaveBeenCalledWith(ml.pill.loadFailed));
  });

  test('a pill that no longer exists leaves the page', async () => {
    stored = [];
    await renderApp('Pill', { pillId: 'p1' });
    // Back on Today, which has its own sky.
    await waitFor(() => expect(headerTitles()).toHaveLength(1));
    expect(screen.queryByText('Delete this pill')).toBeNull();
    expect(alarms.savePill).not.toHaveBeenCalled();
  });

  test('deletes after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await openPill();
    await fireEvent.press(screen.getByText('Delete this pill'));
    expect(alert).toHaveBeenCalledWith(
      'Delete this pill?',
      undefined,
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find(b => b.style === 'destructive')!.onPress!();
    });
    expect(alarms.deletePill).toHaveBeenCalledWith('p1');
    await waitFor(() =>
      expect(screen.queryByText('Delete this pill')).toBeNull(),
    );
  });

  test('a failed delete says so and stays', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(alarms.deletePill).mockRejectedValue(new Error('disk'));
    await openPill();
    await fireEvent.press(screen.getByText('Delete this pill'));
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find(b => b.style === 'destructive')!.onPress!();
    });
    expect(alert).toHaveBeenLastCalledWith(
      'Could not delete the pill',
      'Please try again.',
    );
    expect(screen.getByText('Delete this pill')).toBeTruthy();
  });
});

describe('times', () => {
  test('changes and adds times, and saves them in time order', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('Rings at'));
    jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 22, minute: 0 });
    await fireEvent.press(
      sheet().getByRole('button', { name: 'Change 9:00 PM' }),
    );
    expect(alarms.pickTime).toHaveBeenLastCalledWith(21, 0);
    expect(sheet().getByText('10:00 PM')).toBeTruthy();
    await fireEvent.press(sheet().getByText('Another time'));
    expect(sheet().getByText('8:00 AM')).toBeTruthy();
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(
      telmaInput({
        times: [
          { hour: 8, minute: 0 },
          { hour: 22, minute: 0 },
        ],
      }),
    );
    expect(await screen.findByText('8:00 AM and 10:00 PM')).toBeTruthy();
  });

  test('removes a time, and Save waits for at least one', async () => {
    stored = [
      {
        ...telma,
        times: [
          { hour: 8, minute: 0 },
          { hour: 21, minute: 0 },
        ],
      },
    ];
    await openPill();
    expect(screen.getByText('8:00 AM and 9:00 PM')).toBeTruthy();
    await fireEvent.press(screen.getByText('Rings at'));
    await fireEvent.press(sheet().getByLabelText('Remove 8:00 AM'));
    expect(sheet().queryByText('8:00 AM')).toBeNull();
    expect(sheetSaveDisabled()).toBe(false);
    await fireEvent.press(sheet().getByLabelText('Remove 9:00 PM'));
    expect(sheetSaveDisabled()).toBe(true);
    // Closing the sheet throws its changes away.
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(screen.queryByTestId('sheet')).toBeNull();
    await fireEvent.press(screen.getByText('Rings at'));
    expect(sheet().getByText('8:00 AM')).toBeTruthy();
    expect(alarms.savePill).not.toHaveBeenCalled();
  });

  test('refuses a time already on the pill', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(alarms.pickTime).mockResolvedValue({ hour: 21, minute: 0 });
    await openPill();
    await fireEvent.press(screen.getByText('Rings at'));
    await fireEvent.press(sheet().getByText('Another time'));
    expect(alert).toHaveBeenCalledWith('That time is already added.');
    expect(sheet().getAllByText('9:00 PM')).toHaveLength(1);
  });

  test('a cancelled time picker changes nothing', async () => {
    jest.mocked(alarms.pickTime).mockResolvedValue(null);
    await openPill();
    await fireEvent.press(screen.getByText('Rings at'));
    await fireEvent.press(
      sheet().getByRole('button', { name: 'Change 9:00 PM' }),
    );
    await fireEvent.press(sheet().getByText('Another time'));
    expect(sheet().getByText('9:00 PM')).toBeTruthy();
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(telmaInput());
  });

  test('hides Another time at six times', async () => {
    stored = [
      {
        ...telma,
        times: [6, 8, 10, 12, 14, 16].map(hour => ({ hour, minute: 0 })),
      },
    ];
    await openPill();
    await fireEvent.press(screen.getByText('Rings at'));
    expect(sheet().queryByText('Another time')).toBeNull();
    await fireEvent.press(sheet().getByLabelText('Remove 6:00 AM'));
    expect(sheet().getByText('Another time')).toBeTruthy();
  });
});

describe('sounds', () => {
  const twice: Pill = {
    ...telma,
    times: [
      { hour: 8, minute: 0 },
      { hour: 21, minute: 0 },
    ],
  };

  test('the sound row opens the sound list for the chosen time and says the sound is shared', async () => {
    stored = [twice];
    jest
      .mocked(alarms.getToday)
      .mockResolvedValue(todayWith([card(8, 0, null), card(21, 0, 's1')]));
    await openPill();
    expect(
      await screen.findByText("Default alarm tone · Amma's voice"),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Sound'));
    expect(
      sheet().getByText(
        'Every pill at the same time rings with the same sound.',
      ),
    ).toBeTruthy();
    expect(sheet().getByText('Default alarm tone')).toBeTruthy();
    expect(sheet().getByText("Amma's voice")).toBeTruthy();
    await fireEvent.press(sheet().getByText('9:00 PM'));
    // The sheet closes first: it would stay above the list.
    expect(screen.queryByTestId('sheet')).toBeNull();
    await waitFor(() => expect(headerTitles()).toEqual(['Sound for 9:00 PM']));
    expect(await screen.findByText('Telma 40 rings at this time')).toBeTruthy();
    const mine = await screen.findByRole('radio', { name: /Amma's voice/ });
    expect(mine.props.accessibilityState.checked).toBe(true);
    // Choosing the default tone sets it for that time; back on the summary it shows.
    jest
      .mocked(alarms.getToday)
      .mockResolvedValue(todayWith([card(8, 0, null), card(21, 0, null)]));
    await fireEvent.press(
      screen.getByRole('radio', { name: /Default alarm tone/ }),
    );
    expect(alarms.setCardSound).toHaveBeenCalledWith('c21', null);
    await waitFor(() => expect(headerTitles()).toEqual([]));
    expect(await screen.findByText('Default alarm tone')).toBeTruthy();
  });

  test('with her sounds unreadable, the times show the default tone', async () => {
    jest.mocked(sounds.listSounds).mockRejectedValue(new Error('x'));
    await openPill();
    expect(await screen.findByText('Default alarm tone')).toBeTruthy();
  });

  test('with today unreadable, the summary still shows', async () => {
    jest.mocked(alarms.getToday).mockRejectedValue(new Error('x'));
    await openPill();
    expect(screen.getByText('9:00 PM')).toBeTruthy();
    expect(screen.getByText('Default alarm tone')).toBeTruthy();
  });
});

describe('photos', () => {
  test('takes a photo and saves its name', async () => {
    jest
      .mocked(alarms.pickPhoto)
      .mockResolvedValue({ name: PHOTO, uri: PHOTO_URI });
    await openPill();
    await fireEvent.press(screen.getByLabelText('Change the photo'));
    // No photo yet, so nothing to remove.
    expect(sheet().queryByText('Remove')).toBeNull();
    await fireEvent.press(sheet().getByText('Camera'));
    expect(alarms.pickPhoto).toHaveBeenCalledWith('camera');
    expect(alarms.savePill).toHaveBeenCalledWith(telmaInput({ photo: PHOTO }));
    expect((await screen.findByTestId('pill-photo')).props.source).toEqual({
      uri: PHOTO_URI,
    });
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  test('removes a photo', async () => {
    stored = [{ ...telma, photo: PHOTO, photoUri: PHOTO_URI }];
    await openPill();
    expect(screen.getByTestId('pill-photo')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Change the photo'));
    await fireEvent.press(sheet().getByText('Remove'));
    expect(alarms.savePill).toHaveBeenCalledWith(telmaInput({ photo: null }));
    await waitFor(() => expect(screen.queryByTestId('pill-photo')).toBeNull());
    expect(screen.getByTestId('pill-shape-tablet')).toBeTruthy();
  });

  test('keeps the photo when a pick is cancelled', async () => {
    stored = [{ ...telma, photo: PHOTO, photoUri: PHOTO_URI }];
    jest.mocked(alarms.pickPhoto).mockResolvedValue(null);
    await openPill();
    await fireEvent.press(screen.getByLabelText('Change the photo'));
    await fireEvent.press(sheet().getByText('Camera'));
    expect(alarms.pickPhoto).toHaveBeenCalledWith('camera');
    expect(alarms.savePill).not.toHaveBeenCalled();
    expect(screen.getByTestId('pill-photo').props.source).toEqual({
      uri: PHOTO_URI,
    });
  });

  test('an edit keeps the pill photo', async () => {
    stored = [{ ...telma, photo: PHOTO, photoUri: PHOTO_URI }];
    await openPill();
    await fireEvent.press(screen.getByText('For how long'));
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', photo: PHOTO }),
    );
  });

  // A photo taken before the pill is there would have no pill to save with.
  test('the camera waits for the pill to load', async () => {
    let show: (pills: Pill[]) => void = () => {};
    jest
      .mocked(alarms.listPills)
      .mockReturnValue(new Promise(resolve => (show = resolve)));
    await renderApp('Pill', { pillId: 'p1' });
    expect(screen.queryByLabelText('Change the photo')).toBeNull();
    await act(async () => show(stored));
    expect(await screen.findByLabelText('Change the photo')).toBeTruthy();
  });

  test('says when a photo could not be added', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest
      .mocked(alarms.pickPhoto)
      .mockRejectedValue(
        Object.assign(new Error('decode'), { code: 'PHOTO_ERROR' }),
      );
    await openPill();
    await fireEvent.press(screen.getByLabelText('Change the photo'));
    await fireEvent.press(sheet().getByText('Gallery'));
    expect(alarms.pickPhoto).toHaveBeenCalledWith('gallery');
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Couldn't add the photo"),
    );
    expect(screen.queryByTestId('pill-photo')).toBeNull();
    expect(alarms.savePill).not.toHaveBeenCalled();
  });
});

describe('tablets left', () => {
  beforeEach(() => {
    stored = [{ ...telma, remaining: 9 }];
  });

  test.each([
    ['40', 40],
    ['', null],
  ])('types a count and clears it (%p)', async (typed, remaining) => {
    await openPill();
    expect(screen.getByText('9 tablets')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tablets left'));
    await fireEvent.changeText(sheet().getByDisplayValue('9'), typed);
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(
      telmaInput({ remaining, remainingChanged: true }),
    );
  });

  test('adds tablets with the quick buttons', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('+ Add'));
    await fireEvent.press(sheet().getByText('+10'));
    expect(sheet().getByDisplayValue('19')).toBeTruthy();
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(
      telmaInput({ remaining: 19, remainingChanged: true }),
    );
    expect(await screen.findByText('19 tablets')).toBeTruthy();
  });

  test('refuses a count that is not a whole or half number', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('Tablets left'));
    await fireEvent.changeText(sheet().getByDisplayValue('9'), '2.3');
    expect(sheetSaveDisabled()).toBe(true);
  });

  // A ring's Taken may have lowered the count while the page was open; Save must not put 9 back.
  test('keeps the stored count when another sheet saves', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('Telma 40'));
    await fireEvent.changeText(
      sheet().getByDisplayValue('Telma 40'),
      'Telma 80',
    );
    await saveSheet();
    expect(alarms.savePill).toHaveBeenCalledWith(
      telmaInput({ name: 'Telma 80', remaining: 9, remainingChanged: false }),
    );
  });

  test('focusCount opens Tablets left', async () => {
    await openPill({ focusCount: true });
    expect(await sheet().findByDisplayValue('9')).toBeTruthy();
    expect(sheet().getByLabelText('Tablets left').props.autoFocus).toBe(true);
  });

  // The keyboard covers the page rather than shrinking it: the count rises above it, in its sheet.
  test('from the refill banner, the count rises above the keyboard', async () => {
    await openPill({ focusCount: true });
    await sheet().findByDisplayValue('9');
    const bottom = () =>
      StyleSheet.flatten(screen.getByTestId('sheet').props.style).paddingBottom;
    const closed = bottom();
    await act(() =>
      DeviceEventEmitter.emit('keyboardDidShow', {
        endCoordinates: { height: 300, width: 411, screenX: 0, screenY: 534 },
      }),
    );
    expect(bottom()).toBe(closed + 300);
    await act(() => DeviceEventEmitter.emit('keyboardDidHide', null));
    expect(bottom()).toBe(closed);
  });

  test('the name sheet makes room for the keyboard', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('Telma 40'));
    const bottom = () =>
      StyleSheet.flatten(screen.getByTestId('sheet').props.style).paddingBottom;
    const closed = bottom();
    await act(() =>
      DeviceEventEmitter.emit('keyboardDidShow', {
        endCoordinates: { height: 280, width: 411, screenX: 0, screenY: 554 },
      }),
    );
    expect(bottom()).toBe(closed + 280);
    expect(sheet().getByDisplayValue('Telma 40')).toBeTruthy();
  });

  test('does not open Tablets left otherwise', async () => {
    await openPill();
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  test('Tablets left opened by hand does not bring up the keyboard', async () => {
    await openPill();
    await fireEvent.press(screen.getByText('Tablets left'));
    expect(sheet().getByLabelText('Tablets left').props.autoFocus).toBeFalsy();
  });

  test('running low, it is amber and says about how many days', async () => {
    stored = [{ ...telma, remaining: 4 }];
    jest.mocked(alarms.getToday).mockResolvedValue(
      todayWith(
        [card(21, 0, null)],
        [
          {
            pillId: 'p1',
            name: 'Telma 40',
            form: 'tablet',
            remaining: 4,
            daysLeft: 4,
            level: 'low',
          },
        ],
      ),
    );
    await openPill();
    const low = await screen.findByText('4 tablets · about 4 days');
    expect(low).toHaveStyle({ color: colors.amberText });
  });

  test('says none left when there are none', async () => {
    stored = [{ ...telma, remaining: 0 }];
    jest.mocked(alarms.getToday).mockResolvedValue(
      todayWith(
        [card(21, 0, null)],
        [
          {
            pillId: 'p1',
            name: 'Telma 40',
            form: 'tablet',
            remaining: 0,
            daysLeft: 0,
            level: 'out',
          },
        ],
      ),
    );
    await openPill();
    expect(await screen.findByText('None left')).toBeTruthy();
  });

  test('says Capsules left for capsules', async () => {
    stored = [{ ...telma, form: 'capsule', amount: 1, remaining: 9 }];
    await openPill();
    await fireEvent.press(screen.getByText('Capsules left'));
    expect(sheet().getByLabelText('Capsules left')).toBeTruthy();
  });

  test('syrup has no Tablets left row', async () => {
    stored = [{ ...telma, form: 'syrup', amount: 5 }];
    await openPill({ focusCount: true });
    expect(screen.getByText('Syrup · 5 ml each time')).toBeTruthy();
    expect(screen.queryByText('Tablets left')).toBeNull();
    expect(screen.queryByText('Capsules left')).toBeNull();
    expect(screen.queryByTestId('sheet')).toBeNull();
  });
});

describe('for her, on a relative’s phone', () => {
  const herTelma = { ...telma, photo: 'a.jpg', photoUri: 'file:///her/a.jpg' };
  const amma: FamilyCard = {
    elderId: 'E',
    name: 'Amma',
    phone: null,
    delayMinutes: 30,
    heardAt: null,
    silent: false,
    abandoned: false,
    otherZone: false,
    tally: { taken: 0, skipped: 0, missed: 0, notReported: 0, later: 0 },
    refills: [],
  };
  const setup: ElderSetup = {
    editor: true,
    otherZone: false,
    heardAt: null,
    pills: [herTelma],
    times: [{ hour: 21, minute: 0, soundId: 'h1', soundName: "Ravi's sound" }],
    sounds: [{ id: 'h1', name: "Ravi's sound" }],
    problem: null,
  };

  function change(extra: Partial<ChangeView> = {}): ChangeView {
    return {
      id: 'c1',
      kind: 'pill',
      status: 'pending',
      reason: null,
      mine: true,
      byName: 'Ravi',
      at: new Date(2026, 9, 29, 14, 0).getTime(),
      doneAt: null,
      pillId: 'p1',
      pillName: 'Telma 40',
      hour: null,
      minute: null,
      soundName: null,
      ...extra,
    };
  }

  beforeEach(() => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.getElderSetup).mockResolvedValue(setup);
    jest.mocked(family.sendPill).mockResolvedValue('c1');
    jest.mocked(family.sendDeletePill).mockResolvedValue('c2');
    jest.mocked(sounds.listSounds).mockResolvedValue([]);
  });

  async function openHers() {
    await renderApp('Pill', { elderId: 'E', pillId: 'p1' });
    await screen.findByText('Delete this pill');
    await waitFor(() => expect(headerTitles()).toEqual(["Amma's pill"]));
  }

  test('loads her pill; a sheet’s Save sends it with photoChoice keep, and stays', async () => {
    await openHers();
    expect(alarms.listPills).not.toHaveBeenCalled();
    expect(screen.getByText('Telma 40')).toBeTruthy();
    expect(screen.getByTestId('pill-photo').props.source).toEqual({
      uri: 'file:///her/a.jpg',
    });
    // Her phone takes it: sent, it waits there.
    jest.mocked(family.sendPill).mockImplementation(async () => {
      jest.mocked(family.listChanges).mockResolvedValue([change()]);
      return 'c1';
    });
    await fireEvent.press(screen.getByText('For how long'));
    await saveSheet();
    expect(family.sendPill).toHaveBeenCalledWith('E', {
      id: 'p1',
      name: 'Telma 40',
      form: 'tablet',
      amount: 0.5,
      times: [{ hour: 21, minute: 0 }],
      startsTomorrow: false,
      days: 12,
      photo: null,
      remaining: null,
      remainingChanged: false,
      photoChoice: 'keep',
    });
    expect(alarms.savePill).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull());
    expect(headerTitles()).toEqual(["Amma's pill"]);
    expect(
      await screen.findByText("Waiting for Amma's phone: Change Telma 40"),
    ).toBeTruthy();
  });

  test('a photo picked here is sent as new', async () => {
    jest
      .mocked(alarms.pickPhoto)
      .mockResolvedValue({ name: 'b.jpg', uri: 'file:///mine/b.jpg' });
    await openHers();
    await fireEvent.press(screen.getByLabelText('Change the photo'));
    await fireEvent.press(sheet().getByText('Camera'));
    expect(family.sendPill).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({ photo: 'b.jpg', photoChoice: 'new' }),
    );
  });

  test('Remove sends no photo', async () => {
    await openHers();
    await fireEvent.press(screen.getByLabelText('Change the photo'));
    await fireEvent.press(sheet().getByText('Remove'));
    expect(family.sendPill).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({ photo: null, photoChoice: 'none' }),
    );
  });

  test('Delete confirms and sends a delete', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await openHers();
    await fireEvent.press(screen.getByText('Delete this pill'));
    expect(family.sendDeletePill).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => buttons[1].onPress!());
    expect(family.sendDeletePill).toHaveBeenCalledWith('E', 'p1');
    expect(alarms.deletePill).not.toHaveBeenCalled();
  });

  test('NOT_ALLOWED says how to be allowed', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest
      .mocked(family.sendPill)
      .mockRejectedValue(
        Object.assign(new Error('NOT_ALLOWED'), { code: 'NOT_ALLOWED' }),
      );
    await openHers();
    await fireEvent.press(screen.getByText('For how long'));
    await saveSheet();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "Amma's phone hasn't allowed you to change her pills. On her phone: open PillSaathi, tap Family, then turn on Can change my pills on your card.",
      ),
    );
    expect(screen.getByTestId('sheet')).toBeTruthy();
  });

  test.each([true, false])(
    'says the times are hers (another zone: %p)',
    async otherZone => {
      jest
        .mocked(family.getElderSetup)
        .mockResolvedValue({ ...setup, otherZone });
      await openHers();
      expect(await screen.findByText("Times are Amma's time.")).toBeTruthy();
      await fireEvent.press(screen.getByText('Rings at'));
      expect(sheet().getByText("Times are Amma's time.")).toBeTruthy();
    },
  );

  test('never opens setup or the exact-alarm prompt', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest
      .mocked(alarms.getSetupState)
      .mockResolvedValue({ seen: false, doneSteps: [] });
    jest
      .mocked(alarms.getHealth)
      .mockResolvedValue({ ...healthy, exactAlarmAllowed: false });
    await openHers();
    await fireEvent.press(screen.getByText('For how long'));
    await saveSheet();
    await waitFor(() => expect(family.sendPill).toHaveBeenCalled());
    expect(alarms.markSetupSeen).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test('a waiting change for her pill shows the amber strip, and Cancel cancels it', async () => {
    jest.mocked(family.listChanges).mockResolvedValue([change()]);
    await openHers();
    expect(
      await screen.findByText("Waiting for Amma's phone: Change Telma 40"),
    ).toBeTruthy();
    // Her phone's values stay until it takes the change.
    expect(screen.getByText(/^12 days/)).toBeTruthy();
    jest.mocked(family.listChanges).mockResolvedValue([]);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Cancel Change Telma 40' }),
    );
    expect(family.cancelChange).toHaveBeenCalledWith('E', 'c1');
    await waitFor(() =>
      expect(screen.queryByText(/^Waiting for Amma's phone/)).toBeNull(),
    );
  });

  test('a change her phone is taking up has no Cancel', async () => {
    jest
      .mocked(family.listChanges)
      .mockResolvedValue([change({ status: 'applying', kind: 'deletePill' })]);
    await openHers();
    expect(
      await screen.findByText("Waiting for Amma's phone: Delete Telma 40"),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Cancel/ })).toBeNull();
  });

  test('a cancel that is too late says her phone already has it', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(family.listChanges).mockResolvedValue([change()]);
    jest
      .mocked(family.cancelChange)
      .mockRejectedValue(
        Object.assign(new Error('ALREADY_TAKEN'), { code: 'ALREADY_TAKEN' }),
      );
    await openHers();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Cancel Change Telma 40' }),
    );
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Amma's phone already has it."),
    );
  });

  test('her count and how long it lasts come from her phone', async () => {
    jest
      .mocked(family.getElderSetup)
      .mockResolvedValue({ ...setup, pills: [{ ...herTelma, remaining: 4 }] });
    jest.mocked(family.getFamily).mockResolvedValue([
      {
        ...amma,
        refills: [
          {
            pillId: 'p1',
            name: 'Telma 40',
            form: 'tablet',
            remaining: 4,
            daysLeft: 4,
            level: 'low',
          },
        ],
      },
    ]);
    await openHers();
    expect(await screen.findByText('4 tablets · about 4 days')).toBeTruthy();
  });

  // Each time's sound, as the separate Alarm sounds list on her pills page used to show it.
  test('the sound row lists her times with their sounds', async () => {
    jest.mocked(family.getElderSetup).mockResolvedValue({
      ...setup,
      pills: [
        {
          ...herTelma,
          times: [
            { hour: 8, minute: 0 },
            { hour: 21, minute: 0 },
          ],
        },
      ],
      times: [
        { hour: 8, minute: 0, soundId: null, soundName: null },
        { hour: 21, minute: 0, soundId: 'h1', soundName: "Ravi's sound" },
      ],
    });
    await openHers();
    expect(screen.getByText("Default alarm tone · Ravi's sound")).toBeTruthy();
    await fireEvent.press(screen.getByText('Sound'));
    expect(
      sheet().getByText(
        'Every pill at the same time rings with the same sound.',
      ),
    ).toBeTruthy();
    expect(sheet().getByText('8:00 AM')).toBeTruthy();
    expect(sheet().getByText('Default alarm tone')).toBeTruthy();
    expect(sheet().getByText('9:00 PM')).toBeTruthy();
    expect(sheet().getByText("Ravi's sound")).toBeTruthy();
  });

  test('a time opens the sound list for her dose at that time', async () => {
    await openHers();
    await fireEvent.press(screen.getByText('Sound'));
    await fireEvent.press(sheet().getByText('9:00 PM'));
    expect(screen.queryByTestId('sheet')).toBeNull();
    await waitFor(() =>
      expect(headerTitles()).toEqual(["Amma's pill", 'Sound for 9:00 PM']),
    );
    expect(await screen.findByText('Telma 40 rings at this time')).toBeTruthy();
    const hers = await screen.findByRole('radio', { name: /Ravi's sound/ });
    expect(hers.props.accessibilityState.checked).toBe(true);
    await fireEvent.press(
      screen.getByRole('radio', { name: /Default alarm tone/ }),
    );
    expect(family.sendSound).toHaveBeenCalledWith('E', 21, 0, 'default', null);
    await waitFor(() => expect(headerTitles()).toEqual(["Amma's pill"]));
  });

  // Each Save sends the whole pill and her phone applies them in order, so a Save that started
  // from her copy again would undo the change before it.
  describe('while a change waits', () => {
    // Her changes as the server has them, newest first: each send waits there.
    let changes: ChangeView[];
    const twoTimes = [
      { hour: 8, minute: 0 },
      { hour: 21, minute: 0 },
    ];

    beforeEach(() => {
      changes = [];
      jest.mocked(family.listChanges).mockImplementation(async () => changes);
      jest.mocked(family.sendPill).mockImplementation(async (_, input) => {
        const id = `c${changes.length + 1}`;
        const { name, form, amount, times, days } = input;
        const { remaining, remainingChanged } = input;
        changes = [
          change({
            id,
            ahead: true,
            pill: {
              ...{ name, form, amount, times, days },
              ...{ remaining, remainingChanged },
            },
          }),
          ...changes,
        ];
        return id;
      });
    });

    /** Adds 8:00 to her pill, and waits for the sheet to close. */
    async function addEight() {
      await fireEvent.press(screen.getByText('Rings at'));
      await fireEvent.press(sheet().getByText('Another time'));
      await saveSheet();
      await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull());
    }

    async function thirtyDays() {
      await fireEvent.press(screen.getByText('For how long'));
      await fireEvent.press(sheet().getByText('30 days'));
      await saveSheet();
    }

    test('two Saves in a row keep both edits', async () => {
      await openHers();
      await addEight();
      expect(family.sendPill).toHaveBeenLastCalledWith(
        'E',
        expect.objectContaining({ times: twoTimes, days: 12 }),
      );
      await screen.findByText("Waiting for Amma's phone: Change Telma 40");
      // Her phone's values stay until it takes the change.
      expect(screen.getByText('9:00 PM')).toBeTruthy();
      await thirtyDays();
      expect(family.sendPill).toHaveBeenCalledTimes(2);
      expect(family.sendPill).toHaveBeenLastCalledWith('E', {
        id: 'p1',
        name: 'Telma 40',
        form: 'tablet',
        amount: 0.5,
        times: twoTimes,
        startsTomorrow: false,
        days: 30,
        photo: null,
        remaining: null,
        remainingChanged: false,
        photoChoice: 'keep',
      });
    });

    test.each([
      ['is still on its way', () => new Promise<ChangeView[]>(() => {})],
      ['failed', () => Promise.reject(new Error('OFFLINE'))],
    ])(
      'keeps both edits before her changes are read again (the read %s)',
      async (_, read) => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        await openHers();
        jest.mocked(family.listChanges).mockImplementation(read);
        await addEight();
        await thirtyDays();
        expect(family.sendPill).toHaveBeenLastCalledWith(
          'E',
          expect.objectContaining({ times: twoTimes, days: 30 }),
        );
      },
    );

    test('a page opened while a change waits starts each sheet from it', async () => {
      changes = [
        change({
          ahead: true,
          pill: {
            name: 'Telma 40',
            form: 'tablet',
            amount: 0.5,
            times: twoTimes,
            days: 30,
            remaining: null,
            remainingChanged: false,
          },
        }),
      ];
      await openHers();
      expect(screen.getByText(/^12 days/)).toBeTruthy();
      await fireEvent.press(screen.getByText('Rings at'));
      expect(sheet().getByText('8:00 AM')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('sheet-backdrop'));
      await fireEvent.press(screen.getByText('Telma 40'));
      await fireEvent.changeText(
        sheet().getByDisplayValue('Telma 40'),
        'Telma 80',
      );
      await saveSheet();
      expect(family.sendPill).toHaveBeenCalledWith(
        'E',
        expect.objectContaining({
          name: 'Telma 80',
          times: twoTimes,
          days: 30,
        }),
      );
    });

    // "keep" keeps the photo her phone has by then, so a waiting new photo or removal stands.
    test.each([
      ['Camera', 'new'],
      ['Remove', 'none'],
    ])(
      'a photo change still waiting (%s) is not undone by the next Save',
      async (button, choice) => {
        jest
          .mocked(alarms.pickPhoto)
          .mockResolvedValue({ name: 'b.jpg', uri: 'file:///mine/b.jpg' });
        await openHers();
        await fireEvent.press(screen.getByLabelText('Change the photo'));
        await fireEvent.press(sheet().getByText(button));
        expect(family.sendPill).toHaveBeenLastCalledWith(
          'E',
          expect.objectContaining({ photoChoice: choice }),
        );
        await screen.findByText("Waiting for Amma's phone: Change Telma 40");
        await thirtyDays();
        expect(family.sendPill).toHaveBeenLastCalledWith(
          'E',
          expect.objectContaining({
            days: 30,
            photo: null,
            photoChoice: 'keep',
          }),
        );
      },
    );

    // Seen on the Redmi: her pill had no photo, so the next Save sent "none" and removed it.
    test('a new photo for a pill with none is not removed by the next Save', async () => {
      jest.mocked(family.getElderSetup).mockResolvedValue({
        ...setup,
        pills: [{ ...herTelma, photo: null, photoUri: null }],
      });
      jest
        .mocked(alarms.pickPhoto)
        .mockResolvedValue({ name: 'b.jpg', uri: 'file:///mine/b.jpg' });
      await openHers();
      await fireEvent.press(screen.getByLabelText('Change the photo'));
      await fireEvent.press(sheet().getByText('Camera'));
      expect(family.sendPill).toHaveBeenLastCalledWith(
        'E',
        expect.objectContaining({ photo: 'b.jpg', photoChoice: 'new' }),
      );
      await screen.findByText("Waiting for Amma's phone: Change Telma 40");
      await thirtyDays();
      expect(family.sendPill).toHaveBeenLastCalledWith(
        'E',
        expect.objectContaining({ days: 30, photoChoice: 'keep' }),
      );
    });
  });
});
