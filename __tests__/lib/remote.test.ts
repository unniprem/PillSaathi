import { en } from '../../src/i18n/en';
import {
  changeState,
  changeTitle,
  problemText,
  waitingByPill,
} from '../../src/lib/remote';
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
  ).toBe('Done at 3:05 PM');
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
      `Amma's phone may not ring alarms: ${text}. On her phone, open PillSaathi and tap the yellow banner.`,
    );
  }
});
