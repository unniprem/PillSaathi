import { Alert, DeviceEventEmitter, StyleSheet } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ml } from '../../src/i18n/ml';
import { courseSummary, toISODate } from '../../src/lib/course';
import * as alarms from '../../src/native/alarms';
import * as family from '../../src/native/family';
import type { FamilyCard } from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const PHOTO = '3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg';
const PHOTO_URI = `file:///photos/${PHOTO}`;

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(alarms.savePill).mockImplementation(async input => ({
    ...input,
    id: 'p1',
    startDate: '2026-10-26',
    photoUri: null,
  }));
  jest.mocked(alarms.pickTime).mockResolvedValue({ hour: 8, minute: 0 });
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const next = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Next' }));
const back = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Back' }));
const save = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
const disabled = (name: string) =>
  screen.getByRole('button', { name }).props.accessibilityState.disabled;
const checked = (name: string) =>
  screen.getByRole('checkbox', { name }).props.accessibilityState.checked;

/**
 * Opens Add a pill with [params] and answers up to [step]: [name], a tablet, Morning (8:00 AM),
 * and 5 days.
 */
async function toStep(step: number, name = 'Azithromycin 500', params = {}) {
  await renderApp('AddPill', params);
  await fireEvent.changeText(
    await screen.findByPlaceholderText('Medicine name'),
    name,
  );
  if (step > 1) {
    await next();
  }
  if (step > 2) {
    await next();
  }
  if (step > 3) {
    await fireEvent.press(screen.getByText('Morning'));
    await next();
  }
  if (step > 4) {
    await fireEvent.press(screen.getByText('5 days'));
    await next();
  }
}

/** Whether [el] sits in the page's scrolling content rather than fixed above or below it. */
function scrollsWithPage(el: { parent: unknown }): boolean {
  for (let n = el.parent as { type?: unknown; parent: unknown } | null; n; ) {
    if (n.type === 'RCTScrollView') {
      return true;
    }
    n = n.parent as typeof n;
  }
  return false;
}

