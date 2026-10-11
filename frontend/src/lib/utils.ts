/**
 * Class names utility helper to merge and filter conditional class names.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format an ISO timestamp (e.g. '2026-09-01T18:00:00') into a clean, human-readable date and time.
 * Avoids browser timezone drift by directly parsing date components.
 */
export function formatMissionDateTime(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') return '';
  const [datePart, timePart] = iso.split('T');
  if (!datePart) return iso;
  const parts = datePart.split('-');
  if (parts.length < 3) return iso;
  const [year, month, day] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1] || month;
  const dayNum = parseInt(day, 10);

  if (!timePart) return `${monthName} ${dayNum}, ${year}`;

  const timeSub = timePart.split(':');
  if (timeSub.length < 2) return `${monthName} ${dayNum}, ${year}`;
  const h = parseInt(timeSub[0], 10);
  const m = timeSub[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;

  return `${monthName} ${dayNum}, ${year} • ${hour12}:${m} ${ampm}`;
}

/**
 * Format a mission time range from start and end ISO strings (e.g. 'Sep 1, 2026 • 6:00 PM – 6:31 PM (31m)').
 */
export function formatMissionTimeRange(
  startIso?: string | null,
  endIso?: string | null,
  durationMin?: number | null
): string {
  if (!startIso) return '';
  const [startDate, startTime] = startIso.split('T');
  if (!startDate) return startIso;
  const parts = startDate.split('-');
  if (parts.length < 3) return startIso;
  const [year, month, day] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1] || month;
  const dayNum = parseInt(day, 10);
  const dateFormatted = `${monthName} ${dayNum}, ${year}`;

  const formatTime = (tStr?: string) => {
    if (!tStr) return '';
    const timeSub = tStr.split(':');
    if (timeSub.length < 2) return '';
    const h = parseInt(timeSub[0], 10);
    const m = timeSub[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const startFormatted = formatTime(startTime);
  if (!endIso) {
    return startFormatted ? `${dateFormatted} • ${startFormatted}` : dateFormatted;
  }

  const [, endTime] = endIso.split('T');
  const endFormatted = formatTime(endTime);
  const dur = durationMin ? ` (${durationMin}m)` : '';

  if (startFormatted && endFormatted) {
    return `${dateFormatted} • ${startFormatted} – ${endFormatted}${dur}`;
  }
  return startFormatted ? `${dateFormatted} • ${startFormatted}` : dateFormatted;
}

