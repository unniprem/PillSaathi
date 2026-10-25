const pad = (n: number) => String(n).padStart(2, '0');

/** `7:05 PM` (12-hour, no leading zero on the hour) or `19:05` (24-hour). */
export function formatTime(hour: number, minute: number, is24h: boolean) {
  if (is24h) {
    return `${pad(hour)}:${pad(minute)}`;
  }
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** `0:12` or `2:00`: a length in milliseconds as m:ss, rounded down. */
export function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}
