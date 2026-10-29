import {
  Alert,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ml } from '../../src/i18n/ml';
import { courseSummary, toISODate } from '../../src/lib/course';
import * as alarms from '../../src/native/alarms';
import * as family from '../../src/native/family';
import type { Pill } from '../../src/native/alarms';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
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

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  jest.mocked(alarms.listPills).mockResolvedValue([telma]);
  jest.mocked(alarms.savePill).mockResolvedValue(telma);
  jest.mocked(alarms.deletePill).mockResolvedValue();
  jest.mocked(alarms.markSetupSeen).mockResolvedValue();
  jest.mocked(alarms.pickTime).mockResolvedValue({ hour: 8, minute: 0 });
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function newPill(name = 'Azithromycin 500') {
  await renderApp('PillEdit', {});
  await fireEvent.changeText(
    await screen.findByPlaceholderText('Medicine name'),
    name,
  );
  await fireEvent.press(screen.getByText('+ Add a time'));
  await screen.findByText('8:00 AM');
}

const save = () => fireEvent.press(screen.getByText('Save'));

/** Whether [el] sits in the page's scrolling content rather than the fixed top bar. */
function scrollsWithPage(el: { parent: unknown }): boolean {
  for (let n = el.parent as { type?: unknown; parent: unknown } | null; n; ) {
    if (n.type === 'RCTScrollView') {
      return true;
    }
    n = n.parent as typeof n;
  }
  return false;
}

test('Save and Delete sit in the top bar, not at the end of the page', async () => {
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByDisplayValue('Telma 40');
  expect(scrollsWithPage(screen.getByPlaceholderText('Medicine name'))).toBe(
    true,
  );
  expect(scrollsWithPage(screen.getByText('Save'))).toBe(false);
  expect(scrollsWithPage(screen.getByText('Delete'))).toBe(false);
});

test('starts with no duration chosen and Save disabled', async () => {
  await newPill();
  for (const label of [
    '5 days',
    '7 days',
    '10 days',
    '20 days',
    'Other…',
    'No end',
  ]) {
    expect(
      screen.getByRole('button', { name: label }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  }
  expect(
    screen.getByRole('button', { name: 'Save' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ disabled: true }));
  await save();
  expect(alarms.savePill).not.toHaveBeenCalled();
});

test('saves a new pill with what was entered', async () => {
  await newPill('  Azithromycin 500 ');
  expect(alarms.pickTime).toHaveBeenCalledWith(8, 0);
  await fireEvent.press(screen.getByText('5 days'));
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith({
    id: null,
    name: 'Azithromycin 500',
    form: 'tablet',
    amount: 1,
    times: [{ hour: 8, minute: 0 }],
    startsTomorrow: false,
    days: 5,
    photo: null,
    remaining: null,
    remainingChanged: false,
  });
});

test('saves No end and Tomorrow as chosen', async () => {
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
  await fireEvent.press(screen.getByText('Tomorrow'));
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ startsTomorrow: true, days: null }),
  );
});

test('keeps Save disabled for an invalid Other… duration', async () => {
  await newPill();
  await fireEvent.press(screen.getByText('Other…'));
  const days = screen.getByLabelText('Days');
  for (const junk of ['0', '366', '5.5', '', '1e2']) {
    await fireEvent.changeText(days, junk);
    await save();
  }
  expect(alarms.savePill).not.toHaveBeenCalled();
  await fireEvent.changeText(days, '12');
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ days: 12 }),
  );
});

test('resets the amount when the type changes', async () => {
  await renderApp('PillEdit', {});
  expect(await screen.findByText('1 tablet')).toBeTruthy();
  await fireEvent.press(screen.getByText('Syrup'));
  expect(screen.getByText('5 ml')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('More'));
  expect(screen.getByText('7.5 ml')).toBeTruthy();
  await fireEvent.press(screen.getByText('Tablet'));
  expect(screen.getByText('1 tablet')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Less'));
  await fireEvent.press(screen.getByLabelText('Less'));
  expect(screen.getByText('½ tablet')).toBeTruthy();
});

test('refuses a time already on the pill', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await newPill();
  await fireEvent.press(screen.getByText('+ Add a time'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('That time is already added.'),
  );
  expect(screen.getAllByText('8:00 AM')).toHaveLength(1);
});

test('changes and removes a time', async () => {
  await newPill();
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 21, minute: 0 });
  await fireEvent.press(screen.getByText('+ Add a time'));
  expect(await screen.findByText('9:00 PM')).toBeTruthy();
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 7, minute: 30 });
  await fireEvent.press(screen.getAllByText('Change')[0]);
  expect(await screen.findByText('7:30 AM')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Remove 9:00 PM'));
  expect(screen.queryByText('9:00 PM')).toBeNull();
  await fireEvent.press(screen.getByText('7 days'));
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ times: [{ hour: 7, minute: 30 }], days: 7 }),
  );
});

