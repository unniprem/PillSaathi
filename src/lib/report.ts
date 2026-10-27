import type { Lang, Strings } from '../i18n';
import type { HistoryDose, Pill } from '../native/alarms';
import { formatAmount } from './amount';
import { formatDay, lastDay } from './course';
import { monthRange, summarize } from './history';
import { formatTime } from './time';

/**
 * The month on screen, up to [today], as plain text to share through WhatsApp, SMS or email: the
 * date range, the doses taken, every dose not taken (oldest first, with the pills it covered), and
 * the medicines now. Written in [lang]; pill names stay as typed.
 */
export function reportText(o: {
  month: string;
  today: string;
  doses: HistoryDose[];
  pills: Pill[];
  is24h: boolean;
  lang: Lang;
  t: Strings;
}): string {
  const { t } = o;
  const { taken, total, percent } = summarize(o.doses);
  const lines = [
    t.report.title(range(o.month, o.today, t)),
    percent === null ? t.report.noDoses : t.report.taken(taken, total, percent),
    '',
  ];

  if (total > 0) {
    const notTaken = [...o.doses]
      .filter(d => d.outcome !== 'taken')
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.hour - b.hour ||
          a.minute - b.minute,
      );
    if (notTaken.length === 0) {
      lines.push(t.report.notTakenNone);
    } else {
      lines.push(t.report.notTaken);
      notTaken.forEach(d =>
        lines.push(
          t.report.doseLine(
            formatDay(d.date, t),
            formatTime(d.hour, d.minute, o.is24h),
            d.outcome === 'missed' ? t.report.missed : t.report.skipped,
            d.pills.map(p => p.name).join(', '),
          ),
        ),
      );
    }
    lines.push('');
  }

  const current = o.pills.filter(p => {
    const end = lastDay(p.startDate, p.days);
    return end === null || end >= o.today;
  });
  if (current.length === 0) {
    lines.push(t.report.medicinesNone);
  } else {
    lines.push(t.report.medicines);
    current.forEach(p => {
      const end = lastDay(p.startDate, p.days);
      const times = [...p.times]
        .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
        .map(time => formatTime(time.hour, time.minute, o.is24h))
        .join(', ');
      lines.push(
        t.report.pillLine(
          p.name,
          formatAmount(p.form, p.amount, o.lang),
          times,
          end === null ? t.report.noEnd : t.report.lastDay(formatDay(end, t)),
        ),
      );
    });
  }
  return lines.join('\n');
}

/** "1–25 Oct 2026", or "1 Oct 2026" for a single day. */
function range(month: string, today: string, t: Strings): string {
  const { from, to } = monthRange(month, today);
  const [year, m] = month.split('-').map(Number);
  const first = Number(from.slice(8));
  const last = Number(to.slice(8));
  const days = first === last ? `${first}` : `${first}–${last}`;
  return `${days} ${t.months[m - 1]} ${year}`;
}
