/**
 * Convert a datetime-local input string (e.g. "2024-12-31T23:59") to a Unix timestamp in seconds.
 */
export function toUnixSec(dateLocalStr) {
  return Math.floor(new Date(dateLocalStr).getTime() / 1000);
}

/**
 * Convert a Unix timestamp in seconds to a datetime-local input string (YYYY-MM-DDTHH:MM),
 * adjusted to the browser's local timezone.
 */
export function toDateLocalStr(unixSec) {
  const d = new Date(unixSec * 1000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