test('hides + Add a time at six times', async () => {
  await newPill();
  for (let h = 9; h <= 13; h++) {
    jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: h, minute: 0 });
    await fireEvent.press(screen.getByText('+ Add a time'));
    await screen.findByText(
      `${h > 12 ? h - 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`,
    );
  }
  expect(screen.queryByText('+ Add a time')).toBeNull();
});

test('shows the course summary', async () => {
  await newPill();
  await fireEvent.press(screen.getByText('5 days'));
  const today = toISODate(new Date());
  expect(
    screen.getByText(
      courseSummary({
        startDate: today,
        days: 5,
        times: [{ hour: 8, minute: 0 }],
        today,
        is24h: false,
      }),
    ),
  ).toBeTruthy();
});

test('loads an existing pill and saves it with its id', async () => {
  await renderApp('PillEdit', { pillId: 'p1' });
  expect(await screen.findByDisplayValue('Telma 40')).toBeTruthy();
  expect(screen.getByText('½ tablet')).toBeTruthy();
  expect(screen.getByText('9:00 PM')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Other…' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ selected: true }));
  expect(screen.getByDisplayValue('12')).toBeTruthy();
  expect(screen.queryByText('Tomorrow')).toBeNull();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith({
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
  });
});

test('an edit keeps the pill photo', async () => {
  const photo = '3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg';
  jest
    .mocked(alarms.listPills)
    .mockResolvedValue([
      { ...telma, photo, photoUri: `file:///photos/${photo}` },
    ]);
  await renderApp('PillEdit', { pillId: 'p1' });
  expect(await screen.findByDisplayValue('Telma 40')).toBeTruthy();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'p1', photo }),
  );
});

const PHOTO = '3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg';
const PHOTO_URI = `file:///photos/${PHOTO}`;

test('takes a photo and saves its name', async () => {
  jest
    .mocked(alarms.pickPhoto)
    .mockResolvedValue({ name: PHOTO, uri: PHOTO_URI });
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByDisplayValue('Telma 40');
  await fireEvent.press(screen.getByText('Take a photo'));
  expect(alarms.pickPhoto).toHaveBeenCalledWith('camera');
  expect((await screen.findByTestId('pill-photo')).props.source).toEqual({
    uri: PHOTO_URI,
  });
  expect(screen.getByText('Retake')).toBeTruthy();
  expect(screen.getByText('Remove')).toBeTruthy();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'p1', photo: PHOTO }),
  );
});

test('picks a photo from the gallery for a new pill', async () => {
  jest
    .mocked(alarms.pickPhoto)
    .mockResolvedValue({ name: PHOTO, uri: PHOTO_URI });
  await newPill();
  await fireEvent.press(screen.getByText('Choose from gallery'));
  expect(alarms.pickPhoto).toHaveBeenCalledWith('gallery');
  await screen.findByTestId('pill-photo');
  await fireEvent.press(screen.getByText('5 days'));
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ id: null, photo: PHOTO }),
  );
});

test('removes a photo', async () => {
  jest
    .mocked(alarms.listPills)
    .mockResolvedValue([{ ...telma, photo: PHOTO, photoUri: PHOTO_URI }]);
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByTestId('pill-photo');
  await fireEvent.press(screen.getByText('Remove'));
  expect(screen.queryByTestId('pill-photo')).toBeNull();
  expect(screen.getByText('Take a photo')).toBeTruthy();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'p1', photo: null }),
  );
});