test('asks one question a page, five pages', async () => {
  await toStep(1);
  expect(screen.getByText("What's the medicine called?")).toBeTruthy();
  expect(screen.getByText('1 of 5')).toBeTruthy();
  // On her phone the step bar takes the title's place.
  expect(headerTitles()).toEqual([]);
  await next();
  expect(screen.getByText('What kind, and how much?')).toBeTruthy();
  expect(screen.getByText('2 of 5')).toBeTruthy();
  await next();
  expect(screen.getByText('When should Azithromycin 500 ring?')).toBeTruthy();
  expect(screen.getByText('Pick one or more.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Morning'));
  await next();
  expect(screen.getByText('For how long?')).toBeTruthy();
  await fireEvent.press(screen.getByText('5 days'));
  await next();
  expect(screen.getByText('Does this look right?')).toBeTruthy();
  expect(screen.getByText('5 of 5')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
});

// Review Focus 1: at a large text size the page scrolls under them, and they stay on screen.
test('Back, Next and Save sit under the page, not in it', async () => {
  await toStep(1);
  expect(scrollsWithPage(screen.getByPlaceholderText('Medicine name'))).toBe(
    true,
  );
  expect(scrollsWithPage(screen.getByText('Next'))).toBe(false);
  expect(scrollsWithPage(screen.getByText('Back'))).toBe(false);
  await next();
  await next();
  await fireEvent.press(screen.getByText('Morning'));
  await next();
  await fireEvent.press(screen.getByText('5 days'));
  await next();
  expect(scrollsWithPage(screen.getByText('Save'))).toBe(false);
});

test('Next waits until the step is answered', async () => {
  await renderApp('AddPill', {});
  await screen.findByPlaceholderText('Medicine name');
  expect(disabled('Back')).toBe(true);
  expect(disabled('Next')).toBe(true);
  await fireEvent.changeText(
    screen.getByPlaceholderText('Medicine name'),
    '  ',
  );
  await next();
  expect(screen.getByText('1 of 5')).toBeTruthy();
  await fireEvent.changeText(
    screen.getByPlaceholderText('Medicine name'),
    'Iron',
  );
  expect(disabled('Next')).toBe(false);
  await next();
  // The type and amount start answered.
  expect(disabled('Next')).toBe(false);
  await next();
  expect(disabled('Next')).toBe(true);
  await next();
  expect(screen.getByText('3 of 5')).toBeTruthy();
  await fireEvent.press(screen.getByText('Night'));
  expect(disabled('Next')).toBe(false);
});

test('starts with no duration chosen, and Next waits for one', async () => {
  await toStep(4);
  for (const label of ['5 days', '10 days', '30 days', 'No end', 'Other…']) {
    expect(
      screen.getByRole('button', { name: label }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  }
  expect(disabled('Next')).toBe(true);
  await next();
  expect(screen.getByText('4 of 5')).toBeTruthy();
  expect(alarms.savePill).not.toHaveBeenCalled();
});

test('saves a new pill with what was entered', async () => {
  await toStep(5, '  Azithromycin 500 ');
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
  // A ready time needs no clock.
  expect(alarms.pickTime).not.toHaveBeenCalled();
});

test('after saving it goes back to where it came from', async () => {
  await renderApp();
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Add a pill' }),
  );
  await fireEvent.changeText(
    await screen.findByPlaceholderText('Medicine name'),
    'Iron',
  );
  await next();
  await next();
  await fireEvent.press(screen.getByText('Night'));
  await next();
  await fireEvent.press(screen.getByText('No end'));
  await next();
  await save();
  await waitFor(() =>
    expect(screen.queryByText('Does this look right?')).toBeNull(),
  );
  expect(alarms.savePill).toHaveBeenCalledTimes(1);
  expect(screen.getByText('No pills yet')).toBeTruthy();
});

test('saves No end and Tomorrow as chosen', async () => {
  await toStep(4);
  await fireEvent.press(screen.getByText('No end'));
  expect(
    screen.getByRole('button', { name: 'Today' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ selected: true }));
  await fireEvent.press(screen.getByText('Tomorrow'));
  await next();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ startsTomorrow: true, days: null }),
  );
});

test('keeps Next waiting for an invalid Other… duration', async () => {
  await toStep(4);
  await fireEvent.press(screen.getByText('Other…'));
  const days = screen.getByLabelText('Days');
  for (const junk of ['0', '366', '5.5', '', '1e2']) {
    await fireEvent.changeText(days, junk);
    await next();
    expect([junk, screen.queryByText('4 of 5')]).toEqual([
      junk,
      expect.anything(),
    ]);
  }
  await fireEvent.changeText(days, '12');
  await next();
  expect(screen.getByText('12 days')).toBeTruthy();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ days: 12 }),
  );
});

test('resets the amount when the type changes', async () => {
  await toStep(2);
  expect(screen.getByLabelText('1 tablet')).toBeTruthy();
  expect(
    screen.getByRole('radio', { name: 'Tablet' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ checked: true }));
  await fireEvent.press(screen.getByText('Syrup'));
  expect(screen.getByLabelText('5 ml')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('More'));
  expect(screen.getByLabelText('7.5 ml')).toBeTruthy();
  await fireEvent.press(screen.getByText('Tablet'));
  expect(screen.getByLabelText('1 tablet')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Less'));
  await fireEvent.press(screen.getByLabelText('Less'));
  expect(screen.getByLabelText('½ tablet')).toBeTruthy();
  await next();
  await fireEvent.press(screen.getByText('Morning'));
  await next();
  await fireEvent.press(screen.getByText('5 days'));
  await next();
  expect(screen.getByText('Tablet · ½ each time')).toBeTruthy();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ form: 'tablet', amount: 0.5 }),
  );
});

