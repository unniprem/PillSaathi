import {
  QUICK_TIMES,
  addToCount,
  draftFromPill,
  draftReady,
  emptyDraft,
  stepReady,
  toPillInput,
} from '../../src/lib/pillDraft';
import type { PillDraft } from '../../src/lib/pillDraft';
import type { Pill } from '../../src/native/alarms';

const telma: Pill = {
  id: 'p1',
  name: 'Telma 40',
  form: 'tablet',
  amount: 0.5,
  times: [
    { hour: 21, minute: 0 },
    { hour: 8, minute: 0 },
  ],
  startDate: '2026-10-20',
  days: 12,
  photo: 'a.jpg',
  photoUri: 'file:///photos/a.jpg',
  remaining: 9,
};

/** A new pill with every step answered. */
const ready = (more: Partial<PillDraft> = {}): PillDraft => ({
  ...emptyDraft(),
  name: 'Iron',
  times: [{ hour: 8, minute: 0 }],
  duration: 5,
  ...more,
});

test('a new draft has no times and starts today', () => {
  const d = emptyDraft();
  expect(d.id).toBeNull();
  expect(d.name).toBe('');
  expect(d.form).toBe('tablet');
  expect(d.amount).toBe(1);
  expect(d.times).toEqual([]);
  expect(d.duration).toBeNull();
  expect(d.startsTomorrow).toBe(false);
  expect(d.photo).toBeNull();
  expect(d.count).toBe('');
  expect(d.countChanged).toBe(false);
});

test('the three ready times are 8:00, 13:30 and 21:00', () => {
  expect(QUICK_TIMES).toEqual([
    { hour: 8, minute: 0 },
    { hour: 13, minute: 30 },
    { hour: 21, minute: 0 },
  ]);
});

test('toPillInput builds what savePill takes', () => {
  expect(toPillInput(ready({ name: '  Azithromycin 500 ' }))).toEqual({
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
  expect(toPillInput(ready({ duration: 'none' })).days).toBeNull();
  expect(toPillInput(ready({ duration: 'other', otherDays: '12' })).days).toBe(
    12,
  );
  expect(toPillInput(ready({ startsTomorrow: true })).startsTomorrow).toBe(
    true,
  );
  expect(toPillInput(ready({ count: '25', countChanged: true }))).toMatchObject(
    { remaining: 25, remainingChanged: true },
  );
  // Only tablets and capsules are counted.
  expect(
    toPillInput(ready({ form: 'syrup', amount: 5, count: '25' })).remaining,
  ).toBeNull();
});

test('an edit keeps its start date', () => {
  expect(
    toPillInput({ ...draftFromPill(telma), startsTomorrow: true })
      .startsTomorrow,
  ).toBe(false);
});

test('a draft of a pill has its fields, its times in order', () => {
  const d = draftFromPill(telma);
  expect(d).toMatchObject({
    id: 'p1',
    name: 'Telma 40',
    form: 'tablet',
    amount: 0.5,
    times: [
      { hour: 8, minute: 0 },
      { hour: 21, minute: 0 },
    ],
    duration: 'other',
    otherDays: '12',
    startDate: '2026-10-20',
    photo: 'a.jpg',
    photoUri: 'file:///photos/a.jpg',
    count: '9',
    countChanged: false,
  });
  expect(toPillInput(d)).toEqual({
    id: 'p1',
    name: 'Telma 40',
    form: 'tablet',
    amount: 0.5,
    times: [
      { hour: 8, minute: 0 },
      { hour: 21, minute: 0 },
    ],
    startsTomorrow: false,
    days: 12,
    photo: 'a.jpg',
    remaining: 9,
    remainingChanged: false,
  });
  expect(draftFromPill({ ...telma, days: 30 }).duration).toBe(30);
  expect(draftFromPill({ ...telma, days: null }).duration).toBe('none');
  expect(draftFromPill({ ...telma, remaining: null }).count).toBe('');
});

test('step 1 needs a name', () => {
  expect(stepReady(emptyDraft(), 1)).toBe(false);
  expect(stepReady({ ...emptyDraft(), name: '   ' }, 1)).toBe(false);
  expect(stepReady({ ...emptyDraft(), name: 'Iron' }, 1)).toBe(true);
  expect(stepReady(emptyDraft(), 2)).toBe(true);
});

test('step 3 needs a time; step 4 needs a duration', () => {
  expect(stepReady(emptyDraft(), 3)).toBe(false);
  expect(stepReady(ready(), 3)).toBe(true);
  expect(stepReady(emptyDraft(), 4)).toBe(false);
  expect(stepReady(ready({ duration: 'none' }), 4)).toBe(true);
  for (const junk of ['0', '366', '5.5', '', '1e2']) {
    expect([
      junk,
      stepReady(ready({ duration: 'other', otherDays: junk }), 4),
    ]).toEqual([junk, false]);
  }
  expect(stepReady(ready({ duration: 'other', otherDays: '365' }), 4)).toBe(
    true,
  );
});

test('step 5 takes no count, or a whole or half number', () => {
  for (const typed of ['9.3', '1000', '-1', '9.', 'ten']) {
    expect([typed, stepReady(ready({ count: typed }), 5)]).toEqual([
      typed,
      false,
    ]);
  }
  for (const typed of ['9.5', '0', '999', '']) {
    expect([typed, stepReady(ready({ count: typed }), 5)]).toEqual([
      typed,
      true,
    ]);
  }
  // A count left from a tablet doesn't hold up a syrup.
  expect(stepReady(ready({ form: 'syrup', count: 'ten' }), 5)).toBe(true);
});

test('a draft is ready when every step is', () => {
  expect(draftReady(ready())).toBe(true);
  expect(draftReady(ready({ name: '' }))).toBe(false);
  expect(draftReady(ready({ times: [] }))).toBe(false);
  expect(draftReady(ready({ duration: null }))).toBe(false);
  expect(draftReady(ready({ count: 'ten' }))).toBe(false);
});

test('the quick buttons add to the count, or start it', () => {
  expect(addToCount('', 10)).toBe('10');
  expect(addToCount('9.5', 15)).toBe('24.5');
  expect(addToCount('ten', 30)).toBe('30');
});