test('keeps the photo when a pick is cancelled', async () => {
  jest
    .mocked(alarms.listPills)
    .mockResolvedValue([{ ...telma, photo: PHOTO, photoUri: PHOTO_URI }]);
  jest.mocked(alarms.pickPhoto).mockResolvedValue(null);
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByTestId('pill-photo');
  await fireEvent.press(screen.getByText('Retake'));
  expect(alarms.pickPhoto).toHaveBeenCalledWith('camera');
  expect(screen.getByTestId('pill-photo').props.source).toEqual({
    uri: PHOTO_URI,
  });
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ photo: PHOTO }),
  );
});

test('says when a photo could not be added', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(alarms.pickPhoto)
    .mockRejectedValue(
      Object.assign(new Error('decode'), { code: 'PHOTO_ERROR' }),
    );
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByDisplayValue('Telma 40');
  await fireEvent.press(screen.getByText('Choose from gallery'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith("Couldn't add the photo"),
  );
  expect(screen.queryByTestId('pill-photo')).toBeNull();
});

test('shows the pill page in Malayalam', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  await renderApp('PillEdit', { pillId: 'p1' });
  expect(await screen.findByText('പേര്')).toBeTruthy();
  expect(screen.getByText('½ ഗുളിക')).toBeTruthy();
  expect(screen.getByText(ml.pill.takePhoto)).toBeTruthy();
  expect(screen.getByText(ml.common.save)).toBeTruthy();
  expect(screen.getByText(ml.forms.capsule)).toBeTruthy();
});

test('a pill that cannot be loaded says so in the app language', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  jest.mocked(alarms.listPills).mockRejectedValue(new Error('disk'));
  await renderApp('PillEdit', { pillId: 'p1' });
  await waitFor(() => expect(alert).toHaveBeenCalledWith(ml.pill.loadFailed));
});

test('a pill that no longer exists leaves the page', async () => {
  jest.mocked(alarms.listPills).mockResolvedValue([]);
  await renderApp('PillEdit', { pillId: 'p1' });
  await waitFor(() => expect(screen.queryByText('Save')).toBeNull());
  expect(alarms.savePill).not.toHaveBeenCalled();
});

test('deletes after confirming', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderApp('PillEdit', { pillId: 'p1' });
  await screen.findByDisplayValue('Telma 40');
  await fireEvent.press(screen.getByText('Delete'));
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
  await waitFor(() => expect(screen.queryByText('Delete')).toBeNull());
});

test('a failed save says so and stays', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(alarms.savePill).mockRejectedValueOnce(new Error('disk full'));
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
  await save();
  expect(alert).toHaveBeenCalledWith(
    'Could not save the pill',
    'Please try again.',
  );
  expect(screen.getByText('Save')).toBeTruthy();
});

test('opens setup after the first pill', async () => {
  jest
    .mocked(alarms.getSetupState)
    .mockResolvedValue({ seen: false, doneSteps: [] });
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
  await save();
  await waitFor(() => expect(alarms.markSetupSeen).toHaveBeenCalledTimes(1));
  expect(
    await screen.findByText(
      'Some phones stop apps in the background. Do these steps once so your alarms always ring.',
    ),
  ).toBeTruthy();
});

test('asks for the exact alarm permission when it is missing', async () => {
  jest.mocked(alarms.getHealth).mockResolvedValue({
    notificationsEnabled: true,
    alarmChannelEnabled: true,
    exactAlarmAllowed: false,
    fullScreenAllowed: true,
    ignoringBatteryOptimizations: true,
    backgroundRestricted: false,
    alarmVolumeLow: false,
  });
  jest.mocked(alarms.openSetting).mockResolvedValue(true);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await newPill();
  await fireEvent.press(screen.getByText('No end'));
  await save();
  expect(alert).toHaveBeenCalledWith(
    'PillSaathi needs permission to set alarms',
    expect.any(String),
    expect.any(Array),
    expect.anything(),
  );
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    buttons.find(b => b.text === 'Allow')!.onPress!();
  });
  expect(alarms.openSetting).toHaveBeenCalledWith('exactAlarm');
});

/** Lets a scroll queued for the next frame run. */
const nextFrame = () => act(() => new Promise<void>(r => setTimeout(r, 0)));

