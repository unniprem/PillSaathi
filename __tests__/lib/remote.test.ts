import { en } from '../../src/i18n/en';
import { draftFromPill } from '../../src/lib/pillDraft';
import type { PillDraft } from '../../src/lib/pillDraft';
import {
  afterSend,
  changeState,
  changeTitle,
  pillAhead,
  problemText,
  waitingByPill,
} from '../../src/lib/remote';
import type { Pill } from '../../src/native/alarms';
import type { ChangeView } from '../../src/native/family';

const at3pm = new Date(2026, 9, 29, 15, 5).getTime();

function change(extra: Partial<ChangeView>): ChangeView {
  return {
    id: 'c1',
    kind: 'pill',
    status: 'pending',
    reason: null,
    mine: true,
    byName: 'Ravi',
    at: at3pm,
    doneAt: null,
    pillId: null,
    pillName: 'Telma 40',
    hour: null,
    minute: null,
    soundName: null,
    ...extra,
  };
}

test('changeTitle names what the change does', () => {
  expect(changeTitle(change({}), en, false)).toBe('Add Telma 40');
  expect(changeTitle(change({ pillId: 'p1' }), en, false)).toBe(
    'Change Telma 40',
  );
  expect(
    changeTitle(change({ kind: 'deletePill', pillId: 'p1' }), en, false),
  ).toBe('Delete Telma 40');
  const sound = change({ kind: 'sound', hour: 8, minute: 0, pillName: null });
  expect(changeTitle({ ...sound, soundName: "Ravi's sound" }, en, false)).toBe(
    "8:00 AM sound: Ravi's sound",
  );
  expect(changeTitle(sound, en, true)).toBe('08:00 sound: Default tone');
});

test('changeState says waiting, done or not done, and why', () => {
  expect(changeState(change({}), en, false, 'Amma')).toBe(
    "Waiting for Amma's phone",
  );
  expect(changeState(change({ status: 'applying' }), en, false, 'Amma')).toBe(
    "Waiting for Amma's phone",
  );
  expect(
    changeState(
      change({ status: 'applied', doneAt: at3pm }),
      en,
      false,
      'Amma',
    ),
  ).toBe('✓ Done at 3:05 PM');
  const reasons: Record<string, string> = {
    notAllowed: "you're not allowed to change her pills now",
    invalid: "her phone couldn't use it",
    pillGone: 'the pill was deleted on her phone',
    timeGone: 'she has no dose at that time now',
    soundGone: 'that sound is gone from her phone',
    fileBroken: "the photo or sound didn't arrive whole",
  };
  for (const [reason, text] of Object.entries(reasons)) {
    expect(
      changeState(change({ status: 'rejected', reason }), en, false, 'Amma'),
    ).toBe(`Not done: ${text}`);
  }
});

test('waitingByPill keeps waiting pill changes by pill, and ignores done ones', () => {
  const edit = change({ id: 'c1', pillId: 'p1' });
  const del = change({
    id: 'c2',
    kind: 'deletePill',
    pillId: 'p2',
    status: 'applying',
  });
  const done = change({ id: 'c3', pillId: 'p3', status: 'applied' });
  const failed = change({ id: 'c4', pillId: 'p4', status: 'rejected' });
  const add = change({ id: 'c5' });
  const sound = change({ id: 'c6', kind: 'sound', hour: 8, minute: 0 });
  const map = waitingByPill([edit, del, done, failed, add, sound]);
  expect([...map.keys()]).toEqual(['p1', 'p2']);
  expect(map.get('p2')).toBe(del);
});

test('waitingByPill keeps the newest waiting change of a pill', () => {
  // listChanges gives the newest first.
  const newer = change({ id: 'c2', pillId: 'p1' });
  const older = change({ id: 'c1', pillId: 'p1' });
  expect(waitingByPill([newer, older]).get('p1')).toBe(newer);
});

