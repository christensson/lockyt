/**
 * Makes a short text for the time since a moment, for example "2 months ago".
 */

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

const MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const HOUR = MINUTES_PER_HOUR * MINUTE;
const DAY = HOURS_PER_DAY * HOUR;
const WEEK = DAYS_PER_WEEK * DAY;
const MONTH = DAYS_PER_MONTH * DAY;
const YEAR = DAYS_PER_YEAR * DAY;

type Unit = {
  name: Intl.RelativeTimeFormatUnit;
  length: number;
};

const UNITS: Unit[] = [
  {name: 'year', length: YEAR},
  {name: 'month', length: MONTH},
  {name: 'week', length: WEEK},
  {name: 'day', length: DAY},
  {name: 'hour', length: HOUR},
  {name: 'minute', length: MINUTE}
];

/**
 * Makes the relative time text.
 *
 * @param timestamp The moment, as milliseconds since 1970-01-01T00:00Z.
 * @param locale The locale of the user, for example "en".
 * @param now The current moment. Defaults to the clock.
 * @returns The text, for example "2 months ago" or "just now".
 */
export function relativeTime(timestamp: number, locale: string, now: number = Date.now()): string {
  const elapsed = now - timestamp;
  if (elapsed < MINUTE) {
    return 'just now';
  }
  let formatter: Intl.RelativeTimeFormat;
  try {
    formatter = new Intl.RelativeTimeFormat(locale || 'en', {numeric: 'auto'});
  } catch (error) {
    console.warn('[lock] Unknown locale "' + locale + '": ' + String(error));
    formatter = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});
  }
  for (let i = 0; i < UNITS.length; i++) {
    const unit = UNITS[i];
    if (elapsed >= unit.length) {
      return formatter.format(-Math.floor(elapsed / unit.length), unit.name);
    }
  }
  return 'just now';
}
