const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the Unix timestamp (seconds) for the start of today in UTC+8.
 */
function getStartOfTodayUTC8() {
  const utc8Now = Date.now() + UTC8_OFFSET_MS;
  const startOfDayUTC8 = utc8Now - (utc8Now % DAY_MS);
  return Math.floor((startOfDayUTC8 - UTC8_OFFSET_MS) / 1000);
}

/**
 * Returns an array of day bucket objects aligned to UTC+8 midnight,
 * ordered oldest-first, covering the last `days` days up to and including today.
 *
 * Each bucket: { date: 'YYYY-MM-DD', start: <unix sec>, end: <unix sec>, clicks: 0 }
 */
function getDayBucketsUTC8(days) {
  const utc8Now = Date.now() + UTC8_OFFSET_MS;
  const todayStartUTC8 = utc8Now - (utc8Now % DAY_MS);

  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStartUTC8 = todayStartUTC8 - i * DAY_MS;
    const dayEndUTC8 = dayStartUTC8 + DAY_MS;
    const startSec = Math.floor((dayStartUTC8 - UTC8_OFFSET_MS) / 1000);
    const endSec = Math.floor((dayEndUTC8 - UTC8_OFFSET_MS) / 1000);
    const dateLabel = new Date(dayStartUTC8).toISOString().slice(0, 10);
    buckets.push({ date: dateLabel, start: startSec, end: endSec, clicks: 0 });
  }
  return buckets;
}

module.exports = { getStartOfTodayUTC8, getDayBucketsUTC8 };