test('ticking Morning and Night gives two times', async () => {
  await toStep(3);
  expect(checked('Morning, 8:00 AM')).toBe(false);
  await fireEvent.press(screen.getByText('Morning'));
  await fireEvent.press(screen.getByText('Night'));
  expect(checked('Morning, 8:00 AM')).toBe(true);
  expect(checked('Afternoon, 1:30 PM')).toBe(false);
  expect(checked('Night, 9:00 PM')).toBe(true);
  await next();
  await fireEvent.press(screen.getByText('5 days'));
  await next();
  expect(screen.getByText('8:00 AM and 9:00 PM')).toBeTruthy();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({
      times: [
        { hour: 8, minute: 0 },
        { hour: 21, minute: 0 },
      ],
    }),
  );
});

test('refuses a time already on the pill', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await toStep(3);
  await fireEvent.press(screen.getByText('Morning'));
  await fireEvent.press(screen.getByText('Another time'));
  expect(alarms.pickTime).toHaveBeenCalledWith(8, 0);
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('That time is already added.'),
  );
  expect(screen.getAllByText('8:00 AM')).toHaveLength(1);
});

test('two ready times cannot ring at once', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await toStep(3);
  await fireEvent.press(screen.getByText('Morning'));
  await fireEvent.press(screen.getByText('Night'));
  // Night moved to Morning's time.
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 8, minute: 0 });
  await fireEvent.press(screen.getByRole('button', { name: 'Change 9:00 PM' }));
  expect(alarms.pickTime).toHaveBeenLastCalledWith(21, 0);
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('That time is already added.'),
  );
  expect(checked('Night, 9:00 PM')).toBe(true);
  // Morning moved to Afternoon's time, then Afternoon ticked.
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 13, minute: 30 });
  await fireEvent.press(screen.getByRole('button', { name: 'Change 8:00 AM' }));
  expect(
    await screen.findByRole('checkbox', { name: 'Morning, 1:30 PM' }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText('Afternoon'));
  expect(alert).toHaveBeenCalledTimes(2);
  expect(checked('Afternoon, 1:30 PM')).toBe(false);
});

test('changes and removes a time', async () => {
  await toStep(3);
  await fireEvent.press(screen.getByText('Morning'));
  // Another time at a ready time ticks that one.
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 21, minute: 0 });
  await fireEvent.press(screen.getByText('Another time'));
  await waitFor(() => expect(checked('Night, 9:00 PM')).toBe(true));
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 10, minute: 0 });
  await fireEvent.press(screen.getByText('Another time'));
  expect(await screen.findByText('10:00 AM')).toBeTruthy();
  expect(checked('10:00 AM')).toBe(true);
  jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: 7, minute: 30 });
  await fireEvent.press(screen.getByRole('button', { name: 'Change 8:00 AM' }));
  expect(await screen.findByText('7:30 AM')).toBeTruthy();
  await fireEvent.press(screen.getByText('10:00 AM'));
  expect(screen.queryByText('10:00 AM')).toBeNull();
  await fireEvent.press(screen.getByText('Night'));
  await next();
  await fireEvent.press(screen.getByText('10 days'));
  await next();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({ times: [{ hour: 7, minute: 30 }], days: 10 }),
  );
});

test('hides Another time at six times', async () => {
  await toStep(3);
  await fireEvent.press(screen.getByText('Morning'));
  for (let h = 9; h <= 13; h++) {
    jest.mocked(alarms.pickTime).mockResolvedValueOnce({ hour: h, minute: 0 });
    await fireEvent.press(screen.getByText('Another time'));
    await screen.findByText(
      `${h > 12 ? h - 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`,
    );
  }
  expect(screen.queryByText('Another time')).toBeNull();
});

test('shows the pill on one card before saving', async () => {
  await toStep(5, 'Iron');
  const today = toISODate(new Date());
  expect(screen.getByText('Iron')).toBeTruthy();
  expect(screen.getByText('Tablet · 1 each time')).toBeTruthy();
  expect(screen.getByText('8:00 AM')).toBeTruthy();
  expect(screen.getByText('5 days')).toBeTruthy();
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
  expect(screen.getByTestId('pill-shape-tablet')).toBeTruthy();
});

