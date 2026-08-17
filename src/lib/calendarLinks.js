/**
 * Calendar interoperability — turns an SSC event into something Google
 * Calendar, Outlook or Apple Calendar will accept.
 *
 * Events are stored with a plain `date` string ("2026-08-20") and a free-text
 * `time` ("9:00 AM - 5:00 PM", "1:30 PM", ""). Everything here works from those
 * two fields, so nothing about the admin forms has to change.
 *
 * The campus is in the Philippines, which has no daylight saving, so a fixed
 * +08:00 offset is exact rather than an approximation. Emitting UTC timestamps
 * means the .ics files need no VTIMEZONE block and still land on the right hour
 * for a student whose phone is set to another timezone.
 */

const MANILA_OFFSET_MINUTES = 8 * 60;

/** Product identifier written into every .ics file. */
const PRODID = '-//PSU-UCC Supreme Student Council//SSC Virtual Board//EN';

/**
 * Parses "9:00 AM", "9 AM", "13:45" into minutes from midnight.
 * Returns null when the text has no recognisable clock time.
 */
const parseClock = (text) => {
  const match = String(text || '').match(/(\d{1,2})\s*[:.]?\s*(\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = (match[3] || '').toLowerCase().replace(/\./g, '');

  if (Number.isNaN(hours) || hours > 23 || minutes > 59) return null;

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

/**
 * Splits a free-text time range into start/end minutes.
 * A single time gets a one-hour default duration; blank text means all-day.
 */
export const parseEventTime = (time) => {
  const text = String(time || '').trim();
  if (!text) return { allDay: true, startMinutes: 0, endMinutes: 0 };

  // en dash, em dash, hyphen, "to"
  const parts = text.split(/\s*(?:–|—|-|\bto\b)\s*/i).filter(Boolean);
  let start = parseClock(parts[0]);
  if (start === null) return { allDay: true, startMinutes: 0, endMinutes: 0 };

  let end = parts.length > 1 ? parseClock(parts[1]) : null;

  // "1:00 - 5:00 PM" — only the closing time carries the meridiem. Borrow it
  // when doing so still leaves a sane duration, which is what separates
  // "1:00 - 5:00 PM" (1 PM to 5 PM) from "9:00 - 5:00 PM" (9 AM to 5 PM).
  const startHasMeridiem = /[ap]\.?m\.?/i.test(parts[0] || '');
  const endIsPm = /p\.?m\.?/i.test(parts[1] || '');
  if (end !== null && !startHasMeridiem && endIsPm && start < 12 * 60 && start + 12 * 60 <= end) {
    start += 12 * 60;
  }

  if (end === null || end <= start) end = Math.min(start + 60, 23 * 60 + 59);

  return { allDay: false, startMinutes: start, endMinutes: Math.max(end, start + 1) };
};

/** "2026-08-20" -> [2026, 8, 20]; tolerant of Date objects and timestamps. */
const dateParts = (value) => {
  if (value instanceof Date) {
    return [value.getFullYear(), value.getMonth() + 1, value.getDate()];
  }
  const match = String(value || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()];
};

const pad = (value) => String(value).padStart(2, '0');

/**
 * Converts a Manila wall-clock moment to a UTC basic-format stamp
 * ("20260820T010000Z").
 */
const toUtcStamp = (year, month, day, minutesFromMidnight) => {
  const utcMs = Date.UTC(year, month - 1, day, 0, minutesFromMidnight - MANILA_OFFSET_MINUTES, 0);
  const at = new Date(utcMs);
  return (
    `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `T${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}00Z`
  );
};

/** Basic-format date for all-day entries, optionally shifted by whole days. */
const toDateStamp = (year, month, day, dayOffset = 0) => {
  const at = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}`;
};

/** ISO local string Outlook's deeplink expects, e.g. 2026-08-20T09:00:00+08:00 */
const toIsoWithOffset = (year, month, day, minutesFromMidnight) =>
  `${year}-${pad(month)}-${pad(day)}T${pad(Math.floor(minutesFromMidnight / 60))}:` +
  `${pad(minutesFromMidnight % 60)}:00+08:00`;

/**
 * Strips HTML down to readable plain text. Calendar descriptions are plain-text
 * fields in every client that matters, and the rich text editor stores markup.
 */
export const toCalendarText = (html) => {
  const source = String(html || '');
  if (!/[<&]/.test(source)) return source.trim();

  const parsed = new DOMParser().parseFromString(source, 'text/html');
  // Give block elements a line break so paragraphs don't run together.
  parsed.body.querySelectorAll('p, div, li, br, h1, h2, h3, h4, tr').forEach((node) => {
    node.insertAdjacentText('afterend', '\n');
  });
  return (parsed.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

/**
 * Everything the link builders and the .ics writer need, derived once.
 * Returns null for an event with an unusable date.
 */
const describeEvent = (event) => {
  const parts = dateParts(event?.date);
  if (!parts) return null;

  const [year, month, day] = parts;
  const { allDay, startMinutes, endMinutes } = parseEventTime(event?.time);

  const status = String(event?.status || '').toLowerCase();
  const description = toCalendarText(event?.description);
  const footer = [
    status ? `Status: ${status.charAt(0).toUpperCase()}${status.slice(1)}` : '',
    'Posted on the PSU-UCC SSC Virtual Board.'
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title: String(event?.title || 'SSC Event').trim(),
    location: String(event?.location || '').trim(),
    description: [description, footer].filter(Boolean).join('\n\n'),
    allDay,
    year,
    month,
    day,
    startMinutes,
    endMinutes,
    uid: `ssc-${event?.id || `${year}${month}${day}`}@psu-ucc-ssc`,
    // Pending events are marked tentative so they look provisional in the
    // student's own calendar rather than a firm commitment.
    icsStatus: status === 'approved' ? 'CONFIRMED' : 'TENTATIVE'
  };
};

// ---------------------------------------------------------------------------
// Web links
// ---------------------------------------------------------------------------

/** Google Calendar "add event" link. */
export const googleCalendarUrl = (event) => {
  const info = describeEvent(event);
  if (!info) return '';

  const dates = info.allDay
    ? `${toDateStamp(info.year, info.month, info.day)}/${toDateStamp(info.year, info.month, info.day, 1)}`
    : `${toUtcStamp(info.year, info.month, info.day, info.startMinutes)}/` +
      `${toUtcStamp(info.year, info.month, info.day, info.endMinutes)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: info.title,
    dates,
    details: info.description,
    location: info.location,
    ctz: 'Asia/Manila'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Outlook deeplink. `flavour` picks between a personal account
 * (outlook.live.com) and a school/work Microsoft 365 account
 * (outlook.office.com) — the two hosts do not accept each other's links.
 */
export const outlookCalendarUrl = (event, flavour = 'live') => {
  const info = describeEvent(event);
  if (!info) return '';

  const host = flavour === 'office' ? 'https://outlook.office.com' : 'https://outlook.live.com';
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: info.title,
    body: info.description,
    location: info.location,
    startdt: info.allDay
      ? `${info.year}-${pad(info.month)}-${pad(info.day)}`
      : toIsoWithOffset(info.year, info.month, info.day, info.startMinutes),
    enddt: info.allDay
      ? `${info.year}-${pad(info.month)}-${pad(info.day)}`
      : toIsoWithOffset(info.year, info.month, info.day, info.endMinutes)
  });
  if (info.allDay) params.set('allday', 'true');

  return `${host}/calendar/0/deeplink/compose?${params.toString()}`;
};

// ---------------------------------------------------------------------------
// iCalendar (.ics) — Apple Calendar, Outlook desktop, and every importer
// ---------------------------------------------------------------------------

/** Escapes a value for an iCalendar property. */
const escapeIcs = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/**
 * RFC 5545 caps a content line at 75 octets and continues it with a leading
 * space. Long descriptions break strict parsers without this.
 */
const foldLine = (line) => {
  if (line.length <= 73) return line;
  const chunks = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 72) {
    chunks.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  if (rest) chunks.push(` ${rest}`);
  return chunks.join('\r\n');
};

/** Minutes before the start at which a VALARM should fire. */
export const REMINDER_CHOICES = [
  { value: 0, label: 'No reminder' },
  { value: 10, label: '10 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 24 * 60, label: '1 day before' },
  { value: 7 * 24 * 60, label: '1 week before' }
];

const alarmBlock = (minutesBefore, summary) => {
  if (!minutesBefore) return [];
  const days = Math.floor(minutesBefore / (24 * 60));
  const hours = Math.floor((minutesBefore % (24 * 60)) / 60);
  const minutes = minutesBefore % 60;
  const duration =
    `-P${days ? `${days}D` : ''}` +
    (hours || minutes ? `T${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}` : '');

  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(summary)}`,
    `TRIGGER:${days && !hours && !minutes ? `-P${days}D` : duration}`,
    'END:VALARM'
  ];
};

const vevent = (event, { reminderMinutes = 24 * 60, stamp } = {}) => {
  const info = describeEvent(event);
  if (!info) return [];

  const lines = [
    'BEGIN:VEVENT',
    `UID:${info.uid}`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escapeIcs(info.title)}`
  ];

  if (info.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toDateStamp(info.year, info.month, info.day)}`);
    lines.push(`DTEND;VALUE=DATE:${toDateStamp(info.year, info.month, info.day, 1)}`);
  } else {
    lines.push(`DTSTART:${toUtcStamp(info.year, info.month, info.day, info.startMinutes)}`);
    lines.push(`DTEND:${toUtcStamp(info.year, info.month, info.day, info.endMinutes)}`);
  }

  if (info.location) lines.push(`LOCATION:${escapeIcs(info.location)}`);
  if (info.description) lines.push(`DESCRIPTION:${escapeIcs(info.description)}`);
  lines.push(`STATUS:${info.icsStatus}`);
  lines.push('CATEGORIES:PSU-UCC SSC');
  lines.push(...alarmBlock(reminderMinutes, `Reminder: ${info.title}`));
  lines.push('END:VEVENT');

  return lines;
};

/**
 * Builds an .ics document for one or many events.
 * `X-WR-CALNAME` is what Apple Calendar and Outlook show as the calendar name.
 */
export const buildIcs = (events, { reminderMinutes = 24 * 60, calendarName = 'PSU-UCC SSC Activities' } = {}) => {
  const list = Array.isArray(events) ? events : [events];
  const stamp = toUtcStamp(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
    new Date().getHours() * 60 + new Date().getMinutes()
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Manila',
    ...list.flatMap((event) => vevent(event, { reminderMinutes, stamp })),
    'END:VCALENDAR'
  ];

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
};

/** Turns a title into a safe download filename. */
const toFileName = (title) =>
  `${String(title || 'ssc-event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'ssc-event'}.ics`;

/**
 * Hands the .ics file to the browser. Apple Calendar and Outlook desktop both
 * open it directly; on iOS and Android it lands in the calendar app's importer.
 */
export const downloadIcs = (events, options = {}) => {
  const text = buildIcs(events, options);
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.fileName || toFileName(options.calendarName || events?.title);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Human-readable "when" line, reused by the share sheet and the alerts. */
export const describeWhen = (event) => {
  const info = describeEvent(event);
  if (!info) return '';
  const date = new Date(info.year, info.month - 1, info.day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  return info.allDay ? `${date} (all day)` : `${date} · ${String(event.time).trim()}`;
};