describe('where his next change to a pill starts', () => {
  const telma: Pill = {
    id: 'p1',
    name: 'Telma 40',
    form: 'tablet',
    amount: 0.5,
    times: [{ hour: 21, minute: 0 }],
    startDate: '2026-10-20',
    days: 12,
    photo: 'a.jpg',
    photoUri: 'file:///her/a.jpg',
    remaining: 9,
  };
  /** A change to Telma 40 that her copy doesn't show yet: 8:00 added, 30 days. */
  const ahead = (extra: Partial<ChangeView> = {}) =>
    change({
      pillId: 'p1',
      ahead: true,
      pill: {
        name: 'Telma 80',
        form: 'capsule',
        amount: 1,
        times: [
          { hour: 8, minute: 0 },
          { hour: 21, minute: 0 },
        ],
        days: 30,
        remaining: 40,
        remainingChanged: false,
      },
      ...extra,
    });

  test('pillAhead: with nothing ahead of her copy, it is her pill as read', () => {
    expect(pillAhead(telma, [])).toEqual(telma);
    const behind = [
      // Done, and her copy has it.
      ahead({ status: 'applied', ahead: false }),
      ahead({ status: 'rejected', ahead: false }),
      ahead({ pillId: 'p2' }),
      ahead({ kind: 'deletePill', pill: null }),
      ahead({ kind: 'sound', pillId: null, pill: null, hour: 8, minute: 0 }),
    ];
    expect(pillAhead(telma, behind)).toEqual(telma);
  });

  test('pillAhead lays the newest change over it, keeping her photo, start date and count', () => {
    const older = ahead({ id: 'c1', pill: { ...ahead().pill!, days: 5 } });
    const newer = ahead({ id: 'c2' });
    expect(pillAhead(telma, [newer, older])).toEqual({
      ...telma,
      name: 'Telma 80',
      form: 'capsule',
      amount: 1,
      times: [
        { hour: 8, minute: 0 },
        { hour: 21, minute: 0 },
      ],
      days: 30,
    });
  });

  // Her phone took it, but this phone hasn't read her pills since.
  test('pillAhead: a done change counts until her copy shows it', () => {
    const done = ahead({ status: 'applied', doneAt: at3pm });
    expect(pillAhead(telma, [done]).days).toBe(30);
  });

  test('pillAhead takes the count only from a change that set it', () => {
    const counted = ahead({
      pill: { ...ahead().pill!, remaining: 40, remainingChanged: true },
    });
    expect(pillAhead(telma, [counted]).remaining).toBe(40);
  });

  // Seen on the Redmi: 30 capsules left, then 10 days; the count sheet opened empty.
  test('pillAhead keeps a count set by an older change than the newest', () => {
    const counted = ahead({
      id: 'c1',
      pill: { ...ahead().pill!, remaining: 30, remainingChanged: true },
    });
    const newer = ahead({ id: 'c2', pill: { ...ahead().pill!, days: 10 } });
    expect(pillAhead(telma, [newer, counted])).toMatchObject({
      days: 10,
      remaining: 30,
    });
  });

  test('afterSend starts the next change from the one sent, with her photo and count', () => {
    const base = draftFromPill(telma);
    const sent = {
      ...base,
      times: [
        { hour: 8, minute: 0 },
        { hour: 21, minute: 0 },
      ],
      photo: 'b.jpg',
      photoUri: 'file:///mine/b.jpg',
    };
    expect(afterSend(base, sent)).toEqual({ ...sent, ...photoOf(base) });
    expect(afterSend(base, { ...sent, photo: null, photoUri: null })).toEqual({
      ...sent,
      ...photoOf(base),
    });
    const counted = { ...sent, count: '40', countChanged: true };
    expect(afterSend(base, counted)).toEqual({
      ...sent,
      ...photoOf(base),
      count: '40',
    });
  });
});

const photoOf = (d: PillDraft) => ({
  photo: d.photo,
  photoUri: d.photoUri,
  savedPhoto: d.savedPhoto,
});

test('problemText names the first problem, or nothing', () => {
  expect(problemText(null, en, 'Amma')).toBeNull();
  const texts: Record<string, string> = {
    notifications: 'notifications are off',
    alarmChannel: 'the alarm notifications are off',
    exactAlarms: "alarms aren't allowed",
    fullScreen: "full-screen alarms aren't allowed",
    battery: 'battery setup not done',
    restricted: 'PillSaathi is restricted in the background',
    setup: 'battery setup not done',
  };
  for (const [problem, text] of Object.entries(texts)) {
    expect(problemText(problem, en, 'Amma')).toBe(
      `Amma's phone may not ring alarms: ${text}. On her phone, open PillSaathi and tap Fix now.`,
    );
  }
});