test('Back keeps what was entered', async () => {
  await toStep(4, 'Iron');
  await fireEvent.press(screen.getByText('30 days'));
  await back();
  expect(checked('Morning, 8:00 AM')).toBe(true);
  await back();
  await fireEvent.press(screen.getByText('Capsule'));
  await back();
  expect(screen.getByDisplayValue('Iron')).toBeTruthy();
  await next();
  expect(
    screen.getByRole('radio', { name: 'Capsule' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ checked: true }));
  await next();
  await next();
  expect(
    screen.getByRole('button', { name: '30 days' }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ selected: true }));
  await next();
  await save();
  expect(alarms.savePill).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Iron',
      form: 'capsule',
      times: [{ hour: 8, minute: 0 }],
      days: 30,
    }),
  );
});

test('close leaves without saving', async () => {
  await renderApp();
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Add a pill' }),
  );
  await fireEvent.changeText(
    await screen.findByPlaceholderText('Medicine name'),
    'Iron',
  );
  await next();
  await fireEvent.press(screen.getByLabelText('Close'));
  await waitFor(() =>
    expect(screen.queryByText('What kind, and how much?')).toBeNull(),
  );
  expect(screen.getByText('No pills yet')).toBeTruthy();
  expect(alarms.savePill).not.toHaveBeenCalled();
});

// The keyboard covers the page rather than shrinking it, so Next rises above it.
test('makes room under Next for the keyboard', async () => {
  await toStep(1);
  const bottom = () =>
    StyleSheet.flatten(screen.getByTestId('add-pill-foot').props.style)
      .paddingBottom;
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

test('asks in Malayalam', async () => {
  jest.mocked(alarms.currentLanguage).mockReturnValue('ml');
  await renderApp('AddPill', {});
  expect(await screen.findByText(ml.addPill.nameQuestion)).toBeTruthy();
  expect(screen.getByPlaceholderText(ml.pill.namePlaceholder)).toBeTruthy();
  expect(screen.getByText(ml.common.next)).toBeTruthy();
});

describe('photos', () => {
  test('picks a photo from the gallery for a new pill', async () => {
    jest
      .mocked(alarms.pickPhoto)
      .mockResolvedValue({ name: PHOTO, uri: PHOTO_URI });
    await toStep(1);
    expect(screen.getByText('Add a photo of the strip')).toBeTruthy();
    expect(screen.getByText('Optional. Helps tell pills apart.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Gallery'));
    expect(alarms.pickPhoto).toHaveBeenCalledWith('gallery');
    expect((await screen.findByTestId('pill-photo')).props.source).toEqual({
      uri: PHOTO_URI,
    });
    await next();
    await next();
    await fireEvent.press(screen.getByText('Morning'));
    await next();
    await fireEvent.press(screen.getByText('5 days'));
    await next();
    // The summary shows it too.
    expect(screen.getByTestId('pill-photo').props.source).toEqual({
      uri: PHOTO_URI,
    });
    await save();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({ id: null, photo: PHOTO }),
    );
  });

  test('takes a photo with the camera, and removes it', async () => {
    jest
      .mocked(alarms.pickPhoto)
      .mockResolvedValue({ name: PHOTO, uri: PHOTO_URI });
    await toStep(1);
    await fireEvent.press(screen.getByText('Camera'));
    expect(alarms.pickPhoto).toHaveBeenCalledWith('camera');
    await screen.findByTestId('pill-photo');
    await fireEvent.press(screen.getByText('Remove'));
    expect(screen.queryByTestId('pill-photo')).toBeNull();
    // The dashed box takes one too.
    await fireEvent.press(screen.getByText('Add a photo of the strip'));
    expect(alarms.pickPhoto).toHaveBeenLastCalledWith('camera');
    await screen.findByTestId('pill-photo');
  });

  test('keeps the photo when a pick is cancelled', async () => {
    jest
      .mocked(alarms.pickPhoto)
      .mockResolvedValueOnce({ name: PHOTO, uri: PHOTO_URI })
      .mockResolvedValueOnce(null);
    await toStep(1);
    await fireEvent.press(screen.getByText('Camera'));
    await screen.findByTestId('pill-photo');
    await fireEvent.press(screen.getByText('Gallery'));
    expect(alarms.pickPhoto).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('pill-photo').props.source).toEqual({
      uri: PHOTO_URI,
    });
  });

  test('says when a photo could not be added', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .mocked(alarms.pickPhoto)
      .mockRejectedValue(
        Object.assign(new Error('decode'), { code: 'PHOTO_ERROR' }),
      );
    await toStep(1);
    await fireEvent.press(screen.getByText('Gallery'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Couldn't add the photo"),
    );
    expect(screen.queryByTestId('pill-photo')).toBeNull();
  });
});

