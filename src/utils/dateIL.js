/**
 * Date/time helpers — all output in Israel time (Asia/Jerusalem).
 */
const IL_TZ = 'Asia/Jerusalem';

/** Current hour in Israel time (0–23). */
export function hoursIL() {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: IL_TZ, hour: 'numeric', hour12: false }), 10);
}

/** Format a date as "DD/MM/YYYY" in Israel time. */
export function formatDateIL(date, opts = {}) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', { timeZone: IL_TZ, ...opts });
}

/** Format a time as "HH:MM" in Israel time. */
export function formatTimeIL(date, opts = {}) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-GB', {
    timeZone: IL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  });
}

/** Format a full datetime in Israel time. */
export function formatDateTimeIL(date, opts = {}) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-GB', {
    timeZone: IL_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  });
}

/** Relative "X minutes ago" — still based on Israel now for consistency. */
export function agoIL(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return formatDateIL(date);
}
