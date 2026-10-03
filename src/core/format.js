/**
 * VinVibes — Formatting helpers
 */

export function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0 || !isFinite(totalSeconds)) return '0:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ss = seconds.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}

/** "1 hr 12 min" style total for collections. */
export function formatTotalDuration(totalSeconds) {
  const minutes = Math.round((totalSeconds || 0) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Lowercase + strip accents for search matching. */
export function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