describe('saving', () => {
  test('a failed save says so and stays', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(alarms.savePill).mockRejectedValueOnce(new Error('disk full'));
    await toStep(5);
    await save();
    expect(alert).toHaveBeenCalledWith(
      'Could not save the pill',
      'Please try again.',
    );
    expect(screen.getByText('Does this look right?')).toBeTruthy();
    expect(disabled('Save')).toBe(false);
  });

  test('opens setup after the first pill', async () => {
    jest
      .mocked(alarms.getSetupState)
      .mockResolvedValue({ seen: false, doneSteps: [] });
    await toStep(5);
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
    await toStep(5);
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
    await waitFor(() =>
      expect(screen.queryByText('Does this look right?')).toBeNull(),
    );
  });
});

describe('tablets left', () => {
  /** Opens the count on the last step. */
  const addCount = () => fireEvent.press(screen.getByText('+ Add'));

  test('is optional, and not asked until + Add', async () => {
    await toStep(5);
    expect(screen.getByText('Tablets left')).toBeTruthy();
    expect(screen.getByText('Optional')).toBeTruthy();
    expect(screen.queryByLabelText('Tablets left')).toBeNull();
    await addCount();
    expect(screen.getByLabelText('Tablets left').props.autoFocus).toBe(true);
  });

  test('adds tablets with the quick buttons', async () => {
    await toStep(5);
    await addCount();
    await fireEvent.press(screen.getByText('+10'));
    await fireEvent.press(screen.getByText('+15'));
    expect(screen.getByLabelText('Tablets left').props.value).toBe('25');
    await save();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({ remaining: 25, remainingChanged: true }),
    );
  });

  test('refuses a count that is not a whole or half number', async () => {
    await toStep(5);
    await addCount();
    for (const typed of ['9.3', '1000', '-1', '9.', 'ten']) {
      await fireEvent.changeText(screen.getByLabelText('Tablets left'), typed);
      expect([typed, disabled('Save')]).toEqual([typed, true]);
    }
    for (const typed of ['9.5', '0', '999', '']) {
      await fireEvent.changeText(screen.getByLabelText('Tablets left'), typed);
      expect([typed, disabled('Save')]).toEqual([typed, false]);
    }
  });

  test('hides the count for syrup and drops', async () => {
    await toStep(5);
    await addCount();
    await fireEvent.changeText(screen.getByLabelText('Tablets left'), '20');
    const toKind = async (kind: string) => {
      await back();
      await back();
      await back();
      await fireEvent.press(screen.getByText(kind));
      await next();
      await next();
      await next();
    };
    await toKind('Syrup');
    expect(screen.queryByText('Tablets left')).toBeNull();
    expect(screen.queryByText('+10')).toBeNull();
    await toKind('Drops');
    expect(screen.queryByText('Tablets left')).toBeNull();
    await save();
    expect(alarms.savePill).toHaveBeenCalledWith(
      expect.objectContaining({ form: 'drops', remaining: null }),
    );
  });

  test('says Capsules left for capsules', async () => {
    await toStep(2);
    await fireEvent.press(screen.getByText('Capsule'));
    await next();
    await fireEvent.press(screen.getByText('Morning'));
    await next();
    await fireEvent.press(screen.getByText('5 days'));
    await next();
    expect(screen.getByText('Capsules left')).toBeTruthy();
    await addCount();
    expect(screen.getByLabelText('Capsules left')).toBeTruthy();
    expect(
      screen.getByText('Optional. It goes down by the amount at each Taken.'),
    ).toBeTruthy();
  });
});

