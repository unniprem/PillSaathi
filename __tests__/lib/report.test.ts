import { en } from '../../src/i18n/en';
import { ml } from '../../src/i18n/ml';
import { reportText } from '../../src/lib/report';
import type { HistoryDose, Pill } from '../../src/native/alarms';

const telma: Pill = {
  id: 'p1',
  name: 'Telma 40',
  form: 'tablet',
  amount: 1,
  times: [
    { hour: 21, minute: 0 },
    { hour: 8, minute: 0 },
  ],
  startDate: '2026-09-01',
  days: null,
  photo: null,
  photoUri: null,
  remaining: null,
};
const vitaminD: Pill = {
  id: 'p2',
  name: 'Vitamin D',
  form: 'capsule',
  amount: 1,
  times: [{ hour: 8, minute: 0 }],
  startDate: '2026-10-21',
  days: 10, // last day Fri 30 Oct
  photo: null,
  photoUri: null,
  remaining: null,
};

function dose(
  date: string,
  hour: number,
  outcome: HistoryDose['outcome'],
  pills: Pill[] = [telma],
): HistoryDose {
  return {
    date,
    hour,
    minute: 0,
    outcome,
    at: 0,
    marked: false,
    pills: pills.map(p => ({
      pillId: p.id,
      name: p.name,
      form: p.form,
      amount: p.amount,
      exists: true,
      photoUri: null,
    })),
  };
}

/** 8:00 and 21:00 on each of Oct 1–25, all taken except the [notTaken] ones, which replace theirs. */
function october(notTaken: HistoryDose[]): HistoryDose[] {
  const all: HistoryDose[] = [];
  for (let d = 1; d <= 25; d++) {
    const date = `2026-10-${String(d).padStart(2, '0')}`;
    for (const hour of [8, 21]) {
      all.push(
        notTaken.find(n => n.date === date && n.hour === hour) ??
          dose(date, hour, 'taken'),
      );
    }
  }
  return all;
}

const base = {
  month: '2026-10',
  today: '2026-10-25',
  pills: [telma, vitaminD],
  is24h: false,
  lang: 'en' as const,
  t: en,
};

it('writes the spec example exactly', () => {
  // The spec's example says 46 of 50 but lists two doses; every dose not taken is listed, so
  // here two of the 50 were not taken.
  const doses = october([
    dose('2026-10-14', 8, 'skipped', [telma, vitaminD]),
    dose('2026-10-06', 21, 'missed'),
  ]);
  expect(reportText({ ...base, doses })).toBe(
    [
      'PillSaathi · 1–25 Oct 2026',
      'Taken 48 of 50 doses (96%)',
      '',
      'Not taken:',
      '• Tue 6 Oct, 9:00 PM: missed (Telma 40)',
      '• Wed 14 Oct, 8:00 AM: skipped (Telma 40, Vitamin D)',
      '',
      'Medicines now:',
      '• Telma 40: 1 tablet at 8:00 AM, 9:00 PM, no end',
      '• Vitamin D: 1 capsule at 8:00 AM, last day Fri 30 Oct',
    ].join('\n'),
  );
});

it('writes an empty month', () => {
  expect(reportText({ ...base, doses: [] })).toBe(
    [
      'PillSaathi · 1–25 Oct 2026',
      'No doses recorded',
      '',
      'Medicines now:',
      '• Telma 40: 1 tablet at 8:00 AM, 9:00 PM, no end',
      '• Vitamin D: 1 capsule at 8:00 AM, last day Fri 30 Oct',
    ].join('\n'),
  );
});

it('writes a month with only misses', () => {
  const text = reportText({
    ...base,
    doses: [dose('2026-10-07', 21, 'missed'), dose('2026-10-07', 8, 'missed')],
  });
  expect(text).toContain('\nTaken 0 of 2 doses (0%)\n');
  expect(text).toContain(
    'Not taken:\n• Wed 7 Oct, 8:00 AM: missed (Telma 40)\n• Wed 7 Oct, 9:00 PM: missed (Telma 40)\n',
  );
});

it('says none when every dose was taken', () => {
  const text = reportText({ ...base, doses: october([]) });
  expect(text).toContain('Taken 50 of 50 doses (100%)\n\nNot taken: none\n\n');
});

it('ranges a past month to its last day', () => {
  expect(
    reportText({ ...base, month: '2026-09', doses: [] }).split('\n')[0],
  ).toBe('PillSaathi · 1–30 Sep 2026');
  expect(
    reportText({ ...base, today: '2026-10-01', doses: [] }).split('\n')[0],
  ).toBe('PillSaathi · 1 Oct 2026');
});

it('leaves finished courses out of Medicines now', () => {
  const finished: Pill = {
    ...telma,
    id: 'p3',
    name: 'Azithromycin',
    startDate: '2026-10-20',
    days: 5, // last day Sat 24 Oct
  };
  const endsToday: Pill = { ...vitaminD, startDate: '2026-10-16' }; // last day Sun 25 Oct
  const text = reportText({ ...base, pills: [finished, endsToday], doses: [] });
  expect(text).not.toContain('Azithromycin');
  expect(text).toContain(
    '• Vitamin D: 1 capsule at 8:00 AM, last day Sun 25 Oct',
  );
  expect(reportText({ ...base, pills: [finished], doses: [] })).toMatch(
    /\nMedicines now: none$/,
  );
});

it('writes Malayalam with pill names as typed', () => {
  const text = reportText({
    ...base,
    lang: 'ml',
    t: ml,
    doses: [dose('2026-10-06', 21, 'missed'), dose('2026-10-06', 8, 'taken')],
  });
  expect(text).toContain(ml.report.notTaken);
  expect(text).toContain(ml.report.medicines);
  expect(text).toContain('Telma 40');
  expect(text).toContain('1 ഗുളിക');
  expect(text).not.toContain('Not taken');
  expect(text).not.toContain('Medicines now');
  expect(text).not.toContain('tablet');
});