describe('tablets left', () => {
  test('adds tablets with the quick buttons', async () => {
    await newPill();
    await fireEvent.press(screen.getByText('No end'));
    await fireEvent.press(screen.getByText('+10'));
    await fireEvent.press(screen.getByText('+15'));
    expect(screen.getByLabelText('Tablets left').props.value).toBe('25');
    await save();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({ remaining: 25, remainingChanged: true }),
    );
  });

  test.each([
    ['40', 40],
    ['', null],
  ])('types a count and clears it (%p)', async (typed, remaining) => {
    jest
      .mocked(alarms.listPills)
      .mockResolvedValue([{ ...telma, remaining: 9 }]);
    await renderApp('PillEdit', { pillId: 'p1' });
    await fireEvent.changeText(await screen.findByDisplayValue('9'), typed);
    await save();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({ remaining, remainingChanged: true }),
    );
  });

  // A ring's Taken may have lowered the count while the page was open; Save must not put 9 back.
  test('keeps the stored count when the field is untouched', async () => {
    jest
      .mocked(alarms.listPills)
      .mockResolvedValue([{ ...telma, remaining: 9 }]);
    await renderApp('PillEdit', { pillId: 'p1' });
    expect(await screen.findByDisplayValue('9')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByDisplayValue('Telma 40'),
      'Telma 80',
    );
    await save();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Telma 80',
        remaining: 9,
        remainingChanged: false,
      }),
    );
  });

  test('refuses a count that is not a whole or half number', async () => {
    await newPill();
    await fireEvent.press(screen.getByText('No end'));
    const saveDisabled = () =>
      screen.getByRole('button', { name: 'Save' }).props.accessibilityState
        .disabled;
    for (const typed of ['9.3', '1000', '-1', '9.', 'ten']) {
      await fireEvent.changeText(screen.getByLabelText('Tablets left'), typed);
      expect([typed, saveDisabled()]).toEqual([typed, true]);
    }
    for (const typed of ['9.5', '0', '999', '']) {
      await fireEvent.changeText(screen.getByLabelText('Tablets left'), typed);
      expect([typed, saveDisabled()]).toEqual([typed, false]);
    }
  });

  test('hides the count for syrup and drops', async () => {
    await newPill();
    await fireEvent.press(screen.getByText('No end'));
    await fireEvent.changeText(screen.getByLabelText('Tablets left'), '20');
    await fireEvent.press(screen.getByText('Syrup'));
    expect(screen.queryByLabelText('Tablets left')).toBeNull();
    expect(screen.queryByText('+10')).toBeNull();
    await fireEvent.press(screen.getByText('Drops'));
    expect(screen.queryByLabelText('Tablets left')).toBeNull();
    await save();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({ form: 'drops', remaining: null }),
    );
  });

  test('says Capsules left for capsules', async () => {
    await newPill();
    await fireEvent.press(screen.getByText('Capsule'));
    expect(screen.getByLabelText('Capsules left')).toBeTruthy();
    expect(screen.getByText('Capsules left')).toBeTruthy();
    expect(
      screen.getByText('Optional. It goes down by the amount at each Taken.'),
    ).toBeTruthy();
  });

  test('opens at the count from the refill banner', async () => {
    await renderApp('PillEdit', { pillId: 'p1', focusCount: true });
    await screen.findByDisplayValue('Telma 40');
    expect(screen.getByLabelText('Tablets left').props.autoFocus).toBe(true);
  });

  // The keyboard covers the lower half of the page: bring the count up above it.
  test('scrolls the count into view from the refill banner', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await renderApp('PillEdit', { pillId: 'p1', focusCount: true });
    await screen.findByDisplayValue('Telma 40');
    const layout = (y: number) =>
      fireEvent(screen.getByTestId('count-section'), 'layout', {
        nativeEvent: { layout: { x: 0, y, width: 360, height: 120 } },
      });
    await layout(640);
    await waitFor(() =>
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 640, animated: false }),
    );
    // The keyboard's room below the page arrives later: scroll again once the page can go further.
    await fireEvent(
      screen.getByTestId('pill-page'),
      'contentSizeChange',
      360,
      1200,
    );
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(2));
    // Once the page is scrolled by hand, it stays where it was put.
    await fireEvent(screen.getByTestId('pill-page'), 'scrollBeginDrag');
    await layout(700);
    await nextFrame();
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  // The keyboard covers the page rather than shrinking it, so the page makes room below itself.
  test('makes room under the page for the keyboard', async () => {
    await renderApp('PillEdit', { pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    const bottom = () =>
      StyleSheet.flatten(
        screen.getByTestId('pill-page').props.contentContainerStyle,
      ).paddingBottom;
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

  test('does not scroll to the count otherwise', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await renderApp('PillEdit', { pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    await fireEvent(screen.getByTestId('count-section'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 640, width: 360, height: 120 } },
    });
    await nextFrame();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('does not focus the count otherwise', async () => {
    await renderApp('PillEdit', { pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    expect(screen.getByLabelText('Tablets left').props.autoFocus).toBeFalsy();
  });
});

describe('for her, on a relative’s phone', () => {
  const herTelma = { ...telma, photo: 'a.jpg', photoUri: 'file:///her/a.jpg' };
  const amma = {
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

  beforeEach(() => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.getElderSetup).mockResolvedValue({
      editor: true,
      otherZone: false,
      heardAt: null,
      pills: [herTelma],
      times: [],
      sounds: [],
      problem: null,
    });
    jest.mocked(family.sendPill).mockResolvedValue('c1');
    jest.mocked(family.sendDeletePill).mockResolvedValue('c2');
  });

  test('loads her pill, Save sends it with photoChoice keep, and returns', async () => {
    await renderApp('PillEdit', { elderId: 'E', pillId: 'p1' });
    expect(await screen.findByDisplayValue('Telma 40')).toBeTruthy();
    await waitFor(() => expect(headerTitles()).toEqual(["Amma's pill"]));
    expect(alarms.listPills).not.toHaveBeenCalled();
    await save();
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
    await waitFor(() => expect(headerTitles()).not.toContain("Amma's pill"));
  });

  test('a new pill with Start tomorrow sends startsTomorrow true and photoChoice none', async () => {
    await renderApp('PillEdit', { elderId: 'E' });
    await fireEvent.changeText(
      await screen.findByPlaceholderText('Medicine name'),
      'Azee 500',
    );
    await fireEvent.press(screen.getByText('+ Add a time'));
    await screen.findByText('8:00 AM');
    await fireEvent.press(screen.getByText('No end'));
    await fireEvent.press(screen.getByText('Tomorrow'));
    await save();
    expect(family.sendPill).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({
        id: null,
        name: 'Azee 500',
        startsTomorrow: true,
        photo: null,
        photoChoice: 'none',
      }),
    );
  });

  test('a photo picked here is sent as new', async () => {
    jest
      .mocked(alarms.pickPhoto)
      .mockResolvedValue({ name: 'b.jpg', uri: 'file:///mine/b.jpg' });
    await renderApp('PillEdit', { elderId: 'E', pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    await fireEvent.press(screen.getByText('Retake'));
    await save();
    expect(family.sendPill).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({ photo: 'b.jpg', photoChoice: 'new' }),
    );
  });

  test('Delete confirms and sends a delete', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderApp('PillEdit', { elderId: 'E', pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    await fireEvent.press(screen.getByText('Delete'));
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
    await renderApp('PillEdit', { elderId: 'E', pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    await save();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "Amma's phone hasn't allowed you to change her pills. On her phone: Settings → Family → turn on Can change my pills next to your name.",
      ),
    );
  });

  test('says the times are hers when she is in another zone', async () => {
    jest.mocked(family.getElderSetup).mockResolvedValue({
      editor: true,
      otherZone: true,
      heardAt: null,
      pills: [herTelma],
      times: [],
      sounds: [],
      problem: null,
    });
    await renderApp('PillEdit', { elderId: 'E', pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    expect(await screen.findByText("Times are Amma's time.")).toBeTruthy();
  });

  test('never opens setup or the exact-alarm prompt', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest
      .mocked(alarms.getSetupState)
      .mockResolvedValue({ seen: false, doneSteps: [] });
    jest.mocked(alarms.getHealth).mockResolvedValue({
      notificationsEnabled: true,
      alarmChannelEnabled: true,
      exactAlarmAllowed: false,
      fullScreenAllowed: true,
      ignoringBatteryOptimizations: true,
      backgroundRestricted: false,
      alarmVolumeLow: false,
    });
    await renderApp('PillEdit', { elderId: 'E', pillId: 'p1' });
    await screen.findByDisplayValue('Telma 40');
    await save();
    await waitFor(() => expect(family.sendPill).toHaveBeenCalled());
    expect(alarms.markSetupSeen).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });
});