describe('for her, on a relative’s phone', () => {
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

  beforeEach(() => {
    jest.mocked(family.getFamily).mockResolvedValue([amma]);
    jest.mocked(family.sendPill).mockResolvedValue('c1');
  });

  test('is titled for her, and says the times are hers', async () => {
    await toStep(3, 'Vitamin D', { elderId: 'E' });
    await waitFor(() =>
      expect(headerTitles()).toEqual(['Add a pill for Amma']),
    );
    expect(screen.getByText('3 of 5')).toBeTruthy();
    expect(screen.getByText('When should Vitamin D ring?')).toBeTruthy();
    expect(screen.getByText("Times are Amma's time.")).toBeTruthy();
    expect(screen.queryByText('Pick one or more.')).toBeNull();
  });

  test('a new pill with Start tomorrow sends startsTomorrow true and photoChoice none', async () => {
    await toStep(4, 'Azee 500', { elderId: 'E' });
    await fireEvent.press(screen.getByText('No end'));
    await fireEvent.press(screen.getByText('Tomorrow'));
    await next();
    await save();
    expect(family.sendPill).toHaveBeenCalledWith('E', {
      id: null,
      name: 'Azee 500',
      form: 'tablet',
      amount: 1,
      times: [{ hour: 8, minute: 0 }],
      startsTomorrow: true,
      days: null,
      photo: null,
      remaining: null,
      remainingChanged: false,
      photoChoice: 'none',
    });
    expect(alarms.savePill).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('Does this look right?')).toBeNull(),
    );
  });

  test('a photo picked here is sent as new', async () => {
    jest
      .mocked(alarms.pickPhoto)
      .mockResolvedValue({ name: 'b.jpg', uri: 'file:///mine/b.jpg' });
    await renderApp('AddPill', { elderId: 'E' });
    await fireEvent.changeText(
      await screen.findByPlaceholderText('Medicine name'),
      'Azee 500',
    );
    await fireEvent.press(screen.getByText('Camera'));
    await screen.findByTestId('pill-photo');
    await next();
    await next();
    await fireEvent.press(screen.getByText('Morning'));
    await next();
    await fireEvent.press(screen.getByText('5 days'));
    await next();
    await save();
    expect(family.sendPill).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({ photo: 'b.jpg', photoChoice: 'new' }),
    );
  });

  test('NOT_ALLOWED says how to be allowed, and stays', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .mocked(family.sendPill)
      .mockRejectedValue(
        Object.assign(new Error('NOT_ALLOWED'), { code: 'NOT_ALLOWED' }),
      );
    await toStep(5, 'Azee 500', { elderId: 'E' });
    await waitFor(() =>
      expect(headerTitles()).toEqual(['Add a pill for Amma']),
    );
    await save();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "Amma's phone hasn't allowed you to change her pills. On her phone: open PillSaathi, tap Family, then turn on Can change my pills on your card.",
      ),
    );
    expect(screen.getByText('Does this look right?')).toBeTruthy();
    expect(disabled('Save')).toBe(false);
  });

  test('no internet says so', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .mocked(family.sendPill)
      .mockRejectedValue(Object.assign(new Error('x'), { code: 'OFFLINE' }));
    await toStep(5, 'Azee 500', { elderId: 'E' });
    await save();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('No internet. Please try again.'),
    );
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
    await toStep(5, 'Azee 500', { elderId: 'E' });
    await save();
    await waitFor(() => expect(family.sendPill).toHaveBeenCalled());
    expect(alarms.markSetupSeen).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });
});
